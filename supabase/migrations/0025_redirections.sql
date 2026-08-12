-- 0025_redirections.sql
-- Rank Math port, part 2 of 2: Redirections + 404 Monitor.
--
-- Matching happens in src/middleware.ts on the Worker, so the source rows are
-- read on every unmatched request. The table is tiny and cached in-isolate for
-- a short TTL (see src/lib/seo/redirects.ts) — do not add heavy columns here.

create table if not exists public.redirections (
  id            uuid primary key default gen_random_uuid(),
  -- Match sources. `sources` holds one or more patterns; a request matches the
  -- rule if ANY pattern matches (Rank Math semantics).
  sources       text[] not null check (cardinality(sources) between 1 and 20),
  comparison    text not null default 'exact'
                check (comparison in ('exact','contains','start','end','regex')),
  -- Case-insensitive matching (Rank Math default is case-insensitive).
  ignore_case   boolean not null default true,
  destination   text not null default '',
  http_code     integer not null default 301
                check (http_code in (301, 302, 307, 410, 451)),
  is_active     boolean not null default true,
  hits          integer not null default 0,
  last_hit_at   timestamptz,
  note          text not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- 410/451 answer without a body; every other code needs somewhere to go.
  constraint redirections_destination_chk check (
    http_code in (410, 451) or length(btrim(destination)) > 0
  )
);

create index if not exists redirections_active_idx on public.redirections(id) where is_active;

create trigger trg_redirections_updated
  before update of sources, comparison, ignore_case, destination, http_code, is_active, note
  on public.redirections
  for each row execute function public.set_updated_at();
-- Hit counters update on every redirect; do not turn those anonymous hits into
-- activity_log rows. Audit only admin-editable routing fields.
create trigger trg_redirections_audit_insert_delete
  after insert or delete on public.redirections
  for each row execute function public.audit_trigger();
create trigger trg_redirections_audit_update
  after update of sources, comparison, ignore_case, destination, http_code, is_active, note
  on public.redirections
  for each row execute function public.audit_trigger();

alter table public.redirections enable row level security;
-- Public read: the Worker matches redirects with the anon client on every
-- request. Rows contain no secrets (they are effectively public URL rewrites).
create policy redirections_public_read on public.redirections
  for select to anon, authenticated using (true);
create policy redirections_admin_write on public.redirections
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Supabase may install broad default privileges for `public` tables. Revoke
-- first; otherwise the column-level anon grant below would not restrict
-- admin notes/hit metadata.
revoke all on table public.redirections from anon, authenticated;
grant select (id, sources, comparison, ignore_case, destination, http_code, is_active, created_at) on public.redirections to anon;
grant select, insert, update, delete on public.redirections to authenticated;

-- ── 404 monitor ─────────────────────────────────────────────────────────────
create table if not exists public.redirection_404_log (
  id           uuid primary key default gen_random_uuid(),
  uri          text not null unique,
  hits         integer not null default 1,
  referer      text not null default '',
  user_agent   text not null default '',
  created_at   timestamptz not null default now(),
  last_hit_at  timestamptz not null default now()
);

create index if not exists redirection_404_hits_idx on public.redirection_404_log(hits desc);
create index if not exists redirection_404_seen_idx on public.redirection_404_log(last_hit_at desc);

alter table public.redirection_404_log enable row level security;
-- No client-side INSERT policy: rows are only written through log_404() below,
-- which is SECURITY DEFINER. Anonymous visitors must not be able to write
-- arbitrary rows or read the log.
create policy redirection_404_admin_read on public.redirection_404_log
  for select to authenticated using ((select public.is_admin()));
create policy redirection_404_admin_write on public.redirection_404_log
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

revoke all on table public.redirection_404_log from anon, authenticated;
grant select, insert, update, delete on public.redirection_404_log to authenticated;

-- Upsert a 404 hit. SECURITY DEFINER so the anon Worker client can record a
-- miss without any table-level grant. Inputs are truncated here (not just in
-- the app) so the table can't be inflated by a long crafted URL.
create or replace function public.log_404(
  p_uri text,
  p_referer text default '',
  p_user_agent text default ''
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uri text := left(coalesce(p_uri, ''), 512);
begin
  if v_uri = '' or left(v_uri, 1) <> '/' then return; end if;
  -- ponytail: public 404 logging intentionally stops creating new rows at
  -- 10k; upgrade to an edge rate-limited ingestion service if this ceiling is
  -- reached. Existing URIs continue accumulating hits.
  if not exists (select 1 from public.redirection_404_log where uri = v_uri)
     and (select count(*) from public.redirection_404_log) >= 10000 then
    return;
  end if;
  insert into public.redirection_404_log as l (uri, referer, user_agent)
       values (v_uri, left(coalesce(p_referer, ''), 512), left(coalesce(p_user_agent, ''), 256))
  on conflict (uri) do update
     set hits        = l.hits + 1,
         last_hit_at = now(),
         referer     = case when excluded.referer <> '' then excluded.referer else l.referer end,
         user_agent  = case when excluded.user_agent <> '' then excluded.user_agent else l.user_agent end
   -- Same-URI bursts are bot noise. Bound public write amplification while
   -- preserving a useful approximate hit count.
   where l.last_hit_at < now() - interval '5 seconds';
end;
$$;

revoke all on function public.log_404(text, text, text) from public;
grant execute on function public.log_404(text, text, text) to anon, authenticated;

-- Count a redirect hit without granting UPDATE on the table.
create or replace function public.bump_redirect_hit(p_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.redirections
     set hits = hits + 1, last_hit_at = now()
   where id = p_id
     and is_active
     and (last_hit_at is null or last_hit_at < now() - interval '5 seconds');
$$;

revoke all on function public.bump_redirect_hit(uuid) from public;
grant execute on function public.bump_redirect_hit(uuid) to anon, authenticated;

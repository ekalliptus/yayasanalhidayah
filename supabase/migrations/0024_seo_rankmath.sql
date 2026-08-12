-- 0024_seo_rankmath.sql
-- Rank Math port, part 1 of 2: per-page SEO overrides + the extra per-article
-- SEO columns the editor's new SEO tabs write.
--
-- Design notes
--  * Global settings stay in `seo_settings` (key='site', jsonb) — no schema
--    change needed there, the app merges over TypeScript defaults, so new keys
--    are additive. See src/lib/seo/settings.ts.
--  * `page_seo` covers routes that are NOT articles (/, /program, /artikel, …).
--    Keyed by pathname so the public layout can look up an override for any
--    route without a table per page type.
--  * Robots flags are stored as a text[] of Rank Math's own tokens
--    (index/noindex/nofollow/noarchive/nosnippet/noimageindex) so the public
--    renderer joins them straight into the robots meta. NULL/empty = inherit
--    the global default (this is the "inherit" state Rank Math also has).

-- ── Per-page SEO overrides ──────────────────────────────────────────────────
create table if not exists public.page_seo (
  path             text primary key,
  label            text not null default '',
  title            text,
  description      text,
  canonical        text,
  robots           text[],
  og_title         text,
  og_description   text,
  og_image         text,
  twitter_title    text,
  twitter_description text,
  twitter_image    text,
  schema_type      text not null default 'WebPage'
                   check (schema_type in ('WebPage','AboutPage','ContactPage','CollectionPage','none')),
  sitemap_include  boolean not null default true,
  sitemap_priority numeric(2,1) not null default 0.5
                   check (sitemap_priority >= 0.0 and sitemap_priority <= 1.0),
  sitemap_changefreq text not null default 'weekly'
                   check (sitemap_changefreq in ('always','hourly','daily','weekly','monthly','yearly','never')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  -- Only real, site-relative paths. Blocks protocol-relative ("//evil.com")
  -- and absolute URLs from ever becoming a lookup key.
  constraint page_seo_path_chk check (path = '/' or path ~ '^/[^/?#[:space:]][^?#[:space:]]*$')
);

create trigger trg_page_seo_updated before update on public.page_seo
  for each row execute function public.set_updated_at();

alter table public.page_seo enable row level security;
create policy page_seo_public_read on public.page_seo
  for select to anon, authenticated using (true);
create policy page_seo_admin_write on public.page_seo
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

revoke all on table public.page_seo from anon, authenticated;
grant select on public.page_seo to anon;
grant select, insert, update, delete on public.page_seo to authenticated;

-- Seed the routes that exist today so the admin screen is populated on first
-- visit. Titles/descriptions stay NULL = "use whatever the page passes".
-- Fix the sibling-project seed accidentally shipped in 0017, but only when
-- those exact old values are still present (never overwrite an admin edit).
update public.seo_settings
set value = jsonb_set(
              jsonb_set(value, '{homepage_title}', to_jsonb('Yayasan Alhidayah — Amanah, Tepat Sasaran, Sesuai Syariat'::text)),
              '{homepage_description}',
              to_jsonb('Yayasan Alhidayah — Lembaga sosial & keagamaan dari Bandung Barat. Wakaf mushaf Al-Quran, kafarat, fidyah, dan bantuan sosial untuk fakir miskin, anak yatim, dan penggiat dakwah.'::text)
            )
where key = 'site'
  and value->>'homepage_title' = 'Sedekah Air Minum — Gerakan Wakaf Air Bersih untuk Indonesia';

revoke all on table public.seo_settings from anon, authenticated;
grant select on public.seo_settings to anon, authenticated;
grant insert, update, delete on public.seo_settings to authenticated;

insert into public.page_seo (path, label, robots, sitemap_include) values
  ('/',                              'Beranda',                null,                 true),
  ('/program',                       'Program Donasi',          null,                 true),
  ('/artikel',                       'Artikel',                 null,                 true),
  ('/youtube-aksi-baik-alhidayah',   'YouTube Aksi Baik',      null,                 true),
  ('/404',                           '404 — Tidak Ditemukan',   array['noindex'],      false)
on conflict (path) do nothing;

-- ── Extra per-article SEO columns ───────────────────────────────────────────
-- meta_title / meta_description / og_image / focus_keyword already exist.
alter table public.articles
  add column if not exists canonical_url    text,
  add column if not exists robots           text[],
  add column if not exists og_title         text,
  add column if not exists og_description   text,
  add column if not exists twitter_title    text,
  add column if not exists twitter_description text,
  add column if not exists twitter_image    text,
  add column if not exists schema_type      text default 'BlogPosting',
  add column if not exists schema_data      jsonb not null default '{}'::jsonb,
  add column if not exists secondary_keywords text[],
  add column if not exists is_pillar        boolean not null default false,
  add column if not exists sitemap_include  boolean not null default true,
  -- Last computed analyzer score (0-100) so the article list can show it
  -- without re-running the checks server-side.
  add column if not exists seo_score        integer;

do $$ begin
  alter table public.articles
    add constraint articles_schema_type_chk
    check (schema_type is null or schema_type in ('Article','BlogPosting','NewsArticle','FAQPage','HowTo','none'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.articles
    add constraint articles_seo_score_chk
    check (seo_score is null or (seo_score >= 0 and seo_score <= 100));
exception when duplicate_object then null; end $$;

-- `increment_view()` updates articles.view_count. The old generic updated_at
-- trigger treated every view as a content modification, making sitemap lastmod
-- and Article.dateModified change on every visit. Preserve updated_at for pure
-- counter bumps; update it for every real row change.
create or replace function public.set_article_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (to_jsonb(new) - 'view_count' - 'updated_at')
     is distinct from (to_jsonb(old) - 'view_count' - 'updated_at') then
    new.updated_at := now();
  else
    new.updated_at := old.updated_at;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_articles_updated on public.articles;
create trigger trg_articles_updated
  before update on public.articles
  for each row execute function public.set_article_updated_at();

-- Same counter exception for activity logging: views are metrics, not editor
-- actions. Keep create/delete + content updates in the immutable audit trail.
drop trigger if exists trg_articles_audit on public.articles;
create trigger trg_articles_audit_insert_delete
  after insert or delete on public.articles
  for each row execute function public.audit_trigger();
create trigger trg_articles_audit_update
  after update of
    title, slug, excerpt, content, content_html, cover_image, status,
    published_at, author_id, category_id, meta_title, meta_description,
    og_image, reading_time, focus_keyword, cover_ratio, cover_focal,
    cover_size, canonical_url, robots, og_title, og_description,
    twitter_title, twitter_description, twitter_image, schema_type,
    schema_data, secondary_keywords, is_pillar, sitemap_include, seo_score
  on public.articles
  for each row execute function public.audit_trigger();

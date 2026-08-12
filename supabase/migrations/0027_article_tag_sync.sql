-- 0027_article_tag_sync.sql
-- Atomic tag replacement for article saves. The old delete-then-insert pair was
-- two HTTP transactions: an insert failure could leave the article tagless.
-- SECURITY INVOKER keeps the existing article_tags RLS policy as the boundary.

create or replace function public.sync_article_tags(p_article_id uuid, p_tag_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  delete from public.article_tags where article_id = p_article_id;
  insert into public.article_tags (article_id, tag_id)
  select distinct p_article_id, tag_id
  from unnest(coalesce(p_tag_ids, '{}'::uuid[])) as tag_id;
end;
$$;

revoke all on function public.sync_article_tags(uuid, uuid[]) from public;
grant execute on function public.sync_article_tags(uuid, uuid[]) to authenticated;

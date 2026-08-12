-- 0026_seo_smoke_assertions.sql
-- Migration-time assertions: fail the push immediately if a prior SEO migration
-- was edited into an inconsistent state. No persistent DB objects are created.

do $$
begin
  if to_regclass('public.page_seo') is null then
    raise exception 'SEO migration incomplete: public.page_seo missing';
  end if;
  if to_regclass('public.redirections') is null then
    raise exception 'SEO migration incomplete: public.redirections missing';
  end if;
  if to_regclass('public.redirection_404_log') is null then
    raise exception 'SEO migration incomplete: public.redirection_404_log missing';
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'articles' and column_name = 'seo_score'
  ) then
    raise exception 'SEO migration incomplete: articles.seo_score missing';
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'articles' and column_name = 'schema_data'
  ) then
    raise exception 'SEO migration incomplete: articles.schema_data missing';
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'redirection_404_log'
      and policyname = 'redirection_404_admin_read'
  ) then
    raise exception 'SEO migration incomplete: 404 admin RLS missing';
  end if;
end $$;

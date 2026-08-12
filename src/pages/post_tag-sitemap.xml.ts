export const prerender = false;
import type { APIRoute } from 'astro';
import { getSeoSettings, renderUrlset, sitemapResponse, isExcluded } from '@/lib/seo';

interface Row { slug: string; updated_at: string }
const unavailable = () => new Response('Sitemap temporarily unavailable', { status: 503, headers: { 'retry-after': '60' } });

export const GET: APIRoute = async ({ locals }) => {
  const supabase = locals.supabase;
  const settings = await getSeoSettings(supabase);
  if (!settings.sitemap_enabled || !settings.robots_index || settings.robots_global.includes('noindex') || !settings.sitemap_include_tags) {
    return new Response('Not Found', { status: 404 });
  }

  // Only tags attached to sitemap-eligible, indexable articles. Empty/thin tag
  // archives stay out just like Rank Math's noindex-empty-taxonomies rule.
  // ponytail: Data API caps this discovery query at 1,000 articles; move it to
  // an SQL view/RPC when the published corpus reaches that ceiling.
  const { data: articles, error: articleError } = await (supabase as any)
    .from('articles')
    .select('id')
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .eq('sitemap_include', true)
    .or('robots.is.null,robots.not.cs.{noindex}')
    .limit(1000);
  if (articleError) return unavailable();
  const articleIds = ((articles ?? []) as { id: string }[]).map((row) => row.id);
  if (!articleIds.length) return sitemapResponse(renderUrlset([], false));

  const { data: links, error: linksError } = await supabase
    .from('article_tags')
    .select('tag_id')
    .in('article_id', articleIds);
  if (linksError) return unavailable();
  const tagIds = [...new Set((links ?? []).map((row) => row.tag_id))];
  if (!tagIds.length) return sitemapResponse(renderUrlset([], false));

  const { data, error } = await supabase.from('tags').select('slug,updated_at').in('id', tagIds).order('slug');
  if (error) return unavailable();
  const urls = ((data ?? []) as unknown as Row[])
    .filter((tag) => !isExcluded(`/artikel?tag=${tag.slug}`, settings.sitemap_exclude_paths))
    .map((tag) => ({
      loc: `${settings.site_url}/artikel?tag=${encodeURIComponent(tag.slug)}`,
      lastmod: tag.updated_at,
      changefreq: 'weekly',
      priority: 0.4,
    }));
  return sitemapResponse(renderUrlset(urls, false));
};

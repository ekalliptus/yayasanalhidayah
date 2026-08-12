export const prerender = false;
import type { APIRoute } from 'astro';
import { getSeoSettings, renderSitemapIndex, sitemapResponse } from '@/lib/seo';

// Index of every sub-sitemap. Rank Math's URL scheme is kept verbatim so a
// Search Console property migrated from WordPress keeps resolving.
export const GET: APIRoute = async ({ locals }) => {
  const supabase = locals.supabase;
  const settings = await getSeoSettings(supabase);
  if (!settings.sitemap_enabled || !settings.robots_index || settings.robots_global.includes('noindex')) return new Response('Not Found', { status: 404 });

  const site = settings.site_url;
  const entries: { loc: string; lastmod?: string | null }[] = [];

  if (settings.sitemap_include_pages) {
    entries.push({ loc: `${site}/page-sitemap.xml` });
  }

  if (settings.sitemap_include_articles) {
    const { data, count, error } = await (supabase as any)
      .from('articles')
      .select('updated_at', { count: 'exact' })
      .eq('status', 'published')
      .lte('published_at', new Date().toISOString())
      .eq('sitemap_include', true)
      .or('robots.is.null,robots.not.cs.{noindex}')
      .order('updated_at', { ascending: false })
      .limit(1);
    if (error) return new Response('Sitemap temporarily unavailable', { status: 503, headers: { 'retry-after': '60' } });
    const rows = (data ?? []) as { updated_at: string }[];
    if (rows.length) {
      const pages = Math.max(1, Math.ceil((count ?? 0) / settings.sitemap_links_per_page));
      for (let page = 1; page <= pages; page++) {
        entries.push({ loc: `${site}/post-sitemap${page === 1 ? '' : page}.xml`, lastmod: rows[0].updated_at });
      }
    }
  }

  if (settings.sitemap_include_categories) {
    entries.push({ loc: `${site}/category-sitemap.xml` });
  }
  if (settings.sitemap_include_tags) {
    entries.push({ loc: `${site}/post_tag-sitemap.xml` });
  }

  return sitemapResponse(renderSitemapIndex(entries));
};

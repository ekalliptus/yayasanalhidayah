export const prerender = false;
import type { APIRoute } from 'astro';
import { getSeoSettings, renderUrlset, sitemapResponse, isExcluded } from '@/lib/seo';

interface Row { slug: string; updated_at: string }

// Category archives (/artikel?category=slug). Only categories that actually
// have a published article are listed — empty archives are thin content.
export const GET: APIRoute = async ({ locals }) => {
  const supabase = locals.supabase;
  const settings = await getSeoSettings(supabase);
  if (!settings.sitemap_enabled || !settings.robots_index || settings.robots_global.includes('noindex') || !settings.sitemap_include_categories) {
    return new Response('Not Found', { status: 404 });
  }

  // ponytail: taxonomy discovery is capped at 1,000 published articles by the
  // Data API; move this to a grouped SQL view/RPC when the corpus reaches it.
  const { data: used, error: usedError } = await (supabase as any)
    .from('articles')
    .select('category_id')
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .eq('sitemap_include', true)
    .or('robots.is.null,robots.not.cs.{noindex}')
    .not('category_id', 'is', null)
    .limit(1000);
  if (usedError) return new Response('Sitemap temporarily unavailable', { status: 503, headers: { 'retry-after': '60' } });
  const ids = [...new Set(((used ?? []) as { category_id: string }[]).map((r) => r.category_id))];
  if (ids.length === 0) return sitemapResponse(renderUrlset([], false));

  const { data, error } = await supabase
    .from('categories')
    .select('slug,updated_at')
    .in('id', ids)
    .order('slug');

  if (error) return new Response('Sitemap temporarily unavailable', { status: 503, headers: { 'retry-after': '60' } });
  const site = settings.site_url;
  const urls = ((data ?? []) as unknown as Row[])
    .filter((c) => !isExcluded(`/artikel?category=${c.slug}`, settings.sitemap_exclude_paths))
    .map((c) => ({
      loc: `${site}/artikel?category=${encodeURIComponent(c.slug)}`,
      lastmod: c.updated_at,
      changefreq: 'weekly',
      priority: 0.5,
    }));

  return sitemapResponse(renderUrlset(urls, false));
};

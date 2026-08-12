import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import { getSeoSettings } from './settings';
import { renderUrlset, sitemapResponse, extractImages, isExcluded } from './sitemap';

interface Row {
  slug: string; title: string; cover_image: string | null; content_html: string | null;
  published_at: string | null; updated_at: string; robots: string[] | null; sitemap_include: boolean | null;
  canonical_url: string | null;
}

export async function articleSitemapResponse(client: SupabaseClient<Database>, page = 1): Promise<Response> {
  const settings = await getSeoSettings(client);
  if (!settings.sitemap_enabled || !settings.robots_index || settings.robots_global.includes('noindex') || !settings.sitemap_include_articles || page < 1) return new Response('Not Found', { status: 404 });
  const size = settings.sitemap_links_per_page;
  const includeImages = settings.sitemap_include_images && !settings.robots_global.includes('noimageindex');
  const from = (page - 1) * size;
  const { data, error } = await (client as any)
    .from('articles')
    .select('slug,title,cover_image,content_html,published_at,updated_at,robots,sitemap_include,canonical_url')
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .eq('sitemap_include', true)
    .or('robots.is.null,robots.not.cs.{noindex}')
    .order('published_at', { ascending: false })
    .range(from, from + size - 1);

  if (error) return new Response('Sitemap temporarily unavailable', { status: 503, headers: { 'retry-after': '60' } });
  const rows = (data ?? []) as Row[];
  if (!rows.length && page > 1) return new Response('Not Found', { status: 404 });
  const urls = rows
    .filter((a) => !a.canonical_url || sameOrigin(a.canonical_url, settings.site_url))
    .filter((a) => !isExcluded(`/artikel/${a.slug}`, settings.sitemap_exclude_paths))
    .map((a) => ({
      loc: `${settings.site_url}/artikel/${a.slug}`,
      lastmod: a.updated_at ?? a.published_at,
      changefreq: 'weekly', priority: 0.7,
      images: includeImages && !(a.robots ?? []).includes('noimageindex')
        ? [...(a.cover_image ? [{ loc: absoluteImage(a.cover_image, settings.site_url), title: a.title }] : []), ...extractImages(a.content_html, 10, settings.site_url)]
        : [],
    }));
  return sitemapResponse(renderUrlset(urls, includeImages));
}

function sameOrigin(value: string, site: string): boolean {
  try { return new URL(value).origin === new URL(site).origin; }
  catch { return false; }
}

function absoluteImage(value: string, site: string): string {
  return /^https?:\/\//i.test(value) ? value : `${site}${value.startsWith('/') ? '' : '/'}${value}`;
}

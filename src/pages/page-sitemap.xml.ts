export const prerender = false;
import type { APIRoute } from 'astro';
import {
  getSeoSettings, listPageSeo, renderUrlset, sitemapResponse, isExcluded,
} from '@/lib/seo';

function sameOrigin(value: string, site: string): boolean {
  try { return new URL(value).origin === new URL(site).origin; }
  catch { return false; }
}

// Static/marketing routes. The list comes from `page_seo`, which the admin
// screen manages, so adding a route to the sitemap is a CMS action.
export const GET: APIRoute = async ({ locals }) => {
  const supabase = locals.supabase;
  const settings = await getSeoSettings(supabase);
  if (!settings.sitemap_enabled || !settings.robots_index || settings.robots_global.includes('noindex') || !settings.sitemap_include_pages) {
    return new Response('Not Found', { status: 404 });
  }

  const site = settings.site_url;
  const pages = await listPageSeo(supabase);
  const urls = pages
    .filter((p) => p.sitemap_include)
    .filter((p) => !(p.robots ?? []).includes('noindex'))
    .filter((p) => !p.canonical || sameOrigin(p.canonical, site))
    .filter((p) => !isExcluded(p.path, settings.sitemap_exclude_paths))
    .map((p) => ({
      loc: p.path === '/' ? `${site}/` : `${site}${p.path}`,
      lastmod: p.updated_at,
      changefreq: p.sitemap_changefreq,
      // The homepage outranks the rest unless the admin says otherwise.
      priority: p.path === '/' ? Math.max(p.sitemap_priority, 1.0) : p.sitemap_priority,
    }));

  return sitemapResponse(renderUrlset(urls, false));
};

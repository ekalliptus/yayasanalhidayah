export const prerender = false;
import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { getAllPublishedForFeed } from '@/lib/supabase/queries/articles';
import { getSeoSettings } from '@/lib/seo';

export const GET: APIRoute = async ({ locals, site }) => {
  const [articles, settings] = await Promise.all([
    getAllPublishedForFeed(locals.supabase, 50),
    getSeoSettings(locals.supabase),
  ]);
  return rss({
    title: `${settings.site_name} — Artikel`,
    description: settings.site_description,
    site: site?.toString() ?? settings.site_url,
    items: articles.map((a) => ({
      title: a.title,
      description: a.excerpt ?? '',
      link: `/artikel/${a.slug}`,
      pubDate: a.published_at ? new Date(a.published_at) : undefined,
    })),
    customData: '<language>id-ID</language>',
  });
};

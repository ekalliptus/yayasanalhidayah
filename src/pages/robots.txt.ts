export const prerender = false;
import type { APIRoute } from 'astro';
import { getSeoSettings } from '@/lib/seo';

// Dynamic robots.txt (Rank Math's robots.txt editor). "auto" builds a sane
// default from the current settings; "custom" serves the admin's text verbatim
// with the sitemap line appended if they forgot it.
//
// NOTE: this route only wins over public/robots.txt if the static file is
// removed — Cloudflare serves assets before the Worker. See CLAUDE.md.
export const GET: APIRoute = async ({ locals }) => {
  const settings = await getSeoSettings(locals.supabase);
  const sitemapLine = settings.sitemap_enabled
    ? `Sitemap: ${settings.site_url}/sitemap_index.xml`
    : '';

  let body: string;
  if (!settings.robots_index) {
    // The global kill switch is on (staging) — always beat custom text.
    body = 'User-agent: *\nDisallow: /';
  } else if (settings.robots_txt_mode === 'custom' && settings.robots_txt_custom.trim()) {
    body = settings.robots_txt_custom.trim();
    if (sitemapLine && !/^\s*sitemap:/im.test(body)) body += `\n\n${sitemapLine}`;
  } else {
    body = [
      'User-agent: *',
      'Allow: /',
      'Disallow: /admin',
      'Disallow: /api/',
      '',
      sitemapLine,
    ]
      .filter((l) => l !== undefined)
      .join('\n')
      .trim();
  }

  return new Response(body + '\n', {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
    },
  });
};

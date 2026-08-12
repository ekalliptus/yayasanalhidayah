export const prerender = false;
import type { APIRoute } from 'astro';
import { getSeoSettings, isValidIndexNowKey } from '@/lib/seo';

// IndexNow proves domain ownership by fetching /{key}.txt. This dynamic route
// serves only the configured key; every other .txt path remains 404.
export const GET: APIRoute = async ({ params, locals }) => {
  const settings = await getSeoSettings(locals.supabase);
  const requested = params.indexnowKey ?? '';
  if (!settings.indexnow_enabled || !isValidIndexNowKey(settings.indexnow_key) || requested !== settings.indexnow_key) {
    return new Response('Not Found', { status: 404 });
  }
  return new Response(settings.indexnow_key, {
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=86400' },
  });
};

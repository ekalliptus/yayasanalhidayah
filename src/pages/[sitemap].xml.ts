export const prerender = false;
import type { APIRoute } from 'astro';
import { articleSitemapResponse } from '@/lib/seo/article-sitemap';

// Concrete sitemap routes win over this dynamic fallback. It handles Rank
// Math-style pagination: /post-sitemap2.xml, /post-sitemap3.xml, …
export const GET: APIRoute = ({ locals, params }) => {
  const match = /^post-sitemap([2-9]\d*)$/.exec(params.sitemap ?? '');
  if (!match) return new Response('Not Found', { status: 404 });
  return articleSitemapResponse(locals.supabase, Number(match[1]));
};

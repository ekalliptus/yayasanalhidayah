export const prerender = false;
import type { APIRoute } from 'astro';
import { articleSitemapResponse } from '@/lib/seo/article-sitemap';

// Astro accepts embedded dynamic params in endpoint filenames. The generic
// [sitemap].xml.ts fallback covers adapters that route this as a literal name;
// both produce the same response contract.
export const GET: APIRoute = ({ locals, params }) => {
  const page = Number(params.page);
  if (!Number.isInteger(page) || page < 2) return new Response('Not Found', { status: 404 });
  return articleSitemapResponse(locals.supabase, page);
};

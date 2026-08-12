export const prerender = false;
import type { APIRoute } from 'astro';
import { articleSitemapResponse } from '@/lib/seo/article-sitemap';
export const GET: APIRoute = ({ locals }) => articleSitemapResponse(locals.supabase, 1);

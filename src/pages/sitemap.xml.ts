export const prerender = false;
import type { APIRoute } from 'astro';
export const GET: APIRoute = ({ redirect }) => redirect('/sitemap_index.xml', 301);

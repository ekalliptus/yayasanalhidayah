export const prerender = false;
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { badRequest, forbidden, ok, serverError } from '@/lib/api';
import { getSeoSettings, submitIndexNow } from '@/lib/seo';

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user || !['super_admin', 'owner', 'admin', 'editor'].includes(locals.role ?? '')) return forbidden();
  let urls: string[];
  try { urls = z.array(z.string().url().max(2000)).min(1).max(100).parse(((await request.json()) as { urls?: unknown }).urls); }
  catch { return badRequest('Daftar URL tidak valid'); }
  const settings = await getSeoSettings(locals.supabase);
  const result = await submitIndexNow(urls, settings);
  if (!result.ok) return serverError('Pengiriman IndexNow gagal');
  return ok({ submitted: result.submitted });
};

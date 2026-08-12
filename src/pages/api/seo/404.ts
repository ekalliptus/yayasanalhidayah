export const prerender = false;
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { badRequest, forbidden, ok, serverError } from '@/lib/api';

export const DELETE: APIRoute = async ({ request, locals }) => {
  if (!locals.user || !['super_admin', 'owner', 'admin'].includes(locals.role ?? '')) return forbidden();
  let ids: string[];
  try { ids = z.array(z.string().uuid()).min(1).max(500).parse(((await request.json()) as { ids?: unknown }).ids); }
  catch { return badRequest('ID tidak valid'); }
  const { error } = await (locals.supabase as any).from('redirection_404_log').delete().in('id', ids);
  if (error) return serverError('Gagal menghapus log');
  return ok();
};

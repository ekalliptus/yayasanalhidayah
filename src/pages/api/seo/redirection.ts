export const prerender = false;
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { badRequest, forbidden, ok, serverError } from '@/lib/api';
import { invalidateRedirectCache } from '@/lib/seo';

const schema = z.object({
  id: z.string().uuid().nullable().optional(),
  sources: z.array(z.string().trim().min(1).max(300)).min(1).max(20),
  comparison: z.enum(['exact','contains','start','end','regex']),
  ignore_case: z.boolean(),
  destination: z.string().max(2000),
  http_code: z.union([z.literal(301),z.literal(302),z.literal(307),z.literal(410),z.literal(451)]),
  is_active: z.boolean(),
  note: z.string().max(500).default(''),
}).superRefine((value, ctx) => {
  if (![410, 451].includes(value.http_code)) {
    const destination = value.destination.trim();
    if (!destination) ctx.addIssue({ code: 'custom', path: ['destination'], message: 'Tujuan wajib diisi' });
    else if (/\p{Cc}/u.test(destination)) ctx.addIssue({ code: 'custom', path: ['destination'], message: 'Tujuan mengandung karakter kontrol' });
    else if (!destination.startsWith('/') && !/^https?:\/\//i.test(destination)) {
      ctx.addIssue({ code: 'custom', path: ['destination'], message: 'Tujuan harus path lokal atau URL HTTP(S)' });
    }
  }
  if (value.comparison !== 'regex' && value.sources.some((source) => !source.startsWith('/'))) {
    ctx.addIssue({ code: 'custom', path: ['sources'], message: 'Sumber URL harus diawali /' });
  }
  if (value.comparison === 'regex') {
    for (const source of value.sources) {
      if (source.length > 200) ctx.addIssue({ code: 'custom', path: ['sources'], message: 'Regex maksimal 200 karakter' });
      // Reject nested/repeated wildcards — the common catastrophic-backtracking
      // shapes. This is intentionally conservative for URL matching.
      else if (/\([^)]*[+*][^)]*\)[+*{]|\.\*[+*{]|\.\+[+*{]/.test(source)) {
        ctx.addIssue({ code: 'custom', path: ['sources'], message: 'Regex berisiko lambat; sederhanakan pengulangan' });
      } else try { new RegExp(source); } catch { ctx.addIssue({ code: 'custom', path: ['sources'], message: `Regex tidak valid: ${source}` }); }
    }
  }
});

function admin(locals: App.Locals): boolean {
  return Boolean(locals.user && ['super_admin', 'owner', 'admin'].includes(locals.role ?? ''));
}

export const POST: APIRoute = async ({ request, locals }) => {
  if (!admin(locals)) return forbidden();
  let payload: z.infer<typeof schema>;
  try { payload = schema.parse(await request.json()); }
  catch (e) { return badRequest(e instanceof z.ZodError ? e.issues[0]?.message ?? 'Data tidak valid' : 'Body tidak valid'); }
  const { id, ...row } = payload;
  const db = locals.supabase as any; // generated types update after migration push
  const query = id
    ? db.from('redirections').update(row).eq('id', id).select('*').single()
    : db.from('redirections').insert(row).select('*').single();
  const { data, error } = await query;
  if (error || !data) return serverError('Gagal menyimpan redirect');
  invalidateRedirectCache();
  return ok({ redirection: data });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  if (!admin(locals)) return forbidden();
  let id = '';
  try { id = z.string().uuid().parse(((await request.json()) as { id?: unknown }).id); }
  catch { return badRequest('ID tidak valid'); }
  const { error } = await (locals.supabase as any).from('redirections').delete().eq('id', id);
  if (error) return serverError('Gagal menghapus redirect');
  invalidateRedirectCache();
  return ok();
};

export const prerender = false;
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { ok, badRequest, forbidden, serverError } from '@/lib/api';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { recordActivity } from '@/lib/activity';
import { workerEnv } from '@/lib/supabase/runtime-env';

const schema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(['admin', 'editor']),
});

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user || (locals.role !== 'super_admin' && locals.role !== 'owner' && locals.role !== 'admin')) return forbidden();

  let payload: z.infer<typeof schema>;
  try { payload = schema.parse(await request.json()); }
  catch (e) { return badRequest(e instanceof z.ZodError ? e.issues[0]?.message ?? 'Invalid' : 'Invalid body'); }

  const runtimeEnv = workerEnv();
  const admin = createSupabaseAdmin(runtimeEnv);

  // Prevent demoting the owner.
  const { data: target } = await admin
    .from('profiles')
    .select('role')
    .eq('id', payload.user_id)
    .single<{ role: string }>();
  if (target?.role === 'super_admin') return forbidden('Tidak bisa mengubah role super admin');
  // Only super_admin can change the owner's role.
  if (target?.role === 'owner' && locals.role !== 'super_admin') return forbidden('Tidak bisa mengubah role owner');

  // Privilege-multiplication: only owner/super_admin can promote to admin.
  if (payload.role === 'admin' && locals.role !== 'owner' && locals.role !== 'super_admin') {
    return forbidden('Hanya owner yang bisa mempromosikan ke admin');
  }

  // Last-admin guard: ensure at least one admin/owner remains after demotion.
  const isDemotion = target?.role === 'admin' || target?.role === 'owner';
  if (isDemotion && payload.role === 'editor') {
    const { count } = await admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .in('role', ['super_admin', 'admin', 'owner']);
    if ((count ?? 0) <= 1) {
      return forbidden('Tidak bisa mendemote admin terakhir — minimal 1 admin/owner harus ada');
    }
  }

  const { error } = await admin.from('profiles').update({ role: payload.role } as never).eq('id', payload.user_id);
  if (error) return serverError(error.message);

  await recordActivity(locals.supabase, {
    action: 'update',
    entityType: 'profiles',
    entityId: payload.user_id,
    summary: `mengubah role ke ${payload.role}`,
  });

  return ok();
};

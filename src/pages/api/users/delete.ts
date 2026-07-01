export const prerender = false;
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { ok, badRequest, forbidden, serverError } from '@/lib/api';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { recordActivity } from '@/lib/activity';
import { workerEnv } from '@/lib/supabase/runtime-env';

const schema = z.object({ user_id: z.string().uuid() });

// Delete a user. Privilege model mirrors update-role:
//   - Owner can delete anyone except themselves (and never the owner).
//   - Admin can delete editors only (not admins, not owner).
//   - No one can delete the owner or their own account here.
export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user || (locals.role !== 'owner' && locals.role !== 'admin')) return forbidden();

  let payload: z.infer<typeof schema>;
  try { payload = schema.parse(await request.json()); }
  catch (e) { return badRequest(e instanceof z.ZodError ? e.issues[0]?.message ?? 'Invalid' : 'Invalid body'); }

  if (payload.user_id === locals.user.id) {
    return forbidden('Tidak bisa menghapus akun sendiri');
  }

  const admin = createSupabaseAdmin(workerEnv());

  const { data: target } = await admin
    .from('profiles')
    .select('role')
    .eq('id', payload.user_id)
    .single<{ role: string }>();
  if (!target) return badRequest('User tidak ditemukan');
  if (target.role === 'owner') return forbidden('Tidak bisa menghapus owner');
  if (target.role === 'admin' && locals.role !== 'owner') {
    return forbidden('Hanya owner yang bisa menghapus admin');
  }

  // Deleting the auth user cascades to the profile (FK on delete cascade).
  const { error } = await admin.auth.admin.deleteUser(payload.user_id);
  if (error) return serverError(error.message);

  await recordActivity(locals.supabase, {
    action: 'delete',
    entityType: 'profiles',
    entityId: payload.user_id,
    summary: 'menghapus user',
  });

  return ok();
};

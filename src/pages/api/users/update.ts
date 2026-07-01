export const prerender = false;
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { ok, badRequest, forbidden, serverError } from '@/lib/api';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { recordActivity } from '@/lib/activity';
import { workerEnv } from '@/lib/supabase/runtime-env';

const schema = z.object({
  user_id: z.string().uuid(),
  full_name: z.string().max(120).optional(),
  // Manual activation: confirm the email so the user can log in immediately.
  activate: z.boolean().optional(),
});

// Edit a user's profile (full name) and/or manually activate their account.
// Owner/admin only. Owner can edit anyone; admin cannot edit the owner.
export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user || (locals.role !== 'owner' && locals.role !== 'admin')) return forbidden();

  let payload: z.infer<typeof schema>;
  try { payload = schema.parse(await request.json()); }
  catch (e) { return badRequest(e instanceof z.ZodError ? e.issues[0]?.message ?? 'Invalid' : 'Invalid body'); }

  const admin = createSupabaseAdmin(workerEnv());

  const { data: target } = await admin
    .from('profiles')
    .select('role')
    .eq('id', payload.user_id)
    .single<{ role: string }>();
  if (!target) return badRequest('User tidak ditemukan');
  if (target.role === 'owner' && locals.user.id !== payload.user_id) {
    return forbidden('Tidak bisa mengubah owner');
  }

  // Update full name in profiles.
  if (payload.full_name !== undefined) {
    const { error } = await admin
      .from('profiles')
      .update({ full_name: payload.full_name } as never)
      .eq('id', payload.user_id);
    if (error) return serverError(error.message);
  }

  // Manual activation: mark the email confirmed via the admin API.
  if (payload.activate) {
    const { error } = await admin.auth.admin.updateUserById(payload.user_id, {
      email_confirm: true,
    });
    if (error) return serverError(error.message);
  }

  await recordActivity(locals.supabase, {
    action: 'update',
    entityType: 'profiles',
    entityId: payload.user_id,
    summary: payload.activate ? 'mengaktifkan & memperbarui user' : 'memperbarui data user',
  });

  return ok();
};

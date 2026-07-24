export const prerender = false;
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { ok, badRequest, forbidden, serverError } from '@/lib/api';
import { passwordStrengthError } from '@/lib/security';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { recordActivity } from '@/lib/activity';
import { workerEnv } from '@/lib/supabase/runtime-env';

const schema = z.object({
  user_id: z.string().uuid(),
  new_password: z.string().min(8),
});

// Reset a user's password directly (no email link). Allowed:
//   - Owner can reset anyone
//   - Admin can reset themselves, other admins, or editors (NOT owner)
//   - Editor cannot use this endpoint
// Mirrors the privilege model used by update-role / create.
export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user || (locals.role !== 'super_admin' && locals.role !== 'owner' && locals.role !== 'admin')) return forbidden();

  let payload: z.infer<typeof schema>;
  try { payload = schema.parse(await request.json()); }
  catch (e) { return badRequest(e instanceof z.ZodError ? e.issues[0]?.message ?? 'Invalid' : 'Invalid body'); }

  const pwErr = passwordStrengthError(payload.new_password);
  if (pwErr) return badRequest(pwErr);

  const runtimeEnv = workerEnv();
  const admin = createSupabaseAdmin(runtimeEnv);

  // Look up target role to enforce the owner-protection + admin-scope rules.
  const { data: target } = await admin
    .from('profiles')
    .select('role, email')
    .eq('id', payload.user_id)
    .single<{ role: string; email: string }>();
  if (!target) return badRequest('User tidak ditemukan');

  if (target.role === 'super_admin') {
    return forbidden('Tidak bisa mereset kata sandi super admin');
  }
  if (target.role === 'owner' && locals.role !== 'super_admin') {
    return forbidden('Tidak bisa mereset kata sandi owner — minta owner yang melakukannya');
  }

  if (locals.role === 'admin' && target.role === 'admin') {
    // Admin can reset other admins — mirrors the update-role privilege level.
  }

  const { error } = await admin.auth.admin.updateUserById(payload.user_id, {
    password: payload.new_password,
  });
  if (error) return serverError(error.message);

  await recordActivity(locals.supabase, {
    action: 'update',
    entityType: 'profiles',
    entityId: payload.user_id,
    summary: `mereset kata sandi ${target.email}`,
  });

  return ok();
};

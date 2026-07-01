export const prerender = false;
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { ok, badRequest, forbidden, serverError } from '@/lib/api';
import { passwordStrengthError } from '@/lib/security';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { recordActivity } from '@/lib/activity';
import { workerEnv } from '@/lib/supabase/runtime-env';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().max(120).optional().default(''),
  role: z.enum(['admin', 'editor']).default('editor'),
});

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user || (locals.role !== 'owner' && locals.role !== 'admin')) return forbidden();

  let payload: z.infer<typeof schema>;
  try { payload = schema.parse(await request.json()); }
  catch (e) { return badRequest(e instanceof z.ZodError ? e.issues[0]?.message ?? 'Invalid' : 'Invalid body'); }

  const pwErr = passwordStrengthError(payload.password);
  if (pwErr) return badRequest(pwErr);

  // Privilege-multiplication guard: only owner can create admin.
  if (payload.role === 'admin' && locals.role !== 'owner') {
    return forbidden('Hanya owner yang bisa membuat user admin');
  }

  const runtimeEnv = workerEnv();
  const admin = createSupabaseAdmin(runtimeEnv);

  // Auto-confirm: admin-provisioned accounts are trusted (the admin sets the
  // password and shares it directly). Without this the user would be stuck —
  // they can't log in until email is confirmed, and no SMTP is configured to
  // deliver a confirmation link. `email_confirm: true` activates immediately.
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: payload.email,
    password: payload.password,
    email_confirm: true,
    user_metadata: { full_name: payload.full_name },
  });
  if (authError) {
    if (authError.message.toLowerCase().includes('already')) {
      return badRequest('Email sudah terdaftar');
    }
    return serverError(authError.message);
  }
  const userId = authData.user.id;

  await admin.from('profiles').update({
    role: payload.role,
    full_name: payload.full_name,
  } as never).eq('id', userId);

  await recordActivity(locals.supabase, {
    action: 'create',
    entityType: 'profiles',
    entityId: userId,
    summary: `menambah user ${payload.email} (${payload.role})`,
  });

  return ok({
    user: {
      id: userId,
      email: payload.email,
      full_name: payload.full_name,
      role: payload.role,
      created_at: authData.user.created_at,
    },
  });
};

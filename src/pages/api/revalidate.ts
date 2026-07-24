export const prerender = false;
import type { APIRoute } from 'astro';
import { ok, forbidden, serverError, badRequest } from '@/lib/api';
import { resolveEnv } from '@/lib/supabase/env';
import { recordActivity } from '@/lib/activity';
import { workerEnv } from '@/lib/supabase/runtime-env';

// Triggers a Cloudflare deploy hook to rebuild the static marketing pages after
// a CMS edit. Owner/admin only. Records the action in the activity log.
export const POST: APIRoute = async ({ locals }) => {
  if (!locals.user || (locals.role !== 'super_admin' && locals.role !== 'owner' && locals.role !== 'admin')) {
    return forbidden();
  }
  const env = resolveEnv(workerEnv());
  if (!env.CF_DEPLOY_HOOK_URL) {
    return badRequest('CF_DEPLOY_HOOK_URL belum dikonfigurasi');
  }

  try {
    const res = await fetch(env.CF_DEPLOY_HOOK_URL, { method: 'POST' });
    if (!res.ok) return serverError(`Deploy hook gagal (${res.status})`);
    await recordActivity(locals.supabase, {
      action: 'site_rebuild',
      entityType: 'system',
      summary: 'memicu build ulang situs',
    });
    return ok();
  } catch (e) {
    return serverError(e instanceof Error ? e.message : 'Deploy hook error');
  }
};

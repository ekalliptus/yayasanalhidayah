// Standalone keep-alive Worker for yayasanalhidayah.
//
// The main site runs on @astrojs/cloudflare v13, which has no worker.ts /
// scheduled() handler — so the daily Supabase keep-alive lives in this separate
// tiny Worker instead. On its Cron Trigger it GETs the site's /api/heartbeat
// (GET so Astro's security.checkOrigin doesn't 403 it), which runs the
// heartbeat() RPC and resets Supabase's ~7-day free-tier inactivity pause.
//
// Secret required: CRON_SECRET (must equal the main Worker's CRON_SECRET).
//   bunx wrangler secret put CRON_SECRET --config cron-keepalive/wrangler.jsonc

const HEARTBEAT_URL = 'https://yayasanalhidayah.com/api/heartbeat';

export default {
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(ping(env));
  },
  // Manual trigger for testing: GET this Worker's URL. No secret is exposed —
  // it only reports whether the upstream heartbeat succeeded.
  async fetch(_request, env, ctx) {
    const res = await ping(env);
    return new Response(JSON.stringify(res), {
      status: res.ok ? 200 : 502,
      headers: { 'content-type': 'application/json' },
    });
  },
};

async function ping(env) {
  try {
    const res = await fetch(HEARTBEAT_URL, {
      method: 'GET',
      headers: { 'x-cron-secret': env.CRON_SECRET ?? '' },
    });
    const body = await res.text();
    if (!res.ok) console.error(`[keepalive] HTTP ${res.status}: ${body}`);
    return { ok: res.ok, status: res.status };
  } catch (err) {
    console.error('[keepalive] fetch failed', err);
    return { ok: false, error: String(err) };
  }
}

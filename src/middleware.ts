import { defineMiddleware } from 'astro:middleware';
import { createSupabaseServer } from '@/lib/supabase/server';
import { publicEnv } from '@/lib/supabase/env';
import type { Role } from '@/lib/supabase/types';
import { workerEnv } from '@/lib/supabase/runtime-env';
import { matchRedirect, bumpRedirectHit, log404 } from '@/lib/seo/redirects';

const ADMIN_ONLY_PREFIXES = ['/admin/settings', '/admin/users', '/admin/activity', '/admin/submissions', '/admin/seo'];

/** Security headers applied to admin HTML responses. */
function applySecurityHeaders(response: Response, path: string): Response {
  if (path.startsWith('/admin')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'no-referrer');
  }
  return response;
}

// Marketing routes served as SSR with a short edge cache so edits appear
// within ~1 minute without a manual rebuild, while TTFB stays fast.
const MARKETING_CACHE = ['/', '/program', '/youtube-aksi-baik-alhidayah', '/404'];

// SEO endpoints that need locals.supabase (sitemaps, robots.txt, llms.txt).
const SEO_ENDPOINTS = new Set([
  '/robots.txt', '/llms.txt', '/sitemap_index.xml', '/sitemap.xml',
  '/post-sitemap.xml', '/page-sitemap.xml',
  '/category-sitemap.xml', '/post_tag-sitemap.xml',
]);

export const onRequest = defineMiddleware(async (context, next) => {
  const { cookies, locals, url, redirect, request } = context;
  const runtimeEnv = workerEnv();

  const path = url.pathname;
  const needsAuth = path.startsWith('/admin') && path !== '/admin/login';
  const isLogin = path === '/admin/login';
  const isApi = path.startsWith('/api/');
  // SSR scope: admin, api, blog, feeds, SEO endpoints, AND marketing.
  const isMarketing = MARKETING_CACHE.includes(path);
  const isIndexNowKey = /^\/[a-f0-9]{8,128}\.txt$/i.test(path);
  const isPagedSitemap = /^\/post-sitemap\d+\.xml$/.test(path);
  const isSsr = needsAuth || isLogin || isApi || isMarketing || SEO_ENDPOINTS.has(path) || isIndexNowKey || isPagedSitemap
    || path.startsWith('/artikel') || path.startsWith('/rss');

  const { url: supaUrl, anonKey } = publicEnv(runtimeEnv);
  if (!supaUrl || !anonKey) {
    const response = await next();
    return applySecurityHeaders(response, path);
  }

  const supabase = createSupabaseServer(cookies, runtimeEnv, request.headers.get('cookie'));

  // ── Redirections (Rank Math port) ─────────────────────────────────────────
  // Runs before routing so a rule can shadow a live URL, exactly like the
  // WordPress module. /admin and /api are never redirected: a stray rule must
  // not be able to lock the dashboard out.
  //
  // Static assets are served by Cloudflare before the Worker runs, so in
  // practice this sees SSR routes and unmatched (would-be-404) paths — which is
  // where redirects matter.
  if (!path.startsWith('/admin') && !isApi) {
    const hit = await matchRedirect(supabase, path + (url.search || ''));
    if (hit) {
      if (hit.status === 410 || hit.status === 451) {
        await bumpRedirectHit(supabase, hit.id);
        return new Response(hit.status === 410 ? 'Gone' : 'Unavailable For Legal Reasons', {
          status: hit.status,
          headers: { 'content-type': 'text/plain; charset=utf-8' },
        });
      }
      // Collapse protocol-relative destinations ("//evil.com") to a local path
      // so a mistyped rule can never become an open redirect.
      let location = hit.location.startsWith('//')
        ? `/${hit.location.replace(/^\/+/, '')}`
        : hit.location;
      if (/^https?:\/\//i.test(location)) {
        try {
          const target = new URL(location);
          // External redirects are valid, but only HTTP(S) survived API validation.
          location = target.href;
        } catch { location = ''; }
      } else if (!location.startsWith('/')) {
        location = `/${location}`;
      }
      if (location) {
        try {
          const target = new URL(location, url.origin);
          if (target.origin === url.origin && target.pathname === url.pathname && target.search === url.search) {
            location = ''; // fragment-only/self redirect loop
          }
        } catch { location = ''; }
      }
      if (location) {
        await bumpRedirectHit(supabase, hit.id);
        return new Response(null, { status: hit.status, headers: { location } });
      }
    }
  }

  if (!isSsr) {
    const response = await next();
    if (response.status === 404) await logMiss(supabase, url, request);
    return applySecurityHeaders(response, path);
  }

  locals.supabase = supabase;
  locals.user = null;
  locals.role = null;

  if (needsAuth || isLogin || isApi) {
    const { data: { user } } = await supabase.auth.getUser();
    locals.user = user ?? null;
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single<{ role: Role }>();
      locals.role = profile?.role ?? null;
    }
  }

  if (needsAuth && !locals.user) {
    // Open-redirect guard: include search string, drop any protocol-relative
    // path the browser might try to interpret as off-site.
    const nextPath = url.pathname + url.search;
    return redirect(`/admin/login?next=${encodeURIComponent(nextPath)}`);
  }
  if (needsAuth && ADMIN_ONLY_PREFIXES.some((p) => path.startsWith(p))) {
    if (locals.role !== 'super_admin' && locals.role !== 'owner' && locals.role !== 'admin') {
      return redirect('/admin?error=forbidden');
    }
  }
  if (isLogin && locals.user) {
    return redirect('/admin');
  }

  const response = await next();

  // 404 monitor — public routes only; admin/API noise is not actionable.
  if (
    response.status === 404 && path !== '/404' && !path.startsWith('/admin') && !isApi &&
    !SEO_ENDPOINTS.has(path) && !isIndexNowKey && !isPagedSitemap
  ) {
    await logMiss(supabase, url, request);
  }

  // Edge cache for marketing: short s-maxage so edits appear within ~1 min
  // without a rebuild, stale-while-revalidate keeps TTFB fast.
  if (isMarketing) {
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  }
  return applySecurityHeaders(response, path);
});

async function logMiss(
  supabase: ReturnType<typeof createSupabaseServer>,
  url: URL,
  request: Request,
): Promise<void> {
  await log404(
    supabase,
    url.pathname + (url.search || ''),
    request.headers.get('referer') ?? '',
    request.headers.get('user-agent') ?? '',
  );
}

export const prerender = false;
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { badRequest, forbidden, ok, serverError } from '@/lib/api';
import { getSeoSettings, invalidatePageSeoCache, ROBOTS_TOKENS } from '@/lib/seo';
import { recordActivity } from '@/lib/activity';

const robots = ROBOTS_TOKENS.map((r) => r.value) as [string, ...string[]];
const CORE_PATHS = new Set(['/', '/program', '/artikel', '/youtube-aksi-baik-alhidayah', '/404']);
const schema = z.object({
  original_path: z.string().trim().max(300).regex(/^\/(?!\/)[^?#\s]*$/).nullable().optional(),
  path: z.string().trim().max(300).regex(/^\/(?!\/)[^?#\s]*$/, 'Path harus lokal, tanpa query/hash/spasi'),
  label: z.string().max(100).default(''),
  title: z.string().max(300).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  canonical: z.string().url().max(2000).refine((v) => /^https?:\/\//i.test(v), 'Canonical harus URL HTTP(S)').nullable().optional().or(z.literal('').transform(() => null)),
  robots: z.array(z.enum(robots)).max(6).nullable().optional(),
  og_title: z.string().max(300).nullable().optional(),
  og_description: z.string().max(500).nullable().optional(),
  og_image: z.string().url().max(2000).refine((v) => /^https?:\/\//i.test(v), 'Gambar harus URL HTTP(S)').nullable().optional().or(z.literal('').transform(() => null)),
  twitter_title: z.string().max(300).nullable().optional(),
  twitter_description: z.string().max(500).nullable().optional(),
  twitter_image: z.string().url().max(2000).refine((v) => /^https?:\/\//i.test(v), 'Gambar harus URL HTTP(S)').nullable().optional().or(z.literal('').transform(() => null)),
  schema_type: z.enum(['WebPage','AboutPage','ContactPage','CollectionPage','none']),
  sitemap_include: z.boolean(),
  sitemap_priority: z.number().min(0).max(1),
  sitemap_changefreq: z.enum(['always','hourly','daily','weekly','monthly','yearly','never']),
});

function admin(locals: App.Locals): boolean {
  return Boolean(locals.user && ['super_admin', 'owner', 'admin'].includes(locals.role ?? ''));
}

export const POST: APIRoute = async ({ request, locals }) => {
  if (!admin(locals)) return forbidden();
  let payload: z.infer<typeof schema>;
  try { payload = schema.parse(await request.json()); }
  catch (e) { return badRequest(e instanceof z.ZodError ? e.issues[0]?.message ?? 'Data tidak valid' : 'Body tidak valid'); }
  try {
    const { original_path, ...input } = payload;
    const settings = await getSeoSettings(locals.supabase);
    const canonicalIsLocal = !payload.canonical || new URL(payload.canonical).origin === new URL(settings.site_url).origin;
    const row = {
      ...input,
      title: payload.title?.trim() || null,
      description: payload.description?.trim() || null,
      og_title: payload.og_title?.trim() || null,
      og_description: payload.og_description?.trim() || null,
      twitter_title: payload.twitter_title?.trim() || null,
      twitter_description: payload.twitter_description?.trim() || null,
      sitemap_include: payload.sitemap_include && canonicalIsLocal,
    };
    if (original_path && CORE_PATHS.has(original_path) && original_path !== payload.path) {
      return badRequest('Path halaman inti tidak dapat diubah');
    }
    const db = locals.supabase as any;
    const query = original_path
      ? db.from('page_seo').update(row).eq('path', original_path).select('*').single()
      : db.from('page_seo').insert(row).select('*').single();
    const { data, error } = await query;
    if (error || !data) return serverError(error?.code === '23505' ? 'Path sudah terdaftar' : 'Gagal menyimpan SEO halaman');
    await recordActivity(locals.supabase, { action: original_path ? 'update' : 'create', entityType: 'page_seo', summary: `memperbarui SEO ${payload.path}` });
    invalidatePageSeoCache();
    return ok({ page: data });
  } catch { return serverError('Gagal menyimpan SEO halaman'); }
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  if (!admin(locals)) return forbidden();
  let path: string;
  try { path = z.string().regex(/^\/(?!\/)[^?#\s]*$/).parse(((await request.json()) as { path?: unknown }).path); }
  catch { return badRequest('Path tidak valid'); }
  if (CORE_PATHS.has(path)) return badRequest('Halaman inti tidak dapat dihapus; nonaktifkan sitemap bila perlu');
  const { error } = await (locals.supabase as any).from('page_seo').delete().eq('path', path);
  if (error) return serverError('Gagal menghapus SEO halaman');
  await recordActivity(locals.supabase, { action: 'delete', entityType: 'page_seo', summary: `menghapus SEO ${path}` });
  invalidatePageSeoCache();
  return ok();
};

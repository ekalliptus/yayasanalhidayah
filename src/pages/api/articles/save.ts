export const prerender = false;
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { ok, badRequest, forbidden, serverError, json } from '@/lib/api';
import { sanitizeArticleHtml } from '@/lib/sanitize';
import { recordActivity } from '@/lib/activity';
import { toSlug } from '@/lib/slug';
import readingTime from 'reading-time';
import { applyImageSeo, getSeoSettings, submitIndexNow } from '@/lib/seo';
import { runSeoChecks } from '@/components/admin/articles/seo-checks';

// Hard payload limits to prevent abuse / OOM.
const MAX_TITLE = 300;
const MAX_SLUG = 200;
const MAX_EXCERPT = 600;
const MAX_META_TITLE = 200;
const MAX_META_DESC = 500;
const MAX_CONTENT_HTML = 500_000; // ~500KB
const MAX_URL = 2000;

const schema = z.object({
  id: z.string().uuid().nullable().optional(),
  title: z.string().min(1, 'Judul wajib diisi').max(MAX_TITLE),
  slug: z.string().min(1).max(MAX_SLUG),
  excerpt: z.string().max(MAX_EXCERPT).nullable().optional(),
  content: z.any().nullable().optional(),
  content_html: z.string().max(MAX_CONTENT_HTML).default(''),
  plain_text: z.string().max(MAX_CONTENT_HTML).default(''),
  cover_image: z.string().url().max(MAX_URL).refine((v) => /^https?:\/\//i.test(v), 'Sampul harus URL HTTP(S)').nullable().optional()
    .or(z.literal('').transform(() => null)),
  cover_ratio: z.enum(['16:9', '4:3', '1:1', 'original']).nullable().optional(),
  cover_focal: z.string().regex(/^(100|\d{1,2}),(100|\d{1,2})$/, 'Titik fokus tidak valid').nullable().optional(),
  cover_size: z.enum(['full', 'medium', 'small']).nullable().optional(),
  status: z.enum(['draft', 'published', 'scheduled', 'archived']),
  published_at: z.string().refine((value) => !Number.isNaN(new Date(value).getTime()), 'Tanggal terbit tidak valid').nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  meta_title: z.string().max(MAX_META_TITLE).nullable().optional(),
  meta_description: z.string().max(MAX_META_DESC).nullable().optional(),
  focus_keyword: z.string().max(MAX_META_TITLE).nullable().optional(),
  secondary_keywords: z.array(z.string().trim().min(1).max(MAX_META_TITLE)).max(10).default([]).transform((keywords) => [...new Set(keywords)]),
  canonical_url: z.string().url().max(MAX_URL).refine((v) => /^https?:\/\//i.test(v), 'Canonical harus URL HTTP(S)').nullable().optional()
    .or(z.literal('').transform(() => null)),
  robots: z.array(z.enum(['index','noindex','nofollow','noarchive','nosnippet','noimageindex'])).max(6).nullable().optional(),
  og_title: z.string().max(MAX_META_TITLE).nullable().optional(),
  og_description: z.string().max(MAX_META_DESC).nullable().optional(),
  og_image: z.string().url().max(MAX_URL).refine((v) => /^https?:\/\//i.test(v), 'Gambar harus URL HTTP(S)').nullable().optional()
    .or(z.literal('').transform(() => null)),
  twitter_title: z.string().max(MAX_META_TITLE).nullable().optional(),
  twitter_description: z.string().max(MAX_META_DESC).nullable().optional(),
  twitter_image: z.string().url().max(MAX_URL).refine((v) => /^https?:\/\//i.test(v), 'Gambar harus URL HTTP(S)').nullable().optional()
    .or(z.literal('').transform(() => null)),
  schema_type: z.enum(['Article','BlogPosting','NewsArticle','FAQPage','HowTo','none']).default('BlogPosting'),
  schema_data: z.record(z.string(), z.unknown()).default({}).refine((value) => JSON.stringify(value).length <= 20_000, 'Schema data terlalu besar'),
  is_pillar: z.boolean().default(false),
  sitemap_include: z.boolean().default(true),
  // Accepted for backward-compatible clients but never trusted; recomputed server-side below.
  seo_score: z.number().int().min(0).max(100).nullable().optional(),
  tag_ids: z.array(z.string().uuid()).max(50).default([]),
}).superRefine((value, ctx) => {
  if (value.schema_type === 'FAQPage') {
    const faqs = (value.schema_data as { faqs?: unknown }).faqs;
    if (!Array.isArray(faqs) || faqs.length < 1 || faqs.length > 50) {
      ctx.addIssue({ code: 'custom', path: ['schema_data'], message: 'FAQ wajib berisi 1–50 pertanyaan' });
    } else {
      for (const item of faqs) {
        if (!item || typeof item !== 'object') { ctx.addIssue({ code: 'custom', path: ['schema_data'], message: 'Format FAQ tidak valid' }); break; }
        const row = item as Record<string, unknown>;
        if (typeof row.question !== 'string' || !row.question.trim() || row.question.length > 300 || typeof row.answer !== 'string' || !row.answer.trim() || row.answer.length > 5000) {
          ctx.addIssue({ code: 'custom', path: ['schema_data'], message: 'Pertanyaan/jawaban FAQ tidak valid' }); break;
        }
      }
    }
  }
  if (value.schema_type === 'HowTo') {
    const data = value.schema_data as { name?: unknown; steps?: unknown };
    if (typeof data.name !== 'string' || !data.name.trim() || data.name.length > 300 || !Array.isArray(data.steps) || data.steps.length < 1 || data.steps.length > 50 || data.steps.some((step) => typeof step !== 'string' || !step.trim() || step.length > 5000)) {
      ctx.addIssue({ code: 'custom', path: ['schema_data'], message: 'HowTo wajib punya nama dan 1–50 langkah' });
    }
  }
});

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user || !locals.role) return forbidden();
  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > 1_100_000) return badRequest('Artikel terlalu besar');

  let payload: z.infer<typeof schema>;
  try {
    const text = await request.text();
    if (text.length > 1_100_000) return badRequest('Artikel terlalu besar');
    payload = schema.parse(JSON.parse(text));
  } catch (e) {
    return badRequest(e instanceof z.ZodError ? e.issues[0]?.message ?? 'Data tidak valid' : 'Body tidak valid');
  }

  const supabase = locals.supabase;
  const slug = toSlug(payload.slug || payload.title);
  const cleanHtml = sanitizeArticleHtml(payload.content_html || '');
  const seoSettings = await getSeoSettings(supabase);
  // Image SEO fills only missing alt/title values after sanitization. Existing
  // editor-authored attributes always win.
  const optimizedHtml = applyImageSeo(cleanHtml, seoSettings, {
    title: payload.title,
    excerpt: payload.excerpt ?? '',
    focusKeyword: payload.focus_keyword ?? '',
  });
  const minutes = Math.max(1, Math.round(readingTime(payload.plain_text || '').minutes));
  const canonicalIsLocal = !payload.canonical_url || new URL(payload.canonical_url).origin === new URL(seoSettings.site_url).origin;
  const { data: keywordRows } = await supabase
    .from('articles')
    .select('focus_keyword')
    .not('focus_keyword', 'is', null)
    .neq('id', payload.id ?? '00000000-0000-0000-0000-000000000000');
  const usedFocusKeywords = ((keywordRows ?? []) as { focus_keyword: string | null }[])
    .map((row) => row.focus_keyword)
    .filter((value): value is string => Boolean(value));
  const seoScore = runSeoChecks({
    focusKeyword: payload.focus_keyword ?? '',
    title: payload.title,
    slug,
    metaTitle: payload.meta_title ?? '',
    metaDesc: payload.meta_description ?? '',
    excerpt: payload.excerpt ?? '',
    text: payload.plain_text,
    html: optimizedHtml,
    hasCover: Boolean(payload.cover_image),
    usedFocusKeywords,
  }).percentage;

  // Publishing requires a published_at; default to now if missing.
  let publishedAt = payload.published_at ?? null;
  if ((payload.status === 'published' || payload.status === 'scheduled') && !publishedAt) {
    publishedAt = new Date().toISOString();
  }

  // Guard: if the editor didn't produce HTML (e.g. onCreate didn't fire) but
  // content JSON exists, don't overwrite existing content_html with empty string.
  const hasContent = payload.content && typeof payload.content === 'object';
  const htmlToSave = optimizedHtml || (hasContent ? undefined : '');

  const row: Record<string, unknown> = {
    title: payload.title,
    slug,
    excerpt: payload.excerpt ?? null,
    content: payload.content ?? null,
    ...(htmlToSave !== undefined && { content_html: htmlToSave }),
    cover_image: payload.cover_image ?? null,
    cover_ratio: payload.cover_ratio ?? null,
    cover_focal: payload.cover_focal ?? null,
    cover_size: payload.cover_size ?? null,
    status: payload.status,
    published_at: publishedAt,
    category_id: payload.category_id ?? null,
    meta_title: payload.meta_title ?? null,
    meta_description: payload.meta_description ?? null,
    focus_keyword: payload.focus_keyword ?? null,
    secondary_keywords: payload.secondary_keywords,
    canonical_url: payload.canonical_url ?? null,
    robots: payload.robots ?? null,
    og_title: payload.og_title ?? null,
    og_description: payload.og_description ?? null,
    og_image: payload.og_image ?? null,
    twitter_title: payload.twitter_title ?? null,
    twitter_description: payload.twitter_description ?? null,
    twitter_image: payload.twitter_image ?? null,
    schema_type: payload.schema_type,
    schema_data: payload.schema_data,
    is_pillar: payload.is_pillar,
    // External-canonical URLs must not be advertised in this site's sitemap.
    sitemap_include: payload.sitemap_include && canonicalIsLocal,
    seo_score: seoScore,
    reading_time: minutes,
  };

  try {
    let articleId = payload.id ?? null;

    if (articleId) {
      // Any signed-in editor/admin/owner may edit and publish any article — this
      // mirrors the DB RLS policy `articles_editor_all` (the real authz boundary).
      const { error } = await supabase.from('articles').update(row as never).eq('id', articleId);
      if (error) return slugError(error.message);
    } else {
      const { data, error } = await supabase
        .from('articles')
        .insert({ ...row, author_id: locals.user.id } as never)
        .select('id')
        .single<{ id: string }>();
      if (error) return slugError(error.message);
      articleId = data.id;
    }

    // One database transaction: insert failure rolls the preceding delete back.
    const rpc = supabase.rpc.bind(supabase) as unknown as (
      fn: string, args: Record<string, unknown>,
    ) => Promise<{ error: { message: string } | null }>;
    const { error: tagsError } = await rpc('sync_article_tags', {
      p_article_id: articleId,
      p_tag_ids: [...new Set(payload.tag_ids)],
    });
    if (tagsError) return serverError('Artikel tersimpan, tag gagal diperbarui');

    await recordActivity(supabase, {
      action: payload.status === 'published' ? 'publish' : payload.id ? 'update' : 'create',
      entityType: 'articles',
      entityId: articleId,
      summary: `${payload.id ? 'memperbarui' : 'membuat'} artikel "${payload.title}"`,
    });

    // Best effort: publishing succeeds even when IndexNow is unavailable.
    if (payload.status === 'published' && seoSettings.indexnow_enabled) {
      await submitIndexNow([`${seoSettings.site_url}/artikel/${slug}`], seoSettings);
    }

    return ok({ id: articleId, slug, seo_score: seoScore, sitemap_include: payload.sitemap_include && canonicalIsLocal });
  } catch {
    return serverError('Gagal menyimpan artikel');
  }
};

function slugError(message: string): Response {
  if (message.includes('articles_slug') || message.toLowerCase().includes('duplicate')) {
    return json({ ok: false, error: 'Slug sudah dipakai artikel lain' }, 409);
  }
  return serverError('Gagal menyimpan artikel');
}

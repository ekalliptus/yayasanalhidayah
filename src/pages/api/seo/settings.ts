export const prerender = false;
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { badRequest, forbidden, ok, serverError } from '@/lib/api';
import { invalidateSeoSettingsCache, isValidIndexNowKey, mergeSeoSettings, SEO_DEFAULTS } from '@/lib/seo';
import { recordActivity } from '@/lib/activity';

const MAX_JSON = 100_000;
const schema = z.record(z.string(), z.unknown());

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user || !['super_admin', 'owner', 'admin'].includes(locals.role ?? '')) return forbidden();
  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > MAX_JSON) return badRequest('Setelan terlalu besar');

  let raw: Record<string, unknown>;
  try {
    const text = await request.text();
    if (text.length > MAX_JSON) return badRequest('Setelan terlalu besar');
    raw = schema.parse(JSON.parse(text));
  } catch {
    return badRequest('Data setelan tidak valid');
  }

  // Keep only known keys, coerce primitive types, and canonicalize analytics IDs.
  const settings = mergeSeoSettings(raw as Partial<typeof SEO_DEFAULTS>);
  try {
    const site = new URL(settings.site_url);
    if (!['http:', 'https:'].includes(site.protocol)) return badRequest('URL situs harus HTTP(S)');
    settings.site_url = site.origin;
  } catch { return badRequest('URL situs tidak valid'); }
  const urlFields: (keyof typeof settings)[] = ['default_og_image', 'org_logo', 'org_url'];
  for (const key of urlFields) {
    const value = settings[key];
    if (typeof value !== 'string' || !value) continue;
    try {
      const parsed = new URL(value, settings.site_url);
      if (!['http:', 'https:'].includes(parsed.protocol)) return badRequest(`${String(key)} harus URL HTTP(S)`);
      (settings as unknown as Record<string, unknown>)[key] = parsed.href;
    } catch { return badRequest(`${String(key)} tidak valid`); }
  }
  settings.social_profiles = settings.social_profiles.filter((value) => {
    try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; }
  });
  if (settings.social_profiles.length > 30 || settings.opening_hours.length > 50 || settings.sitemap_exclude_paths.length > 200) {
    return badRequest('Terlalu banyak item pada setelan SEO');
  }
  if (settings.indexnow_enabled && !isValidIndexNowKey(settings.indexnow_key)) {
    return badRequest('IndexNow key harus 8–128 karakter heksadesimal');
  }
  if (settings.sitemap_links_per_page < 1 || settings.sitemap_links_per_page > 1000) {
    return badRequest('URL per sitemap harus 1–1000');
  }
  const longText = new Set(['homepage_description', 'org_description', 'robots_txt_custom', 'llms_txt_description']);
  for (const [key, value] of Object.entries(settings)) {
    if (typeof value !== 'string') continue;
    const max = key === 'robots_txt_custom' ? 20_000 : longText.has(key) ? 2_000 : 500;
    if (value.length > max) return badRequest(`${key} maksimal ${max} karakter`);
  }
  const lat = Number(settings.geo_lat), lng = Number(settings.geo_lng);
  if ((settings.geo_lat && (!Number.isFinite(lat) || lat < -90 || lat > 90)) || (settings.geo_lng && (!Number.isFinite(lng) || lng < -180 || lng > 180))) {
    return badRequest('Koordinat tidak valid');
  }
  try {
    const { error } = await locals.supabase
      .from('seo_settings')
      .upsert({ key: 'site', value: settings } as never);
    if (error) return serverError('Gagal menyimpan setelan SEO');
    await recordActivity(locals.supabase, {
      action: 'update', entityType: 'seo_settings',
      summary: 'memperbarui setelan SEO global',
    });
    invalidateSeoSettingsCache();
    return ok({ settings });
  } catch {
    return serverError('Gagal menyimpan setelan SEO');
  }
};

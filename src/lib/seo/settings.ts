// Global SEO settings — the Rank Math "Titles & Meta / General / Local SEO"
// surface, ported to a single jsonb row (`seo_settings`, key='site').
//
// The DB stores whatever the admin last saved; this module owns the DEFAULTS
// and merges stored values over them. New settings are therefore additive: add
// a key here, ship the UI, no migration needed.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../supabase/types';

export type RobotsToken =
  | 'index' | 'noindex' | 'nofollow' | 'noarchive' | 'nosnippet' | 'noimageindex';

export const ROBOTS_TOKENS: { value: RobotsToken; label: string; hint: string }[] = [
  { value: 'index', label: 'Index', hint: 'Boleh muncul di hasil pencarian' },
  { value: 'noindex', label: 'No Index', hint: 'Sembunyikan dari hasil pencarian' },
  { value: 'nofollow', label: 'No Follow', hint: 'Jangan ikuti link di halaman ini' },
  { value: 'noarchive', label: 'No Archive', hint: 'Jangan simpan versi cache' },
  { value: 'nosnippet', label: 'No Snippet', hint: 'Jangan tampilkan cuplikan teks' },
  { value: 'noimageindex', label: 'No Image Index', hint: 'Jangan indeks gambar di halaman ini' },
];

export type SchemaOrgType = 'Organization' | 'NGO' | 'LocalBusiness' | 'Person';
export type TwitterCardType = 'summary_large_image' | 'summary';
export type ImagePreviewSize = 'none' | 'standard' | 'large';

export interface SeoSettings {
  // ── Site identity ────────────────────────────────────────────────────────
  site_url: string;
  site_name: string;
  site_description: string;
  site_locale: string;

  // ── Titles & meta ────────────────────────────────────────────────────────
  title_separator: string;
  capitalize_titles: boolean;
  homepage_title: string;
  homepage_description: string;
  /** Template applied to article <title>. Supports %variables%. */
  article_title_template: string;
  article_description_template: string;
  /** Template for ordinary pages that pass a title into the layout. */
  page_title_template: string;
  archive_title_template: string;

  // ── Robots ───────────────────────────────────────────────────────────────
  robots_global: RobotsToken[];
  robots_max_snippet: number;
  robots_max_image_preview: ImagePreviewSize;
  robots_max_video_preview: number;
  /** Master kill-switch — off means every page renders noindex,nofollow. */
  robots_index: boolean;
  noindex_paginated: boolean;

  // ── Social / OpenGraph ───────────────────────────────────────────────────
  default_og_image: string;
  og_image_alt: string;
  twitter_handle: string;
  twitter_card_type: TwitterCardType;
  facebook_app_id: string;
  social_profiles: string[];

  // ── Webmaster verification ───────────────────────────────────────────────
  gsc_verification: string;
  bing_verification: string;
  yandex_verification: string;
  baidu_verification: string;
  pinterest_verification: string;
  norton_verification: string;

  // ── Analytics ────────────────────────────────────────────────────────────
  ga4_id: string;
  gtm_id: string;

  // ── Local SEO / Organization schema ──────────────────────────────────────
  org_type: SchemaOrgType;
  org_name: string;
  org_alternate_name: string;
  org_legal_name: string;
  org_logo: string;
  org_url: string;
  org_email: string;
  org_phone: string;
  org_founding_date: string;
  org_tax_id: string;
  org_description: string;
  address_street: string;
  address_locality: string;
  address_region: string;
  address_postal: string;
  address_country: string;
  geo_lat: string;
  geo_lng: string;
  area_served: string;
  price_range: string;
  /** One entry per line, e.g. "Mo-Fr 08:00-17:00". */
  opening_hours: string[];

  // ── Sitemap ──────────────────────────────────────────────────────────────
  sitemap_enabled: boolean;
  sitemap_links_per_page: number;
  sitemap_include_images: boolean;
  sitemap_include_articles: boolean;
  sitemap_include_categories: boolean;
  sitemap_include_tags: boolean;
  sitemap_include_pages: boolean;
  /** Paths excluded from every sitemap (exact match or prefix with a `*`). */
  sitemap_exclude_paths: string[];

  // ── robots.txt ───────────────────────────────────────────────────────────
  robots_txt_mode: 'auto' | 'custom';
  robots_txt_custom: string;

  // ── llms.txt ─────────────────────────────────────────────────────────────
  llms_txt_enabled: boolean;
  llms_txt_description: string;

  // ── IndexNow (instant indexing) ──────────────────────────────────────────
  indexnow_enabled: boolean;
  indexnow_key: string;

  // ── Breadcrumbs ──────────────────────────────────────────────────────────
  breadcrumbs_enabled: boolean;
  breadcrumbs_home_label: string;
  breadcrumbs_separator: string;

  // ── Image SEO ────────────────────────────────────────────────────────────
  image_alt_template: string;
  image_title_template: string;
  image_add_missing_alt: boolean;
  image_add_missing_title: boolean;
}

export const SEO_DEFAULTS: SeoSettings = {
  site_url: 'https://yayasanalhidayah.com',
  site_name: 'Yayasan Alhidayah',
  site_description: 'Lembaga sosial & keagamaan dari Bandung Barat.',
  site_locale: 'id_ID',

  title_separator: '—',
  capitalize_titles: false,
  homepage_title: 'Yayasan Alhidayah — Amanah, Tepat Sasaran, Sesuai Syariat',
  homepage_description:
    'Yayasan Alhidayah — Lembaga sosial & keagamaan dari Bandung Barat. Wakaf mushaf Al-Quran, kafarat, fidyah, dan bantuan sosial untuk fakir miskin, anak yatim, dan penggiat dakwah.',
  article_title_template: '%title% %sep% %sitename%',
  article_description_template: '%excerpt%',
  page_title_template: '%title% %sep% %sitename%',
  archive_title_template: '%term% %sep% %sitename%',

  robots_global: ['index'],
  robots_max_snippet: -1,
  robots_max_image_preview: 'large',
  robots_max_video_preview: -1,
  robots_index: true,
  noindex_paginated: false,

  default_og_image: '',
  og_image_alt: 'Kegiatan Yayasan Alhidayah — Wakaf & Kafarat',
  twitter_handle: '',
  twitter_card_type: 'summary_large_image',
  facebook_app_id: '',
  social_profiles: [
    'https://www.instagram.com/aksibaikalhidayah',
    'https://www.facebook.com/Yas%20Alhidayah',
  ],

  gsc_verification: '',
  bing_verification: '',
  yandex_verification: '',
  baidu_verification: '',
  pinterest_verification: '',
  norton_verification: '',

  ga4_id: '',
  gtm_id: '',

  org_type: 'NGO',
  org_name: 'Yayasan Alhidayah',
  org_alternate_name: 'Alhidayah Foundation',
  org_legal_name: 'Yayasan Alhidayah',
  org_logo: 'https://yayasanalhidayah.com/logo-clear.png',
  org_url: 'https://yayasanalhidayah.com',
  org_email: '',
  org_phone: '+62-851-7700-7772',
  org_founding_date: '2025',
  org_tax_id: '31.714.301.4-421.000',
  org_description:
    'Lembaga sosial dan keagamaan berbadan hukum dari Bandung Barat yang bergerak di bidang wakaf mushaf Al-Quran, kafarat, dan bantuan sosial.',
  address_street: 'Kampung Pamokokolan RT 03/01, Desa Bunijaya',
  address_locality: 'Gununghalu',
  address_region: 'Kabupaten Bandung Barat',
  address_postal: '',
  address_country: 'ID',
  geo_lat: '-6.89',
  geo_lng: '107.34',
  area_served: 'Kabupaten Bandung Barat, Jawa Barat, Indonesia',
  price_range: '',
  opening_hours: [],

  sitemap_enabled: true,
  sitemap_links_per_page: 1000,
  sitemap_include_images: true,
  sitemap_include_articles: true,
  sitemap_include_categories: true,
  sitemap_include_tags: false,
  sitemap_include_pages: true,
  sitemap_exclude_paths: [],

  robots_txt_mode: 'auto',
  robots_txt_custom: '',

  llms_txt_enabled: true,
  llms_txt_description: '',

  indexnow_enabled: false,
  indexnow_key: '',

  breadcrumbs_enabled: true,
  breadcrumbs_home_label: 'Beranda',
  breadcrumbs_separator: '›',

  image_alt_template: '%title% %sep% %sitename%',
  image_title_template: '%title%',
  image_add_missing_alt: true,
  image_add_missing_title: true,
};

/**
 * GA4 Measurement IDs and GTM container IDs are interpolated into an inline
 * <script>. Even though the source is admin-controlled, allow only the
 * canonical shapes so a stray quote can never break out of the string.
 */
export function sanitizeGa4Id(raw: string): string {
  return (raw || '').trim().match(/^G-[A-Z0-9]{6,}$/i)?.[0] ?? '';
}
export function sanitizeGtmId(raw: string): string {
  return (raw || '').trim().match(/^GTM-[A-Z0-9]{4,}$/i)?.[0] ?? '';
}

/** Coerce a stored value into the shape/type of its default. */
function coerce<T>(stored: unknown, fallback: T): T {
  if (stored === undefined || stored === null) return fallback;
  if (Array.isArray(fallback)) return (Array.isArray(stored) ? stored : fallback) as T;
  if (typeof fallback === 'boolean') return (typeof stored === 'boolean' ? stored : fallback) as T;
  if (typeof fallback === 'number') {
    const n = typeof stored === 'number' ? stored : Number(stored);
    return (Number.isFinite(n) ? n : fallback) as T;
  }
  if (typeof fallback === 'string') return (typeof stored === 'string' ? stored : fallback) as T;
  return stored as T;
}

function safeWebUrl(value: string, base?: string): boolean {
  try { return ['http:', 'https:'].includes(new URL(value, base).protocol); }
  catch { return false; }
}

/** Merge stored SEO settings over the defaults (DB may lag the schema). */
export function mergeSeoSettings(stored: Partial<SeoSettings> | null | undefined): SeoSettings {
  const out = { ...SEO_DEFAULTS };
  if (stored) {
    for (const key of Object.keys(SEO_DEFAULTS) as (keyof SeoSettings)[]) {
      (out as Record<string, unknown>)[key] = coerce(
        (stored as Record<string, unknown>)[key],
        SEO_DEFAULTS[key],
      );
    }
  }
  // JSONB can outlive the UI version that wrote it. Normalize all enum/array
  // settings here so one stale or hand-edited value can never crash a public
  // request (e.g. sitemap exclusions calling trim on a non-string).
  const stringArrays: (keyof SeoSettings)[] = [
    'social_profiles', 'opening_hours', 'sitemap_exclude_paths',
  ];
  for (const key of stringArrays) {
    const value = out[key];
    (out as Record<string, unknown>)[key] = Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean)
      : [];
  }
  out.social_profiles = out.social_profiles.filter((value) => safeWebUrl(value));
  for (const key of ['default_og_image', 'org_logo', 'org_url'] as const) {
    if (!out[key]) continue;
    if (!safeWebUrl(out[key], out.site_url)) out[key] = SEO_DEFAULTS[key];
    else out[key] = new URL(out[key], out.site_url).href;
  }
  out.robots_global = Array.isArray(out.robots_global)
    ? out.robots_global.filter((token): token is RobotsToken => ROBOTS_TOKENS.some((item) => item.value === token))
    : ['index'];
  if (!['summary_large_image', 'summary'].includes(out.twitter_card_type)) out.twitter_card_type = SEO_DEFAULTS.twitter_card_type;
  if (!['none', 'standard', 'large'].includes(out.robots_max_image_preview)) out.robots_max_image_preview = SEO_DEFAULTS.robots_max_image_preview;
  if (!['auto', 'custom'].includes(out.robots_txt_mode)) out.robots_txt_mode = 'auto';
  if (!['Organization', 'NGO', 'LocalBusiness', 'Person'].includes(out.org_type)) out.org_type = 'NGO';
  out.sitemap_links_per_page = Math.max(1, Math.min(1000, Math.trunc(out.sitemap_links_per_page)));
  out.ga4_id = sanitizeGa4Id(out.ga4_id);
  out.gtm_id = sanitizeGtmId(out.gtm_id);
  try {
    const site = new URL(out.site_url);
    out.site_url = ['http:', 'https:'].includes(site.protocol) ? site.origin : SEO_DEFAULTS.site_url;
  } catch { out.site_url = SEO_DEFAULTS.site_url; }
  return out;
}

// Per-isolate cache: settings are read on every SSR request but change rarely.
// A short TTL keeps admin edits visible within a minute (matching the existing
// marketing edge-cache window) while removing a DB round trip from the hot path.
const CACHE_TTL_MS = 60_000;
let cache: { at: number; value: SeoSettings } | null = null;

export function invalidateSeoSettingsCache(): void {
  cache = null;
}

export async function getSeoSettings(
  client: SupabaseClient<Database> | null,
): Promise<SeoSettings> {
  if (!client) return SEO_DEFAULTS;
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) return cache.value;

  const { data } = await client
    .from('seo_settings')
    .select('value')
    .eq('key', 'site')
    .maybeSingle<{ value: Partial<SeoSettings> }>();

  const merged = mergeSeoSettings(data?.value);
  cache = { at: now, value: merged };
  return merged;
}

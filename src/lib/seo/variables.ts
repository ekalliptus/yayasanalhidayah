// Rank Math-style replacement variables (%title%, %sitename%, %sep%, …).
//
// Used by the title/description templates in the SEO admin and by the Image SEO
// alt/title templates. Rendering is a plain string substitution — templates are
// admin-authored and the result is emitted as a text node / attribute value, so
// there is no HTML context to escape here (Astro escapes on output).

import type { SeoSettings } from './settings';

export interface VariableContext {
  settings: SeoSettings;
  /** Page/article title. */
  title?: string;
  excerpt?: string;
  /** Term name for archives (category/tag). */
  term?: string;
  category?: string;
  tag?: string;
  focusKeyword?: string;
  authorName?: string;
  /** ISO strings. */
  publishedAt?: string | null;
  modifiedAt?: string | null;
  url?: string;
  page?: number;
  /** Fixed "now" so a single render is internally consistent. */
  now?: Date;
}

export interface VariableDef {
  token: string;
  label: string;
  description: string;
  group: 'Dasar' | 'Konten' | 'Tanggal' | 'Organisasi';
}

/** Catalogue shown in the admin's variable picker. */
export const SEO_VARIABLES: VariableDef[] = [
  { token: '%sep%', label: 'Pemisah', description: 'Karakter pemisah judul', group: 'Dasar' },
  { token: '%sitename%', label: 'Nama Situs', description: 'Nama situs', group: 'Dasar' },
  { token: '%sitedesc%', label: 'Deskripsi Situs', description: 'Tagline/deskripsi situs', group: 'Dasar' },
  { token: '%url%', label: 'URL', description: 'URL halaman saat ini', group: 'Dasar' },
  { token: '%page%', label: 'Halaman', description: 'Nomor halaman (paginasi)', group: 'Dasar' },

  { token: '%title%', label: 'Judul', description: 'Judul halaman/artikel', group: 'Konten' },
  { token: '%excerpt%', label: 'Ringkasan', description: 'Ringkasan artikel', group: 'Konten' },
  { token: '%category%', label: 'Kategori', description: 'Kategori artikel', group: 'Konten' },
  { token: '%tag%', label: 'Tag', description: 'Tag artikel', group: 'Konten' },
  { token: '%term%', label: 'Term', description: 'Nama kategori/tag pada halaman arsip', group: 'Konten' },
  { token: '%focuskw%', label: 'Focus Keyword', description: 'Focus keyword artikel', group: 'Konten' },
  { token: '%name%', label: 'Penulis', description: 'Nama penulis', group: 'Konten' },

  { token: '%date%', label: 'Tanggal Terbit', description: 'Tanggal publikasi', group: 'Tanggal' },
  { token: '%modified%', label: 'Tanggal Ubah', description: 'Tanggal perubahan terakhir', group: 'Tanggal' },
  { token: '%currentdate%', label: 'Tanggal Hari Ini', description: 'Tanggal saat halaman dirender', group: 'Tanggal' },
  { token: '%currentday%', label: 'Tanggal (hari)', description: 'Tanggal hari ini', group: 'Tanggal' },
  { token: '%currentmonth%', label: 'Bulan Ini', description: 'Nama bulan saat ini', group: 'Tanggal' },
  { token: '%currentyear%', label: 'Tahun Ini', description: 'Tahun saat ini', group: 'Tanggal' },

  { token: '%org_name%', label: 'Nama Organisasi', description: 'Nama organisasi (Local SEO)', group: 'Organisasi' },
  { token: '%org_url%', label: 'URL Organisasi', description: 'URL organisasi', group: 'Organisasi' },
  { token: '%org_logo%', label: 'Logo Organisasi', description: 'URL logo organisasi', group: 'Organisasi' },
];

const ID_DATE = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
const ID_MONTH = new Intl.DateTimeFormat('id-ID', { month: 'long' });

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : ID_DATE.format(d);
}

/** Resolve every %variable% in `template` against `ctx`. */
export function replaceVariables(template: string, ctx: VariableContext): string {
  if (!template) return '';
  const s = ctx.settings;
  const now = ctx.now ?? new Date();

  const map: Record<string, string> = {
    sep: s.title_separator || '|',
    sitename: s.site_name,
    sitedesc: s.site_description,
    url: ctx.url ?? '',
    page: String(ctx.page ?? 1),

    title: ctx.title ?? '',
    excerpt: ctx.excerpt ?? '',
    category: ctx.category ?? '',
    tag: ctx.tag ?? '',
    term: ctx.term ?? ctx.category ?? '',
    focuskw: ctx.focusKeyword ?? '',
    name: ctx.authorName ?? '',

    date: fmtDate(ctx.publishedAt),
    modified: fmtDate(ctx.modifiedAt),
    currentdate: ID_DATE.format(now),
    currentday: String(now.getDate()),
    currentmonth: ID_MONTH.format(now),
    currentyear: String(now.getFullYear()),

    org_name: s.org_name,
    org_url: s.org_url,
    org_logo: s.org_logo,
  };

  // Unknown tokens are stripped rather than left as literal %junk% in <head>.
  const out = template.replace(/%([a-z0-9_]+)%/gi, (_, key: string) => map[key.toLowerCase()] ?? '');
  return collapse(out);
}

/**
 * Templates routinely leave dangling separators when a variable resolves empty
 * ("%title% %sep% %sitename%" with no title → " — Yayasan"). Trim those so the
 * rendered title always looks hand-written.
 */
function collapse(value: string): string {
  const seps = '\\-–—|·•~»«>/';
  return value
    .replace(/\s+/g, ' ')
    .replace(new RegExp(`^[${seps}\\s]+`), '')
    .replace(new RegExp(`[${seps}\\s]+$`), '')
    .replace(new RegExp(`([${seps}])\\s*\\1+`, 'g'), '$1')
    .trim();
}

/** Rank Math's "Capitalize Titles" — title-case each word. */
export function capitalizeTitle(value: string): string {
  return value.replace(/\p{L}[\p{L}\p{M}'’-]*/gu, (w) => w.charAt(0).toUpperCase() + w.slice(1));
}

/** Truncate on a word boundary — used for auto-generated descriptions. */
export function truncate(value: string, max: number): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[.,;:\-–—]$/, '') + '…';
}

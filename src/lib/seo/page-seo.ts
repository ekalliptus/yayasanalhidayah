// Per-path SEO overrides (`page_seo`). Lets the admin control title, meta,
// robots, canonical and social tags for any non-article route without touching
// the .astro file.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../supabase/types';
import type { RobotsToken } from './settings';

export interface PageSeo {
  path: string;
  label: string;
  title: string | null;
  description: string | null;
  canonical: string | null;
  robots: RobotsToken[] | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  twitter_title: string | null;
  twitter_description: string | null;
  twitter_image: string | null;
  schema_type: string;
  sitemap_include: boolean;
  sitemap_priority: number;
  sitemap_changefreq: string;
  updated_at?: string;
}

// Same short TTL as the settings cache — one DB round trip per isolate/minute
// instead of one per request.
const CACHE_TTL_MS = 60_000;
let cache: { at: number; rows: Map<string, PageSeo> } | null = null;

export function invalidatePageSeoCache(): void {
  cache = null;
}

/** Strip the trailing slash so "/program/" and "/program" share one row. */
export function normalizePath(pathname: string): string {
  if (!pathname) return '/';
  const p = pathname.split('?')[0].split('#')[0];
  return p !== '/' && p.endsWith('/') ? p.slice(0, -1) : p;
}

async function loadAll(client: SupabaseClient<Database>): Promise<Map<string, PageSeo>> {
  const db = client as any; // generated types update after migration push
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) return cache.rows;
  const { data } = await db.from('page_seo').select('*');
  const rows = new Map<string, PageSeo>();
  for (const row of (data ?? []) as unknown as PageSeo[]) {
    rows.set(normalizePath(row.path), row);
  }
  cache = { at: now, rows };
  return rows;
}

export async function getPageSeo(
  client: SupabaseClient<Database> | null,
  pathname: string,
): Promise<PageSeo | null> {
  if (!client) return null;
  try {
    return (await loadAll(client)).get(normalizePath(pathname)) ?? null;
  } catch {
    // SEO overrides are decoration — never break a page render over them.
    return null;
  }
}

export async function listPageSeo(
  client: SupabaseClient<Database> | null,
): Promise<PageSeo[]> {
  if (!client) return [];
  const { data, error } = await (client as any).from('page_seo').select('*').order('path');
  if (error) throw new Error('Failed to load page SEO');
  return (data ?? []) as unknown as PageSeo[];
}

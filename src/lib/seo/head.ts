// One resolver for everything that goes in <head>.
//
// Base.astro calls resolveSeo() once and renders the result; article pages and
// the admin SERP preview call the same function, so what the editor previews is
// literally what the crawler receives.

import type { SeoSettings, RobotsToken } from './settings';
import { replaceVariables, capitalizeTitle, truncate, type VariableContext } from './variables';
import { buildRobots } from './robots';
import type { PageSeo } from './page-seo';

export type SeoKind = 'home' | 'page' | 'article' | 'archive';

export interface SeoPageInput {
  kind: SeoKind;
  /** Site-relative pathname, e.g. "/artikel/judul". */
  pathname: string;
  /** Page/article title before templating. */
  title?: string;
  description?: string;
  /** Bypass the title template (a page already built its own full title). */
  rawTitle?: boolean;
  noindex?: boolean;
  canonical?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  robots?: RobotsToken[] | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  twitterTitle?: string | null;
  twitterDescription?: string | null;
  twitterImage?: string | null;

  // Article-only signals (also feed the variable resolver).
  excerpt?: string;
  authorName?: string;
  publishedAt?: string | null;
  modifiedAt?: string | null;
  category?: string;
  tags?: string[];
  focusKeyword?: string;
  /** Page number for paginated lists (1 = first page). */
  page?: number;
}

export interface ResolvedSeo {
  title: string;
  description: string;
  canonical: string;
  robots: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogImageAlt: string;
  ogType: 'website' | 'article';
  twitterCard: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
  twitterSite: string;
  locale: string;
  siteName: string;
}

const MAX_DESC = 160;

function absoluteUrl(value: string, siteUrl: string): string {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) {
    try { return new URL(value).href; } catch { return ''; }
  }
  if (value.startsWith('//')) value = `/${value.replace(/^\/+/, '')}`;
  return `${siteUrl}${value.startsWith('/') ? '' : '/'}${value}`;
}

/** Pick the template for this page kind. */
function templateFor(kind: SeoKind, settings: SeoSettings): string {
  switch (kind) {
    case 'home': return settings.homepage_title;
    case 'article': return settings.article_title_template;
    case 'archive': return settings.archive_title_template;
    default: return settings.page_title_template;
  }
}

export function resolveSeo(
  input: SeoPageInput,
  settings: SeoSettings,
  override?: PageSeo | null,
): ResolvedSeo {
  const site = settings.site_url;
  const ctx: VariableContext = {
    settings,
    // `%title%` inside a page override must resolve to the page's original
    // title, not to the override template itself.
    title: input.title,
    excerpt: input.excerpt ?? input.description,
    category: input.category,
    tag: input.tags?.[0],
    term: input.category ?? (input.kind === 'archive' ? input.title : undefined),
    focusKeyword: input.focusKeyword,
    authorName: input.authorName,
    publishedAt: input.publishedAt,
    modifiedAt: input.modifiedAt,
    url: absoluteUrl(input.pathname, site),
    page: input.page ?? 1,
  };

  // ── Title ────────────────────────────────────────────────────────────────
  // An explicit page_seo.title or a rawTitle page skips templating entirely;
  // everything else runs through the per-kind template.
  let title: string;
  if (override?.title) {
    title = replaceVariables(override.title, ctx);
  } else if (input.kind === 'home') {
    title = replaceVariables(settings.homepage_title, ctx);
  } else if (input.rawTitle && input.title) {
    title = input.title;
  } else if (input.title) {
    title = replaceVariables(templateFor(input.kind, settings), ctx);
  } else {
    title = replaceVariables(settings.homepage_title, ctx);
  }
  if (settings.capitalize_titles) title = capitalizeTitle(title);

  // ── Description ──────────────────────────────────────────────────────────
  const rawDescription =
    override?.description ||
    input.description ||
    (input.kind === 'article' && settings.article_description_template
      ? replaceVariables(settings.article_description_template, ctx)
      : '') ||
    (input.kind === 'home' ? settings.homepage_description : '') ||
    settings.homepage_description;
  const description = truncate(replaceVariables(rawDescription, ctx), MAX_DESC);

  // ── Canonical ────────────────────────────────────────────────────────────
  const canonical = absoluteUrl(
    override?.canonical || input.canonical || input.pathname,
    site,
  ) || absoluteUrl(input.pathname, site);

  // ── Robots ───────────────────────────────────────────────────────────────
  const paginatedNoindex =
    settings.noindex_paginated && (input.page ?? 1) > 1;
  const robots = buildRobots(
    settings,
    input.robots ?? override?.robots ?? null,
    Boolean(input.noindex) || paginatedNoindex,
  );

  // ── Social ───────────────────────────────────────────────────────────────
  const ogImage = absoluteUrl(
    input.ogImage || override?.og_image || settings.default_og_image || '/hero/hero-1.webp',
    site,
  );
  const ogTitle = replaceVariables(input.ogTitle || override?.og_title || title, ctx);
  const ogDescription = truncate(replaceVariables(input.ogDescription || override?.og_description || description, ctx), MAX_DESC);
  const twitterImage = absoluteUrl(
    input.twitterImage || override?.twitter_image || ogImage,
    site,
  );
  const twitterTitle = replaceVariables(input.twitterTitle || override?.twitter_title || ogTitle, ctx);
  const twitterDescription = truncate(replaceVariables(input.twitterDescription || override?.twitter_description || ogDescription, ctx), MAX_DESC);

  return {
    title,
    description,
    canonical,
    robots,
    ogTitle,
    ogDescription,
    ogImage,
    ogImageAlt: settings.og_image_alt,
    ogType: input.ogType ?? (input.kind === 'article' ? 'article' : 'website'),
    twitterCard: settings.twitter_card_type,
    twitterTitle,
    twitterDescription,
    twitterImage,
    twitterSite: settings.twitter_handle.trim(),
    locale: settings.site_locale,
    siteName: settings.site_name,
  };
}

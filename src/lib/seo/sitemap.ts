// XML sitemap generation, ported from Rank Math's sitemap module.
//
// URL scheme matches Rank Math so an existing Search Console property keeps
// working after the migration:
//   /sitemap_index.xml          — index of every sub-sitemap
//   /post-sitemap.xml           — articles
//   /page-sitemap.xml           — static/marketing routes
//   /category-sitemap.xml       — article categories
//   /post_tag-sitemap.xml       — article tags
//
// Output is built with template literals on purpose: the shape is tiny and
// fixed, and an XML library would cost more than it saves.

export interface SitemapImage {
  loc: string;
  title?: string;
}

export interface SitemapUrl {
  loc: string;
  lastmod?: string | null;
  changefreq?: string;
  priority?: number;
  images?: SitemapImage[];
}

/** Escape the five XML predefined entities. */
export function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** W3C datetime with an explicit +00:00 offset, as Rank Math emits. */
export function w3cDate(value: string | Date | null | undefined): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().replace(/\.\d{3}Z$/, '+00:00');
}

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8"?>';

export function renderSitemapIndex(
  entries: { loc: string; lastmod?: string | null }[],
): string {
  const items = entries
    .map((e) => {
      const lastmod = w3cDate(e.lastmod);
      return `\t<sitemap>\n\t\t<loc>${xmlEscape(e.loc)}</loc>\n${lastmod ? `\t\t<lastmod>${lastmod}</lastmod>\n` : ''}\t</sitemap>`;
    })
    .join('\n');
  return `${XML_HEADER}\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</sitemapindex>`;
}

export function renderUrlset(urls: SitemapUrl[], withImages: boolean): string {
  const ns = withImages
    ? '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">'
    : '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';

  const items = urls
    .map((u) => {
      const lastmod = w3cDate(u.lastmod);
      const parts = [`\t\t<loc>${xmlEscape(u.loc)}</loc>`];
      if (lastmod) parts.push(`\t\t<lastmod>${lastmod}</lastmod>`);
      if (u.changefreq) parts.push(`\t\t<changefreq>${u.changefreq}</changefreq>`);
      if (typeof u.priority === 'number') parts.push(`\t\t<priority>${u.priority.toFixed(1)}</priority>`);
      if (withImages) {
        for (const img of u.images ?? []) {
          parts.push(
            `\t\t<image:image>\n\t\t\t<image:loc>${xmlEscape(img.loc)}</image:loc>${
              img.title ? `\n\t\t\t<image:title>${xmlEscape(img.title)}</image:title>` : ''
            }\n\t\t</image:image>`,
          );
        }
      }
      return `\t<url>\n${parts.join('\n')}\n\t</url>`;
    })
    .join('\n');

  return `${XML_HEADER}\n${ns}\n${items}\n</urlset>`;
}

/** Headers Rank Math sends on every sitemap response. */
export function sitemapResponse(xml: string): Response {
  return new Response(xml, {
    headers: {
      'content-type': 'application/xml; charset=UTF-8',
      'x-robots-tag': 'noindex, follow',
      'cache-control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
    },
  });
}

function decodeEntities(value: string): string {
  return value.replace(/&(amp|lt|gt|quot|#39);/g, (entity) => ({
    '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'",
  }[entity] ?? entity));
}

/** Extract <img src> (and alt) from stored article HTML for the image sitemap. */
export function extractImages(html: string | null | undefined, limit = 10, site = ''): SitemapImage[] {
  if (!html) return [];
  const out: SitemapImage[] = [];
  const re = /<img\b[^>]*?\bsrc=["']([^"']+)["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && out.length < limit) {
    let src = m[1];
    if (!/^https?:\/\//i.test(src)) {
      if (!site || !src.startsWith('/')) continue; // skip data: and malformed paths
      src = `${site}${src}`;
    }
    const alt = /\balt=["']([^"']*)["']/i.exec(m[0])?.[1];
    out.push({ loc: src, title: alt ? decodeEntities(alt) : undefined });
  }
  return out;
}

/** Does `path` match one of the admin's exclusion patterns (`*` = prefix)? */
export function isExcluded(path: string, patterns: string[]): boolean {
  return patterns.some((raw) => {
    const p = raw.trim();
    if (!p) return false;
    return p.endsWith('*') ? path.startsWith(p.slice(0, -1)) : path === p;
  });
}

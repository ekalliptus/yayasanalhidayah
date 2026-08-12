import { describe, expect, test } from 'bun:test';
import { SEO_DEFAULTS, mergeSeoSettings } from './settings';
import { replaceVariables, truncate } from './variables';
import { buildRobots } from './robots';
import { resolveSeo } from './head';
import { renderSitemapIndex, renderUrlset, xmlEscape, extractImages, isExcluded } from './sitemap';
import { applyImageSeo } from './image';
import { isValidIndexNowKey, submitIndexNow } from './indexnow';
import { buildSchemaGraph } from './schema';
import { findRedirect, type Redirection } from './redirects';

const settings = { ...SEO_DEFAULTS };

describe('SEO settings', () => {
  test('merges old partial settings over current defaults', () => {
    const value = mergeSeoSettings({ title_separator: '|' });
    expect(value.title_separator).toBe('|');
    expect(value.site_name).toBe(SEO_DEFAULTS.site_name);
  });

  test('rejects unsafe analytics identifiers', () => {
    const value = mergeSeoSettings({ ga4_id: "G-ABC123');alert(1)//", gtm_id: 'bad' });
    expect(value.ga4_id).toBe('');
    expect(value.gtm_id).toBe('');
  });
});

describe('replacement variables', () => {
  test('replaces supported variables and removes unknown tokens', () => {
    expect(replaceVariables('%title% %sep% %sitename% %unknown%', {
      settings,
      title: 'Kafarat',
    })).toBe('Kafarat — Yayasan Alhidayah');
  });

  test('truncates descriptions on a word boundary', () => {
    expect(truncate('satu dua tiga empat', 10)).toBe('satu dua…');
  });
});

describe('robots meta', () => {
  test('global kill switch always wins', () => {
    expect(buildRobots({ ...settings, robots_index: false }, ['index'])).toBe('noindex, nofollow');
  });

  test('noindex removes index and advanced preview directives', () => {
    expect(buildRobots(settings, ['index', 'noindex', 'nofollow'])).toBe('noindex, nofollow');
  });

  test('zero and none advanced directives are emitted explicitly', () => {
    const value = buildRobots({ ...settings, robots_max_snippet: 0, robots_max_video_preview: 0, robots_max_image_preview: 'none' }, ['index']);
    expect(value).toContain('max-snippet:0');
    expect(value).toContain('max-video-preview:0');
    expect(value).toContain('max-image-preview:none');
  });
});

describe('resolved head', () => {
  test('uses article template and absolute canonical', () => {
    const seo = resolveSeo({
      kind: 'article',
      pathname: '/artikel/kafarat',
      title: 'Panduan Kafarat',
      description: 'Ringkasan.',
    }, settings);
    expect(seo.title).toBe('Panduan Kafarat — Yayasan Alhidayah');
    expect(seo.canonical).toBe('https://yayasanalhidayah.com/artikel/kafarat');
    expect(seo.ogType).toBe('article');
  });

  test('page override wins over props', () => {
    const seo = resolveSeo({ kind: 'page', pathname: '/program', title: 'Program' }, settings, {
      path: '/program', label: 'Program', title: 'Donasi Hari Ini', description: 'Deskripsi override.',
      canonical: null, robots: null, og_title: null, og_description: null, og_image: null,
      twitter_title: null, twitter_description: null, twitter_image: null, schema_type: 'WebPage',
      sitemap_include: true, sitemap_priority: 0.5, sitemap_changefreq: 'weekly',
    });
    expect(seo.title).toBe('Donasi Hari Ini');
    expect(seo.description).toBe('Deskripsi override.');
  });
});

describe('Image SEO', () => {
  test('fills only missing image attributes', () => {
    const html = applyImageSeo('<p><img src="a.jpg"><img src="b.jpg" alt="Ditulis"></p>', settings, { title: 'Kafarat' });
    expect(html).toContain('<img title="Kafarat" alt="Kafarat — Yayasan Alhidayah" src="a.jpg">');
    expect(html).toContain('<img title="Kafarat" src="b.jpg" alt="Ditulis">');
    expect(html).not.toContain('alt="Kafarat — Yayasan Alhidayah" src="b.jpg"');
  });

  test('alt and title automation can be toggled independently', () => {
    const html = applyImageSeo('<img src="a.jpg">', { ...settings, image_add_missing_alt: false }, { title: 'Kafarat' });
    expect(html).toBe('<img title="Kafarat" src="a.jpg">');
  });
});

describe('IndexNow', () => {
  test('validates key shape', () => {
    expect(isValidIndexNowKey('abcdef1234567890')).toBe(true);
    expect(isValidIndexNowKey('../secret')).toBe(false);
  });

  test('submits same-origin URLs only', async () => {
    let body: any;
    const fakeFetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      body = JSON.parse(String(init?.body));
      return new Response('', { status: 202 });
    }) as typeof fetch;
    const result = await submitIndexNow([
      'https://yayasanalhidayah.com/artikel/a',
      'https://evil.test/a',
    ], { ...settings, indexnow_enabled: true, indexnow_key: 'abcdef1234567890' }, fakeFetch);
    expect(result).toEqual({ ok: true, submitted: 1, status: 202 });
    expect(body.urlList).toEqual(['https://yayasanalhidayah.com/artikel/a']);
  });
});

describe('redirections', () => {
  const row = (value: Partial<Redirection>): Redirection => ({
    id: 'a', sources: ['/lama'], comparison: 'exact', ignore_case: true,
    destination: '/baru', http_code: 301, is_active: true, ...value,
  });

  test('exact matching ignores query and preserves it', () => {
    expect(findRedirect([row({})], '/lama?utm=x')).toEqual({ id: 'a', status: 301, location: '/baru?utm=x' });
  });

  test('more specific comparison wins and inactive rules are ignored', () => {
    const match = findRedirect([
      row({ id: 'contains', comparison: 'contains', sources: ['lama'], destination: '/contains' }),
      row({ id: 'inactive', is_active: false, destination: '/inactive' }),
      row({ id: 'exact', destination: '/exact' }),
    ], '/lama');
    expect(match?.location).toBe('/exact');
  });

  test('regex backreferences resolve destination', () => {
    const match = findRedirect([row({ comparison: 'regex', sources: ['^/old/(.+)$'], destination: '/new/$1' })], '/old/path');
    expect(match?.location).toBe('/new/path');
  });

  test('skips fragment-only self redirects', () => {
    expect(findRedirect([row({ destination: '/lama#bagian' })], '/lama')).toBeNull();
  });
});

describe('structured data', () => {
  const seo = resolveSeo({ kind: 'article', pathname: '/artikel/a', title: 'A', description: 'D' }, settings);

  test('emits FAQ and HowTo nodes from validated inputs', () => {
    const graph = buildSchemaGraph({
      kind: 'article', seo, schemaType: 'FAQPage',
      faqs: [{ question: 'Apa?', answer: 'Ini.' }],
      howTo: { name: 'Cara', steps: ['Satu', 'Dua'] },
    }, settings) as any;
    expect(graph['@graph'].some((node: any) => node['@type'] === 'FAQPage')).toBe(true);
    expect(graph['@graph'].some((node: any) => node['@type'] === 'HowTo')).toBe(true);
    expect(graph['@graph'].some((node: any) => node['@type'] === 'FAQPage' && node.headline)).toBe(false);
  });

  test('article schema none keeps WebPage but drops Article node', () => {
    const graph = buildSchemaGraph({ kind: 'article', seo, schemaType: 'none', article: { title: 'A' } }, settings) as any;
    expect(graph['@graph'].some((node: any) => node['@type'] === 'WebPage')).toBe(true);
    expect(graph['@graph'].some((node: any) => ['Article','BlogPosting','NewsArticle'].includes(node['@type']))).toBe(false);
  });
});

describe('sitemaps', () => {
  test('escapes XML and emits image namespace', () => {
    expect(xmlEscape('a&b<c')).toBe('a&amp;b&lt;c');
    const xml = renderUrlset([{ loc: 'https://site.test/a?x=1&y=2', images: [{ loc: 'https://img.test/a.jpg' }] }], true);
    expect(xml).toContain('xmlns:image=');
    expect(xml).toContain('x=1&amp;y=2');
    expect(xml).toContain('<image:loc>https://img.test/a.jpg</image:loc>');
  });

  test('renders sitemap index timestamps as W3C', () => {
    const xml = renderSitemapIndex([{ loc: 'https://site.test/post-sitemap.xml', lastmod: '2026-08-12T00:00:00Z' }]);
    expect(xml).toContain('2026-08-12T00:00:00+00:00');
  });

  test('extracts HTTP and site-relative images, skips data URIs', () => {
    const images = extractImages('<img src="https://x.test/a.jpg" alt="A"><img src="/b.jpg"><img src="data:image/png,x">', 10, 'https://site.test');
    expect(images).toEqual([{ loc: 'https://x.test/a.jpg', title: 'A' }, { loc: 'https://site.test/b.jpg', title: undefined }]);
  });

  test('supports exact and prefix sitemap exclusions', () => {
    expect(isExcluded('/admin/users', ['/admin*'])).toBe(true);
    expect(isExcluded('/program', ['/artikel'])).toBe(false);
  });
});

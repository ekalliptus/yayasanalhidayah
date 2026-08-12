// Run against a deployed/preview origin:
//   SITE_URL=http://localhost:4321 bun scripts/verify-seo.mjs
// Uses only platform fetch + assert; no test framework.
import assert from 'node:assert/strict';

const site = (process.env.SITE_URL || 'http://localhost:4321').replace(/\/$/, '');

async function text(path, expectedType) {
  const response = await fetch(site + path);
  assert.equal(response.status, 200, `${path}: HTTP ${response.status}`);
  assert.match(response.headers.get('content-type') || '', expectedType, `${path}: content-type`);
  return response.text();
}

const home = await text('/', /text\/html/);
assert.match(home, /<link rel="canonical" href="https:\/\/yayasanalhidayah\.com\/?"/);
assert.match(home, /<script type="application\/ld\+json"/);
assert.match(home, /"@type":"WebSite"/);

const robots = await text('/robots.txt', /text\/plain/);
assert.match(robots, /Sitemap: https:\/\/yayasanalhidayah\.com\/sitemap_index\.xml/);

const index = await text('/sitemap_index.xml', /application\/xml/);
assert.match(index, /<sitemapindex/);
assert.match(index, /page-sitemap\.xml/);

const pages = await text('/page-sitemap.xml', /application\/xml/);
assert.match(pages, /<urlset/);
assert.match(pages, /https:\/\/yayasanalhidayah\.com\//);

const llms = await text('/llms.txt', /text\/plain/);
assert.match(llms, /^# Yayasan Alhidayah/m);

console.log('SEO smoke checks passed:', site);

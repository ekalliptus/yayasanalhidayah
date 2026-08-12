// JSON-LD @graph builder — the Rank Math schema module, trimmed to the node
// types this site actually has: Organization/NGO (+ address, geo, contact),
// WebSite (with SearchAction), WebPage, BreadcrumbList, Article/BlogPosting,
// ImageObject, and FAQPage.
//
// Nodes are cross-linked by @id exactly like Rank Math does, so Google resolves
// publisher/author/isPartOf references instead of duplicating the entities.

import type { SeoSettings } from './settings';
import type { ResolvedSeo } from './head';

type Node = Record<string, unknown>;

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface SchemaInput {
  kind: 'home' | 'page' | 'article' | 'archive';
  seo: ResolvedSeo;
  /** 'none' disables the page-level Article/WebPage node. */
  schemaType?: string | null;
  breadcrumbs?: BreadcrumbItem[];
  article?: {
    title: string;
    image?: string;
    publishedAt?: string | null;
    modifiedAt?: string | null;
    authorName?: string;
    section?: string;
    keywords?: string[];
    wordCount?: number;
  };
  faqs?: { question: string; answer: string }[];
  howTo?: { name: string; steps: string[] };
}

function orgId(site: string) { return `${site}/#organization`; }
function siteId(site: string) { return `${site}/#website`; }

function organizationNode(s: SeoSettings): Node {
  const site = s.site_url;
  const types = s.org_type === 'NGO' ? ['Organization', 'NGO'] : [s.org_type];
  const node: Node = {
    '@type': types.length === 1 ? types[0] : types,
    '@id': orgId(site),
    name: s.org_name,
    url: s.org_url || site,
  };
  if (s.org_alternate_name) node.alternateName = s.org_alternate_name;
  if (s.org_legal_name) node.legalName = s.org_legal_name;
  if (s.org_description) node.description = s.org_description;
  if (s.org_founding_date) node.foundingDate = s.org_founding_date;
  if (s.org_tax_id) node.taxID = s.org_tax_id;
  if (s.org_email) node.email = s.org_email;
  if (s.price_range) node.priceRange = s.price_range;
  if (s.org_logo) {
    node.logo = { '@type': 'ImageObject', '@id': `${site}/#logo`, url: s.org_logo, caption: s.org_name };
    node.image = { '@id': `${site}/#logo` };
  }

  const address: Node = { '@type': 'PostalAddress' };
  if (s.address_street) address.streetAddress = s.address_street;
  if (s.address_locality) address.addressLocality = s.address_locality;
  if (s.address_region) address.addressRegion = s.address_region;
  if (s.address_postal) address.postalCode = s.address_postal;
  if (s.address_country) address.addressCountry = s.address_country;
  if (Object.keys(address).length > 1) node.address = address;

  const lat = Number(s.geo_lat), lng = Number(s.geo_lng);
  if (Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)) {
    node.geo = { '@type': 'GeoCoordinates', latitude: lat, longitude: lng };
  }
  if (s.org_phone) {
    node.contactPoint = {
      '@type': 'ContactPoint',
      telephone: s.org_phone,
      contactType: 'customer service',
      availableLanguage: 'Indonesian',
    };
  }
  if (s.area_served) node.areaServed = { '@type': 'AdministrativeArea', name: s.area_served };
  const sameAs = s.social_profiles.filter(Boolean);
  if (sameAs.length) node.sameAs = sameAs;
  if (s.opening_hours.length) node.openingHours = s.opening_hours;
  return node;
}

function websiteNode(s: SeoSettings): Node {
  const site = s.site_url;
  return {
    '@type': 'WebSite',
    '@id': siteId(site),
    url: site,
    name: s.site_name,
    description: s.site_description,
    publisher: { '@id': orgId(site) },
    inLanguage: s.site_locale.replace('_', '-'),
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${site}/artikel?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };
}

function breadcrumbNode(site: string, canonical: string, items: BreadcrumbItem[]): Node {
  return {
    '@type': 'BreadcrumbList',
    '@id': `${canonical}#breadcrumb`,
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${site}${item.url}`,
    })),
  };
}

export function buildSchemaGraph(input: SchemaInput, s: SeoSettings): Node {
  const site = s.site_url;
  const { seo } = input;
  const graph: Node[] = [organizationNode(s), websiteNode(s)];

  const hasBreadcrumbs = Boolean(input.breadcrumbs?.length);
  if (hasBreadcrumbs) graph.push(breadcrumbNode(site, seo.canonical, input.breadcrumbs!));

  // `none` on an article disables the Article/BlogPosting node, not the base
  // WebPage entity that ties the URL into the site graph.
  const disabled = input.schemaType === 'none' && input.kind !== 'article';
  if (!disabled) {
    const webPageType =
      input.kind === 'article' ? 'WebPage'
      : (input.schemaType && input.schemaType !== 'none' ? input.schemaType : 'WebPage');

    const webPage: Node = {
      '@type': webPageType,
      '@id': seo.canonical,
      url: seo.canonical,
      name: seo.title,
      description: seo.description,
      isPartOf: { '@id': siteId(site) },
      about: { '@id': orgId(site) },
      inLanguage: s.site_locale.replace('_', '-'),
    };
    if (seo.ogImage) {
      webPage.primaryImageOfPage = { '@id': `${seo.canonical}#primaryimage` };
      graph.push({
        '@type': 'ImageObject',
        '@id': `${seo.canonical}#primaryimage`,
        url: seo.ogImage,
        contentUrl: seo.ogImage,
        caption: seo.ogImageAlt,
      });
    }
    if (hasBreadcrumbs) webPage.breadcrumb = { '@id': `${seo.canonical}#breadcrumb` };
    graph.push(webPage);

    if (
      input.kind === 'article' && input.article &&
      (!input.schemaType || ['Article', 'BlogPosting', 'NewsArticle'].includes(input.schemaType))
    ) {
      const a = input.article;
      const articleType = input.schemaType || 'BlogPosting';
      const node: Node = {
        '@type': articleType,
        '@id': `${seo.canonical}#article`,
        headline: a.title,
        description: seo.description,
        mainEntityOfPage: { '@id': seo.canonical },
        isPartOf: { '@id': seo.canonical },
        publisher: { '@id': orgId(site) },
        inLanguage: s.site_locale.replace('_', '-'),
      };
      if (a.image || seo.ogImage) node.image = { '@id': `${seo.canonical}#primaryimage` };
      if (a.publishedAt) node.datePublished = a.publishedAt;
      if (a.modifiedAt) node.dateModified = a.modifiedAt;
      if (a.authorName) {
        node.author = a.authorName.toLowerCase().replace(/\s+/g, '') === s.org_name.toLowerCase().replace(/\s+/g, '')
          ? { '@id': orgId(site) }
          : { '@type': 'Person', '@id': `${site}/#author-${slugKey(a.authorName)}`, name: a.authorName };
      }
      if (a.section) node.articleSection = a.section;
      if (a.keywords?.length) node.keywords = a.keywords.join(', ');
      if (a.wordCount) node.wordCount = a.wordCount;
      graph.push(node);
    }
  }

  if (input.faqs?.length) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${seo.canonical}#faq`,
      mainEntity: input.faqs.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    });
  }

  if (input.howTo?.steps.length) {
    graph.push({
      '@type': 'HowTo',
      '@id': `${seo.canonical}#howto`,
      name: input.howTo.name,
      step: input.howTo.steps.map((text, index) => ({
        '@type': 'HowToStep',
        position: index + 1,
        name: `Langkah ${index + 1}`,
        text,
      })),
    });
  }

  return { '@context': 'https://schema.org', '@graph': graph };
}

function slugKey(value: string): string {
  return encodeURIComponent(value.toLowerCase().trim()).replace(/%/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'default';
}

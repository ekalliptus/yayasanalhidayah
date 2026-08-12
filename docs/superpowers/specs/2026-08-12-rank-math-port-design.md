# Rank Math Port — Design

## Goal

Port the useful Rank Math SEO behavior from `SEO-RANK-MATH.zip` into the Astro 6 + Supabase CMS. Admin changes must become crawler-visible public output without editing source files or rebuilding static pages.

## Scope

- Global titles/meta templates with `%variable%` replacement
- Robots defaults + per-page/per-article overrides
- Open Graph, Twitter Cards, verification, GA4/GTM
- Organization/NGO Local SEO and JSON-LD `@graph`
- Dynamic sitemap index plus article/page/category/tag/image sitemaps (campaigns stay represented by `/program`; fragments are not crawlable URLs)
- Dynamic robots.txt, llms.txt
- Per-page SEO manager for all public routes
- Per-article SEO tabs, SERP preview, schema, canonical, robots, social overrides
- Content analyzer upgraded to approximately 35 checks
- Redirections (exact/contains/start/end/regex; 301/302/307/410/451)
- 404 monitor with hit counts and “create redirect” action
- IndexNow on publish
- Missing image alt/title templates
- Visible breadcrumbs + BreadcrumbList schema

## Architecture

1. **Database** — `seo_settings` JSON singleton for schema-fluid global settings; `page_seo` for pathname overrides; explicit article SEO columns; `redirections` and `redirection_404_log`. All exposed tables use RLS, explicit role grants, and indexed hot paths.
2. **SEO resolver** — pure TypeScript modules under `src/lib/seo/`. Settings merge, variables, robots, head resolution, schema graph, sitemap XML, redirects, IndexNow, and image SEO remain independently testable.
3. **Public output** — `Base.astro` calls one resolver, then `SeoHead.astro` emits the complete `<head>`. Dynamic endpoints consume the same settings. Article pages pass the article row; normal pages inherit `page_seo` by pathname.
4. **Admin** — `/admin/seo` owns global modules; `/admin/seo/pages`, `/redirections`, `/404` own row-based data. API routes validate writes with Zod and enforce admin roles server-side. Article editor owns content-specific SEO.

## Admin UI

Keep the existing dark shadcn system. Dense forms, compact cards, section tabs, clear help text, keyboard focus, responsive stacking. The distinctive element is a live Google-result preview generated through the same replacement-variable logic used publicly; no decorative redesign.

## Data flow

Admin form → authenticated `/api/seo/*` → Zod validation → RLS-backed Supabase write → short in-isolate cache expiration → public resolver → `<head>`/XML/text output. Article publish additionally submits the public URL to IndexNow when enabled.

## Security

- No service-role key outside `src/pages/api/**`; SEO APIs do not require it.
- Admin role checked both in middleware/API and RLS.
- Analytics IDs canonicalized before inline-script interpolation.
- Redirect destinations reject unsafe schemes; protocol-relative destinations collapse to local paths.
- Regex rules are length-capped and invalid expressions are ignored.
- 404 writes use a narrow SECURITY DEFINER RPC with explicit grants and bounded input.
- Public errors remain generic.

## Testing

- Bun unit tests: variables, robots precedence, head resolver, sitemap XML, redirect matching, image SEO, analyzer checks.
- Astro typecheck and production build.
- Migration dry-run/advisors when project access becomes available.
- Runtime smoke checks: homepage head, article head/schema, sitemap index/submaps, robots.txt, llms.txt, redirects, 404 logging, admin save.

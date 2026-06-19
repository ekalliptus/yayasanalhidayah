# Project: sedekahairminum

> Yayasan Sedekah Air Minum — website donasi untuk penyediaan air minum bersih
> bagi masyarakat yang membutuhkan. CMS, struktur section, dan pola arsitektur
> **sama persis** dengan `yayasanalhidayah` (Astro 5 hybrid + React 19 + TipTap v3
> + shadcn (base-nova) + Supabase + Cloudflare Workers). Bedanya hanya konteks
> homepage: program donasi air minum (pemasangan titik air, galon, sumur bor,
> distribusi rutin), bukan program pendidikan/amal umum.
>
> Template ini bisa disalin ke project Astro 5 hybrid + React 19 + TipTap v3 +
> shadcn (base-nova) + Supabase (Postgres + Auth + Storage) yang di-deploy ke
> Cloudflare Workers.

---

## Stack (referensi)

| Layer        | Tech                                                              |
|--------------|-------------------------------------------------------------------|
| Framework    | Astro 5.18 (hybrid: `output: 'static'`, SSR per-route)          |
| UI runtime   | React 19 (`@astrojs/react` + `@base-ui/react` primitives)        |
| Editor       | TipTap v3 + StarterKit + TextStyle/Highlight/TaskList            |
| Styling      | Tailwind v4 + shadcn (base-nova preset)                          |
| Data         | Supabase (Postgres + Auth + Storage)                              |
| Adapter      | `@astrojs/cloudflare` → **Cloudflare Worker** (bukan Pages)         |
| Runtime      | Cloudflare Workers + `nodejs_compat_v2`                            |
| Package mgr  | **Bun** (default di semua script — lihat bagian "Bun" di bawah)    |

> **Penting**: proyek ini **bukan** Cloudflare Pages. Adapter `cloudflare()` dengan
> `main: dist/_worker.js/index.js` + `assets: { directory, binding }` adalah model
> **Worker Assets**. Deploy via `bunx wrangler deploy`. Deploy hook URL
> berbentuk `https://api.cloudflare.com/client/v4/workers/builds/deploy_hooks/<ID>`
> (bukan `/pages/...`).

---

## Bun (runtime & package manager)

Default ke Bun, bukan Node.js/npm/pnpm/yarn.

- `bun <file>` bukan `node`/`ts-node`
- `bun test` bukan `jest`/`vitest`
- `bun build <file.html|file.ts|file.css>` bukan `webpack`/`esbuild`
- `bun install` bukan `npm/yarn/pnpm install`
- `bun run <script>` bukan `npm/yarn/pnpm run`
- `bunx <pkg> <cmd>` bukan `npx`
- Bun auto-load `.env`, **jangan** pakai `dotenv`
- Adapter `@astrojs/cloudflare` tetap nge-bundle ke `dist/_worker.js/index.js` →
  dipakai Cloudflare Workers (V8 isolate), bukan Bun runtime. Bun hanya untuk
  tooling lokal + build.

> Untuk SSR request handling di Cloudflare, **tetap** pakai `Request`/`Response`
> standar Web Fetch API (lihat `src/pages/api/**`). Jangan pakai `Bun.serve` —
> tidak relevan di Worker runtime.

---

## Homepage — konteks section (sedekahairminum)

Susunan section di `src/pages/index.astro` **sama** dengan yayasanalhidayah,
hanya copywriting + asset yang disesuaikan ke misi air minum:

| # | Section         | Konteks sedekahairminum                                                          |
|---|-----------------|----------------------------------------------------------------------------------|
| 1 | `Header`        | Nav: Beranda / Program / Tentang / Laporan / Donasi. CTA "Donasi Air".            |
| 2 | `Hero`          | Tagline: "Seteguk air, sejuta harapan." Subhead: ringkasan dampak (KK terlayani, titik air aktif, liter tersalur). 2 CTA: "Donasi Sekarang" + "Lihat Program". Slider foto: kegiatan distribusi, pemasangan titik air, sukarelawan. |
| 3 | `TrustMarquee`  | Logo mitra: yayasan partner, masjid/mushola penerima, korporat CSR, media.        |
| 4 | `About`         | Visi/misi (editable via `settings`): "Menjadi jembatan kebaikan dalam menyediakan air minum yang layak bagi umat." Didirikan, badan hukum, domisili. |
| 5 | `WhyUs`         | 3–4 poin: 100% donasi sampai (laporan transparan), tepat sasaran (verifikasi lapangan), sesuai syariat (tidak riba, tidak syubhat), akuntabel (audit publik). |
| 6 | `Programs`      | Cards campaign aktif: "Pemasangan Sumur Bor", "Titik Air Galon Mushola", "Distribusi Air Bersih Daerah Kekeringan", "Water Station Sekolah", dll. Tampilkan 3 terbaru + link "Lihat Semua Program" → `/program`. |
| 7 | `Testimonial`   | Quote dari penerima manfaat (warga, pengurus mushola, kepala desa) + donatur tetap. Slider/grid. |
| 8 | `DonorCTA`      | Section penutup: "Mulai dari Rp10.000 = 1 galon untuk 1 keluarga." QRIS, transfer bank, donasi rutin bulanan. |
| 9 | `Footer`        | Kontak, alamat sekretariat, WhatsApp, email, media sosial, legalitas.            |

> Bukti/kwitansi donasi, foto progres, dan laporan keuangan tetap di-tagging
> per campaign di `campaigns/` Supabase Storage. Sumber kebenaran section:
> `src/pages/index.astro` + `src/components/*.astro`.

---

## Setup pertama kali

Lihat **`docs/SETUP.md`** (atau sesuai project) untuk langkah detail. Urutan singkat:
1. `bun install`
2. Buat project Supabase, copy URL + anon key + service-role key
3. Copy `.dev.vars.example` → `.dev.vars` (gitignored), isi semua var
4. Terapkan migrasi SQL di `supabase/migrations/` berurutan (atau pakai `bunx supabase db push --linked`)
5. `bunx wrangler kv namespace create SESSION` (wajib, atau SSR akan error
   "Invalid binding SESSION") → paste ID-nya ke `wrangler.jsonc`
6. `bunx wrangler secret put` untuk semua secret (lihat bagian **Secrets** di bawah)
7. `bun run dev` (Astro) atau `bunx wrangler dev` (simulasi Worker)

---

## Jangan hapus (sudah punya alasan)

- Vite plugin `reactDomEdge()` di `astro.config.mjs` → memaksa `react-dom/server` ke edge build (dibutuhkan untuk Cloudflare).
- `compatibility_flags: ["nodejs_compat_v2"]` di `wrangler.jsonc` → Supabase/Node builtins.
- `assets` + `main: ./dist/_worker.js/index.js` di `wrangler.jsonc` → model Worker Assets.
- Field `SESSION` di `kv_namespaces` → binding placeholder yang dibutuhkan adapter.

---

## Aturan kerja (tidak boleh dilanggar)

### Keamanan & secret
- **Service-role key HANYA** boleh dipakai di `src/pages/api/**` (lihat `createSupabaseAdmin`).
- `import.meta.env.PUBLIC_*` dibaca **saat build** — taruh di `.env.production` (anon key aman di-commit, RLS-guarded).
- **Secret** (`SUPABASE_SERVICE_ROLE_KEY`, `CF_DEPLOY_HOOK_URL`, `CRON_SECRET`)
  via `wrangler secret put`, **jangan pernah** taruh di `wrangler.jsonc` atau `.env.production`.
- Cron secret HANYA via header `X-Cron-Secret`, **jangan** query string (ke-log di akses Cloudflare).
- Admin response wajib: `Cache-Control: no-store`, `X-Frame-Options: DENY` (di `middleware.ts`).
- **Jangan pernah** pakai `event.message` Supabase mentah di response ke client.
- CSP di `public/_headers`: `form-action 'self'`, `base-uri 'self'`, `object-src 'none'`. No unsafe-inline.
- Password policy: **min 8 char + 1 upper + 1 digit**, enforce di server (lihat `passwordStrengthError`).

### Routing & render mode
- Marketing pages = `static` (default). `/artikel/*` + `/admin/**` + `/api/**` = SSR.
  Wajib `export const prerender = false;` di file route SSR.
- Route admin-only: tambahkan prefix ke `ADMIN_ONLY_PREFIXES` di `middleware.ts`.
- Saat build, SSR route yang malformed → "Invalid binding SESSION" (perlu KV namespace
  nyata, bukan ID temp).

### Otorisasi
- **Login UI**: POST ke `/api/auth/login` (server-side), selalu tampilkan error
  generic, rate limit 3s/30s.
- **Owner-only** untuk: membuat admin baru, demote admin terakhir.
- **Demote admin terakhir** → tolak (minimal 1 admin/owner harus ada).
- **Edit/terbitkan artikel**: semua role login boleh (selaras RLS `articles_editor_all`).
  Guard cukup auth dasar di `save.ts`.
- **Query `articles` + profiles**: `author_id` FK ke `auth.users`, fetch terpisah
  (jangan `join profiles!author_id`).

### Editor (TipTap v3)
- **Selalu sanitize** `content_html` lewat `sanitizeArticleHtml()` sebelum simpan.
- `getHTML()` node = source of truth, sanitize untuk `content_html` di server.
- Image/cover/gambar inline → resize via custom NodeView (lihat
  `src/components/admin/editor/ResizableImage.tsx`).
- Autoload CSS + JS editor harus konsisten di admin dan preview publik (mirror styling).
- `EditorHandle` (forwardRef) untuk imperative API ke parent (paste judul otomatis,
  inject content, dll).
- Pakai `extensions[0].parent?.()` untuk extend node TipTap dengan atribut kustom
  (contoh: `width`, `data-align` di image).

### SEO & metadata
- **Visi/Misi** editable via settings (single-row key/value di tabel `settings`).
- **Rank-Math-style global SEO** di tabel `seo_settings` (key 'site'). Render ke
  `<head>` di `Layout.astro`; ambil via `getSeoSettings()`.
- **Focus keyword** artikel: kolom `articles.focus_keyword` (persist, bukan React state).
- **OG/Twitter/verifikasi/GA4** semua dikontrol via `seo_settings`, inject
  kondisional di Layout. Sanitasi input (mis. format `G-XXXXXX` untuk GA4) sebelum
  dipakai di inline script.

---

## Pola arsitektur yang sudah jadi

| Pola                        | Lokasi                                                              |
|----------------------------|--------------------------------------------------------------------|
| SEO rank-math global       | `src/lib/seo.ts` + `src/components/admin/seo/SeoForm.tsx`          |
| Rank math focus keyword    | Kolom `articles.focus_keyword` + SEO analyzer (`src/components/admin/articles/SeoAnalyzer.tsx`) |
| Cover adjustable (rasio+focal+size) | `articles.cover_ratio` / `cover_focal` / `cover_size` + `FocalPicker` |
| Resizable image NodeView   | `src/components/admin/editor/ResizableImage.tsx` (drag-handle + toolbar + alignment) |
| Auto-save draft (debounced) | `ArticleForm.tsx` + `AutosaveBadge` component                       |
| Role-based authz + audit  | `recordActivity()` di `src/lib/activity.ts` (jangan lupa)            |
| Idempotent SQL batches     | `supabase/apply_batch_*.sql` (dashboard-ready, drop-if-exists)       |
| `Base-UI` Select value→label | `items` prop wajib di `Select.Root` (value saja → tampil UUID)      |
| TipTap v3 text-style meta-package | `TextStyle` + subpath `color/font-family/font-size`              |

---

## File penting (sumber kebenaran)

```
astro.config.mjs                     # output: static, adapter: cloudflare(), Vite plugins
wrangler.jsonc                      # kompatibilitas, KV namespace, cron, vars (non-secret)
public/_headers                     # CSP, security headers
src/middleware.ts                   # auth gate, security headers, ADMIN_ONLY_PREFIXES
src/worker.ts                       # Astro fetch + scheduled() cron handler
src/lib/supabase/admin.ts           # createSupabaseAdmin (server-only, service role)
src/lib/supabase/server.ts          # SSR Supabase client (cookies)
src/lib/supabase/browser.ts         # browser Supabase client (admin islands)
src/lib/supabase/types.ts           # generated Database types — regenerate, jangan edit manual
src/lib/supabase/env.ts             # resolveEnv: workers runtime vs import.meta.env
src/lib/security.ts                 # passwordStrengthError, sanitasi input
src/lib/sanitize.ts                 # sanitizeArticleHtml — DOMPurify/sanitize-html policy
src/lib/activity.ts                 # recordActivity (audit log, wajib di setiap mutasi)
src/layouts/Layout.astro            # global head: SEO meta, OG, Twitter, GA4, verifikasi
src/styles/tailwind.css             # shadcn tokens (--background, --primary, dll) + light/dark
src/pages/index.astro               # homepage (9 section sesuai tabel konteks di atas)
src/components/*.astro              # Hero, TrustMarquee, About, WhyUs, Programs, Testimonial, DonorCTA, Footer
supabase/migrations/                # numbered SQL files, urut kronologis
supabase/apply_batch_*.sql          # single-file dashboard paste (idempoten)
```

---

## Secrets yang perlu di-set

Jalankan dari terminal repo, **interaktif** (akan prompt paste):

```bash
bunx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
bunx wrangler secret put CF_DEPLOY_HOOK_URL
bunx wrangler secret put CRON_SECRET
```

Untuk dev lokal → edit `.dev.vars` (gitignored). Template ada di `.dev.vars.example`.

---

## Perintah harian

```bash
bun install                # install deps
bun run dev                # Astro dev server (port 4321)
bunx wrangler dev          # simulasi Worker runtime
bun run build              # build → dist/
bunx wrangler deploy       # deploy ke Cloudflare
bunx astro check           # typecheck (juga di CI)
```

---

## Catatan portabilitas

Saat menyalin template ini ke project lain, **jangan** copy:
- File `src/lib/supabase/types.ts` (DB-schema spesifik, regenerate dari project baru)
- Migration SQL (sesuai schema project baru)
- `wrangler.jsonc` (name, account_id, KV namespace, vars project baru)
- `.env.production` / `.dev.vars` (credential project baru)

Yang **aman** disalin: pola di `src/lib/`, layout, komponen UI shadcn, struktur
folder, middleware template, dan **aturan + daftar pola arsitektur di CLAUDE.md ini**.

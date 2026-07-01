# Project: yayasanalhidayah

> Yayasan Al-Hidayah — website yayasan + CMS/blog + integrasi donasi WordPress.
> Pola arsitektur **sama** dengan sibling `sedekahairminum` (React 19 + TipTap v3
> + shadcn (base-nova) + Supabase). **BEDA UTAMA**: project ini pakai **Astro 6 +
> `@astrojs/cloudflare` v13** (sibling masih Astro 5 + v12) — banyak gotcha v13 di
> bawah. Juga punya integrasi WordPress (campaign donasi) yang tidak ada di sibling.

---

## Stack

| Layer        | Tech                                                              |
|--------------|-------------------------------------------------------------------|
| Framework    | **Astro 6** (hybrid: `output: 'static'`, SSR per-route)          |
| UI runtime   | React 19 (`@astrojs/react` + `@base-ui/react` primitives)        |
| Editor       | TipTap v3 + StarterKit + TextStyle/Highlight/TaskList/Table       |
| Styling      | Tailwind v4 + shadcn (base-nova preset)                          |
| Data         | Supabase (Postgres + Auth + Storage) — project `veekfqvmoddnyzlqklvi` |
| Adapter      | **`@astrojs/cloudflare` v13** (built on `@cloudflare/vite-plugin`) |
| Runtime      | Cloudflare Workers + `nodejs_compat_v2`                            |
| Donasi       | WordPress (`donasi.yayasanalhidayah.com`) → sync ke tabel `programs` |
| Package mgr  | **Bun**                                                            |

---

## Perbedaan v13 vs v12 (WAJIB paham — sumber banyak bug)

- **`Astro.locals.runtime.env` DIHAPUS di Astro 6.** Baca worker env lewat
  `workerEnv()` di `src/lib/supabase/runtime-env.ts` (yang `import { env } from
  'cloudflare:workers'`). JANGAN pakai `locals.runtime.env` — throw di request time.
- **`workerEntryPoint` + `platformProxy` DIHAPUS di v13.** Custom worker entry
  (`src/worker.ts` untuk `scheduled()` cron) **tidak bisa** dipasang cara lama →
  file itu sudah dihapus. **Cron keep-alive = eksternal**: cron-job.org / GitHub
  Action / CF Cron Trigger hit `/api/heartbeat` + header `X-Cron-Secret` tiap hari.
- **`wrangler.jsonc` TIDAK boleh set `main`/`assets`.** v13 adapter default-nya
  `main: @astrojs/cloudflare/entrypoints/server` + ASSETS binding otomatis.
  Set `main: ./dist/...` → error "doesn't point to an existing file".
- **KV `SESSION` tidak dipakai.** `astro.config.mjs` pin `session: { driver:
  sessionDrivers.null() }` supaya adapter berhenti auto-provision KV (gagal
  deploy code 10014). Auth = cookie Supabase, bukan Astro Sessions.
- **`@cloudflare/workers-types`** wajib di-reference di `src/env.d.ts`
  (`/// <reference types="@cloudflare/workers-types" />`) agar `cloudflare:workers`
  ke-type.
- **Build output**: v13 → `dist/client` + `dist/server` (bukan `dist/_worker.js`).

## Jangan hapus (sudah punya alasan)

- Vite plugin `reactDomEdge()` di `astro.config.mjs` → paksa `react-dom/server` ke
  edge build (browser build butuh `MessageChannel` yang tidak ada di workerd).
- `compatibility_flags: ["nodejs_compat_v2"]` di `wrangler.jsonc` → Supabase/Node builtins.
- `session: { driver: sessionDrivers.null() }` di `astro.config.mjs`.
- `import { env } from 'cloudflare:workers'` di `runtime-env.ts` (isolasi, jangan re-export dari `env.ts`).

---

## Aturan kerja (tidak boleh dilanggar)

### Keamanan & secret
- **Service-role key HANYA** di `src/pages/api/**` (`createSupabaseAdmin(workerEnv())`).
- `import.meta.env.PUBLIC_*` dibaca **saat build** → di `.env.production` (anon key aman, RLS-guarded).
- Secret via `bunx wrangler secret put` (SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET, CF_DEPLOY_HOOK_URL). Jangan di `wrangler.jsonc`.
- Cron secret HANYA via header `X-Cron-Secret` — jangan query string (ke-log).
- Admin response: `Cache-Control: no-store` + `X-Frame-Options: DENY` (di `middleware.ts`).
- Jangan pakai `error.message` Supabase mentah ke client — pakai pesan generic.
- Password: min 8 char + 1 upper + 1 digit (`passwordStrengthError` di `src/lib/security.ts`).
- CSP `public/_headers`: `form-action 'self'`, `base-uri 'self'`, `object-src 'none'`. No unsafe-inline.

### Routing & render
- Marketing = static; `/artikel/*` + `/admin/**` + `/api/**` = SSR (`export const prerender = false`).
- Route admin-only → tambah prefix ke `ADMIN_ONLY_PREFIXES` di `middleware.ts`.

### User management
- User baru dibuat **`email_confirm: true`** (langsung aktif — tidak ada SMTP; kalau `false` user tak bisa login selamanya). Lihat `api/users/create.ts`.
- Endpoint: `create.ts`, `update.ts` (edit nama + aktivasi manual), `delete.ts`, `update-role.ts`, `reset-password.ts`.
- **Owner-only**: buat admin, promote ke admin. **Last-admin guard**: tolak demote admin terakhir. Owner tak bisa dihapus/diubah, tak bisa hapus diri sendiri.

### Editor (TipTap v3)
- **Selalu** sanitize `content_html` lewat `sanitizeArticleHtml()` (`src/lib/sanitize.ts`) sebelum simpan, dirender via `set:html`.
- Sanitizer sudah izinkan: tabel + **colgroup/col + colwidth** (lebar kolom), **text-align pada p/h1-h6/li**, task list read-only, warna/font terbatas. Tambah mark/node baru → update allowlist atau ke-strip.
- `ResizableImage` (custom NodeView), doc/PDF upload dgn label link custom, smart title-paste (`handleTitlePaste` di `ArticleForm.tsx`), theme toggle ivory (`AdminShell.tsx`).

### WordPress / Programs
- `src/lib/wp/*` + `src/pages/api/programs/sync.ts` sync campaign dari WP (`WP_BASE_URL`) ke tabel `programs`. Public read tetap dari Supabase, bukan WP langsung.

---

## File penting

```
astro.config.mjs                    # output static, adapter v13, reactDomEdge, null session
wrangler.jsonc                      # nodejs_compat_v2, vars, NO main/assets/KV
public/_headers                     # CSP + security headers
src/middleware.ts                   # auth gate, security headers, ADMIN_ONLY_PREFIXES
src/lib/supabase/runtime-env.ts     # workerEnv() — ganti locals.runtime.env (v13)
src/lib/supabase/admin.ts           # createSupabaseAdmin (service role, api/** only)
src/lib/supabase/{server,browser}.ts
src/lib/supabase/types.ts           # generated — regenerate, jangan edit manual
src/lib/{security,sanitize,activity}.ts
src/lib/seo.ts                      # Rank-Math global SEO (tabel seo_settings)
src/lib/wp/                         # WordPress campaign sync
src/pages/api/users/               # create, update, delete, update-role, reset-password
src/pages/api/{heartbeat,contact,revalidate}.ts, programs/sync.ts
supabase/migrations/                # numbered SQL, urut kronologis
```

## Perintah harian

```bash
bun install
bun run dev                # port 4321
bun run build              # → dist/client + dist/server
bunx wrangler deploy
bunx astro check           # typecheck
bunx supabase gen types typescript --linked > src/lib/supabase/types.ts
```

import { defineConfig } from 'astro/config';
import { sessionDrivers } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const EDGE_SERVER = require.resolve('react-dom/server.edge');

// Vite plugin: react-dom/server → edge build ONLY during build. The edge build
// uses ReadableStream (no MessageChannel) which Workers need. In dev, the
// default node build works fine (Vite dev runs under Node, not workerd).
function reactDomEdge() {
  return {
    name: 'react-dom-edge',
    enforce: 'pre',
    apply: 'build',
    resolveId(source) {
      if (source === 'react-dom/server' || source === 'react-dom/server.browser') {
        return EDGE_SERVER;
      }
    },
  };
}

export default defineConfig({
  site: 'https://yayasanalhidayah.com',
  output: 'static',
  // @astrojs/cloudflare v13 is built on @cloudflare/vite-plugin: it reads
  // wrangler.jsonc bindings automatically (locals.runtime.env is populated from
  // `vars` + secrets in both dev and prod). The v12 `platformProxy`/`workerEntryPoint`
  // options no longer exist. imageService:'compile' inlines the image service.
  adapter: cloudflare({ imageService: 'compile' }),
  integrations: [sitemap(), react()],
  // No Astro Sessions used (auth = Supabase cookies). Pin a no-op session driver
  // so the adapter stops auto-provisioning a "SESSION" KV namespace on every deploy
  // (fails with code 10014 once the namespace already exists).
  session: {
    driver: sessionDrivers.null(),
  },
  build: {
    inlineStylesheets: 'always',
  },
  compressHTML: true,
  vite: {
    plugins: [tailwindcss(), reactDomEdge()],
    build: {
      chunkSizeWarningLimit: 1200,
    },
    ssr: {
      external: ['@supabase/supabase-js', '@supabase/ssr'],
    },
  },
});

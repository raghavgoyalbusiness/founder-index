// @ts-check
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwind from '@tailwindcss/vite';

// PLACEHOLDER: swap for the real domain before the first deploy. Used for
// canonical URLs, the sitemap and JSON-LD, so it has to be right in production.
const site = process.env.SITE_URL ?? 'https://founderindex.dev';

export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'ignore',
  integrations: [react(), sitemap()],
  vite: {
    plugins: [tailwind()],
    resolve: {
      alias: { '~': fileURLToPath(new URL('./src', import.meta.url)) },
    },
  },
  build: { inlineStylesheets: 'auto' },
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  devToolbar: { enabled: false },
});

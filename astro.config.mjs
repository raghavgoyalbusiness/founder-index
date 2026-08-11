// @ts-check
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwind from '@tailwindcss/vite';

// PLACEHOLDER: swap for the real domain before the first deploy. Used for
// canonical URLs, the sitemap and JSON-LD, so it has to be right in production.
const site = process.env.SITE_URL ?? 'https://founderindex.dev';

// Empty for a domain root (Vercel, Netlify, a custom domain). A GitHub Pages
// project site is served from /<repo>/, so set BASE_PATH=/founder-index there.
// Internal links go through `u()` in src/lib/url.ts, which reads this.
const base = process.env.BASE_PATH || undefined;

export default defineConfig({
  site,
  base,
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

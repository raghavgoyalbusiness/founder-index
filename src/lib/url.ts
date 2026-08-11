/**
 * Internal link helper.
 *
 * The site is written with root-absolute links (`/stage/build`), which is
 * right when it's served from a domain root — Vercel, Netlify, a custom
 * domain. GitHub Pages project sites live under `/<repo>/` instead, and a
 * root-absolute href would walk straight off the site.
 *
 * `u()` prefixes Astro's configured base, which is `/` unless BASE_PATH is
 * set at build time. So the same source deploys to either without a fork.
 */
const BASE = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');

export function u(path: string): string {
  // Leave anything that isn't an internal absolute path alone: full URLs,
  // hashes, mailto:, and the pre-filled GitHub issue links.
  if (!path.startsWith('/')) return path;
  return `${BASE}${path}` || '/';
}

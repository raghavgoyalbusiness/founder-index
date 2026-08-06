/**
 * Text helpers shared by the build scripts and the site itself.
 * Plain ESM with JSDoc types so `scripts/*.mjs` and Astro can both import it
 * without a build step. Keep it dependency-free.
 */

/** The hard ceiling on a `what` description. Enforced by scripts/validate.mjs. */
export const MAX_WHAT_WORDS = 12;

/**
 * Turn a resource name into a URL slug.
 *
 * Apostrophes are dropped rather than replaced, so "There's An AI For That"
 * becomes `theres-an-ai-for-that` and not `there-s-an-ai-for-that`.
 *
 * @param {string} value
 * @returns {string}
 */
export function slugify(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip combining accents
    .replace(/['‘’`]/g, '') // drop apostrophes entirely
    .replace(/&/g, ' and ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Count the words in a description.
 *
 * Standalone punctuation is not a word: the em dashes and plus signs used as
 * connectors ("Copy-paste React + Tailwind components") do not count against
 * the twelve-word budget. Hyphenated compounds count as one.
 *
 * @param {string} value
 * @returns {number}
 */
export function countWords(value) {
  return String(value)
    .split(/\s+/)
    .filter((token) => /[a-z0-9]/i.test(token)).length;
}

/**
 * Sentence-case-safe title for meta tags: collapses whitespace, trims.
 * @param {string} value
 * @returns {string}
 */
export function tidy(value) {
  return String(value).replace(/\s+/g, ' ').trim();
}

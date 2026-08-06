#!/usr/bin/env node
/**
 * Validates data/resources.json. Runs in CI on every commit and before every
 * build, so a bad entry can never reach the site.
 *
 * Checks, in order:
 *   1. JSON Schema conformance (data/schema.json)
 *   2. `what` is twelve words or fewer
 *   3. No duplicate names
 *   4. No two entries that would claim the same /tool/ URL
 *   5. No duplicate links
 *   6. `alternatives` point at entries that actually exist
 *   7. `lastChecked` is a real date, and not in the future
 *   8. Every stage referenced exists in data/stages.json
 *
 * Exit code 1 on any error. Warnings never fail the build.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { slugify, countWords, MAX_WHAT_WORDS } from '../src/lib/text.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));

const errors = [];
const warnings = [];
const fail = (entry, message) =>
  errors.push(entry ? `${entry.name || '(unnamed)'} — ${message}` : message);
const warn = (entry, message) =>
  warnings.push(entry ? `${entry.name || '(unnamed)'} — ${message}` : message);

const resources = read('data/resources.json');
const stages = read('data/stages.json');
const schema = read('data/schema.json');

// ---------------------------------------------------------------- 1. schema
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

if (!validate(resources)) {
  for (const err of validate.errors ?? []) {
    const index = Number(err.instancePath.split('/')[1]);
    const entry = Number.isInteger(index) ? resources[index] : null;
    const field = err.instancePath.split('/').slice(2).join('.') || '(root)';
    fail(entry, `${field} ${err.message}${err.params?.allowedValues ? ` (allowed: ${err.params.allowedValues.join(', ')})` : ''}`);
  }
}

// ------------------------------------------------- 2-8. rules schema can't do
const seenNames = new Map();
const seenSlugs = new Map();
const seenUrls = new Map();
const stageSlugs = new Set(stages.map((s) => s.slug));
const allNames = new Set(resources.map((r) => r.name));
const today = new Date().toISOString().slice(0, 10);

for (const entry of resources) {
  if (typeof entry?.name !== 'string' || typeof entry?.what !== 'string') continue;

  // 2. description length — the rule the directory lives or dies by
  const words = countWords(entry.what);
  if (words > MAX_WHAT_WORDS) {
    fail(entry, `"what" is ${words} words, limit is ${MAX_WHAT_WORDS}: "${entry.what}"`);
  }

  // 3. duplicate names
  if (seenNames.has(entry.name)) {
    fail(entry, 'duplicate name — every entry needs a distinct name');
  }
  seenNames.set(entry.name, entry);

  // 4. slug collisions would make two entries fight over one /tool/ page
  const slug = slugify(entry.name);
  if (!slug) {
    fail(entry, 'name produces an empty URL slug');
  } else if (seenSlugs.has(slug)) {
    fail(entry, `slug "${slug}" collides with "${seenSlugs.get(slug)}"`);
  } else {
    seenSlugs.set(slug, entry.name);
  }

  // 5. duplicate links — compare without protocol, www or trailing slash
  if (entry.url) {
    const key = entry.url
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/+$/, '')
      .toLowerCase();
    if (seenUrls.has(key)) {
      fail(entry, `duplicate link, already used by "${seenUrls.get(key)}": ${entry.url}`);
    } else {
      seenUrls.set(key, entry.name);
    }
  }

  // 6. alternatives must resolve
  for (const alt of entry.alternatives ?? []) {
    if (!allNames.has(alt)) {
      fail(entry, `alternatives lists "${alt}", which is not an entry in this file`);
    }
    if (alt === entry.name) {
      fail(entry, 'lists itself as an alternative');
    }
  }

  // 7. dates
  if (entry.lastChecked) {
    const parsed = new Date(entry.lastChecked);
    if (Number.isNaN(parsed.valueOf())) {
      fail(entry, `lastChecked "${entry.lastChecked}" is not a real date`);
    } else if (entry.lastChecked > today) {
      fail(entry, `lastChecked "${entry.lastChecked}" is in the future`);
    }
  }

  // 8. stage must exist
  if (entry.stage && !stageSlugs.has(entry.stage)) {
    fail(entry, `unknown stage "${entry.stage}"`);
  }

  // --- warnings: worth a look, never a build failure
  if (entry.verify && entry.url && entry.lastChecked) {
    warn(entry, 'has verify:true but also a lastChecked date — did someone forget to drop the flag?');
  }
  if (!entry.verify && !entry.url) {
    warn(entry, 'has no url and no verify flag');
  }
  if (/\b(supercharge|unlock|revolutionary|seamless|cutting-edge|game-chang)/i.test(entry.what)) {
    warn(entry, `"what" reads like homepage copy: "${entry.what}"`);
  }
}

// ------------------------------------------------------- 9. curated stacks
const stacks = read('data/stacks.json');
const seenStackSlugs = new Set();

for (const stack of stacks) {
  const label = { name: `stack "${stack.slug ?? stack.title}"` };

  if (!stack.slug || slugify(stack.slug) !== stack.slug) {
    fail(label, `slug must be lower-case and hyphenated, got "${stack.slug}"`);
  }
  if (seenStackSlugs.has(stack.slug)) {
    fail(label, 'duplicate stack slug');
  }
  seenStackSlugs.add(stack.slug);

  if (!Array.isArray(stack.items) || stack.items.length < 6 || stack.items.length > 10) {
    fail(label, `a stack is 6-10 entries, this one has ${stack.items?.length ?? 0}`);
  }
  for (const item of stack.items ?? []) {
    if (!allNames.has(item)) {
      fail(label, `lists "${item}", which is not an entry in data/resources.json`);
    }
  }
  if (new Set(stack.items ?? []).size !== (stack.items ?? []).length) {
    fail(label, 'lists the same entry twice');
  }
  for (const field of ['title', 'for', 'blurb']) {
    if (!stack[field]?.trim()) fail(label, `missing "${field}"`);
  }
}

// category hygiene: two spellings of the same thing inside one stage
const categoriesByStage = new Map();
for (const entry of resources) {
  if (!entry?.stage || !entry?.category) continue;
  const bucket = categoriesByStage.get(entry.stage) ?? new Map();
  const key = entry.category.toLowerCase().trim();
  if (bucket.has(key) && bucket.get(key) !== entry.category) {
    warn(entry, `category "${entry.category}" also appears as "${bucket.get(key)}" in this stage`);
  }
  bucket.set(key, entry.category);
  categoriesByStage.set(entry.stage, bucket);
}

// ------------------------------------------------------------------- report
const verified = resources.filter((r) => !r.verify).length;

if (warnings.length) {
  console.warn(`\n${warnings.length} warning${warnings.length === 1 ? '' : 's'}:`);
  for (const w of warnings) console.warn(`  · ${w}`);
}

if (errors.length) {
  console.error(`\n${errors.length} error${errors.length === 1 ? '' : 's'} in data/resources.json:\n`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  console.error('\nNothing was built. Fix the entries above and run again.\n');
  process.exit(1);
}

console.log(
  `\n✓ data/resources.json is valid — ${resources.length} entries, ` +
    `${verified} verified, ${resources.length - verified} awaiting a human.\n`
);

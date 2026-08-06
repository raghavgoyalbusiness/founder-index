#!/usr/bin/env node
/**
 * Pings every link in data/resources.json and writes a report of the ones that
 * have stopped working. Runs weekly in CI, which opens an issue from the report.
 *
 *   node scripts/check-links.mjs                 report to stdout
 *   node scripts/check-links.mjs --out report.md also write a markdown file
 *   node scripts/check-links.mjs --strict        exit 1 if anything is dead
 *
 * Deliberately forgiving: HEAD first, then GET, and a 403 or 405 counts as
 * alive because plenty of sites block robots without being broken. The point
 * is to catch domains that have actually gone, not to fight bot protection.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const resources = JSON.parse(readFileSync(join(root, 'data/resources.json'), 'utf8'));

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const outIndex = args.indexOf('--out');
const outFile = outIndex > -1 ? args[outIndex + 1] : null;

const CONCURRENCY = 8;
const TIMEOUT_MS = 15_000;
/** Blocked-by-bot-protection is not the same as gone. */
const ALIVE_ANYWAY = new Set([401, 403, 405, 406, 429, 999]);

const targets = resources.filter((r) => r.url);
const results = [];

async function ping(url, method = 'HEAD') {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method,
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent':
          'Mozilla/5.0 (compatible; FounderIndexLinkCheck/1.0; +https://github.com/founder-index/founder-index)',
        accept: 'text/html,application/xhtml+xml,*/*',
      },
    });
    return { status: response.status, finalUrl: response.url };
  } finally {
    clearTimeout(timer);
  }
}

async function check(entry) {
  try {
    let result = await ping(entry.url);
    // Some servers simply don't implement HEAD. Give them a second chance.
    if (result.status === 404 || result.status === 405 || result.status === 501) {
      result = await ping(entry.url, 'GET');
    }
    const ok = result.status < 400 || ALIVE_ANYWAY.has(result.status);
    return {
      entry,
      ok,
      status: String(result.status),
      redirectedTo:
        result.finalUrl && normalise(result.finalUrl) !== normalise(entry.url)
          ? result.finalUrl
          : null,
    };
  } catch (error) {
    const reason = error?.name === 'AbortError' ? 'timed out' : (error?.cause?.code ?? error?.message ?? 'failed');
    return { entry, ok: false, status: String(reason), redirectedTo: null };
  }
}

const normalise = (url) =>
  url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '').toLowerCase();

// A small worker pool — polite to the servers, quick enough for 200 links.
let cursor = 0;
async function worker() {
  while (cursor < targets.length) {
    const entry = targets[cursor++];
    const result = await check(entry);
    results.push(result);
    process.stderr.write(result.ok ? '.' : 'x');
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));
process.stderr.write('\n');

const dead = results.filter((r) => !r.ok).sort((a, b) => a.entry.name.localeCompare(b.entry.name));
const moved = results
  .filter((r) => r.ok && r.redirectedTo)
  .sort((a, b) => a.entry.name.localeCompare(b.entry.name));

const lines = [];
lines.push(`Checked ${targets.length} links on ${new Date().toISOString().slice(0, 10)}.`);
lines.push('');

if (dead.length === 0) {
  lines.push('Everything responded. Nothing to do.');
} else {
  lines.push(`## ${dead.length} not responding`);
  lines.push('');
  lines.push('| Entry | Status | Link |');
  lines.push('| --- | --- | --- |');
  for (const { entry, status } of dead) {
    lines.push(`| \`${entry.name}\` | ${status} | ${entry.url} |`);
  }
  lines.push('');
  lines.push(
    'A failure here is not proof a site is gone — some block automated requests. ' +
      'Open each one before removing it. If it really has gone, either delete the entry ' +
      'or set `"verify": true` and drop the `url` until someone finds where it moved to.'
  );
}

if (moved.length > 0) {
  lines.push('');
  lines.push(`## ${moved.length} redirecting somewhere else`);
  lines.push('');
  lines.push('| Entry | On file | Ends up at |');
  lines.push('| --- | --- | --- |');
  for (const { entry, redirectedTo } of moved) {
    lines.push(`| \`${entry.name}\` | ${entry.url} | ${redirectedTo} |`);
  }
  lines.push('');
  lines.push('Worth updating the file so the link goes straight there.');
}

const report = lines.join('\n');
console.log(report);
if (outFile) writeFileSync(join(root, outFile), `${report}\n`);

process.exitCode = strict && dead.length > 0 ? 1 : 0;

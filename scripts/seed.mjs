#!/usr/bin/env node
/**
 * One-time import: splits the original resources.seed.json into the files that
 * data/ is made of. After the first run, data/ is the source of truth and the
 * seed file stays in the repo only as provenance — the raw shape of the notes
 * this directory was built from.
 *
 *   node scripts/seed.mjs           refuses to clobber existing data files
 *   node scripts/seed.mjs --force   overwrites them anyway
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const force = process.argv.includes('--force');
const seed = JSON.parse(readFileSync(join(root, 'resources.seed.json'), 'utf8'));

mkdirSync(join(root, 'data'), { recursive: true });

const write = (name, value) => {
  const path = join(root, 'data', name);
  if (existsSync(path) && !force) {
    console.log(`· data/${name} already exists, left alone (use --force to overwrite)`);
    return;
  }
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
  console.log(`✓ wrote data/${name}`);
};

write('stages.json', seed.stages);
write('resources.json', seed.resources);
write('backlog.json', seed.launchDirectoriesBacklog);
write('excluded.json', seed.excludedFromSource);

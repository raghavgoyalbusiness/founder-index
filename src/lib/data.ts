/**
 * The whole data layer. Everything the site renders is derived here, once, at
 * build time — there is no database and no runtime fetching of content.
 */

import rawResources from '../../data/resources.json';
import rawStages from '../../data/stages.json';
import rawStacks from '../../data/stacks.json';
import backlog from '../../data/backlog.json';
import excluded from '../../data/excluded.json';
import schema from '../../data/schema.json';
import { slugify } from './text.js';

export interface Stage {
  slug: string;
  name: string;
  question: string;
}

export interface Resource {
  name: string;
  url?: string;
  what: string;
  stage: string;
  category: string;
  tags: string[];
  verify?: boolean;
  why?: string;
  alternatives?: string[];
  addedBy?: string;
  lastChecked?: string;
  affiliate?: boolean;
}

/** A resource with everything the templates need precomputed. */
export interface Entry extends Resource {
  slug: string;
  href: string;
  stageRef: Stage;
  /** 1-based position of its stage in the twelve. */
  stageNumber: number;
  host: string | null;
}

export interface Stack {
  slug: string;
  title: string;
  for: string;
  blurb: string;
  items: string[];
}

export const stages: Stage[] = rawStages as Stage[];
export const stackList: Stack[] = rawStacks as Stack[];
export const launchBacklog = backlog as { note: string; names: string[] };
export const excludedFromSource = excluded as {
  note: string;
  [group: string]: string | string[];
};

/** The canonical tag vocabulary, read straight from the schema so the two
 *  can never drift apart. */
export const allTags: string[] =
  (schema as any).definitions.resource.properties.tags.items.enum;

const stageBySlug = new Map(stages.map((s) => [s.slug, s]));
const stageIndex = new Map(stages.map((s, i) => [s.slug, i + 1]));

function hostOf(url?: string): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/** Every entry, in file order, decorated for rendering. */
export const entries: Entry[] = (rawResources as Resource[]).map((r) => {
  const stageRef = stageBySlug.get(r.stage);
  if (!stageRef) throw new Error(`${r.name}: unknown stage "${r.stage}"`);
  const slug = slugify(r.name);
  return {
    ...r,
    slug,
    href: `/tool/${slug}`,
    stageRef,
    stageNumber: stageIndex.get(r.stage) ?? 0,
    host: hostOf(r.url),
  };
});

const entryBySlug = new Map(entries.map((e) => [e.slug, e]));
const entryByName = new Map(entries.map((e) => [e.name, e]));

export const getEntry = (slug: string) => entryBySlug.get(slug);
export const getEntryByName = (name: string) => entryByName.get(name);

/** Entries in a stage, in file order. */
export const entriesInStage = (slug: string) =>
  entries.filter((e) => e.stage === slug);

/** Entries carrying a tag. */
export const entriesWithTag = (tag: string) =>
  entries.filter((e) => e.tags.includes(tag));

/** How many entries sit in each stage — the counts on the index. */
export const stageCounts: Record<string, number> = Object.fromEntries(
  stages.map((s) => [s.slug, entriesInStage(s.slug).length])
);

/** Tags that are actually used, with counts, most-used first. Tags in the
 *  schema but not yet on any entry are excluded — an empty tag page is a
 *  dead end, not a feature. */
export const tagCounts: { tag: string; count: number }[] = allTags
  .map((tag) => ({ tag, count: entriesWithTag(tag).length }))
  .filter((t) => t.count > 0)
  .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));

/** Tags present within one stage, for that stage's filter chips. */
export const tagsInStage = (slug: string) => {
  const counts = new Map<string, number>();
  for (const entry of entriesInStage(slug)) {
    for (const tag of entry.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
};

/** Entries in a stage, grouped by category. Categories are ordered by size,
 *  except "Unclassified", which is always last — it is a to-do list, not a
 *  section anyone is looking for. */
export function groupByCategory(list: Entry[]) {
  const groups = new Map<string, Entry[]>();
  for (const entry of list) {
    const bucket = groups.get(entry.category) ?? [];
    bucket.push(entry);
    groups.set(entry.category, bucket);
  }
  return [...groups.entries()]
    .map(([category, items]) => ({ category, items }))
    .sort((a, b) => {
      if (a.category === 'Unclassified') return 1;
      if (b.category === 'Unclassified') return -1;
      return b.items.length - a.items.length || a.category.localeCompare(b.category);
    });
}

/** Stacks with their items resolved to real entries. Validated in CI, so a
 *  missing name is a build failure rather than a silent gap. */
export const stacks = stackList.map((stack) => ({
  ...stack,
  entries: stack.items.map((name) => {
    const entry = entryByName.get(name);
    if (!entry) throw new Error(`stack "${stack.slug}" references unknown entry "${name}"`);
    return entry;
  }),
}));

export const getStack = (slug: string) => stacks.find((s) => s.slug === slug);

/** Other entries in the same stage and category — the "see also" on a tool
 *  page. Falls back to the stage when a category has only one member. */
export function related(entry: Entry, limit = 5): Entry[] {
  const sameCategory = entries.filter(
    (e) => e.slug !== entry.slug && e.stage === entry.stage && e.category === entry.category
  );
  const sameStage = entries.filter(
    (e) => e.slug !== entry.slug && e.stage === entry.stage && e.category !== entry.category
  );
  return [...sameCategory, ...sameStage].slice(0, limit);
}

/** Named alternatives, resolved. Names that don't resolve are dropped rather
 *  than rendered as dead text — CI catches them before they get here. */
export const alternativesOf = (entry: Entry): Entry[] =>
  (entry.alternatives ?? [])
    .map((name) => entryByName.get(name))
    .filter((e): e is Entry => Boolean(e));

export const totals = {
  entries: entries.length,
  verified: entries.filter((e) => !e.verify).length,
  unverified: entries.filter((e) => e.verify).length,
  stages: stages.length,
  tags: tagCounts.length,
  stacks: stacks.length,
  backlog: launchBacklog.names.length,
};

/** The repo the site is generated from. Used for edit links, issue templates
 *  and the "report a broken link" button. Change this if you fork. */
export const REPO = 'https://github.com/raghavgoyalbusiness/founder-index';

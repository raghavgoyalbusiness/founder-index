# Founder Index

An open, community-maintained directory of tools, grants, programmes and reading for people
starting a company — organised by **stage of the journey**, not by tool category.

A first-time founder doesn't know they need attribution software. They know they've launched
and nobody is coming back. So the site is filed by the question you're actually asking this
week, and the answer is two or three resources rather than forty.

**→ [raghavgoyalbusiness.github.io/founder-index](https://raghavgoyalbusiness.github.io/founder-index/)**

**211 resources · 12 stages · 30 tags · 5 curated stacks**

---

## No paid placement, ever

Nobody has paid to be in this directory and nobody can. There are no sponsored slots, no
boosted positions, and no better description in exchange for anything. Ordering is by
category size or file order — never by money.

**Affiliate links currently in the dataset: none.**

If one is ever added it must be marked `"affiliate": true`, which renders a visible chip on
the card, and it must be listed on that line above. The data is a single JSON file with a
public git history, so you can verify that claim yourself rather than taking it on trust.

## Honest about uncertainty

49 of the 211 entries carry `"verify": true`. That means the link or the description was
inferred from a name in the original notes and nobody has confirmed it since — the tool might
be misnamed, dead, or something other than what we assumed.

Those entries render with a muted **unverified** chip. They're shown rather than hidden,
because a guess labelled as a guess is more useful than a gap. What they never do is pretend.

A weekly GitHub Action pings every link and opens an issue listing anything that has stopped
responding.

## The twelve stages

| # | Stage | The question it answers |
|---|---|---|
| 01 | Explore the idea | Is there a real problem here, and who already solves it? |
| 02 | Validate with people | Will anyone actually use this before I build it? |
| 03 | Build the thing | How do I ship a working version this month? |
| 04 | Brand and design | How does it look, and does it look trustworthy? |
| 05 | Launch it | Where do I put this so the first 100 people see it? |
| 06 | Get customers | How do I find, convert and keep users repeatably? |
| 07 | Raise money | Grants, angels, accelerators, or none of it? |
| 08 | Legal, tax and money | How do I not blow myself up on paperwork? |
| 09 | Build a team | Co-founder, first hires, contractors, equity |
| 10 | Run the company | The boring machinery that keeps days from vanishing |
| 11 | Learn and connect | Playbooks, communities, and people ahead of me |
| 12 | Sell or buy | Acquiring a business, or getting out of one |

Stages are a rough sequence, not a pipeline. Most founders are in three at once.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md). The short version:

- It has to solve a **specific** founder problem
- The description is **twelve words or fewer**, in your own plain words
- If you **haven't used it**, set `"verify": true`

Two routes in: a pull request against `data/resources.json`, or the
[issue template](.github/ISSUE_TEMPLATE/add-resource.yml) if you'd rather not touch JSON.

Looking for somewhere to start? `data/backlog.json` holds ~90 launch directories that need a
confirmed URL and an honest description. One of those is a complete contribution.

## Running it

```bash
npm install
npm run dev        # localhost:5187
npm run validate   # check the data
npm run build      # validates, then builds to dist/
npm run check-links
```

Node 22 or newer.

### Stack

[Astro](https://astro.build) with React islands only where something has to be interactive
(search, and the tag filters on stage pages). Tailwind for styling, [Fuse.js](https://fusejs.io)
for search. Static output — no database, no auth, no server routes. Deploy `dist/` from `main`
to Vercel, Netlify or anything that serves files.

### Layout

```
data/resources.json          the directory itself
data/schema.json             JSON Schema, also the canonical tag list
data/stages.json             the twelve stages
data/stacks.json             curated bundles
data/backlog.json            names still needing URLs — good first issues
data/excluded.json           what was deliberately left out, and why
scripts/validate.mjs         fails the build on any schema or house-rule violation
scripts/check-links.mjs      weekly link check
scripts/seed.mjs             one-time import from resources.seed.json
src/                         the site
resources.seed.json          the original import, kept for provenance
```

`data/` is the source of truth. `resources.seed.json` is the raw shape the notes arrived in
and is not read at build time.

### What CI enforces

`scripts/validate.mjs` runs on every push and pull request, and again before every build:

- JSON Schema conformance
- No description longer than twelve words
- No duplicate names, no two entries claiming the same `/tool/` URL
- No duplicate links (compared without protocol, `www` or trailing slash)
- `alternatives` that resolve to real entries
- `lastChecked` is a real date and not in the future
- Curated stacks reference entries that exist, 6–10 per stack

### Deploying

```bash
npm run deploy
```

Builds and force-pushes `dist/` to the `gh-pages` branch, which GitHub Pages serves. Nothing
on `main` is touched.

The site is written with root-absolute links, which is right for a domain root. A GitHub Pages
project site lives under `/<repo>/` instead, so every internal link goes through `u()` in
`src/lib/url.ts`, which prefixes Astro's configured `base`. That base comes from the
`BASE_PATH` environment variable and is empty by default — so the same source deploys to a
root host with no changes:

| Host | Command |
| --- | --- |
| GitHub Pages | `npm run deploy` |
| Vercel / Netlify / custom domain | connect the repo; build `npm run build`, publish `dist` |

On Vercel or Netlify, leave `BASE_PATH` unset and set `SITE_URL` to the real domain.

### Still to replace

- `src/pages/about.astro` — a marked placeholder where the maintainer's name should go
- `src/lib/data.ts` — `REPO`, if you fork this. It drives the "edit this file" and "report a
  broken link" links

## Licence

Code is [MIT](LICENSE). The dataset is [CC BY 4.0](DATA-LICENSE) — take it, build something
better with it, just say where it came from.

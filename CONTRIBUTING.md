# Contributing

The data is one JSON file. There is no CMS, no login, and no approval queue beyond a pull
request. If you can edit `data/resources.json` you can change what the site says.

## The bar for inclusion

Three rules. They are the whole quality control, so they are enforced rather than suggested.

**1. It solves a specific founder problem.**
Not "a good tool" — a tool for a moment. Before adding something, finish this sentence: *you
would reach for this when you ______.* If you can't, it doesn't go in. A directory that lists
everything is worth the same as no directory.

**2. The description is honest and short.**
Twelve words maximum. Plain verbs. What it does **for you**, never the tool's own homepage
copy. CI counts the words and fails the build at thirteen.

> Good: `UK funding rounds and SEIS/EIS paperwork`
> Bad: `The all-in-one platform to supercharge your fundraise`

Standalone punctuation doesn't count against the twelve, so an em dash is free.

**3. If you haven't used it, say so.**
Set `"verify": true`. The entry renders with a muted *unverified* chip until a human confirms
the link and the description. This is a normal state — a large share of the entries are
sitting in it right now, inherited from the original notes.

Never quietly present a guess as a fact. An entry flagged as a guess is useful; an entry that
pretends is worse than nothing.

## Adding a resource

Add an object to the array in `data/resources.json`:

```jsonc
{
  "name": "SeedLegals",                                  // required, unique
  "url": "https://seedlegals.com/",                      // required unless verify is true
  "what": "UK funding rounds and SEIS/EIS paperwork",    // required, 12 words or fewer
  "stage": "legal",                                      // required, one of the twelve slugs
  "category": "Cap table",                               // required, groups cards in a stage
  "tags": ["uk", "paid"],                                // required, may be empty

  "verify": true,                                        // optional, default false
  "why": "One or two sentences of first-hand context.",  // optional, and the best part
  "alternatives": ["Vestd"],                             // optional, names of other entries
  "addedBy": "your-github-handle",                       // optional, credits you
  "lastChecked": "2026-08-06",                           // optional, ISO date
  "affiliate": false                                     // optional — see below
}
```

The twelve `stage` slugs, in order:

`explore` · `validate` · `build` · `brand` · `launch` · `grow` · `fund` · `legal` · `team` ·
`operate` · `learn` · `exit`

`category` is free text. Reuse an existing one where it fits — the stage page groups cards by
it, and two spellings of the same thing make two sections.

`tags` come from the fixed list in `data/schema.json`. Adding a new tag means changing the
schema in the same pull request, and being able to explain why the existing thirty don't do
the job.

`why` is optional and it is the most valuable field in the file. "Great tool" is not worth
writing. "The free tier stops at 500 rows, which is about two weeks of use" is.

## Then run

```bash
npm run validate
```

It checks the schema, the twelve-word limit, duplicate names, duplicate links, slug
collisions, `alternatives` that point at nothing, future dates, and the curated stacks in
`data/stacks.json`. The same script runs in CI on every push and pull request, and again
before every build — so a bad entry cannot reach the site.

Errors fail. Warnings don't, but read them.

## Working on the site

```bash
npm install
npm run dev        # localhost:5187
npm run build      # validates, then builds to dist/
```

Astro with React islands only where something has to be interactive — search and the stage
filters. Everything else is static HTML. Keep it that way: this is a content site and it
should ship almost no JavaScript.

## No paid placement

Nobody has paid to be in this directory and nobody can. No sponsored slots, no boosted
positions, no better description in exchange for anything. Pull requests that add a listing
on someone's behalf, in exchange for money or links, get closed.

If a link ever carries an affiliate or referral code it must be marked `"affiliate": true`,
which renders a visible chip on the card, and it must be declared in the README. There are
none today.

## Things that stay out

`data/excluded.json` records what was deliberately left out of the original notes and why —
personal links, off-topic sites, and a set of tools that are risky or violate someone's terms
(piracy, scraping people's faces, fake screenshots for ads). The list is in the repo so
nobody re-adds them by accident. If you think something on it belongs, argue the case in an
issue first.

## Good first contributions

`data/backlog.json` has around ninety launch directories that came out of the original notes
as names with no confirmed URL. Pick one, find the real link, write an honest twelve-word
description, open a pull request. That's a complete contribution.

The other easy one: take any entry with `"verify": true`, open the link, check it does what
the description claims, then either fix the description or add `"lastChecked"` and drop the
flag.

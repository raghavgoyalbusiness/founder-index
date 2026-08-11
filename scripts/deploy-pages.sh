#!/usr/bin/env bash
#
# Publish the site to GitHub Pages.
#
#   npm run deploy
#
# Builds with the project-site base path, then force-pushes dist/ to the
# gh-pages branch. Pages serves that branch at:
#
#   https://raghavgoyalbusiness.github.io/founder-index/
#
# Nothing here touches main. If you move to Vercel, Netlify or a custom
# domain, drop BASE_PATH entirely — the site is written for a domain root and
# only prefixes links when BASE_PATH is set.

set -euo pipefail

REPO_URL="https://github.com/raghavgoyalbusiness/founder-index.git"
BASE_PATH="${BASE_PATH:-/founder-index}"
SITE_URL="${SITE_URL:-https://raghavgoyalbusiness.github.io}"

cd "$(dirname "$0")/.."

echo "→ validating data"
node scripts/validate.mjs

echo "→ building for ${SITE_URL}${BASE_PATH}"
BASE_PATH="$BASE_PATH" SITE_URL="$SITE_URL" npx astro build

# GitHub Pages runs Jekyll by default, and Jekyll skips directories starting
# with an underscore — which would silently drop every asset in _astro/.
touch dist/.nojekyll

echo "→ pushing to gh-pages"
cd dist
rm -rf .git
git init -q -b gh-pages
git add -A
git commit -q -m "Deploy $(date -u '+%Y-%m-%d %H:%M UTC')"
git push -q -f "$REPO_URL" gh-pages

echo "✓ live at ${SITE_URL}${BASE_PATH}/"
echo "  (a redeploy takes a minute or so to show up)"

---
id: "013"
title: Build-output tests — new seo-rollout suite + page-count re-derivation + full verification
priority: P1
status: todo
dependencies: ["006", "007", "008", "009", "010", "011", "012"]
---

# Bead 013 — Build-output tests + full verification

> A bead is self-contained: an agent must implement it WITHOUT reopening the plan.

## Outcome

Two test files are in a passing state after a full `npm run build`:

1. **`tests/seo-rollout-build.test.ts`** (NEW, ~150 LOC) — a `describe.skipIf(noDist)`
   suite asserting every SEO-rollout-specific build-output requirement across all 8 new
   routes and the updated homepage.
2. **`tests/build-output.test.ts`** (EDITED) — the page-count band
   `expect.toBeGreaterThanOrEqual(6730)` / `expect.toBeLessThanOrEqual(6770)` is updated
   to reflect the actual post-SEO-rollout HTML page count, re-derived from a real build.

A full verification run passes:
```bash
npm run generate:data && npm run build && npm test && npm run typecheck && npm run lint
```

## Design intent / rationale

**Re-deriving the page-count band (plan §4.10, §8.2 — non-negotiable):**
The current band is `6730–6770` (pre-rollout). The rollout adds exactly 8 new static
routes. However, the plan explicitly states: **"re-derive both bounds from an actual
post-change build — the band is vacancy-data-dependent, so a blind +8 is only an estimate;
update both bounds and the descriptive comments."** The city pages and API grid fragments
are vacancy-dependent and fluctuate between builds. Procedure:

1. Run `npm run build` with all B6-B12 beads applied.
2. Run the `countHtml` helper (already defined in `tests/build-output.test.ts`) on `dist/`.
3. Record the exact count (e.g. `6745`).
4. Set lower bound = `actualCount - 5`, upper bound = `actualCount + 5` (±5 tolerance
   for vacancy-data variance, matching the ±20 implicit in the pre-rollout band).
5. Update the two `expect` lines and the descriptive comment with the exact count and the
   reference build date. Example comment:
   ```ts
   // Reference build 2026-05-XX: 6745 HTML files.
   // ~5790 content pages + ~958 /api/grid/ fragments (M14) + 8 SEO-rollout routes.
   // Band: 6740-6750 (±5 from reference count).
   ```

**Test suite structure for `tests/seo-rollout-build.test.ts`:**
Follow the exact patterns in `tests/build-output.test.ts`:
- `import { describe, it, expect } from 'vitest';`
- `import { existsSync, readFileSync } from 'fs';`
- `import { join, dirname } from 'path';`
- `import { fileURLToPath } from 'url';`
- `const DIST_DIR = join(ROOT, '..', 'dist');`
- `const skipIfNoDist = !existsSync(DIST_DIR);`
- `describe.skipIf(skipIfNoDist)('SEO rollout build output', () => { ... });`

Use AAA structure. Wrap every JSON-LD parse in try/catch with a descriptive error message.

**New routes covered:**
- 4 transport hubs: `dist/rabota-peshim-kurerom/index.html`,
  `dist/rabota-avtokurerom/index.html`, `dist/rabota-velokurerom/index.html`,
  `dist/podrabotka-kurerom/index.html`.
- 3 info-guides: `dist/skolko-zarabatyvaet-kurer/index.html`,
  `dist/kak-stat-kurerom/index.html`, `dist/usloviya-raboty-kurerom/index.html`.
- Reviews page: `dist/otzyvy/index.html`.
- Homepage: `dist/index.html` (add only the new assertions; do not duplicate existing ones).

**Decision C assertion for `/otzyvy/`:**
The suite must assert that the JSON-LD `@graph` contains no node with
`"@type": "AggregateRating"` at the page or `CollectionPage` level. Specifically:
```ts
const graph = JSON.parse(ldJson);
const nodes: unknown[] = graph['@graph'] ?? [];
const pageRatingNodes = nodes.filter(
  (n: any) => n['@type'] === 'AggregateRating'
);
expect(pageRatingNodes).toHaveLength(0);
```
Per-brand `aggregateRating` is nested inside `Organization` nodes — those are allowed.

**Security check (plan §7):**
For every new route, assert the JSON-LD block contains no unescaped `</script>`:
```ts
expect(ldJson).not.toContain('</script>');
```

**Sitemap assertions:**
`astro.config.mjs` (B7) assigns custom priorities. Concatenate all `dist/sitemap-*.xml`
files (excluding `sitemap-index.xml`) before asserting. Expected priorities:
- Hub URLs: `<priority>0.8</priority>`.
- Guide URLs: `<priority>0.7</priority>`.
- `/otzyvy/`: `<priority>0.6</priority>`.

## Acceptance criteria

- [ ] `tests/seo-rollout-build.test.ts` exists and all its tests pass.
- [ ] `tests/build-output.test.ts` page-count band is updated with the actual post-rollout
      count (re-derived from a real build, not estimated). The comment names the reference
      build date and the 8 added routes.
- [ ] For each of the 8 new routes, the suite asserts:
  - [ ] `dist/{slug}/index.html` exists.
  - [ ] Contains exactly one `<script type="application/ld+json">` block.
  - [ ] That block `JSON.parse`s without error.
  - [ ] That block contains no unescaped `</script>` sequence.
  - [ ] Contains a `<link rel="canonical">` with a non-empty `href`.
- [ ] For each of the 4 transport hubs, additionally:
  - [ ] HTML contains `id="vacancies"`.
  - [ ] HTML contains `id="jobs-grid"`.
  - [ ] HTML contains `class="job-card"` (or a non-empty empty-state message).
- [ ] For `/otzyvy/`, additionally:
  - [ ] JSON-LD `@graph` has no top-level `"@type": "AggregateRating"` node.
  - [ ] At most 48 elements matching `class="review-card"` (or equivalent class fragment).
- [ ] For each of the 4 category canonical pages (`dist/rabota-kurerom-peshkom/`,
      `dist/rabota-kurerom-na-avto/`, `dist/rabota-kurerom-na-velosipede/`,
      `dist/rabota-kurerom-podrabotka/`):
  - [ ] `<link rel="canonical">` points at the matching hub URL if the hub is non-empty,
        or is self-canonical if the hub is noindexed.
  - [ ] One unrelated category slug (e.g. `dist/rabota-kurerom-16-let/`) remains
        self-canonical.
- [ ] For `dist/index.html` (homepage):
  - [ ] `<title>` contains "курьер" and is <= 70 chars.
  - [ ] HTML links to all 4 hub hrefs (or fallback category slugs).
  - [ ] HTML links to `/skolko-zarabatyvaet-kurer/`.
- [ ] Sitemap assertions (concatenated `dist/sitemap-*.xml`):
  - [ ] All 8 new URLs present.
  - [ ] Hub URLs have `<priority>0.8</priority>`.
  - [ ] Guide URLs have `<priority>0.7</priority>`.
  - [ ] `/otzyvy/` has `<priority>0.6</priority>`.
  - [ ] Any hub with `isHubEmpty() === true` is absent from the sitemap.
- [ ] Full verification passes:
      `npm run generate:data && npm run build && npm test && npm run typecheck && npm run lint`.
- [ ] All pre-existing `tests/build-output.test.ts` assertions still pass (no regression).

## Edge cases

- **`dist/` absent:** all `seo-rollout-build.test.ts` tests skip via
  `describe.skipIf(skipIfNoDist)` — same guard as `build-output.test.ts`. Never throw
  in this case.
- **A hub is empty / noindex at test time:** detect by reading the hub HTML for
  `<meta name="robots"`. If `noindex` is present: assert the category page is
  self-canonical; assert the hub URL is absent from the sitemap. This must be a
  conditional assertion, not a hard `expect(canonical).toBe(hubUrl)`.
- **Multiple sitemap files:** Astro may emit `sitemap-0.xml`, `sitemap-1.xml`, etc.
  Use `readdirSync(DIST_DIR).filter(f => /^sitemap-\d+\.xml$/.test(f))` to collect them,
  then concatenate before searching.
- **`class="review-card"` counting:** the attribute value may include other class names.
  Use `(html.match(/class="[^"]*\breview-card\b/g) ?? []).length <= 48`.
- **Page-count band off by a few after re-derivation:** if the count fluctuates ±1
  between builds, expand tolerance to ±10. Document in the comment.
- **`JSON.parse` failure:** wrap in `try { ... } catch (e) { throw new Error('Failed to
  parse JSON-LD for /slug/: ' + e.message); }` to produce actionable errors.
- **`generate:data` script absent:** `npm run generate:data` may not exist in this repo.
  Run `npm run build` directly if so. Check `package.json` first.

## Failure modes

- **B6-B12 not all complete:** `existsSync` assertions fail. Error message names the
  missing file. Fix: complete all declared dependencies first.
- **Page-count band not updated:** if the pre-rollout band `6730–6770` is left in place
  and the actual count is `6738`, the lower bound may fail on a slow-data day. Fix:
  re-derive from a real build (this bead's primary responsibility).
- **Sitemap priority not set (B7 incomplete):** the priority assertions fail. Fix: run B7.
- **`</script>` in JSON-LD:** the security assertion fires. This is a pre-existing
  `BaseLayout` issue (plan §7). Flag it in the PR — do not fix silently in B13.
- **`AggregateRating` in `/otzyvy/` JSON-LD:** Decision C violation. Fix in B11.
- **Canonical category page asserts the wrong URL:** the canonical map must match on
  `data.slug` (the bare slug, e.g. `peshkom`) not `params.slug` (the route param
  `rabota-kurerom-peshkom`) — this is the key B7 correctness point; if the assertion
  fails, the bug is in B7's `CATEGORY_CANONICAL_HUB` lookup logic.

## Test obligations

- **Unit:** none. `seo-rollout-build.test.ts` is an integration-level build-output test.
- **E2E / full pipeline:** the acceptance command is:
  `npm run generate:data && npm run build && npm test && npm run typecheck && npm run lint`.
  This is the single gating check for B13.
- **Test isolation:** `seo-rollout-build.test.ts` must be idempotent — running it twice
  on the same `dist/` must produce the same results.
- **Coverage:** B13 targets 100% of its own assertions. It does not count toward coverage
  of the pure-helper modules (B1-B3 own that).

## Operational / admin hooks

- **`generate:data` script:** verify it exists in `package.json` before including it in
  the verification command. If absent, note it in the PR and use `npm run build` alone.
- **`scripts/generate-llms.mjs`:** plan §8.3 confirms this builds `public/llms-full.txt`
  from `knowledge-base.json` only — it does NOT enumerate `src/pages/` routes. No change
  needed. Do not add the 8 new routes to it.
- **`public/llms.txt`:** locate the script/source that emits this file and decide whether
  the 8 new routes belong there. This is a follow-up item for the owner, not a B13 blocker.
- **CI guidance:** add a comment to the updated page-count band in `build-output.test.ts`
  advising contributors to re-derive (not blindly +N) when they add new routes.
- **Sitemap exclusion of empty hubs:** `listingSlugs.ts` (B7) controls which hub paths
  are added to `getEmptyListingPaths()`. If a hub is excluded from the sitemap, the test
  must accept that its URL is absent — do not assert all 8 URLs unconditionally.

## Verification

Run these exact commands from the worktree root
(`/tmp/kurerok-seo-rollout/kurieros-astro`):

```bash
# 1. Check if generate:data exists, then run the full pipeline
npm run generate:data && npm run build && npm test && npm run typecheck && npm run lint
# If generate:data is absent:
npm run build && npm test && npm run typecheck && npm run lint

# 2. Run only the new suite (after build is present):
npx vitest run tests/seo-rollout-build.test.ts

# 3. Run only the updated page-count test:
npx vitest run tests/build-output.test.ts

# 4. Re-derive the page-count band:
node -e "
const fs = require('fs'), path = require('path');
function countHtml(dir) {
  let n = 0;
  for (const e of fs.readdirSync(dir, {withFileTypes:true})) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) n += countHtml(f);
    else if (e.isFile() && e.name.endsWith('.html')) n++;
  }
  return n;
}
const count = countHtml('dist');
console.log('Total HTML files after rollout build:', count);
console.log('Suggested new band: [' + (count-5) + ', ' + (count+5) + ']');
"
```

---
id: "007"
title: "Decision A — canonical map + listingSlugs extension + sitemap priority + canonicalOverride test"
priority: P0
status: todo
dependencies: ["006"]
---

# Bead 007 — Decision A: canonical map, sitemap priority, canonical override test

> A bead is self-contained: an agent must implement it WITHOUT reopening the plan.

## Outcome

Three existing files receive small additive edits, and one new test file is created:

1. **`src/pages/[slug].astro`** — gains the `CATEGORY_CANONICAL_HUB` constant and a `canonicalURL` prop that redirects the 4 exact-match category pages to their hub counterparts, guarded by `isHubEmpty`.
2. **`src/utils/listingSlugs.ts`** — `getEmptyListingPaths()` learns the 4 hub bare paths so empty hubs are excluded from the sitemap.
3. **`astro.config.mjs`** — the sitemap `serialize()` function gains explicit priority branches for the 8 new URLs via a closed `Set`.
4. **`tests/canonicalOverride.test.ts`** (NEW) — unit and build-output tests asserting map correctness and emitted canonical links.

The ~6 000 existing city/category pages are behaviorally unchanged. The 4 canonicaled category pages now emit `<link rel="canonical">` pointing at the matching hub — but only when that hub is non-empty.

## Design intent / rationale

**Why canonical rather than 301 redirect?** The site is `output:'static'` on GitHub Pages. Real 3xx redirects cannot be emitted. A meta-refresh hack is worse for SEO and users. `rel=canonical` is the textbook de-dup signal: two URLs share one intent — declare the rich hub canonical; search engines consolidate ranking onto the hub; the category page stays crawlable as a useful filter facet. All 3 competing plans converged on this decision.

**Why not delete or modify category pages?** They are interlinked from live indexed surfaces (`index.astro` `featuredFormats`/`routeCards`, `knowledge.ts` geo-links). Deleting or altering their slugs would break inbound internal links — violating the additive-only constraint.

**The `data.slug` match rule (critical).** The canonical map keys are bare category slugs: `peshkom`, `na-avto`, `na-velosipede`, `podrabotka`. In `[slug].astro`, the data object carries `data.slug` (the bare category slug, e.g. `peshkom`) — NOT `params.slug` (the full route param like `rabota-kurerom-peshkom`, which would never match the map keys). Always match against `Astro.props.data.slug` (or the equivalent destructured `data.slug`).

**The `isHubEmpty` canonical-to-noindex guard (Plan C, critical).** Emitting `<link rel="canonical" href="/rabota-peshim-kurerom/">` when that hub page carries `robots="noindex, follow"` is a self-inflicted indexing bug — a canonical pointing at a noindexed page. Guard: `[slug].astro` calls `isHubEmpty(jobsData, cfg)` (imported from `src/utils/transportHubs.ts`) before setting `canonicalURL`. If `isHubEmpty` returns `true`, `canonicalURL` falls back to `undefined` (self-canonical).

**Conservative scope.** Only 4 exact-match facets are canonicaled this run. The `flexible` tag is shared by 6 category pages total; only `podrabotka` is canonicaled. `svobodny-grafik`, `na-vyhodnye`, `vecherom`, `nochyu`, `zhenshchine` stay self-canonical (deferred to Open Question #6). `na-samokate` (`tag:'bicycle'`) also stays self-canonical this run.

**`getEmptyListingPaths()` bare-path convention.** Existing entries in `listingSlugs.ts` are bare paths (e.g. `/rabota-kurerom-peshkom`, no trailing slash). `getEmptyListingUrls` in `astro.config.mjs` appends `/` before comparing against sitemap URLs. Hub entries MUST follow the same convention: `/rabota-peshim-kurerom`, `/rabota-avtokurerom`, `/rabota-velokurerom`, `/podrabotka-kurerom`. A trailing slash on the bare path would break the sitemap filter match.

**Sitemap priority via explicit Set.** Use a closed `Set` in `serialize()` — no fragile substring checks. Priority levels: hubs `0.8`, guides `0.7`, `/otzyvy/` `0.6`. Without explicit assignment they default to `0.3`. Read the `site` value already set in `astro.config.mjs` to construct the full URLs for the Set — do not hardcode a domain.

**B7 must ship after B6.** If B7 is applied before the hub pages exist, category pages will emit canonicals pointing at 404s — a critical SEO bug. The dependency is enforced by bead ordering.

## Acceptance criteria

- [ ] `src/pages/[slug].astro` contains:
  ```ts
  const CATEGORY_CANONICAL_HUB: Readonly<Record<string, string>> = {
    peshkom:         '/rabota-peshim-kurerom/',
    'na-avto':       '/rabota-avtokurerom/',
    'na-velosipede': '/rabota-velokurerom/',
    podrabotka:      '/podrabotka-kurerom/',
    // OQ#6: na-samokate, svobodny-grafik, vecherom, nochyu, na-vyhodnye deferred
  };
  ```
- [ ] The canonical-override lookup in `[slug].astro` reads `data.slug` (NOT `params.slug`).
- [ ] The `isHubEmpty(jobsData, cfg)` guard is applied: a hub that is empty causes `canonicalURL` to remain `undefined`.
- [ ] The net-new edit to `[slug].astro` is <=15 LOC.
- [ ] `src/utils/listingSlugs.ts` — `getEmptyListingPaths()` iterates `HUB_CONFIGS` and appends the bare path (no trailing slash) of any empty hub.
- [ ] Hub bare paths in `listingSlugs.ts` have no trailing slash (e.g. `/rabota-peshim-kurerom`).
- [ ] `astro.config.mjs` — `serialize()` assigns priority `0.8` for hub URLs, `0.7` for guide URLs, `0.6` for `/otzyvy/`, using explicit `Set`s (not substring matching).
- [ ] `tests/canonicalOverride.test.ts` passes entirely.
- [ ] `npm run build` is green; existing page count is unchanged.
- [ ] `npm run typecheck` passes with zero new errors.
- [ ] `npm run lint` passes.
- [ ] `dist/rabota-kurerom-peshkom/index.html` has `<link rel="canonical">` href ending in `/rabota-peshim-kurerom/` (absolute URL).
- [ ] `dist/rabota-kurerom-na-avto/index.html` has canonical href ending in `/rabota-avtokurerom/`.
- [ ] `dist/rabota-kurerom-na-velosipede/index.html` has canonical href ending in `/rabota-velokurerom/`.
- [ ] `dist/rabota-kurerom-podrabotka/index.html` has canonical href ending in `/podrabotka-kurerom/`.
- [ ] An unaffected category page (e.g. `dist/rabota-kurerom-16-let/index.html`) still has a self-canonical.
- [ ] `sitemap-*.xml` includes the 8 new URLs with correct priorities; excludes any hub whose `isHubEmpty` returns true.

## Edge cases

- **Hub is empty at build time.** `isHubEmpty` returns `true` → `canonicalURL = undefined` → category page stays self-canonical. The hub page itself is `noindex`. The hub bare path appears in `getEmptyListingPaths()` output → sitemap omits it. All three parts must agree.
- **`data.slug` vs `params.slug` confusion.** The `[slug].astro` catch-all receives the full route param in `params.slug` (e.g. `rabota-kurerom-peshkom`), while `data.slug` is the bare category slug (`peshkom`). If uncertain, add a temporary `console.log` comparing both during a test build.
- **Non-category page types.** The canonical override must only activate when the page type is `'category'` (or the equivalent condition in `[slug].astro`'s existing logic). City pages must never be affected.
- **Canonical URL format.** Check how `BaseLayout` accepts a canonical URL — relative path vs absolute. Match the existing convention in the codebase exactly.
- **Domain in sitemap Set.** Read the `site` field from the existing `astro.config.mjs`. Do not hardcode `kurerok.ru`; the config is the single source of truth for the domain.
- **`na-samokate` (`tag:'bicycle'`)** is NOT in the map this run. Its feed is identical to the velo hub, but folding it is deferred to OQ#6. Leave it self-canonical.

## Failure modes

- **`data.slug` is undefined** — the override silently does nothing. Detection: build and grep category HTML for the expected canonical. Recovery: find the correct property path on the data object in `[slug].astro`'s `getStaticPaths` return or `Astro.props`.
- **Trailing slash on hub bare path in `listingSlugs.ts`** — empty hubs stay in the sitemap. Detection: compare `getEmptyListingPaths()` output against the sitemap's empty-hub check in `astro.config.mjs`. Recovery: remove the trailing slash.
- **Domain mismatch in sitemap priority `Set`** — priorities silently never apply (all new URLs show `0.3`). Detection: `grep -A2 'rabota-peshim-kurerom' sitemap-0.xml | grep priority`. Recovery: read `site` from the existing config and rebuild the Set.
- **Circular dependency** — `[slug].astro` or `listingSlugs.ts` importing `isHubEmpty` from `transportHubs.ts` must not create a cycle. `transportHubs.ts` must not import from `listingSlugs.ts` or `[slug].astro`. Pure TS utility module — no cycles expected.

## Test obligations

- **Unit (`tests/canonicalOverride.test.ts` — NEW):**

  ```ts
  describe('CATEGORY_CANONICAL_HUB map integrity')
    // Import the map from a re-exported constant or verify via build output
    test('every key is a real CATEGORIES slug') // no canonical-to-404 key
    test('every value is one of the 4 real hub URLs, with trailing slash')
    test('no hub URL appears as a key') // no self-override loop
    test('map has exactly 4 entries')

  describe('getEmptyListingPaths() hub extension', () => {
    test('includes bare hub path when isHubEmpty returns true for that hub')
    // Arrange: stub/inject a jobs fixture where foot filter returns []
    // Act: call getEmptyListingPaths(stubJobsData)
    // Assert: result includes '/rabota-peshim-kurerom' (no trailing slash)

    test('excludes hub bare path when feed is non-empty')
    test('existing city/category listing paths are unaffected')
  })

  describe('sitemap priorities (build-output, skipIf noDist)')
    test('/rabota-peshim-kurerom/ has priority 0.8 in sitemap')
    test('/skolko-zarabatyvaet-kurer/ has priority 0.7 in sitemap')
    test('/otzyvy/ has priority 0.6 in sitemap')
    test('existing slug /rabota-kurerom/ has priority != 0.8 (not misclassified)')
  ```

- **Build-output (via `seo-rollout-build.test.ts` in B13):**
  - `dist/rabota-kurerom-peshkom/index.html` has absolute canonical href ending `/rabota-peshim-kurerom/`.
  - An unaffected slug has a self-canonical.

## Operational / admin hooks

- **Open Question #6 note:** Add the comment `// OQ#6: na-samokate, svobodny-grafik, vecherom, nochyu, na-vyhodnye deferred` inside `CATEGORY_CANONICAL_HUB` so future implementers know these were intentional omissions.
- No new env vars, no config beyond the sitemap priority, no migrations.
- The `[slug].astro` edit is fully reversible: removing the ~15-LOC block restores pre-B7 behaviour.

## Verification

```bash
# From worktree root: /tmp/kurerok-seo-rollout/kurieros-astro

npm run build

# Category pages now carry hub canonical
grep 'rel="canonical"' dist/rabota-kurerom-peshkom/index.html
# expected: href="https://<site>/rabota-peshim-kurerom/"

grep 'rel="canonical"' dist/rabota-kurerom-na-avto/index.html
# expected: href="https://<site>/rabota-avtokurerom/"

grep 'rel="canonical"' dist/rabota-kurerom-na-velosipede/index.html
# expected: href="https://<site>/rabota-velokurerom/"

grep 'rel="canonical"' dist/rabota-kurerom-podrabotka/index.html
# expected: href="https://<site>/podrabotka-kurerom/"

# Unaffected page stays self-canonical
grep 'rel="canonical"' dist/rabota-kurerom-16-let/index.html
# expected: href="https://<site>/rabota-kurerom-16-let/"

# Sitemap priorities
grep -A2 'rabota-peshim-kurerom' sitemap-0.xml | grep priority
# expected: <priority>0.8</priority>

grep -A2 'skolko-zarabatyvaet-kurer' sitemap-0.xml | grep priority
# expected: <priority>0.7</priority>

grep -A2 'otzyvy' sitemap-0.xml | grep priority
# expected: <priority>0.6</priority>

npm run typecheck
npm run lint
npx vitest run tests/canonicalOverride.test.ts
npx vitest run
```

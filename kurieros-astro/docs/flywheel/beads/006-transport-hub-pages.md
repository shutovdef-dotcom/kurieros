---
id: "006"
title: "4 transport-hub page files"
priority: P0
status: todo
dependencies: ["005"]
---

# Bead 006 — 4 transport-hub page files

> A bead is self-contained: an agent must implement it WITHOUT reopening the plan.

## Outcome

Four new thin Astro page files exist:

- `src/pages/rabota-peshim-kurerom.astro`
- `src/pages/rabota-avtokurerom.astro`
- `src/pages/rabota-velokurerom.astro`
- `src/pages/podrabotka-kurerom.astro`

Each produces a fully-rendered transport-hub page under its corresponding URL (with `trailingSlash:'always'` the trailing slash is applied by Astro). Pages are indexable when the job feed is non-empty, and explicitly `noindex, follow` when empty. The build is green; no existing pages are altered.

## Design intent / rationale

**Explicit static files, not a `[hub].astro` catch-all.** The existing `src/pages/[slug].astro` already handles ~6 000 city/category slugs. A new `[hub].astro` would collide with it in ambiguous ways and complicate per-page QA. Four explicitly-named files give Astro's static-file-first resolution precedence over the `[slug]` catch-all, make QA trivially obvious per file, and incur zero ambiguity.

**Thin page files — all data work, no template duplication.** Each file is ~30-45 LOC. The pattern:
1. Import `HUB_CONFIGS` from `src/utils/transportHubs.ts` (built in B1) and pick the right key.
2. Import `allJobs` (or `jobsData`) using the same import pattern that `src/pages/[slug].astro` uses for the central job store.
3. Call `filterJobsByCriteria(jobsData, cfg.filter)` to get `filteredJobs`.
4. Derive `isEmpty = filteredJobs.length === 0`.
5. Derive `companyNames` (unique, deduped via `Set`, first 5) and `maxSalary` (max salary across `filteredJobs`, `0` when empty).
6. Call `buildHubTitle`, `buildHubDescription`, `buildHubFaqItems`, `buildHubSchemaGraph` from `src/utils/transportHubs.ts`.
7. Render `<BaseLayout robots={isEmpty ? 'noindex, follow' : undefined} title={...} description={...} schema={...}>` wrapping `<Header/>`, `<main><TransportHub .../></main>`, `<Footer/>`.
8. Pass all computed props into `<TransportHub config={cfg} filteredJobs={filteredJobs} isEmpty={isEmpty} faqItems={faqItems} companyNames={companyNames} maxSalary={maxSalary} />`.

The four files differ **only** in the `HUB_CONFIGS` key they pick:

| File | `HUB_CONFIGS` key | `cfg.filter` | Demand/mo |
|------|-------------------|--------------|----------:|
| `rabota-peshim-kurerom.astro` | `'foot'` | `{ tag: 'foot' }` | 87 837 |
| `rabota-avtokurerom.astro` | `'auto'` | `{ tag: 'auto' }` | 63 046 |
| `rabota-velokurerom.astro` | `'bicycle'` | `{ tag: 'bicycle' }` | 17 483 |
| `podrabotka-kurerom.astro` | `'flexible'` | `{ tag: 'flexible' }` | 18 396 |

**`robots` propagation is the critical correctness concern.** The `BaseLayout` must receive `robots="noindex, follow"` when `isEmpty`. This makes the sitemap-`isHubEmpty` guard in B7 meaningful — both must agree: the page says noindex AND the sitemap omits it.

**No canonical override in these page files.** The canonical for a hub page is its own URL (self-canonical). The `CATEGORY_CANONICAL_HUB` override lives in `[slug].astro` and points *at* these hub pages — that is B7's concern.

## Acceptance criteria

- [ ] `src/pages/rabota-peshim-kurerom.astro` exists and is <=50 LOC.
- [ ] `src/pages/rabota-avtokurerom.astro` exists and is <=50 LOC.
- [ ] `src/pages/rabota-velokurerom.astro` exists and is <=50 LOC.
- [ ] `src/pages/podrabotka-kurerom.astro` exists and is <=50 LOC.
- [ ] Each file imports `HUB_CONFIGS` from `src/utils/transportHubs.ts` and picks the correct key.
- [ ] Each file calls `filterJobsByCriteria(jobsData, cfg.filter)` using the same `jobsData` import pattern as `src/pages/[slug].astro`.
- [ ] `isEmpty = filteredJobs.length === 0` is computed and passed to `BaseLayout` as `robots="noindex, follow"` when true, and `undefined` otherwise.
- [ ] `<TransportHub>` receives all required props: `config`, `filteredJobs`, `isEmpty`, `faqItems`, `companyNames`, `maxSalary`.
- [ ] `npm run build` completes without error; 4 new `dist/**/index.html` files are emitted at `dist/rabota-peshim-kurerom/index.html`, `dist/rabota-avtokurerom/index.html`, `dist/rabota-velokurerom/index.html`, `dist/podrabotka-kurerom/index.html`.
- [ ] Each emitted HTML contains `id="jobs-grid"` and `id="vacancies"` (rendered by `TransportHub.astro` from B5).
- [ ] Each emitted HTML contains exactly one `<link rel="canonical">` pointing at its own URL with trailing slash.
- [ ] Each emitted HTML contains exactly one `<script type="application/ld+json">`.
- [ ] No existing pages are broken (build output count does not decrease relative to the pre-B6 baseline).
- [ ] `npm run typecheck` passes with zero new errors.
- [ ] `npm run lint` passes.

## Edge cases

- **`flexible` tag empty (Open Question #3):** `podrabotka-kurerom.astro` sets `isEmpty=true` and `robots="noindex, follow"`. This is correct behaviour. The page still renders all static blocks (hero, FAQ, requirements, income blurb) — evergreen content. Add a build-time `console.warn('[podrabotka-kurerom] No flexible-tag jobs — page is noindex')` so the build log signals it.
- **`maxSalary` when all salaries are null/undefined:** derive as `0`; `buildHubTitle` / `buildHubDescription` handle the `isEmpty` branch that omits salary copy when empty.
- **`companyNames` derivation:** `Array.from(new Set(filteredJobs.map(j => j.company))).slice(0, 5)`. If `filteredJobs` is empty, pass `[]`.
- **`trailingSlash:'always'`:** do not add a trailing slash manually to the canonical href in the page file — Astro / `BaseLayout` applies it. Verify the emitted `<link rel="canonical">` ends with `/`.
- **Route collision:** Astro resolves explicit static routes before `[slug].astro`. Verify by confirming the build emits exactly one HTML file per new slug.

## Failure modes

- **`filterJobsByCriteria` import path wrong** — build error. Recovery: check the exact import path used in `src/pages/[slug].astro` and replicate.
- **`TransportHub` prop mismatch** — TypeScript build error on `npm run typecheck`. Recovery: check the `Props` interface exported by `src/components/TransportHub.astro` (B5) and align exactly.
- **`HUB_CONFIGS` key typo** — TypeScript compile error (`TransportHubKey` union rejects the wrong string literal). Recovery: fix the key string to match the union.
- **`robots` not wired to `BaseLayout`** — noindex pages get indexed. Detection: after build, `grep -l 'noindex' dist/podrabotka-kurerom/index.html`. Recovery: pass `robots` prop correctly to `BaseLayout`.

## Test obligations

- **Unit:** No new unit tests in B6. The underlying logic (`buildHubTitle`, `isHubEmpty`, etc.) is covered by B1's `tests/transportHubs.test.ts`. Build-output assertions are added in B13.
- **E2E (build-output):** The implementer MUST run a local build after writing the files and spot-check:
  ```bash
  ls dist/rabota-peshim-kurerom/index.html
  ls dist/rabota-avtokurerom/index.html
  ls dist/rabota-velokurerom/index.html
  ls dist/podrabotka-kurerom/index.html
  grep -c 'id="jobs-grid"' dist/rabota-peshim-kurerom/index.html   # expect 1
  grep -c 'rel="canonical"' dist/rabota-peshim-kurerom/index.html  # expect 1
  grep 'noindex' dist/rabota-peshim-kurerom/index.html             # expect no output (foot tag has jobs)
  ```

## Operational / admin hooks

- **Open Question #3 pre-flight:** Before starting this bead, verify `filterJobsByCriteria(jobsData, {tag:'flexible'}).length > 0` in a build-time script or REPL. If zero, `podrabotka-kurerom.astro` will launch as `noindex`. This is acceptable per the plan, but must be flagged in the PR description.
- No config changes, env vars, or migrations. These pages are purely additive.

## Verification

```bash
# From the worktree root: /tmp/kurerok-seo-rollout/kurieros-astro

npm run build

# Confirm 4 new dist outputs exist
ls dist/rabota-peshim-kurerom/index.html
ls dist/rabota-avtokurerom/index.html
ls dist/rabota-velokurerom/index.html
ls dist/podrabotka-kurerom/index.html

# Confirm structural elements in one hub (repeat for others)
grep -c 'id="jobs-grid"' dist/rabota-peshim-kurerom/index.html   # 1
grep -c 'id="vacancies"' dist/rabota-peshim-kurerom/index.html   # 1
grep 'rel="canonical"'   dist/rabota-peshim-kurerom/index.html   # must end with /rabota-peshim-kurerom/

npm run typecheck
npm run lint
npx vitest run
```

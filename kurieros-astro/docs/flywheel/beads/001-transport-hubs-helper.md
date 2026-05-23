---
id: B1
title: "Implement transportHubs.ts pure helper + unit tests"
priority: P0
status: todo
dependencies: []
---

# Bead B1 — `transportHubs.ts` helper + tests

> A bead is self-contained: an agent must implement it WITHOUT reopening the plan.

## Outcome

Two files exist and all tests pass:

- `src/utils/transportHubs.ts` (~180 LOC, pure — no Astro globals, no module-scope `new Date()`) exporting the full public API described below.
- `tests/transportHubs.test.ts` with ≥80% branch coverage on every exported function.

## Design intent / rationale

The 4 transport hubs (пеший / авто / вело / подработка) are ~95% identical in structure. A single config-table + builder pattern avoids 4 forked copies drifting apart. The ~5% that differs (H1 copy, FAQ seeds, requirement bullets, the matching category-facet path) lives in `HUB_CONFIGS` as pure data. This mirrors the discipline of `cityListingPage.ts` — no Astro globals, no side-effects, total functions that return defaults/empty on bad input.

`categoryFacetPath` is the single source of truth for Decision A's canonical map in `[slug].astro` (bead B7) and for the optional "точная фильтрация" link in `HubCrossLinks`. `isHubEmpty` is shared between the hub page files (bead B6) and `[slug].astro` (bead B7) so both agree on whether a hub is empty — preventing a canonical pointing at a `noindex` page.

The `ItemList` / `ListItem` shape in `buildHubSchemaGraph` MUST be copied from `cityListingPage.ts::buildPageSchemaGraph`'s category branch — not invented. Read that function before writing this one.

## Acceptance criteria

- [ ] `TransportHubKey = 'foot' | 'auto' | 'bicycle' | 'flexible'` is exported.
- [ ] `HubConfig` type is exported with fields: `key: TransportHubKey`, `slug: string`, `filter: { tag: string }`, `h1: string`, `eyebrow: string`, `categoryFacetPath: string`, `faqSeeds: string[]`, `incomeBlurb: string`, `requirementsBullets: string[]`.
- [ ] `HUB_CONFIGS: Readonly<Record<TransportHubKey, HubConfig>>` is exported with exactly 4 entries covering keys `'foot'`, `'auto'`, `'bicycle'`, `'flexible'`.
- [ ] `HUB_CONFIGS['foot'].slug === 'rabota-peshim-kurerom'`, `HUB_CONFIGS['auto'].slug === 'rabota-avtokurerom'`, `HUB_CONFIGS['bicycle'].slug === 'rabota-velokurerom'`, `HUB_CONFIGS['flexible'].slug === 'podrabotka-kurerom'`.
- [ ] `HUB_CONFIGS['foot'].categoryFacetPath === 'rabota-kurerom-peshkom'`, `'auto'` -> `'rabota-kurerom-na-avto'`, `'bicycle'` -> `'rabota-kurerom-na-velosipede'`, `'flexible'` -> `'rabota-kurerom-podrabotka'`.
- [ ] `HUB_CONFIGS['foot'].filter.tag === 'foot'`, `'auto'` -> `'auto'`, `'bicycle'` -> `'bicycle'`, `'flexible'` -> `'flexible'`.
- [ ] `buildHubTitle(cfg, count, maxSalary, isEmpty)` returns a string ≤70 chars for every combination of `isEmpty = true/false`, `count = 0`, `count = 1`, `count = 1000`, `maxSalary = 0`, `maxSalary = 150000`, across all 4 configs.
- [ ] `buildHubDescription(cfg, count, companyNames, isEmpty)` returns a string ≤170 chars in all branches.
- [ ] `buildHubFaqItems(cfg, count, companyNames)` returns a non-empty `FaqItem[]` where `FaqItem` is imported from `cityListingPage.ts` (do not redefine the type).
- [ ] `buildHubSchemaGraph(args)` returns a `@graph` array containing exactly: a `CollectionPage` node, an `ItemList` node, a `FAQPage` node, and a `BreadcrumbList` node.
- [ ] `buildHubSchemaGraph` with `jobs = []` → `ItemList.numberOfItems === 0` and `ItemList.itemListElement` is an empty array (not absent).
- [ ] `buildHubSchemaGraph` with `jobs` populated → `ItemList.itemListElement` contains up to 10 `ListItem` objects each shaped `{ "@type": "ListItem", position: number, name: string, url: string }` where `url` starts with `/v/`.
- [ ] `buildHubSchemaGraph` → `BreadcrumbList` uses `buildBreadcrumbSchema` imported from `schema.ts` (do not inline the builder).
- [ ] `isHubEmpty(jobsData, cfg)` returns `true` when `filterJobsByCriteria(jobsData, cfg.filter)` returns an empty array, `false` otherwise. It is a pure function — it MUST call `filterJobsByCriteria` internally, not re-implement filtering.
- [ ] No `new Date()` at module scope. No Astro global imports.
- [ ] `npm run typecheck` passes (no TypeScript errors in this file or its test).
- [ ] `npx vitest run tests/transportHubs.test.ts` passes with 0 failures.

## Edge cases

- `buildHubTitle` with `isEmpty=true` → must produce a meaningful non-empty title (not just whitespace or the bare h1), still ≤70 chars.
- `buildHubTitle` with `maxSalary=0` → omit salary from the string; do not emit "до 0 ₽".
- `buildHubDescription` with `companyNames=[]` → must not produce a trailing comma or empty parentheses; still ≤170 chars.
- `buildHubFaqItems` → each `FaqItem` must have non-empty `question` and `answer` strings; answers must not be placeholder text.
- `buildHubSchemaGraph` when `jobs` has more than 10 entries → only first 10 appear in `ItemList.itemListElement`.
- `isHubEmpty` with a `jobsData` object where the relevant tag is absent entirely → returns `true` (not a crash).

## Failure modes

- **Type mismatch with `FaqItem`** — if `cityListingPage.ts` changes the `FaqItem` shape, this file's import will produce a TypeScript error caught by `typecheck`. Recovery: update import path or re-align the type.
- **Title/description exceeds char limit** — the test assertions on string length catch this at CI time. Recovery: shorten the template strings in the config or builders.
- **`buildBreadcrumbSchema` signature change** — `schema.ts` is reused as-is; if it throws on unexpected args, the unit test calling `buildHubSchemaGraph` will fail with a clear error. Recovery: align the call-site args to the current signature.
- **`filterJobsByCriteria` import path wrong** — TypeScript error at compile time. Recovery: verify the import path by checking `src/utils/jobFilters.ts` exists and exports `filterJobsByCriteria` before writing the import statement.

## Test obligations

**Unit (`tests/transportHubs.test.ts`):**

```
describe('HUB_CONFIGS', () => {
  it('has exactly 4 entries with valid unique slugs')
  it('each entry has a non-empty h1, eyebrow, incomeBlurb, requirementsBullets')
  it('each filter.tag is one of foot|auto|bicycle|flexible')
  it('categoryFacetPath values match expected rabota-kurerom-* facet slugs')
})

describe('buildHubTitle', () => {
  it('returns ≤70 chars — isEmpty=false, count=500, maxSalary=120000, foot config')
  it('returns ≤70 chars — isEmpty=true, count=0, maxSalary=0, foot config')
  it('returns ≤70 chars — all 4 configs × isEmpty=false/true (matrix)')
  it('omits salary text when maxSalary=0')
})

describe('buildHubDescription', () => {
  it('returns ≤170 chars — 3+ company names, isEmpty=false')
  it('returns ≤170 chars — companyNames=[], isEmpty=false')
  it('returns ≤170 chars — isEmpty=true')
})

describe('buildHubFaqItems', () => {
  it('returns a non-empty array for each of the 4 configs')
  it('each item has non-empty question and answer strings')
})

describe('buildHubSchemaGraph', () => {
  it('@graph contains CollectionPage, ItemList, FAQPage, BreadcrumbList nodes')
  it('ItemList.itemListElement is an empty array when jobs=[]')
  it('ItemList.numberOfItems=0 when jobs=[]')
  it('ItemList.itemListElement has ≤10 items when jobs has 15 entries')
  it('each ListItem has shape { @type: "ListItem", position, name, url } with url starting /v/')
  it('FAQPage.mainEntity is non-empty')
})

describe('isHubEmpty', () => {
  it('returns true when no jobs match the hub tag')
  it('returns false when at least 1 job matches the hub tag')
})
```

All tests use AAA structure. Use synthetic fixture `jobsData` arrays (small, no file I/O) for `isHubEmpty` tests. Import all symbols directly from `../../src/utils/transportHubs`.

**E2E:** None for this bead — it is a pure helper; build-output coverage is owned by bead B13.

## Operational / admin hooks

None. This is a pure utility module — no config flags, no observability, no migrations.

## Verification

Run in order:

```sh
npm run typecheck
npx vitest run tests/transportHubs.test.ts
npm run lint
```

All 3 commands must exit 0. Full build (`npm run build`) is not required for this bead — that is bead B13's responsibility.

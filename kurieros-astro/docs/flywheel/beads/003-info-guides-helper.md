---
id: B3
title: "Implement infoGuides.ts helper skeleton + unit tests"
priority: P0
status: todo
dependencies: []
---

# Bead B3 — `infoGuides.ts` helper skeleton + tests

> A bead is self-contained: an agent must implement it WITHOUT reopening the plan.

## Outcome

Two files exist and all tests pass:

- `src/utils/infoGuides.ts` (pure — no Astro globals, no module-scope `new Date()`) exporting the full public API described below, with real config entries for all 3 guides.
- `tests/infoGuides.test.ts` with ≥80% branch coverage on every exported function, including anti-thin-content assertions gated by `it.todo`.

**Note on editorial content (Open Question #2):** Guide prose, income tables, FAQ copy, and HowTo steps are unwritten editorial content blocked on the content author. This bead ships the config *skeleton* — all 3 `INFO_GUIDES` entries with structural fields populated; prose fields that require authored copy are marked `"TODO(OQ2): ..."`. The anti-thin-content unit tests (`>=300 words total body per guide`, `>=2 sections`, `non-empty FAQ`) MUST be written as `it.todo` stubs and will remain skipped until beads B8/B9/B10 author the content. That is intentional — the failing tests gate those beads.

## Design intent / rationale

Three info-guides target high-demand informational queries:
- `/skolko-zarabatyvaet-kurer/` — "сколько зарабатывает курьер" (76K impressions/mo, P0)
- `/kak-stat-kurerom/` — "как стать курьером" (31K/mo, P1)
- `/usloviya-raboty-kurerom/` — "условия и график работы" (25K/mo, P2)

These are standalone top-level routes (not under `/guide/`) because:
- The spec requires keyword-exact top-level URLs — `/guide/` burial forfeits ranking signals.
- The existing `guide/[topic].astro` is a rigid KB-FAQ-card renderer over 12 fixed `TOPIC_META` topics — the wrong shape for long-form editorial (income tables, `IncomeCalculator` embed, step-by-step HowTo).
- Precedent: `calculator.astro`, `compare.astro`, `cities.astro` are all bespoke top-level pages.

`buildGuideSchemaGraph` produces: `Article` (headline ≤110 chars — Google's documented cap, distinct from `seoTitle` ≤70); optional `HowTo` (only when `config.howTo` is non-undefined — never emit an empty `HowTo`); `FAQPage`; `BreadcrumbList`.

`Article.datePublished` / `dateModified` come from `config.publishedDate` / `config.modifiedDate` — NOT from `knowledge-base.json`'s `generated` field. Do not couple guide freshness signals to KB regeneration cadence.

`guide/[topic].astro` and `guide/index.astro` are untouched (additive).

## Acceptance criteria

- [ ] `InfoGuideKey = 'income' | 'how-to-become' | 'work-conditions'` is exported.
- [ ] `GuideSection` type exported: `{ heading: string; body: string }`.
- [ ] `HowToStep` type exported: `{ name: string; text: string }`.
- [ ] `HowToConfig` type exported: `{ name: string; steps: HowToStep[] }`.
- [ ] `InfoGuideConfig` type exported with fields: `key: InfoGuideKey`, `slug: string`, `h1: string`, `kicker: string`, `lead: string`, `seoTitle: string`, `metaDescription: string`, `sections: GuideSection[]`, `faqItems: FaqItem[]`, `howTo?: HowToConfig`, `relatedGuideSlugs: string[]`, `ctaHubSlug: string`, `showCalculator?: boolean`, `kbTopics: string[]`, `publishedDate: string`, `modifiedDate: string`.
- [ ] `FaqItem` is imported from `src/utils/cityListingPage.ts` (not redefined).
- [ ] `INFO_GUIDES: Readonly<Record<InfoGuideKey, InfoGuideConfig>>` exported with exactly 3 entries.
- [ ] `INFO_GUIDES['income'].slug === 'skolko-zarabatyvaet-kurer'`.
- [ ] `INFO_GUIDES['how-to-become'].slug === 'kak-stat-kurerom'`.
- [ ] `INFO_GUIDES['work-conditions'].slug === 'usloviya-raboty-kurerom'`.
- [ ] `INFO_GUIDES['income'].showCalculator === true`.
- [ ] `INFO_GUIDES['how-to-become'].howTo` is defined (not `undefined`).
- [ ] `INFO_GUIDES['work-conditions'].howTo` is `undefined`.
- [ ] `INFO_GUIDES['income'].ctaHubSlug === 'rabota-peshim-kurerom'`.
- [ ] Each entry: `seoTitle.length <= 70`, `metaDescription.length <= 170`.
- [ ] Each entry: `publishedDate` and `modifiedDate` are valid ISO 8601 date strings (`YYYY-MM-DD` format).
- [ ] `buildGuideSchemaGraph(config: InfoGuideConfig, pageUrl: string, siteUrl: string)` returns an object with a `@graph` array.
- [ ] `@graph` contains `Article`, `FAQPage`, `BreadcrumbList` for every config.
- [ ] `@graph` contains `HowTo` only when `config.howTo` is defined; `HowTo` is absent when `config.howTo` is `undefined`.
- [ ] `Article.headline` is ≤110 chars.
- [ ] `Article` has `author` (non-empty object), `publisher` (non-empty object), `inLanguage: 'ru-RU'`, `datePublished`, `dateModified`.
- [ ] `Article.datePublished === config.publishedDate`, `Article.dateModified === config.modifiedDate`.
- [ ] `BreadcrumbList` uses `buildBreadcrumbSchema` from `src/utils/schema.ts` (not inlined).
- [ ] No `new Date()` at module scope. No Astro global imports.
- [ ] `npm run typecheck` passes with 0 errors.
- [ ] `npx vitest run tests/infoGuides.test.ts` exits 0 with all non-skipped tests passing and anti-thin-content items shown as `todo`.

## Edge cases

- `buildGuideSchemaGraph` with `config.howTo = undefined` → `@graph` has exactly 3 nodes; no `HowTo` node present.
- `buildGuideSchemaGraph` with `config.howTo` set → `@graph` has exactly 4 nodes.
- `Article.headline` derived from `config.h1`: if `config.h1` is longer than 110 chars, truncate to 107 chars + `"…"` rather than emitting an over-limit headline.
- `seoTitle` ≤70 chars is a data-entry constraint: enforce by unit test assertion, not by silent truncation (the config author must fix it, not the runtime).
- `FAQPage.mainEntity` must be non-empty — each guide config must have ≥1 `FaqItem`; the unit test for the skeleton may use placeholder items marked `TODO(OQ2)`.
- `relatedGuideSlugs` should only reference slugs of other `INFO_GUIDES` entries or known hub slugs — a unit test asserts no completely unrecognised strings.

## Failure modes

- **Anti-thin-content `it.todo` stubs absent** — if a subsequent bead simply deletes the stubs rather than un-skipping them, thin content ships silently. The stubs must be present in the committed test file with the `TODO(OQ2)` comment so code review catches removal.
- **`seoTitle` or `metaDescription` over char limit** — caught by unit test. Recovery: shorten in the config data.
- **`Article.headline` over 110 chars** — caught by unit test. Recovery: shorten `h1` in config, or implement the 107+`"…"` truncation.
- **`FaqItem` import path wrong** — TypeScript error. Recovery: verify `cityListingPage.ts` exports `FaqItem` before writing the import.
- **`buildBreadcrumbSchema` signature mismatch** — TypeScript error. Recovery: inspect `src/utils/schema.ts` for the current signature before writing the call site.

## Test obligations

**Unit (`tests/infoGuides.test.ts`):**

```
describe('INFO_GUIDES', () => {
  it('has exactly 3 entries')
  it('slugs match expected values')
  it('income entry has showCalculator=true')
  it('how-to-become entry has howTo defined')
  it('work-conditions entry has howTo=undefined')
  it('each seoTitle is ≤70 chars')
  it('each metaDescription is ≤170 chars')
  it('each publishedDate and modifiedDate are valid ISO date strings')
  it('relatedGuideSlugs reference only known slugs')
  // Anti-thin-content — blocked on OQ#2 editorial content:
  it.todo('each entry has >=2 sections with non-empty heading and body // TODO(OQ2)')
  it.todo('each entry faqItems is non-empty // TODO(OQ2)')
  it.todo('total body word count across sections is >=300 per guide // TODO(OQ2)')
})

describe('buildGuideSchemaGraph', () => {
  it('@graph contains Article, FAQPage, BreadcrumbList for config without howTo')
  it('@graph contains Article, HowTo, FAQPage, BreadcrumbList for config with howTo')
  it('HowTo is absent when config.howTo is undefined')
  it('Article.headline is ≤110 chars')
  it('Article has author, publisher, inLanguage="ru-RU"')
  it('Article.datePublished equals config.publishedDate')
  it('Article.dateModified equals config.modifiedDate')
  it('FAQPage.mainEntity is present (array of question nodes)')
})
```

All tests use AAA structure. Import all symbols from `../../src/utils/infoGuides`. No file I/O.

**E2E:** None for this bead — build-output and schema assertions are owned by bead B13.

## Operational / admin hooks

None. Pure utility module — no config flags, no migrations.

## Verification

Run in order:

```sh
npm run typecheck
npx vitest run tests/infoGuides.test.ts
npm run lint
```

Expected: `typecheck` and `lint` exit 0; `vitest` exits 0 with all non-skipped tests passing and `it.todo` items clearly listed in output. Anti-thin-content `it.todo` stubs remain skipped until B8/B9/B10 author content.

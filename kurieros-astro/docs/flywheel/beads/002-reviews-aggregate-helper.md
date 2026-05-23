---
id: B2
title: "Implement reviewsAggregate.ts pure helper + unit tests"
priority: P0
status: todo
dependencies: []
---

# Bead B2 — `reviewsAggregate.ts` helper + tests

> A bead is self-contained: an agent must implement it WITHOUT reopening the plan.

## Outcome

Two files exist and all tests pass:

- `src/utils/reviewsAggregate.ts` (~130 LOC, pure — no Astro globals, no side-effects) exporting the full public API described below.
- `tests/reviewsAggregate.test.ts` with ≥80% branch coverage on every exported function.

## Design intent / rationale

`/otzyvy/` aggregates ~19 144 review rows from `src/data/reviews.json` (row shape: `{id, jobId, company, jobTitle, name, city, pros, cons, comment, rating, date}`) grouped by brand. The site already emits per-brand `Organization` + `AggregateRating` JSON-LD on `/companies/{slug}/` pages — `/otzyvy/` must be *consistent* with that existing markup, not introduce new structured-data risk.

Three key decisions baked into this helper:

1. **No page-level `AggregateRating`** — averaging ratings across different employers is not a rating of one reviewable entity. Engines treat it as misleading. Omit it entirely.
2. **Per-brand `Organization` + `aggregateRating` + ≤6 `Review` items — only for brands that have a real `/companies/{slug}/` page** — so markup is backed by a real URL.
3. **`REVIEWS_BRAND_SLUG` is a fresh explicit map keyed by the exact 8 `reviews.json` display names** — do NOT reuse `knowledge.ts`'s `COMPANY_ROUTE_SLUGS` (it is module-private, keyed by source-id not display name, returns `undefined` for most entries). Do NOT rely on `slugifyCompany` round-tripping display names — it does not.

The 8 review brand display names and their company-page slugs:
- `"Купер"` → `"kuper-ex-sbermarket"`
- `"Альфа-Банк"` → `"alfa-bank"`
- `"Efin"` → `"efin"`
- `"Т-Банк"` → `"t-bank"`
- `"Яндекс Еда"` → `"yandex-eda"`
- `"Бургер Кинг"` → `"burger-king"`
- `"Ozon fresh"` → `"ozon-fresh"`
- `"Ozon"` → `"ozon"`

**Before implementing, verify two things:**
1. Each of the 8 slugs produces a real `/companies/{slug}/` route — check the companies data source (likely `src/data/companies.json` or similar) for these exact slugs.
2. `src/utils/seededShuffle.ts` exists and exports `(array: T[], seed: string) => T[]`. It already backs `ReviewsBlock` on the homepage. If the file or signature differs, adapt it carefully without breaking the existing `ReviewsBlock` consumer.

Honest-content guards: drop brands with `< MIN_REVIEWS_PER_BRAND` reviews; clamp `ratingValue` to [1, 5]; never emit `NaN` or `0` ratings. `buildReviewAggregate` returns `[]` on empty input so `otzyvy.astro` (bead B11) can detect the zero-reviews case and set `robots="noindex, follow"`.

`ReviewLike` reuses the type from `src/utils/companies.ts` — do not redefine it. Import it.

## Acceptance criteria

- [ ] `ReviewLike` type is imported from `src/utils/companies.ts` (not redefined).
- [ ] `MIN_REVIEWS_PER_BRAND = 3` is exported as a named constant.
- [ ] `REVIEWS_BRAND_SLUG: Readonly<Record<string, string>>` is exported with exactly the 8 brand → slug entries listed above (exact display-name keys, exact slug values).
- [ ] `BrandReviewSummary` type is exported with fields: `brand: string`, `slug: string`, `companyHref: string | undefined`, `reviewCount: number`, `averageRating: number`, `ratingDistribution: Record<number, number>`, `sampleReviews: ReviewLike[]`.
- [ ] `buildReviewAggregate(reviews: ReviewLike[]): BrandReviewSummary[]` returns result sorted descending by `reviewCount`.
- [ ] Brands with `reviewCount < MIN_REVIEWS_PER_BRAND` are excluded from the result.
- [ ] `averageRating` is computed from finite ratings only (skip `NaN`, `Infinity`, non-numbers), rounded to 1 decimal place, clamped to [1, 5].
- [ ] `ratingDistribution` is `{1: count, 2: count, 3: count, 4: count, 5: count}` counting only finite integer ratings in [1, 5].
- [ ] `sampleReviews` is `seededShuffle(brandReviews, 'otzyvy-' + company).slice(0, 6)` — deterministic across two calls with identical input.
- [ ] `companyHref` is `/companies/{slug}/` when the brand display name is in `REVIEWS_BRAND_SLUG`; `undefined` otherwise.
- [ ] `buildReviewsSchemaGraph(summaries: BrandReviewSummary[], pageUrl: string, siteUrl: string)` returns a `@graph` array.
- [ ] `@graph` top node is a `CollectionPage` with an `ItemList` of brand sections.
- [ ] Per-brand `Organization` + `aggregateRating` nodes emitted **only** when `companyHref` is defined AND `reviewCount >= MIN_REVIEWS_PER_BRAND` AND `averageRating` is finite in [1, 5].
- [ ] No top-level `AggregateRating` node in the graph — `@graph` must contain no object with `"@type": "AggregateRating"` at the array root level.
- [ ] Each per-brand `Review` sample in the schema: ≤6 items, each with `"@type": "Review"`.
- [ ] `ratingValue` in every emitted `aggregateRating` node is a number, never `NaN`, never `0`, never `> 5`.
- [ ] `npm run typecheck` passes with 0 TypeScript errors in this file and its test.
- [ ] `npx vitest run tests/reviewsAggregate.test.ts` passes with 0 failures.

## Edge cases

- `reviews = []` → `buildReviewAggregate` returns `[]` without throwing.
- All ratings for a brand are non-finite → that brand's `averageRating` would be `NaN`; the brand must be excluded from schema `Organization` markup (the finite-only filter handles this).
- A brand display name not in `REVIEWS_BRAND_SLUG` → `companyHref = undefined`; brand still appears in rendered HTML sections (bead B11) but receives no `Organization` markup.
- Brand with exactly 2 reviews → excluded from result.
- Brand with exactly 3 reviews (= `MIN_REVIEWS_PER_BRAND`) → included.
- `seededShuffle` called twice with the same reviews array and seed → identical `sampleReviews` order.
- `averageRating` computed as 5.0 exactly → clamp to 5, ensure it does not emit 5.0000001 from floating-point arithmetic.
- `reviews.json` display name has invisible Unicode or different capitalization from the map key → `companyHref = undefined` (correct defensive behaviour; the unit test for all 8 map entries detects this if the fixture uses real display names).

## Failure modes

- **`seededShuffle.ts` missing or wrong signature** — TypeScript error at compile time. Recovery: create `src/utils/seededShuffle.ts` with `export function seededShuffle<T>(array: T[], seed: string): T[]` before implementing this bead; verify `ReviewsBlock` still compiles.
- **`ReviewLike` not exported from `companies.ts`** — TypeScript error. Recovery: check `src/utils/companies.ts` for the actual type name; alias if differently named.
- **Brand display names in `reviews.json` differ from the map keys** — `companyHref = undefined` for all brands; the unit test asserting map coverage will flag this. Recovery: inspect actual `reviews.json` display name strings (check for Cyrillic lookalike characters, trailing spaces) and correct the map keys.
- **`NaN` in emitted `ratingValue`** — the finite-only filter must run before averaging; if misplaced, `NaN` propagates. Detection: the unit test assertion `ratingValue never NaN` catches this. Recovery: move the `Number.isFinite(rating)` guard to before the accumulator.

## Test obligations

**Unit (`tests/reviewsAggregate.test.ts`):**

```
describe('REVIEWS_BRAND_SLUG', () => {
  it('contains exactly 8 entries')
  it('every value is a non-empty slug-format string')
})

describe('buildReviewAggregate', () => {
  it('returns [] when input is []')
  it('groups reviews by the company field')
  it('excludes brands with < MIN_REVIEWS_PER_BRAND reviews')
  it('includes brands with exactly MIN_REVIEWS_PER_BRAND reviews')
  it('averageRating is 1-decimal, clamped to [1,5]')
  it('excludes non-finite ratings from the average')
  it('ratingDistribution counts only integer ratings 1-5')
  it('sampleReviews length is ≤6')
  it('sampleReviews is deterministic — two calls with same input produce same result')
  it('result is sorted descending by reviewCount')
  it('companyHref is defined for a brand in REVIEWS_BRAND_SLUG')
  it('companyHref is undefined for a brand not in REVIEWS_BRAND_SLUG')
})

describe('buildReviewsSchemaGraph', () => {
  it('@graph top node is CollectionPage')
  it('no top-level AggregateRating node exists in @graph')
  it('emits Organization + aggregateRating for brand with companyHref and reviewCount>=MIN')
  it('does NOT emit Organization for brand with companyHref=undefined')
  it('does NOT emit Organization for brand with reviewCount < MIN_REVIEWS_PER_BRAND')
  it('ratingValue is a finite number in [1,5] in every aggregateRating')
  it('Review samples are ≤6 per brand')
  it('each review node has @type: "Review"')
})
```

All tests use AAA structure. Build synthetic `ReviewLike[]` fixture arrays (10–30 rows) — do not read `src/data/reviews.json` in tests (file I/O, slow, fragile). Import all symbols directly from `../../src/utils/reviewsAggregate`.

**E2E:** None for this bead — build-output and schema correctness for `/otzyvy/` are covered by bead B13.

## Operational / admin hooks

None. This is a pure utility module — no config flags, no observability, no migrations.

## Verification

Run in order:

```sh
npm run typecheck
npx vitest run tests/reviewsAggregate.test.ts
npm run lint
```

All 3 commands must exit 0. Full build is not required for this bead — that is bead B13's responsibility.

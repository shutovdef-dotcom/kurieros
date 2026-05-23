---
id: "011"
title: Build /otzyvy/ reviews aggregate page
priority: P2
status: todo
dependencies: ["002", "004"]
---

# Bead 011 — Build /otzyvy/ reviews aggregate page

> A bead is self-contained: an agent must implement it WITHOUT reopening the plan.

## Outcome

Two new files exist and the build is green:
- `src/components/ReviewsAggregate.astro` — the brand-grouped reviews body component.
- `src/pages/otzyvy.astro` — the `/otzyvy/` static page that wires `reviews.json` through
  `reviewsAggregate.ts` and renders via `InfoGuideLayout` (from B4).

The page is indexable (unless total review count is 0), funnels to `/companies/{slug}/`
pages, and emits conservative JSON-LD consistent with Decision C.

## Design intent / rationale

**Decision C (plan §3.4) — synthesised, non-negotiable:**

1. **No page-level `AggregateRating`.** A rating averaged across different employers is not
   a rating of one reviewable entity. Engines treat it as misleading structured data.
   Omit entirely — no `AggregateRating` at the page or `CollectionPage` level.

2. **Per-brand `Organization` + `aggregateRating` + bounded `Review[]` (<=6) — only for
   brands that have a real `/companies/{slug}/` page.** This introduces no new structured-
   data risk: the site already emits `AggregateRating` on each company page in the same
   shape. `/otzyvy/` stays consistent with existing markup.

3. **Brands without a company page** get a visible section (reviews + aggregate numbers)
   but no `Organization` / rating JSON-LD.

4. **Honest-content guards (enforced in `reviewsAggregate.ts`, B2):**
   - Drop brands with fewer than `MIN_REVIEWS_PER_BRAND` (= 3) reviews from JSON-LD
     markup (still shown visually; no `Organization` for them).
   - Never emit a `ratingValue` of `0`, `NaN`, `Infinity`, or `> 5`.
   - Clamp every `ratingValue` to range [1, 5].
   - Set `robots="noindex, follow"` on the page if total review count is 0.

5. **Honest-content disclaimer** (visible, plan §3.4): a paragraph stating that reviews
   are collected from platform participants and not independently verified. Placeholder:
   "Отзывы собраны от участников платформы и не прошли независимую проверку."
   Final copy subject to OQ#2 sign-off; placeholder is safe to ship.

6. **`REVIEWS_BRAND_SLUG` map** — defined inside `src/utils/reviewsAggregate.ts` (B2).
   This is an explicit 8-entry map from `reviews.json` display names to company-page slugs:
   ```
   Купер        → kuper-ex-sbermarket
   Альфа-Банк   → alfa-bank
   Efin         → efin
   Т-Банк       → t-bank
   Яндекс Еда   → yandex-eda
   Бургер Кинг  → burger-king
   Ozon fresh   → ozon-fresh
   Ozon         → ozon
   ```
   B2 verifies all 8 map values resolve to a real `/companies/{slug}/` directory. All 8
   qualify for per-brand `Organization` markup. Keys must match the exact byte-for-byte
   `company` field strings from `reviews.json` — do not normalize case.

7. **`seededShuffle`** — `src/utils/seededShuffle.ts` exists and has signature
   `seededShuffle<T>(array: T[], seed: string): T[]`. B2 uses it with seed
   `'otzyvy-' + company` to get deterministic `sampleReviews`. B11 relies on B2 for this.

8. **10 MB `reviews.json` never reaches the client.** It is imported at build time only
   (Astro SSG). At most 6 reviews per brand reach the HTML (<=48 `.review-card` elements
   total). `reviews.json` fields: `{id, jobId, company, jobTitle, name, city, pros, cons,
   comment, rating, date}`.

9. **`ogType='website'`** — a reviews index is not an `Article`. `InfoGuideLayout` (B4)
   accepts `ogType` as an overridable prop; B11 passes `ogType="website"`.

10. **Top-level JSON-LD nodes**: `CollectionPage` + `ItemList` of brand sections. Then,
    per-brand (when `companyHref` exists and `reviewCount >= MIN_REVIEWS_PER_BRAND`):
    `Organization` + `aggregateRating` + up to 6 `Review` objects. No `Article` node.

## Acceptance criteria

- [ ] `src/components/ReviewsAggregate.astro` exists, accepts typed props
      `{ summaries: BrandReviewSummary[], totalCount: number }` (types from B2's
      `src/utils/reviewsAggregate.ts`).
- [ ] `src/pages/otzyvy.astro` exists, imports `../data/reviews` and functions from
      `../utils/reviewsAggregate`, renders via `<InfoGuideLayout ogType="website">`.
- [ ] `dist/otzyvy/index.html` is emitted after `npm run build`.
- [ ] The HTML contains the honest-content disclaimer paragraph.
- [ ] The HTML contains one `<section>` per brand from `reviews.json` (8 sections).
- [ ] Each brand section with a `companyHref` contains a CTA `<a>` linking to
      `/companies/{slug}/`.
- [ ] At most 6 `.review-card` elements per brand section; at most 48 total.
- [ ] `<script type="application/ld+json">` is present, `JSON.parse`s without error,
      contains no unescaped `</script>` sequence (the S7 security check).
- [ ] The JSON-LD `@graph` contains no node with `"@type": "AggregateRating"` at the
      page or `CollectionPage` level.
- [ ] The JSON-LD `@graph` contains `Organization` nodes only for brands whose slug is in
      `REVIEWS_BRAND_SLUG` and whose `reviewCount >= MIN_REVIEWS_PER_BRAND`.
- [ ] `robots` meta is `noindex, follow` when total review count is 0; indexable otherwise.
- [ ] `<link rel="canonical">` is self-referential (`https://kurerok.ru/otzyvy/`).
- [ ] Page renders correctly in dark mode (`prefers-color-scheme: dark`).
- [ ] `npm run build`, `npm run typecheck`, `npm run lint` all pass.
- [ ] `npx vitest run tests/reviewsAggregate.test.ts` passes.

## Edge cases

- **Zero total reviews** → `robots="noindex, follow"`; component renders an empty state
  message ("Отзывы появятся позже" or similar).
- **Brand with < MIN_REVIEWS_PER_BRAND reviews** → visible section rendered (stars, count,
  disclaimer), but NO `Organization` / `aggregateRating` JSON-LD for that brand.
- **Brand name not in `REVIEWS_BRAND_SLUG` map** → no `companyHref`; section renders
  without the company page CTA; no JSON-LD for that brand.
- **Non-finite or out-of-range rating** → B2's clamp ensures `ratingValue` is always
  finite and in [1, 5]. B11 must not bypass this by accessing raw `rating` fields.
- **`</script>` in review text** → `BaseLayout` serializes JSON-LD via `JSON.stringify`,
  which escapes `<` as `<` by default in the JS runtime — verify the rendered HTML
  contains no literal `</script>` inside the JSON-LD block. B13 asserts this.
- **Duplicate/variant brand display names** → `buildReviewAggregate` groups by exact
  `company` string. Accept as distinct groups — do not over-engineer deduplication.
- **Empty `pros`/`cons`/`comment` fields** → the `Review` JSON-LD `reviewBody` must use
  whichever field is non-empty; never emit an empty `reviewBody`.

## Failure modes

- **`InfoGuideLayout` (B4) not complete** → build-time import error. Fix: run B4 first
  (it is a declared dependency).
- **`reviewsAggregate.ts` (B2) not complete** → build-time import error. Fix: run B2
  first (declared dependency).
- **JSON-LD emits `AggregateRating`** → violates Decision C. Detection: B13 build-output
  test asserts absence. Recovery: remove the node from `buildReviewsSchemaGraph` in B2.
- **`ratingValue` of `NaN` or `> 5` reaches JSON-LD** → `JSON.stringify(NaN)` serialises
  as `null`; a B13 assertion catches this. Fix: reinforce the clamp in B2.
- **10 MB import regresses build time noticeably** → note in PR; see Open Question #5.
  Do not precompute silently; escalate to owner before acting.
- **Wrong `ogType`** → `InfoGuideLayout` must accept and forward the `ogType` prop.
  If B4 hardcodes `'article'`, add the prop override there, not in the page file.

## Test obligations

- **Unit:** No new unit tests in B11. `tests/reviewsAggregate.test.ts` (B2) fully covers
  `buildReviewAggregate` and `buildReviewsSchemaGraph`. B11 depends on those tests passing.
- **Build-output (authored in B13, but listed here for traceability):**
  - `dist/otzyvy/index.html` exists.
  - `<script type="application/ld+json">` present, `JSON.parse`s, no unescaped `</script>`.
  - No top-level `AggregateRating` node in the JSON-LD `@graph`.
  - Any `Organization` in the JSON-LD matches a brand with a `companyHref`.
  - At most 48 `.review-card` elements in the HTML.
  - `<link rel="canonical">` present and self-referential.
- **Manual QA (B14):** brand sections visible; stars / count / distribution bar render;
  company CTAs link to `/companies/{slug}/`; disclaimer visible in RU; dark mode correct;
  Rich Results Test on JSON-LD at `https://search.google.com/test/rich-results`.

## Operational / admin hooks

- **Open Question #4 (reviews provenance):** if the owner confirms `reviews.json` is not
  genuine UGC, the remediation touches both `/otzyvy/` AND the existing company pages.
  Do not fix the company pages silently in B11 — flag and escalate.
- **Open Question #5 (build cost):** if `npm run build` time regresses > 20% from
  baseline, add a note in the PR and raise OQ#5 before adding a precompute script.
- **Sitemap priority:** `astro.config.mjs` assigns `/otzyvy/` priority `0.6` in the
  `serialize()` function — this edit belongs to B7, not B11.
- **`set:html` prohibition:** never use `set:html` with review-derived content. All review
  text must flow through `{expression}` Astro slots (auto-escaped). Only the JSON-LD
  `<script>` block (via `BaseLayout`) is permitted to use raw string injection, and
  `BaseLayout` already handles the `JSON.stringify` safely.

## Verification

Run these exact commands from the worktree root
(`/tmp/kurerok-seo-rollout/kurieros-astro`):

```bash
# 1. Full build
npm run build

# 2. Type-check
npm run typecheck

# 3. Lint
npm run lint

# 4. Unit tests (B2's helpers must be passing)
npx vitest run tests/reviewsAggregate.test.ts

# 5. Quick build-output spot checks (full suite authored in B13)
node -e "
const fs = require('fs');
const html = fs.readFileSync('dist/otzyvy/index.html', 'utf8');
const m = html.match(/<script type=\"application\/ld\+json\">([\s\S]*?)<\/script>/);
if (!m) { console.error('No JSON-LD found'); process.exit(1); }
const ldJson = m[1];
if (ldJson.includes('<\/script>')) { console.error('Unescaped </script> in JSON-LD'); process.exit(1); }
const graph = JSON.parse(ldJson);
const nodes = graph['@graph'] ?? [];
const hasPageRating = nodes.some(n => n['@type'] === 'AggregateRating');
if (hasPageRating) { console.error('Page-level AggregateRating found — violates Decision C'); process.exit(1); }
const cards = (html.match(/class=\"review-card\"/g) || []).length;
if (cards > 48) { console.error('Too many review cards: ' + cards); process.exit(1); }
console.log('All spot checks passed. review-card count:', cards);
"
```

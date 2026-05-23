---
id: "016"
title: Honest per-brand reviews — generator rewrite + brand-level surfacing (Decisions F/G)
priority: P1
status: todo
dependencies: ["002", "011"]
---

# Bead 016 — Honest per-brand reviews

> A bead is self-contained: an agent must implement it WITHOUT reopening the plan.

## Outcome

`reviews.json` is regenerated per brand: each of the 8 brands gets a random 10–20 reviews
(was: 4 × every vacancy = 19 144 rows / ~10 MB). The file shrinks to ~120 rows / <100 KB.
`/otzyvy/`, `/companies/{slug}/` and every `/v/{slug}/` vacancy page show the same
honest brand-level review set and a real (non-uniform) per-brand average rating.

## Design intent / rationale

**Decisions F & G (plan §12.1–12.2).** Reviews belong to a brand, not a vacancy. The old
`REVIEWS_PER_JOB = 4` × thousands-of-synthetic-vacancies produced counts (Купер 6 104,
Альфа-Банк 4 532, …) and a uniform ~4.3 average that read as a mature review platform the
site is not — dishonest content, an SEO E-E-A-T risk, and contrary to Decision C. No
aggregate threshold and no "we're just starting" placeholder (Decision G) — show the real
numbers.

**Generator parameters (owner-confirmed 2026-05-20):** 10–20 reviews per brand, uniform
random, seeded for reproducible builds; reviewer names unique within a brand; ~60/40
clean/typo text split; integer 1–5 ratings from a weighted pool so per-brand averages
spread naturally (no deliberate per-brand skew).

**Why integer ratings.** `reviewsAggregate.ts::ratingDistribution` only counts integer
ratings in [1,5]; the old float pool (`3.8, 4.2, …`) left the distribution bars almost
empty. Integer per-review ratings make the distribution bars correct and match how star
reviews actually work; `averageRating` stays a 1-decimal float.

**Keep `jobId`/`jobTitle`/`id`.** `reviewsIndex.ts`'s Zod `reviewSchema` requires all 11
fields — dropping any breaks the build. Each generated review is attached to a *random
vacancy of its brand*; `jobId`/`jobTitle`/`city` are provenance/UI-context fields.

**Brand-level surfacing.** Per-brand generation leaves ~120 reviews across ~120 random
vacancies, so a per-`jobId` lookup would show "no reviews" on ~98 % of the 4 786 vacancy
pages — a regression. `ReviewsBlock` on vacancy pages must filter by **brand** so every
vacancy of a brand shows that brand's reviews (this is the "rewrite the review-DB logic"
the owner asked for). `/otzyvy/` (B11) and `/companies/{slug}/` already group by company —
unchanged.

## Acceptance criteria

- [ ] `scripts/generate-reviews.ts` rewritten: loops over the brands present in
      `jobsData` (group jobs by `company`); per brand picks N ∈ [10,20] (seeded uniform);
      emits N `ReviewRecord`s. All 11 fields kept; `jobId`/`jobTitle`/`city` taken from a
      randomly-picked vacancy of that brand. Deterministic from a fixed string `SEED`
      (re-running produces a byte-identical file).
- [ ] Reviewer names are unique within a brand. The `NAMES` pool is expanded to ≥ 50
      (Russian + Central-Asian + Caucasus + Belarus/Ukraine) so a 20-review brand never
      repeats a name.
- [ ] ~40 % of reviews use the typo text variants (`*_ERRORS_DB`), ~60 % the clean
      variants. Typo pools expanded enough to avoid obvious repetition.
- [ ] `rating` is an integer 1–5 from a weighted pool whose mean ≈ 4.0; per-brand
      averages land naturally apart (not all ~4.3).
- [ ] `date` is within a fixed ~12-month window ending at a hard-coded recent date
      (deterministic — no `Date.now()`).
- [ ] `src/data/reviews.json` regenerated: 8 brands, each 10–20 reviews, < 100 KB.
- [ ] `reviewsIndex.ts`: add `reviewsByCompany: ReadonlyMap<string, Review[]>` built once
      at module load; update the stale "19,144-row / 9.5 MB" doc comment to the new
      reality; the Zod `reviewSchema` is unchanged (all 11 fields still emitted).
- [ ] `ReviewsBlock.astro`: add a `company?: string` prop. When `company` is set, show
      that brand's reviews (a stable `seededShuffle(reviewsByCompany.get(company), 'reviews-'+company)`
      sample of ≤ 6), heading "Отзывы о работодателе", rating + count computed from the
      brand's full review set. `jobId` is kept only for the submit button's
      `data-job-id`. No `company` and no `jobId` → unchanged homepage behaviour
      (`seededShuffle` 3).
- [ ] `src/pages/v/[slug].astro` passes `company={job.company}` to `<ReviewsBlock>` (and
      keeps `jobId`).
- [ ] If `reviewsByJobId` is left unused after the `ReviewsBlock` change, remove it from
      `reviewsIndex.ts` (dead-code); otherwise keep it. Confirm via grep.
- [ ] `docs/flywheel/review-feature-design.md` storage-model section updated to brand-level
      storage (a submitted review records `jobId` provenance but is selected by brand).
- [ ] `/otzyvy/` still: ≤ 48 review cards, no page-level `AggregateRating`, 8 brand
      `Organization` nodes (re-verify — no test change expected).

## Edge cases

- **A brand with < 3 reviews** → `MIN_REVIEWS_PER_BRAND` (=3) in `reviewsAggregate.ts`
  would drop it. The generator's floor is 10, so this cannot happen — but do not lower
  the generator floor below 3.
- **A brand with very few vacancies** → still gets 10–20 reviews; multiple reviews may
  point at the same `jobId`. Fine — `jobId` is provenance, not a uniqueness key.
- **`reviews.json` consumed by `ReviewsBlock` on the homepage** → no `company`/`jobId` →
  homepage path unchanged; `seededShuffle(reviewsData, 'reviews-home').slice(0,3)` still
  works on the smaller dataset.
- **Build determinism** → the generator must be seeded; a second run with no input change
  must produce an identical file (the existing `previousContent === nextContent` guard
  then reports "up to date").
- **`getCompaniesFromJobs`** (company pages) groups reviews by `review.company` — works
  unchanged on the smaller dataset; company `rating` is now computed from ~10–20 reviews.

## Failure modes

- **Zod parse throws at build** → a generated review is missing a field or has a wrong
  type. Detection: `npm run build` fails in `reviewsIndex.ts`. Fix: ensure the generator
  emits all 11 fields with the schema's types (`id`/`jobId`/`rating` numbers, rest
  strings).
- **Vacancy pages show "no reviews"** → `ReviewsBlock` still keyed on `jobId` instead of
  `company`. Detection: open any `/v/{slug}/` preview. Fix: the `company` prop path.
- **Non-deterministic file** → generator used `Date.now()` / `Math.random()`. Detection:
  two runs produce different files. Fix: seed everything; fixed date window.
- **Names repeat within a brand** → `NAMES` pool smaller than `MAX_REVIEWS_PER_BRAND` or
  sliced wrong. Detection: the data-integrity test below. Fix: expand the pool / slice the
  shuffled pool by N.

## Test obligations

- **Unit (`tests/reviewsData.test.ts`, NEW):** load the committed `src/data/reviews.json`
  and assert — 8 brands; every brand has 10 ≤ count ≤ 20; reviewer `name`s unique within
  each brand; every `rating` an integer in [1,5]; all 11 fields present and typed; not all
  per-brand averages equal (natural spread).
- **Unit (`tests/reviewsAggregate.test.ts`):** unchanged — it uses synthetic fixtures, not
  `reviews.json`. Re-run to confirm still green.
- **Build-output (`tests/seo-rollout-build.test.ts`):** unchanged — `/otzyvy/` ≤ 48
  review cards and no top-level `AggregateRating` still hold (≤ 6 sample × 8 brands).
  Re-run to confirm.
- **E2E (manual, documented in PR):** `/otzyvy/` shows non-uniform per-brand ratings and
  realistic counts; a `/v/{slug}/` page shows its brand's reviews; the homepage reviews
  block still renders 3; dark mode; no console errors.

## Operational / admin hooks

The generator is run manually. Check `package.json` for an existing `generate:reviews`
script; if absent, run via `npx tsx scripts/generate-reviews.ts`. The regenerated
`reviews.json` IS committed (it is the build input). The localStorage demo-submit flow in
`ReviewsBlock.astro`'s client `<script>` is left functionally as-is (a client-only demo,
distinct from the OQ#4 real-review feature) — only verify it still appends without error.

## Verification

```bash
npx tsx scripts/generate-reviews.ts   # regenerate reviews.json
npm run build && npm test && npm run typecheck && npm run lint
```

All green; `reviews.json` < 100 KB; the manual `/otzyvy/` + `/v/` QA above.

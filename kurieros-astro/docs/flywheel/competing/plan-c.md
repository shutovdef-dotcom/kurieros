# Plan C — kurerok.ru SEO Rollout Implementation Plan

> **Phase A competing-plan artifact (independent draft C).**
> Scope: the 9 work items in `intent.md §3` — 4 transport/part-time hubs, homepage
> optimization, 4 informational guides. Brand pages explicitly out of scope.
> Grounded in a read-only recon of the real `kurieros-astro` repo.

---

## 1. Intent recap

`kurerok.ru` is a static Astro site (~6000 pages, `output: 'static'`,
`trailingSlash: 'always'`, GitHub Pages) — an aggregator of Russian courier-job
vacancies. Semantic-core v2 surfaced large demand clusters with no dedicated
landing page. This run closes **9 of them additively**:

| # | Page | URL | Type | Priority |
|---|------|-----|------|:--------:|
| 1 | Пеший курьер | `/rabota-peshim-kurerom/` | Transport hub | P0 |
| 2 | Автокурьер | `/rabota-avtokurerom/` | Transport hub | P0 |
| 3 | Велокурьер | `/rabota-velokurerom/` | Transport hub | P1 |
| 4 | Подработка курьером | `/podrabotka-kurerom/` | Hub (free schedule) | P1 |
| 5 | Главная — оптимизация | `/` | Optimize existing | P1 |
| 6 | Сколько зарабатывает курьер | `/skolko-zarabatyvaet-kurer/` | Info-guide | P0 |
| 7 | Как стать курьером | `/kak-stat-kurerom/` | Info-guide | P1 |
| 8 | Условия и график работы | `/usloviya-raboty-kurerom/` | Info-guide | P2 |
| 9 | Отзывы | `/otzyvy/` | Reviews aggregate | P2 |

Hard constraints (non-negotiable): **honest-content noindex** (page is
`index, follow` only with real content; otherwise `noindex, follow`);
**additive only** (do not break the ~6000 existing pages; shared-helper edits
backward-compatible); **reuse-first** (`JobGrid` + `cityListingPage.ts` for hubs,
the `guide/` pattern for guides); **CWV budget** held; **no new data needed for
hubs** — `transport` tags already exist on every job.

Conversion goal: the existing GA4 `apply_click` event (~27%) must not regress as
informational traffic grows.

---

## 2. User workflows the new pages must serve

1. **Transport-intent → hub → vacancy → apply.** Searcher on "работа пешим
   курьером" lands on `/rabota-peshim-kurerom/`, sees a live `JobGrid` of
   foot-courier vacancies across all cities, scans income/requirements blocks,
   clicks a card → existing `/v/{slug}/` → `apply_click`.
2. **Income research → guide → hub → apply.** Searcher on "сколько зарабатывает
   курьер" lands on `/skolko-zarabatyvaet-kurer/`, reads the income-by-format
   table, uses the embedded `IncomeCalculator`, follows a CTA into a transport
   hub or directly to vacancies.
3. **Homepage head-term → homepage → hub.** Searcher on "работа курьером" lands
   on `/`, uses the city/transport toolbar, or follows a new interlink block to
   a transport hub.
4. **Reviews research → `/otzyvy/` → brand company page / vacancies.** Searcher
   on "отзывы курьеров" reads aggregated employer reviews grouped by brand,
   follows through to a `/companies/{slug}/` page (which already lists that
   brand's vacancies) and onward to apply.

Every workflow ends at the same funnel: a `JobCard` → `/v/{slug}/` → the partner
apply link. The new pages add **top-of-funnel surface area**; they do not change
the funnel itself.

---

## 3. Architecture

### 3.1 Component map

```
NEW ROUTES (src/pages/)
  rabota-peshim-kurerom.astro   ┐
  rabota-avtokurerom.astro      ├─ 4 transport hubs — thin page files,
  rabota-velokurerom.astro      │   logic lives in a shared helper module.
  podrabotka-kurerom.astro      ┘
  skolko-zarabatyvaet-kurer.astro ┐
  kak-stat-kurerom.astro          ├─ 4 info-guides — thin page files,
  usloviya-raboty-kurerom.astro   │   one shared <InfoGuideLayout>.
  otzyvy.astro                    ┘  (otzyvy reuses guide chrome too)
  index.astro                   ─── EDITED (homepage optimization)

NEW SHARED HELPERS (src/utils/)
  transportHubs.ts        — hub config table + pure builders (title, FAQ, schema)
  reviewsAggregate.ts     — pure review-aggregation helpers for /otzyvy/

NEW COMPONENTS (src/components/)
  InfoGuideLayout.astro   — guide-shell wrapper (hero+breadcrumb+related grid)
  HubCrossLinks.astro     — interlink block reused by hubs + homepage

EDITED SHARED FILES (all additive / backward-compatible)
  src/pages/[slug].astro      — add CATEGORY_CANONICAL_HUB map (Decision A)
  src/utils/listingSlugs.ts   — extend empty-listing detection to the 4 hubs
  astro.config.mjs            — add sitemap-priority branches for the 9 slugs
  src/pages/index.astro       — title/desc strings + interlink hrefs (Decision D)
  tests/build-output.test.ts  — widen the page-count band by +9

REUSED AS-IS (no edit)
  JobGrid.astro, JobFilters.astro, PartnerBanner.astro, IncomeCalculator.astro,
  BaseLayout.astro, Header.astro, Footer.astro,
  jobFilters.ts (filterJobsByCriteria), schema.ts (buildBreadcrumbSchema),
  cityListingPage.ts (buildFactCards, buildTransportTypes, buildVacancyCountText),
  knowledge.ts (TOPIC_META, getItemsByTopic, getSourceById),
  companies.ts (slugifyCompany, getCompaniesFromJobs),
  scripts/emit-empty-listings.ts (picks up listingSlugs.ts change transitively).
```

### 3.2 Decision A — Transport hubs vs. existing category pages

**Context.** `src/data/constants.ts` `CATEGORIES` already emits, via the
`src/pages/[slug].astro` catch-all:
- `rabota-kurerom-peshkom` (`tag: 'foot'`)
- `rabota-kurerom-na-avto` (`tag: 'auto'`)
- `rabota-kurerom-na-velosipede` (`tag: 'bicycle'`)
- `rabota-kurerom-na-samokate` (`tag: 'bicycle'`)
- `rabota-kurerom-podrabotka` (`tag: 'flexible'`)

These are thin "готовый фильтр" pages: hero + 4 fact cards + `JobFilters` +
`JobGrid revealable` + FAQ. The new hubs (`/rabota-peshim-kurerom/` etc.) target
the **same vacancy set and the same head intent** → genuine cannibalization.

**DECISION A — Option (c): hubs are the canonical rich page; category pages
become thin facets that `canonical` → the hub. NOT redirect, NOT delete.**

Rationale:
- **Why not (b) redirect/repurpose** — the category pages are already in
  Yandex/Google's index, are interlinked from the homepage (`index.astro` lines
  42-47 `featuredFormats` and 49-69 `routeCards` both link
  `/rabota-kurerom-na-avto/`, `…peshkom/`, `…podrabotka/`, `…na-velosipede/`),
  and from `cityListingPage`/footer clouds. A 301 from a
  `getStaticPaths`-emitted route is not free in Astro static (`output: 'static'`
  cannot emit a real 3xx; you ship an HTML meta-refresh or rely on the host). It
  risks the additive guarantee and churns ~5 live URLs. Reject.
- **Why not (a) build new + canonical the category page → hub but leave the
  category page otherwise unchanged** — acceptable, but it leaves two
  near-identical full pages in the build. Option (c) is (a) plus an honest
  framing: the category page is explicitly positioned as a *facet* (keeps the
  filter UX, drops the redundant rich-content blocks) and carries
  `<link rel="canonical">` to the hub.
- **Why (c) wins** — one canonical rich page per intent, zero redirect risk, zero
  URL churn, the category page still works as an internal-link target and a
  long-tail catch (e.g. `rabota-kurerom-na-samokate` has no hub — it keeps its
  own identity). Cannibalization is resolved by the canonical signal, which is
  exactly what `rel=canonical` exists for: two URLs, one indexed.

**Concrete canonical mechanics.** `[slug].astro` currently never sets
`canonicalURL`; `BaseLayout` defaults it to the page's own pathname. Add a small
map in `[slug].astro` frontmatter:

```ts
// src/pages/[slug].astro — new constant
const CATEGORY_CANONICAL_HUB: Readonly<Record<string, string>> = {
  peshkom:         '/rabota-peshim-kurerom/',
  'na-avto':       '/rabota-avtokurerom/',
  'na-velosipede': '/rabota-velokurerom/',
  podrabotka:      '/podrabotka-kurerom/',
  // na-samokate intentionally absent — no hub, stays self-canonical
};
```

When `type === 'category'` and the slug is in this map, the page passes
`canonicalURL={new URL(hubPath, Astro.site)}` to `BaseLayout`. **Honest-content
interaction:** the category page must NOT canonical to a noindexed URL — so the
cross-canonical is emitted only when the hub is non-empty. The hub-emptiness
check (`filterJobsByCriteria(jobsData, {tag}).length > 0`) lives in
`transportHubs.ts::isHubEmpty` so `[slug].astro` and the hub agree. This is the
**only edit to `[slug].astro`** — additive (a new optional prop path keyed by 4
specific slugs), it cannot regress the other ~6000 paths.

**Hub slug ⇄ category-page facet table:**

| Hub (new, canonical) | Category page (facet, canonical→hub) | Tag |
|---|---|---|
| `/rabota-peshim-kurerom/` | `/rabota-kurerom-peshkom/` | `foot` |
| `/rabota-avtokurerom/` | `/rabota-kurerom-na-avto/` | `auto` |
| `/rabota-velokurerom/` | `/rabota-kurerom-na-velosipede/` | `bicycle` |
| `/podrabotka-kurerom/` | `/rabota-kurerom-podrabotka/` | `flexible` |

### 3.3 Decision B — Info-guide routing

**DECISION B — Option (a): standalone top-level `.astro` page files that reuse
the guide system's *components and JSON-LD patterns* via a new shared
`InfoGuideLayout.astro` — but are NOT driven by `knowledge-base.json`'s
`TOPIC_META`.**

Rationale:
- The spec mandates top-level URLs (`/skolko-zarabatyvaet-kurer/`, not
  `/guide/skolko-zarabatyvaet-kurer/`). Option (c) "put under `/guide/`" directly
  violates the brief. Reject (c).
- Option (b) "extend the guide system to *also* emit chosen topics at top level"
  is wrong: `guide/[topic].astro` is a single FAQ-card renderer driven entirely
  by `getItemsByTopic(topic)` against the 12-entry `TOPIC_META`. The 4 new guides
  are **long-form editorial pages** with bespoke structure (income tables,
  calculator, step-by-step HowTo, brand/age breakdowns, aggregated reviews) — not
  a list of KB Q&A cards. Forcing them through `[topic].astro` would mean either
  (i) bloating `[topic].astro` with 4 per-slug `if` branches (the
  `isEzhednevLanding` anti-pattern, 4× worse), or (ii) cramming editorial prose
  into `knowledge-base.json` `answer_long` fields — a pipeline-generated/validated
  data file. Either way the clean KB renderer is compromised. Reject (b).
- Option (a) keeps the separation: `guide/[topic].astro` stays the KB-driven
  micro-FAQ system (untouched); the 4 editorial guides are first-class pages.
  They **reuse**, not fork: a new `InfoGuideLayout.astro` extracts the proven
  guide chrome (breadcrumb, `.guide-hero`, `.guide-kicker`, related-topics grid,
  the `Article`+`FAQPage`+`BreadcrumbList` JSON-LD shape, `ogType="article"` +
  `articleSection`/`articlePublishedTime`). Each guide composes `InfoGuideLayout`
  + its own sections.

**Reuse of KB data inside the guides.** The guides still *pull* from
`knowledge-base.json` where it helps — `/skolko-zarabatyvaet-kurer/` reuses the
`доход` topic's 6 items (`income-foot-courier-msk`, `income-bike-courier-msk`,
`income-auto-courier-msk`, `income-bank-rep-msk`, `income-spb`,
`income-regions`) via `getItemsByTopic('доход')` for a sourced facts block;
`/kak-stat-kurerom/` reuses `оформление` (3 items incl.
`self-employed-registration`) + the `HowTo` JSON-LD pattern from
`guide/[topic].astro`. This yields sourced, fact-checked content without
duplicating prose.

**`.md` variants.** `guide/[topic].md.ts` emits a `.md` mirror for LLM clients.
**Stance: skip the `.md` variants this run** — they are an LLM-discoverability
nicety, not a ranking lever, not in the 9 work items, and each adds a route.
Recorded in §9.

**`guide/index.astro`** is hard-coded to iterate `TOPIC_META`. The 4 guides are
**not** shoehorned there (additive guarantee — leave it untouched). Crawler
reachability instead comes from: (i) the homepage `hubLinks` gains an income-guide
card (Decision D), (ii) each guide cross-links the others via `InfoGuideLayout`'s
related grid, (iii) the transport hubs link the income guide.

### 3.4 Decision C — `/otzyvy/` aggregate reviews

**Context.** `src/data/reviews.json` is a ~10 MB array of 19 144 review objects;
each row has the shape `{ id, jobId, company, jobTitle, name, city, pros, cons,
comment, rating, date }` where `rating` is a number (e.g. `4.2`) and `date` is
ISO-8601 (e.g. `2025-10-21T09:00:00.000Z`). Reviews currently surface only in
`ReviewsBlock.astro` (homepage) and per-`/companies/{slug}/` pages — the latter
already computes an `AggregateRating` from `getCompaniesFromJobs(jobs, reviews)`.

**DECISION C — `/otzyvy/` is a brand-grouped reviews *index*, built at SSG time
from a new pure helper `reviewsAggregate.ts`. JSON-LD is conservative: emit an
`ItemList` of brand sections, and per-section `Organization` + `AggregateRating`
ONLY for brands that also have a real company page; emit a small bounded number
of individual `Review` nodes per brand. Do NOT emit a single page-level
`AggregateRating` over all reviews.**

Design:
- **Aggregation.** `reviewsAggregate.ts` exports `buildReviewAggregate(reviews)`
  → `BrandReviewSummary[]`, each `{ brand, slug, reviewCount, averageRating,
  ratingDistribution, latestReviews: Review[] (top 6 by date),
  companyHref?: string }`.
  - `slug` via the existing `slugifyCompany` from `companies.ts` (DRY — reuse).
  - `companyHref` set only if a `/companies/{slug}/` page exists for that brand
    (intersect with `getCompaniesFromJobs(jobsData)` slugs). Brands present in
    `reviews.json` but with zero current vacancies get no link and no
    `Organization` JSON-LD.
  - Brands sorted by `reviewCount` desc.
- **Page structure** (`otzyvy.astro`, reusing `InfoGuideLayout` chrome): hero →
  intro → per-brand sections (brand name, average rating, count, distribution
  bar, 4-6 latest review cards reusing the `.review-card` markup pattern from
  `companies/[slug].astro`, a "Все вакансии {brand} →" link to the company page
  when one exists) → FAQ → cross-links to hubs/guides.
- **Honest-content / thin-content.** Build-time guard: page is `noindex, follow`
  if total reviews `=== 0` (will not happen with the 19k dataset, but the guard
  is mandatory and cheap). Per-brand: render a section only if it has
  `>= MIN_REVIEWS_PER_BRAND` (proposed `3`) reviews — one-review brands are noise
  and would produce a misleading `AggregateRating`.
- **JSON-LD safety (the critical part).**
  - **No page-level `AggregateRating`.** A single rating averaged across all
    employers is not a rating of one reviewable entity — search engines treat
    that as spammy/misleading structured data. Omit entirely.
  - Per brand, emit an `Organization` node **only when `companyHref` exists**
    (the brand is a real, page-backed entity on this site), with an
    `aggregateRating` `{ ratingValue, reviewCount, bestRating:5, worstRating:1 }`
    computed from the *same* reviews shown on the page, plus a bounded `review`
    array (≤6 `Review` nodes). This mirrors exactly what `companies/[slug].astro`
    already does — same shape, proven valid. Reusing that shape is the safety
    guarantee.
  - The page's top-level node is a `CollectionPage` whose `mainEntity` is an
    `ItemList` of the brand sections (`ListItem` → brand name + anchor URL).
  - `Review` nodes: `itemReviewed` points at the brand `Organization`, never at
    a `Product` or the page itself. `reviewRating` clamped to 1-5.
    `datePublished` ISO-normalized. `reviewBody` assembled from
    `comment`/`pros`/`cons` exactly like `companies/[slug].astro`.
  - Missing-data rule: a review row with a non-finite `rating` is excluded from
    the average and gets no `Review` node. A brand with zero rated reviews → no
    `Organization`/`AggregateRating`.

**Performance note.** `reviews.json` is ~10 MB. `companies/[slug].astro` already
imports it directly and the build survives, so one additional SSG-time import in
`otzyvy.astro` is acceptable. `reviewsAggregate.ts` does **one pass** over the
array; `otzyvy.astro` serializes only the ≤6-per-brand latest slices into HTML —
never the full 19k array. (Contingency if build time regresses: a
`scripts/`-emitted precomputed summary JSON, mirroring `emit-empty-listings.ts`;
not built upfront per YAGNI — §9.)

### 3.5 Decision D — Homepage optimization scope

**Context.** `/` is the highest-traffic page (`priority: 1.0` in the sitemap) and
the single highest-risk surface. `index.astro` is 786 lines; the `<title>`/meta
are computed (`homepageTitle` line 138). Current title is
`Работа курьером 2026: {N} вакансий, {M} компаний | КурьерОк` — already leads
with the head term "Работа курьером".

**DECISION D — Minimal, reversible, copy-and-interlink only. In scope:**
1. **`<title>` / meta** — keep the proven dynamic template; reword so **both**
   head terms ("работа курьером" 147K, "курьер вакансии" 45.8K) appear. Proposed:
   `Работа курьером — {N} вакансий курьером 2026 | КурьерОк` (still
   `.slice(0,70)`; "вакансий курьером" covers the "курьер вакансии" cluster).
   Description tuned similarly. One-line frontmatter edit.
2. **H1** — `HomeHero.astro` owns the H1. Ensure it leads with "Работа курьером".
   If it already does, no change; otherwise a one-word copy edit. **No layout
   change.**
3. **Interlinking to the new hubs.** `featuredFormats` (lines 42-47) and the
   `routeCards` entries (lines 49-69) currently link the **old** category pages
   (`/rabota-kurerom-na-avto/` etc.). Repoint these hrefs to the **new hubs**
   (`/rabota-avtokurerom/`, `/rabota-velokurerom/`, `/rabota-peshim-kurerom/`,
   `/podrabotka-kurerom/`). This is the highest-SEO-value change: it passes
   homepage authority to the new canonical hubs. Pure href swap — fully
   reversible.
4. **One new discovery entry for the info-guides** — extend `hubLinks`
   (line 103) with a "Сколько зарабатывает курьер" → `/skolko-zarabatyvaet-kurer/`
   card so the guides are crawler-reachable from `/`.

**Explicitly OUT of scope for `/`:** no layout/structure changes, no new
sections, no component restructure, no JS changes, no `JobGrid` config change, no
schema rewrite beyond the title/description strings. Every in-scope change is a
string edit or an href swap — each independently revertable via a one-line diff.
This keeps the highest-traffic page's risk near zero.

---

## 4. Components — file-by-file

### 4.1 `src/utils/transportHubs.ts` — NEW (shared pure helper, ~150 LOC)

Pure module (no Astro globals, no `new Date()`), mirroring the
`cityListingPage.ts` discipline. Exports:

```ts
export type TransportHubKey = 'foot' | 'auto' | 'bicycle' | 'podrabotka';

export type HubConfig = {
  key: TransportHubKey;
  slug: string;                    // 'rabota-peshim-kurerom'
  filter: { tag: string };         // { tag: 'foot' } | … | { tag: 'flexible' }
  h1: string;                      // 'Работа пешим курьером'
  eyebrow: string;
  categoryFacetPath: string;       // '/rabota-kurerom-peshkom/'
  // editorial copy: requirement bullets, "как стать" steps, intro placeholders
};

export const HUB_CONFIGS: Readonly<Record<TransportHubKey, HubConfig>>;

export function buildHubTitle(cfg, vacancyCountText, formattedMaxSalary, isEmpty): string;
export function buildHubDescription(cfg, vacancyCountText, companyNames, isEmpty): string;
export function buildHubFaqItems(cfg, count, companyNames, vacancyCountText): FaqItem[];
export function buildHubSchemaGraph(args): unknown[];   // CollectionPage+ItemList+FAQ+Breadcrumb
export function isHubEmpty(jobsData, cfg): boolean;       // shared with [slug].astro canonical guard
```

`buildHubSchemaGraph` reuses `buildBreadcrumbSchema` from `schema.ts` and the
`CollectionPage`+`ItemList`+`FAQPage` shape from
`cityListingPage.ts::buildPageSchemaGraph` (category branch). `FaqItem` type is
re-imported from `cityListingPage.ts` (DRY).

Why a config table, not 4 hand-written pages: the 4 hubs are ~95% identical (same
`JobGrid` call, fact cards, schema). A config row + builders is DRY; 4 forked
files would drift. The ~5% that differs (requirement bullets, H1) lives in the
config as data.

### 4.2 `src/pages/rabota-peshim-kurerom.astro` (+ 3 named siblings) — NEW

Four thin page files (`rabota-peshim-kurerom.astro`, `rabota-avtokurerom.astro`,
`rabota-velokurerom.astro`, `podrabotka-kurerom.astro`). **Explicitly named
files, not a `[hub].astro` catch-all** — a second top-level rest/param route
would be ambiguous against the existing `[slug].astro`. The files are thin
because `transportHubs.ts` holds all logic.

Each frontmatter (~30-50 lines):
1. imports `jobsData`, `HUB_CONFIGS`, the `transportHubs` builders, `JobGrid`,
   `JobFilters`, `PartnerBanner`, `BaseLayout`, `Header`, `Footer`,
   `HubCrossLinks`, and `buildFactCards`/`buildTransportTypes`/
   `buildVacancyCountText` from `cityListingPage.ts`;
2. picks its `HubConfig` (e.g. `HUB_CONFIGS.foot`);
3. `filterJobsByCriteria(jobsData, cfg.filter)` → `filteredJobs`;
4. computes `isEmptyListing = filteredJobs.length === 0`, `companyNames`,
   `transportTypes`, `maxSalary`/`formattedMaxSalary` — **identical logic to
   `[slug].astro` lines 133-156**;
5. builds title/description/FAQ/schema via `transportHubs` helpers;
6. renders `BaseLayout` with `robots={isEmptyListing ? 'noindex, follow' :
   undefined}`.

Body markup reuses the `.listing-*` CSS classes already in `[slug].astro` (or a
small shared `<style>` block — no large new CSS):
```
<Header />
<main>
  hero panel (breadcrumb → eyebrow → H1 → intro → CTA → 4 fact cards)
  <JobFilters />
  <JobGrid initialTag={cfg.filter.tag} limit={24} revealable />
  income block — short prose + "Подробнее" link to /skolko-zarabatyvaet-kurer/
  requirements block — bullets from cfg (auto: права/возраст; foot: возраст/…)
  FAQ section (faqItems)
  <HubCrossLinks current={cfg.key} />   // other hubs + guides + cities
  <PartnerBanner />
</main>
<Footer />
```

### 4.3 `src/components/HubCrossLinks.astro` — NEW (~60 LOC)

Small interlink block: given `current` (a hub key or `'home'`), renders links to
the other 3 hubs + the 4 guides + `/cities/` + `/companies/`. Used by all 4 hub
pages **and** optionally by the homepage. Pure presentational; data is a static
list. Satisfies "reuse-first" and gives consistent internal linking (an SEO win).

### 4.4 `src/components/InfoGuideLayout.astro` — NEW (~120 LOC)

Extracts the guide chrome from `guide/[topic].astro` into a reusable layout:
- Props: `title`, `description`, `h1`, `kicker`, `updated` (string),
  `metaItems` (optional chips), `schemaGraph`, `relatedLinks`
  ({title, href, text}[]).
- Renders: `BaseLayout` (`ogType="article"`, `articleSection`,
  `articlePublishedTime/ModifiedTime`) → `Header` → `.guide-page` container →
  breadcrumb → `.guide-hero` → `<slot />` (the guide's bespoke body) →
  related-topics grid → `PartnerBanner` → `Footer`.
- The `.guide-*` CSS is copied verbatim from `guide/[topic].astro`'s `<style>`
  (already self-contained, dark-mode-aware). **`guide/[topic].astro` is left
  untouched** — we copy the pattern, we do not refactor the live file (additive
  guarantee; consuming `InfoGuideLayout` from `[topic].astro` is a tempting
  cleanup but out of scope — §9).

### 4.5 `src/pages/skolko-zarabatyvaet-kurer.astro` — NEW (P0 — top-of-funnel)

Frontmatter: `getItemsByTopic('доход')` → 6 sourced KB items; `getSourceById`
for `citation`. Body: intro → income table by format/brand (KB facts +
`IncomeCalculator`-style rate data) → `<IncomeCalculator />` (reused component,
already standalone on `/calculator/`) → "от чего зависит доход" → **strong CTA
block into the 4 transport hubs and `/cities/`**. JSON-LD: `Article` + `FAQPage`
+ `BreadcrumbList` (the `guide/[topic].astro` shape; `citation` from KB sources
used). **Funnel requirement (intent §6.2): MUST funnel to vacancies** — CTA uses
`<HubCrossLinks>` + a prominent "Смотреть вакансии" button to
`/rabota-peshim-kurerom/`. `robots`: always `index` (KB + calculator = real
content); defensive guard `noindex` if `getItemsByTopic('доход')` ever returns
`[]`.

### 4.6 `src/pages/kak-stat-kurerom.astro` — NEW (P1)

Reuses the **`HowTo` JSON-LD pattern** from `guide/[topic].astro` (the
`оформление` HowTo block). Body: step-by-step "как устроиться курьером" →
breakdown by brand & age (reuse `getItemsByTopic('оформление')` + `возраст`) →
CTA to company pages and vacancies. JSON-LD: `Article` + `HowTo` + `FAQPage` +
`BreadcrumbList`.

### 4.7 `src/pages/usloviya-raboty-kurerom.astro` — NEW (P2)

Body: суть работы → договор/оформление (reuse `оформление`) → часы/график (reuse
`график` — 2 items `schedule-flexibility`, `side-hustle-evening`) → FAQ → CTA.
JSON-LD: `Article` + `FAQPage` + `BreadcrumbList`. Lighter than the income guide.

### 4.8 `src/pages/otzyvy.astro` — NEW (P2)

Uses `InfoGuideLayout` chrome. Frontmatter: imports `reviews.json` + `jobsData`;
`buildReviewAggregate(reviews)` from `reviewsAggregate.ts`; intersects brand
slugs with `getCompaniesFromJobs`. Conservative JSON-LD per Decision C. `robots`:
`noindex, follow` iff `aggregate.length === 0`. Body: hero → intro → per-brand
sections (only brands with `>= 3` reviews) → FAQ → cross-links. Each brand
section: heading, average + count + distribution bar, ≤6 latest `.review-card`s,
"Все вакансии {brand} →" link when a company page exists.

### 4.9 `src/utils/reviewsAggregate.ts` — NEW (pure helper, ~120 LOC)

Exports `ReviewLike` (re-use the one from `companies.ts` — DRY),
`BrandReviewSummary`, and:
- `buildReviewAggregate(reviews: ReviewLike[]): BrandReviewSummary[]` — one pass:
  group by `company`; `averageRating` (finite ratings only, 1-decimal, clamped
  1-5); `ratingDistribution` (count per star bucket); `latestReviews` (top 6 by
  `date` desc); `slug` via `slugifyCompany`.
- `buildReviewSchemaNodes(summary, companyHref): unknown[]` — per Decision C:
  `Organization` + `aggregateRating` + ≤6 `Review` nodes, **only** when
  `companyHref` is truthy. Mirrors `companies/[slug].astro`'s review-schema shape.
- `MIN_REVIEWS_PER_BRAND = 3` constant exported for the page + tests.

### 4.10 `src/pages/index.astro` — EDITED (Decision D)

All additive / string-level edits: `homepageTitle`/`homepageDescription` template
strings reworded for the two head terms (still `.slice(0,70)`/`.slice(0,170)`);
`featuredFormats` (lines 42-47) hrefs swapped to the new hubs; `routeCards`
category-page hrefs (lines 49-69) swapped to hubs; one new `hubLinks` entry (line
103) → `/skolko-zarabatyvaet-kurer/`. Optionally swap the ad-hoc `featuredFormats`
rendering for `<HubCrossLinks current="home" />` — *optional*, only if it does not
disturb the hero/toolbar layout; default is the lowest-risk href swap. `HomeHero`
H1 verified to lead with "Работа курьером".

### 4.11 `src/utils/listingSlugs.ts` — EDITED (honest-content for hubs)

`getEmptyListingPaths()` today only knows `rabota-kurerom-{slug}` city + category
URLs. The 4 new hubs are *not* `rabota-kurerom-*`, so they would not be
auto-excluded from the sitemap if empty. The honest-content invariant is "sitemap
and `robots` agree" (`jobFilters.ts` JSDoc) — leaving an empty `noindex` hub in
the sitemap is exactly the drift the design forbids. **Decision: extend
`getEmptyListingPaths()`** with a small block iterating `HUB_CONFIGS`, testing
`filterJobsByCriteria(jobsData, cfg.filter).length === 0`, adding the hub path.
Backward-compatible (only *adds* entries to the returned `Set`);
`scripts/emit-empty-listings.ts` + `astro.config.mjs` pick it up with **zero
changes** (`getEmptyListingUrls` already maps over `getEmptyListingPaths()`).
Caveat: with the live ~4.8k-job dataset the `foot`/`auto`/`bicycle`/`flexible`
filters match thousands of jobs, so the hubs are never empty in practice — the
guard is correctness insurance.

### 4.12 `astro.config.mjs` — EDITED (sitemap priority)

`@astrojs/sitemap` auto-includes any `src/pages/*.astro` route, so the 9 new
pages appear automatically. **But** `serialize()` assigns priority by
`url.includes()`: the hubs are `/rabota-peshim-kurerom/` — they do **not** contain
`rabota-kurerom-`; the guides do not contain `/guide/`; `/otzyvy/` matches
nothing. All 9 would fall to the default `priority: 0.3` — under-signaling a P0
hub and a 76K-demand guide. **Decision: add explicit `url.includes()` branches
for the 9 new slugs before the default** (hubs + income guide → `0.7`; other
guides + `/otzyvy/` → `0.6`). A 4-6 line additive change to a pure function;
cannot affect existing URLs (new branches only match the new slugs).

---

## 5. Data model — what each page consumes

| Page | Data source | Access path |
|---|---|---|
| 4 transport hubs | `src/data/jobs.ts` (`GeneratedJob[]`) | `filterJobsByCriteria(jobsData, {tag})` — `foot`/`auto`/`bicycle`/`flexible`. **No new data.** Each job already has `transport` + a transport tag. |
| `/skolko-zarabatyvaet-kurer/` | `knowledge-base.json` (`доход` topic, 6 items) + `IncomeCalculator` rate data (from `vacancies.ts` Yandex offers) | `getItemsByTopic('доход')`, `getSourceById` for citations; calculator self-contained. |
| `/kak-stat-kurerom/` | `knowledge-base.json` (`оформление` 3 items, `возраст` 1) | `getItemsByTopic('оформление' / 'возраст')`. |
| `/usloviya-raboty-kurerom/` | `knowledge-base.json` (`оформление`, `график` 2, `требования` 2) | `getItemsByTopic(…)`. |
| `/otzyvy/` | `reviews.json` (19 144 rows) + `jobs.ts` (for company-page existence) | `buildReviewAggregate(reviews)`; `getCompaniesFromJobs(jobsData)` for `companyHref`. |
| `/` (homepage) | unchanged (`jobs.ts`, `knowledge.ts`) | unchanged; only string/href edits. |

`knowledge-base.json` shape (consumed read-only): `{ version, generated
(YYYY-MM-DD, currently "2026-04-26"), sources: [{id, name, kind, url}], items:
[{id, topic, question, answer_short, answer_long, facts: [{value, source_id}],
geo_scope, company_scope, confidence}] }`.

**Key fact: the 4 hubs need ZERO new data.** Transport tags + the
`filterJobsByCriteria` helper already exist and are battle-tested (the category
pages use the exact same filters today). The guides reuse the existing
`knowledge-base.json` (sourced, validated). `/otzyvy/` reuses `reviews.json`. The
plan introduces **no new data files** — only two new pure helper modules.

---

## 6. Edge cases & failure modes

1. **Empty hub feed.** If a transport tag matches zero active jobs: page sets
   `robots="noindex, follow"`; `getEmptyListingPaths()` (edited, §4.11) adds the
   hub URL → sitemap drops it. Title/description fall to a "следите за
   обновлениями" variant (mirror `cityListingPage.ts::buildSeoTitle` empty
   branch). **Canonical interaction:** if a hub is empty/noindex, the matching
   category page must **not** canonical to it (canonical → noindexed URL is a
   self-inflicted indexing bug). The `[slug].astro` canonical guard checks
   `isHubEmpty(jobsData, cfg)` and skips the cross-canonical, leaving the
   category page self-canonical. Unreachable with the live dataset, but
   implemented.
2. **Honest-content for guides.** Guides are editorial — they always "have
   content". The guard is defensive: if a guide's KB topic returns `[]`
   (`getItemsByTopic` finds nothing — KB schema drift), the guide still has its
   hand-written prose, so it stays `index`. The income guide degrades gracefully
   if `IncomeCalculator` rate maps are empty (the calculator already has
   `fallbackByTransport` defaults — verified).
3. **`/otzyvy/` with thin/zero data.** Page-level: `noindex` iff
   `aggregate.length === 0`. Per-brand: brands with `< 3` reviews are not rendered
   (no section, no JSON-LD). A brand with reviews but zero *finite* ratings → no
   `AggregateRating` (would be `NaN`). A review row with a missing/garbage
   `rating` → excluded from average and from `Review` nodes.
4. **JSON-LD with missing data.**
   - Hubs: `ItemList` slices `filteredJobs.slice(0, 10)` — empty array → empty
     `itemListElement` (valid, just empty); `FAQPage` always has hand-built items.
   - `/otzyvy/`: never emit `Organization`/`AggregateRating` for a brand without a
     backing company page; never emit a page-level `AggregateRating`; clamp all
     `ratingValue` to 1-5; ISO-normalize all dates; drop a `Review` node whose
     `reviewBody` would be empty (no comment/pros/cons).
   - Guides: `citation` array — only sources actually referenced; if a KB item
     references a `source_id` with no matching source, filter it out (mirror
     `guide/[topic].astro`'s `.filter(Boolean)`).
5. **Build failure resilience.** New `src/pages/*.astro` are pure SSG; a throw in
   frontmatter fails the whole build (Astro behavior). Mitigation:
   `transportHubs.ts`/`reviewsAggregate.ts` are pure, total functions (no throws —
   return empty/defaults on bad input), unit-tested before the pages consume
   them. `emit-empty-listings.ts` runs in `prebuild`; if `listingSlugs.ts`'s new
   hub block threw, `generate:data` fails loudly with the existing "run npm run
   generate:data first" guidance — caught early, not at deploy.
6. **i18n.** The site shell UI is **RU-only** post-PR #131 (`BaseLayout` ships
   only the `ru` dictionary; non-RU slots are byte-identical clones, deliberately
   not inlined). Per-vacancy content is translated via lazy
   `/vacancy-translations/<lang>/` fragments. **Decision: all 9 pages are RU-only
   static copy**, consistent with the current shell-UI policy and the category
   pages (`[slug].astro` hero copy is plain RU, no `data-t`). The `JobCard`s
   inside hub `JobGrid`s keep their existing per-vacancy i18n (the lazy fragment
   loader keys off `data-vacancy-source-slug`, which `JobGrid` already emits —
   unchanged). No new i18n keys, no `data-t` attributes on the new editorial
   copy. Explicitly scoped; matches intent §8.
7. **Canonical collisions.** The 9 new slugs checked against the route table:
   `[slug].astro` owns `rabota-kurerom-*` + city slugs; `guide/[topic].astro`
   owns `/guide/*`; `companies/[slug].astro` owns `/companies/*`. The new slugs
   (`rabota-peshim-kurerom`, `rabota-avtokurerom`, `rabota-velokurerom`,
   `podrabotka-kurerom`, `skolko-zarabatyvaet-kurer`, `kak-stat-kurerom`,
   `usloviya-raboty-kurerom`, `otzyvy`) do **not** match any existing static or
   dynamic pattern → no route collision. Each new page is self-canonical
   (BaseLayout default) except the deliberate category→hub canonical of
   Decision A. `intent.md §7` confirms "None of the 9 target routes exist as
   files."
8. **`trailingSlash: 'always'`.** All internal links to the new pages MUST end
   with `/` (e.g. `/rabota-peshim-kurerom/`). The config enforces it; tests assert
   it. Decision A's category-canonical and Decision D's href swaps all use
   trailing slashes.
9. **Sitemap chunk size.** 9 new URLs on a ~5460-URL sitemap → negligible; stays
   within the 1000-URL/chunk + ≤350 KB budget. No action.
10. **Reviews dataset growth.** `reviews.json` is ~10 MB, imported at SSG time by
    `otzyvy.astro` (and already by `companies/[slug].astro`). If growth regresses
    build time, the contingency (§9) is a precomputed brand-summary JSON via a new
    `scripts/` emitter. Not built upfront (YAGNI).
11. **`HomeHero` H1 risk.** Changing the homepage H1 could affect the brand
    impression. Mitigation: copy-only edit, reviewed, trivially revertable; the
    head term "Работа курьером" (147K) is the dominant query so leading with it is
    the correct call.
12. **Stale on-disk checkout.** `intent.md §11`: the local checkout is stale vs
    GitHub `main`. **Out of scope for this plan** (a Phase D git-hygiene task) but
    flagged so implementation worktrees branch from the correct `main`.

---

## 7. Security & trust boundaries

- **No secrets, no new env vars.** All 9 pages are static SSG; no API keys, no
  runtime fetch of secrets. (The homepage's existing geo-IP fetch is untouched.)
- **`reviews.json` is the only sizeable semi-trusted input.** It is a
  repo-committed data file (not live user input) but contains free-text
  (`comment`, `pros`, `cons`, `name`, `city`) that ends up in HTML. Astro
  **auto-escapes** every `{expression}` interpolation in `.astro` templates — the
  review text rendered into `.review-card`s is XSS-safe by default, exactly as
  `companies/[slug].astro` already renders the same fields. **Rule: never use
  `set:html` for review-derived content.** The only `set:html` in the new code is
  the JSON-LD `<script>` (via `BaseLayout`'s `structuredData`, already
  `JSON.stringify`-d); review strings inside JSON-LD are JSON-encoded, not HTML,
  so injection there is impossible too.
- **JSON-LD trust.** Conservative-by-design (Decision C): no fabricated
  `AggregateRating`, ratings clamped, brand `Organization` nodes only for
  page-backed brands. This guards against a structured-data manual action — the
  real "trust boundary" for an SEO project.
- **Outbound links.** Hub `JobCard`s link to partner apply URLs — that flow is
  unchanged (existing `JobGrid`/`JobCard`, existing `data-apply-cta` tracking).
  Guide CTAs link to internal hubs/`/companies/` only. KB `citation` source URLs
  in JSON-LD point to official service pages; any rendered source links reuse
  `guide/[topic].astro`'s `rel="noopener noreferrer nofollow"` pattern.
- **No new client JS.** Hubs/guides ship no bespoke `<script>` (the income guide
  embeds `IncomeCalculator`, which carries its own already-audited script). Less
  JS = smaller attack surface and protects the CWV budget.
- **Honest-content as a trust boundary.** Shipping a noindexable empty page or a
  thin-content page is itself a site-trust risk; the `robots` + sitemap-exclusion
  machinery (extended in §4.11) is the enforcement point.

---

## 8. Testing strategy

Matching the repo's `vitest` patterns (`tests/*.test.ts`, pure-helper unit tests,
`describe.skipIf(noDist)` build-output tests, AAA structure, descriptive names).
Target ≥80% coverage on all new helper code.

### 8.1 Unit tests (pure helpers — the bulk of coverage)

**`tests/transportHubs.test.ts`** — for `src/utils/transportHubs.ts`:
- `HUB_CONFIGS` has exactly 4 entries; each `slug` unique + trailing-slash-free;
  each `filter.tag` ∈ {`foot`,`auto`,`bicycle`,`flexible`}.
- `buildHubTitle`/`buildHubDescription`: non-empty vs empty branch; `≤70`/`≤170`
  chars; head keyword present; empty branch yields "следите за обновлениями" copy.
- `buildHubFaqItems`: returns ≥3 items; every item has non-empty
  `question`/`answer`; count interpolation correct.
- `buildHubSchemaGraph`: emits `CollectionPage` + `FAQPage` + `BreadcrumbList`;
  `ItemList` length = `min(jobs, 10)`; breadcrumb last crumb = hub.
- `isHubEmpty`: `true` for a job list with no matching tag, `false` otherwise;
  uses a `makeJob` fixture mirroring `tests/jobFilters.test.ts`.

**`tests/reviewsAggregate.test.ts`** — for `src/utils/reviewsAggregate.ts`:
- `buildReviewAggregate`: groups by brand; `averageRating` correct, 1-decimal,
  clamped 1-5; `ratingDistribution` sums to `reviewCount`; `latestReviews` sorted
  desc by date, length ≤6; `slug` matches `slugifyCompany`.
- non-finite / missing `rating` rows excluded from the average.
- empty input → `[]`.
- `buildReviewSchemaNodes`: `[]` when `companyHref` falsy; with a href, emits
  `Organization` + `aggregateRating` (`ratingValue` 1-5, `reviewCount` matches) +
  ≤6 `Review` nodes; every `Review` has `itemReviewed` = `Organization`,
  `reviewRating` clamped, `datePublished` ISO; a brand with zero finite ratings →
  no `aggregateRating`.
- `MIN_REVIEWS_PER_BRAND === 3`.

**`tests/listingSlugs.test.ts`** (new, or extend) — the edited
`getEmptyListingPaths()`:
- with a fixture where a hub tag matches zero jobs, the hub path is in the Set;
- with a normal fixture, the 4 hub paths are absent;
- existing city/category behavior unchanged (regression guard).

### 8.2 Build-output / integration tests

**`tests/seo-rollout-build.test.ts`** — new, `describe.skipIf(noDist)` (mirrors
`tests/build-output.test.ts`):
- All 9 routes emit an `index.html` (`dist/rabota-peshim-kurerom/index.html`, …,
  `dist/otzyvy/index.html`).
- Each hub HTML contains `id="jobs-grid"` and `class="job-card"` (the `JobGrid`
  rendered) and a canonical `<link>` to itself.
- Each new page emits exactly one `<script type="application/ld+json">`; it
  `JSON.parse`s; the hub graph contains
  `CollectionPage`+`FAQPage`+`BreadcrumbList`.
- `/otzyvy/` JSON-LD contains **no** top-level `AggregateRating` node; any
  `Organization` with `aggregateRating` corresponds to a brand with a company
  page.
- The category page `dist/rabota-kurerom-peshkom/index.html` carries
  `<link rel="canonical" href="https://kurerok.ru/rabota-peshim-kurerom/">`
  (Decision A); the other 3 facets likewise.
- Homepage HTML links to all 4 new hubs and to `/skolko-zarabatyvaet-kurer/`.
- `sitemap-index.xml` / chunk files include the 9 new URLs with the expected
  priority.
- All internal links to new pages end with `/` (trailing-slash invariant).

### 8.3 Regression guards
- `tests/build-output.test.ts` page-count band — currently `~6750` (±band);
  **must be widened by +9** or it fails. A required edit.
- `transport-coverage.test.ts` (existing) — confirm still green; the hubs depend
  on transport tags it already covers.
- Existing `[slug].astro` behavior — confirm the new `CATEGORY_CANONICAL_HUB`
  edit does not alter non-category / non-mapped paths.

### 8.4 Manual QA (Phase D, browser)
- Hub renders, `JobGrid` reveal-more works, fact cards correct, FAQ accordion.
- Income guide: calculator interactive, CTA links land on hubs.
- `/otzyvy/`: brand sections render, links to company pages resolve.
- Dark mode on all 9 pages (the reused `.guide-*`/`.listing-*` CSS is already
  dark-mode-aware; verify no regression).
- Lighthouse CWV spot-check on a hub + the income guide vs the budget.

---

## 9. Open questions

1. **(#1, from intent §4) Brand per-vacancy data source.** Does `kurerok.ru`
   have a per-brand vacancy feed for Золотое Яблоко / Wildberries / Магнит /
   Самокат / Пятёрочка / Лавка / Додо / ВкусВилл? This gates Wave 2 (all brand
   pages). **Not designed in this plan.** Escalate to the site owner.
2. **Homepage H1 current text.** Does `HomeHero.astro`'s H1 already lead with
   "Работа курьером"? If yes, Decision D item 2 is a no-op. Resolve by reading
   `HomeHero.astro` in Phase B.
3. **`.md` guide variants.** `guide/[topic].md.ts` emits LLM-friendly Markdown
   mirrors. Should the 4 new guides get `.md` siblings? **Stance: no** (not in the
   9 items, adds 4 routes, no ranking value). Flag for the owner if LLM
   discoverability is a goal.
4. **`MIN_REVIEWS_PER_BRAND` threshold.** Proposed `3`. Could be `5` for a
   stricter quality bar. Owner/SEO call; trivially tunable (one constant).
5. **`reviews.json` build-time cost.** A ~10 MB SSG import. `companies/[slug].astro`
   already does this and the build is green, so expected fine — but if measured
   build time regresses, the contingency is a precomputed brand-summary JSON via a
   new `scripts/emit-reviews-summary.ts` (mirroring `emit-empty-listings.ts`). Not
   built upfront (YAGNI); decide on real numbers.
6. **`InfoGuideLayout` adoption by `guide/[topic].astro`.** Refactoring the live
   `[topic].astro` to consume the new `InfoGuideLayout` would de-duplicate the
   `.guide-*` chrome. **Out of scope** (additive guarantee — do not touch the live
   file this run). A clean follow-up task.
7. **Income-table data provenance.** `/skolko-zarabatyvaet-kurer/` mixes KB
   `доход` facts with `IncomeCalculator` rate data. Confirm the KB `доход` items
   are fresh enough (KB `generated: 2026-04-26`) to headline a 76K-demand page, or
   whether the table needs a manual content pass.
8. **Hub body copy ownership.** The requirement/"как стать" prose in
   `HUB_CONFIGS` is editorial. Who writes the final RU copy — the plan provides
   structure + placeholders; a content pass is needed before indexing.

---

## 10. Implementation sequencing (work breakdown into beads)

Dependency-ordered. Each bead is independently testable; `[dep: …]` notes
prerequisites. Beads B1-B3 have no interdependencies → safe to parallelize.

| Bead | Title | Files | Dep | Notes |
|---|---|---|---|---|
| **B1** | Transport-hub helper | `src/utils/transportHubs.ts` + `tests/transportHubs.test.ts` | — | Pure module + config table + builders. TDD: tests first. Reuses `cityListingPage.ts`/`schema.ts` types. |
| **B2** | Reviews-aggregate helper | `src/utils/reviewsAggregate.ts` + `tests/reviewsAggregate.test.ts` | — | Pure module. Reuses `slugifyCompany` from `companies.ts`. Conservative JSON-LD builder. |
| **B3** | Shared UI components | `src/components/InfoGuideLayout.astro`, `src/components/HubCrossLinks.astro` | — | Chrome extracted (copied) from `guide/[topic].astro`. No logic — low risk; parallel with B1/B2. |
| **B4** | 4 transport hub pages | `src/pages/rabota-peshim-kurerom.astro` + 3 named siblings | B1, B3 | Thin page files; reuse `JobGrid`/`JobFilters`/`PartnerBanner`. Honest-content `robots` wired. |
| **B5** | Honest-content + sitemap wiring | `src/utils/listingSlugs.ts` (edit), `astro.config.mjs` (edit serialize priority) | B1 | `getEmptyListingPaths()` gains the 4-hub block; `serialize()` gains 9 priority branches. Backward-compatible. `emit-empty-listings.ts` unchanged. |
| **B6** | Decision-A category canonical | `src/pages/[slug].astro` (edit — add `CATEGORY_CANONICAL_HUB` map + canonical guard) | B1, B4 | Single additive edit; canonical only emitted when the hub is non-empty (`isHubEmpty`). |
| **B7** | Income guide (P0) | `src/pages/skolko-zarabatyvaet-kurer.astro` | B3 | Reuses `IncomeCalculator`, KB `доход` topic, guide JSON-LD shape. Strong vacancy-funnel CTA. |
| **B8** | "Как стать курьером" guide (P1) | `src/pages/kak-stat-kurerom.astro` | B3 | Reuses `HowTo` JSON-LD pattern + `оформление`/`возраст` KB. |
| **B9** | "Условия работы" guide (P2) | `src/pages/usloviya-raboty-kurerom.astro` | B3 | Reuses `оформление`/`график`/`требования` KB. |
| **B10** | `/otzyvy/` aggregate-reviews page (P2) | `src/pages/otzyvy.astro` | B2, B3 | Brand-grouped sections; conservative JSON-LD; `companyHref` intersection with `getCompaniesFromJobs`. |
| **B11** | Homepage optimization (Decision D) | `src/pages/index.astro` (edit), `src/components/home/HomeHero.astro` (verify/copy edit) | B4, B7 | Title/desc reword; `featuredFormats`/`routeCards` hrefs → hubs; one `hubLinks` entry → income guide. String-level only. |
| **B12** | Build-output tests + page-count band | `tests/seo-rollout-build.test.ts` (new), `tests/build-output.test.ts` (widen band +9) | B4-B11 | `skipIf(noDist)`; asserts all 9 routes, JSON-LD validity, canonical edges, sitemap inclusion. |
| **B13** | Full verification + manual QA | — | B12 | `npm run generate:data && npm run build && npm test && npm run typecheck && npm run lint`; browser QA per §8.4; Lighthouse CWV spot-check. |

**Suggested wave grouping** (matching the flywheel's parallel-worktree model):
- **Wave α (parallel):** B1, B2, B3 — pure helpers + UI chrome, no
  interdependencies.
- **Wave β (parallel after α):** B4 (hubs), B7/B8/B9 (guides), B10 (`/otzyvy/`) —
  all depend only on α.
- **Wave γ (after β):** B5 (sitemap/honest-content), B6 (category canonical),
  B11 (homepage) — these touch shared files / depend on the hubs existing.
- **Wave δ:** B12 (tests) then B13 (verification) — sequential, last.

**Hand-off to the indexing campaign (`seo-promotion` skill).** This plan ships
all 9 URLs in a single wave. The hand-off list (intent §4/§10): 4 hub URLs + 4
guide URLs + `/otzyvy/` — submitted to IndexNow / Yandex Переобход / Bing / GSC
once the build is green and verified. The 4 category facets are *already*
indexed; their new `canonical` is picked up on the next crawl with no submission
needed.

---

### Reuse summary (intent §8 "reuse, don't rebuild")

- **Reused as-is, zero edits:** `JobGrid`, `JobFilters`, `PartnerBanner`,
  `IncomeCalculator`, `BaseLayout`, `Header`, `Footer`, `jobFilters.ts`,
  `schema.ts`, `knowledge.ts`, `emit-empty-listings.ts`.
- **Reused via copy of a proven pattern:** the `guide/[topic].astro` chrome +
  JSON-LD (→ `InfoGuideLayout`); `cityListingPage.ts`'s
  `CollectionPage`/`ItemList`/`FAQPage` shape and `buildFactCards` /
  `buildTransportTypes` / `buildVacancyCountText`; `companies/[slug].astro`'s
  `Review`/`AggregateRating`/`Organization` shape (→ `reviewsAggregate.ts`);
  `slugifyCompany` from `companies.ts`.
- **Net-new surface:** 2 pure helper modules (`transportHubs.ts`,
  `reviewsAggregate.ts`), 2 small components (`InfoGuideLayout`, `HubCrossLinks`),
  9 page files (8 thin + `/otzyvy/`).
- **Edited shared files (all additive / backward-compatible):**
  `src/pages/[slug].astro` (one canonical map), `src/utils/listingSlugs.ts` (one
  hub block), `astro.config.mjs` (sitemap-priority branches), `src/pages/index.astro`
  (strings + hrefs), `tests/build-output.test.ts` (page-count band). **Zero
  edits** to any data file; **zero** new data files.

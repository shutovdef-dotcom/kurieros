# kurerok.ru SEO Rollout — Flywheel Plan

> Living markdown plan. Phase A artifact — synthesised from 3 independent competing plans
> (`docs/flywheel/competing/plan-{a,b,c}.md`) over `docs/flywheel/intent.md`.
> **Status: REFINED — architecture STABLE after 3 fresh-eyes rounds. Ready for Phase B
> (beads), gated on Open Questions #2/#3/#4 (owner inputs).**
> Scope: Wave 1 (4 transport/part-time hubs + homepage optimization) + Wave 3 info-guides
> (3 guides + `/otzyvy/`). Brand pages deferred (Open Question #1).

---

## 1. Intent

- **Problem:** Semantic-core v2 found ~642K impressions/mo of unblocked search demand on
  `kurerok.ru` (a static Astro courier-jobs aggregator, ~6 000 pages) with no dedicated
  landing page: transport hubs ~187K, info content ~158K, homepage head terms ~297K.
- **Goal:** Ship 9 additive work items closing those clusters — without breaking the
  existing ~6 000 pages — each page indexable only with real content, each funnelling to
  vacancies and the GA4 `apply_click` event.
- **Target users:** RU job-seekers searching commercial ("работа пешим курьером") and
  informational ("сколько зарабатывает курьер") queries.
- **Non-goals:** All brand landing pages (Wave 2 + Wave 3 brands) — blocked on Open
  Question #1. Geo-page optimization. Indexing-campaign mechanics (owned by `seo-promotion`).
- **Success criteria:** 9 routes shipped additively; build green; CWV not regressed;
  honest-content enforced; new URLs auto-sitemapped with sensible priority; reuse-first;
  post-launch — index < 14 days, cluster clicks rise, `apply_click` ~27% does not regress.

### The 9 work items

| # | Page | URL | Type | Demand/mo | Priority |
|---|------|-----|------|----------:|:--------:|
| 1 | Пеший курьер | `/rabota-peshim-kurerom/` | Transport hub | 87 837 | P0 |
| 2 | Автокурьер | `/rabota-avtokurerom/` | Transport hub | 63 046 | P0 |
| 3 | Велокурьер | `/rabota-velokurerom/` | Transport hub | 17 483 | P1 |
| 4 | Подработка курьером | `/podrabotka-kurerom/` | Hub (free schedule) | 18 396 | P1 |
| 5 | Главная — оптимизация | `/` | Optimize existing | 297 365 | P1 |
| 6 | Сколько зарабатывает курьер | `/skolko-zarabatyvaet-kurer/` | Info-guide | 76 239 | P0 |
| 7 | Как стать курьером | `/kak-stat-kurerom/` | Info-guide | 31 814 | P1 |
| 8 | Условия и график работы | `/usloviya-raboty-kurerom/` | Info-guide | 25 945 | P2 |
| 9 | Отзывы | `/otzyvy/` | Reviews aggregate | 24 076 | P2 |

---

## 2. User workflows

1. **Transport-intent → hub → vacancy → apply.** Searcher on "работа пешим курьером" lands
   on `/rabota-peshim-kurerom/`, sees a live `JobGrid` of `tag:'foot'` vacancies across all
   cities, reads income/requirements/FAQ, clicks a `JobCard` → existing `/v/{slug}/` → apply.
2. **Income research → guide → hub → apply.** Searcher on "сколько зарабатывает курьер"
   lands on `/skolko-zarabatyvaet-kurer/`, reads the income table, uses `IncomeCalculator`,
   follows a CTA into a hub or vacancy. Top-of-funnel — MUST funnel down.
3. **Homepage head-term → homepage → hub.** Searcher on "работа курьером" lands on `/`,
   uses the toolbar or a new interlink block into a transport hub.
4. **Reviews research → `/otzyvy/` → brand → vacancy.** Searcher on "отзывы курьеров" reads
   brand-grouped employer reviews, follows to a `/companies/{slug}/` page → vacancies.
5. **Crawler indexing (implicit).** Every new URL auto-enters `sitemap-index.xml` with a
   sensible priority, indexable only with real content, ready for the wave-by-wave
   `seo-promotion` hand-off.

---

## 3. Architecture

### 3.1 Component map

```
NEW page routes (src/pages/) — 8 files
  rabota-peshim-kurerom.astro   ┐  4 transport hubs — thin page files;
  rabota-avtokurerom.astro      │  each renders <TransportHub> with a
  rabota-velokurerom.astro      │  per-slug config from transportHubs.ts
  podrabotka-kurerom.astro      ┘
  skolko-zarabatyvaet-kurer.astro ┐ 3 info-guides — thin page files,
  kak-stat-kurerom.astro          │ each via <InfoGuideLayout> + bespoke body
  usloviya-raboty-kurerom.astro   ┘
  otzyvy.astro                      reviews aggregate — uses guide chrome

NEW shared helpers (src/utils/) — pure, unit-tested, no Astro globals
  transportHubs.ts     hub config table + pure builders (title/desc/FAQ/schema) + isHubEmpty
  infoGuides.ts        guide config registry + pure builders + schema
  reviewsAggregate.ts  brand-grouped review aggregation + conservative JSON-LD

NEW components (src/components/)
  TransportHub.astro     hub body (hero+facts, JobGrid, info/FAQ/exit-ramp blocks)
  InfoGuideLayout.astro  guide chrome (breadcrumb, hero, related grid) — copied from guide/[topic]
  ReviewsAggregate.astro reviews-by-brand body
  HubCrossLinks.astro    interlink block reused by hubs + homepage

EDITED shared files — all additive, backward-compatible
  src/pages/[slug].astro       + CATEGORY_CANONICAL_HUB map (Decision A) — <=15 LOC
  src/utils/listingSlugs.ts    + getEmptyListingPaths() learns the 4 hub paths
  astro.config.mjs             + sitemap-priority branches for the 8 new slugs
  src/pages/index.astro        title/desc strings + interlink hrefs (Decision D)
  tests/build-output.test.ts   widen the page-count band by +8

REUSED as-is — zero edits
  JobGrid.astro, JobFilters.astro, PartnerBanner.astro, IncomeCalculator.astro,
  BaseLayout.astro, Header/Footer, jobFilters.ts (filterJobsByCriteria),
  schema.ts (buildBreadcrumbSchema), cityListingPage.ts (buildFactCards & FaqItem/FactCard
  types), knowledge.ts (getItemsByTopic, getSourceById), companies.ts (slugifyCompany,
  getCompaniesFromJobs), seededShuffle.ts, scripts/emit-empty-listings.ts
```

### 3.2 Decision A — Transport hubs vs. existing category pages

**Context.** The catch-all `src/pages/[slug].astro` already emits category pages on
different slugs: `rabota-kurerom-peshkom` (`tag:'foot'`), `rabota-kurerom-na-avto`
(`auto`), `rabota-kurerom-na-velosipede` (`bicycle`), `rabota-kurerom-podrabotka`
(`tag:'flexible'`), plus `na-samokate` (`bicycle`) and other flexible facets. The new hubs
target the same intent and the same job pool → genuine cannibalization.

**Decision: new hubs are the canonical rich page; the 4 exact-match category pages keep
their slugs but `<link rel="canonical">` -> the matching hub.** No 301s, no deletion.

Rationale (all 3 competing plans converged here):
- **301s are not safely available** — GitHub Pages static hosting (`output:'static'`)
  cannot emit a real 3xx; a meta-refresh hack is worse for SEO/users.
- **Category pages are interlinked from live indexed surfaces** (`index.astro`
  `featuredFormats`/`routeCards`, `knowledge.ts` geo-links). Deleting/redirecting their
  slugs would break inbound internal links — an additive-only violation.
- **`rel=canonical` is the textbook de-dup signal:** two URLs, one intent -> declare the
  rich hub canonical; engines consolidate ranking onto it; the category page stays a
  crawlable, clickable filter facet.

**Mechanics.** A new constant in `[slug].astro`:
```ts
const CATEGORY_CANONICAL_HUB: Readonly<Record<string, string>> = {
  peshkom:         '/rabota-peshim-kurerom/',
  'na-avto':       '/rabota-avtokurerom/',
  'na-velosipede': '/rabota-velokurerom/',
  podrabotka:      '/podrabotka-kurerom/',
};
```
When `type === 'category'` and the bare category slug is in the map, pass `canonicalURL`
to `BaseLayout`. **Match on `Astro.props.data.slug`** (the bare slug, e.g. `peshkom`) —
NOT `Astro.params.slug` (the full `rabota-kurerom-peshkom` route param), which would never
match the map keys. All other ~6 000 slugs get `undefined` -> default self-canonical. **Canonical-to-noindexed
guard (from Plan C):** emit the cross-canonical *only* when the target hub is non-empty —
`[slug].astro` calls `isHubEmpty(jobsData, cfg)` from `transportHubs.ts` so the page and
the hub agree. A canonical pointing at a `noindex` hub is a self-inflicted indexing bug.

**Conservative scope:** only the **4 exact-match** facets are canonicaled this run.
Note `tag:'flexible'` is shared by **6** category pages (`podrabotka`, `svobodny-grafik`,
`na-vyhodnye`, `vecherom`, `nochyu`, `zhenshchine`) and `tag:'bicycle'` by 2 (`na-velosipede`,
`na-samokate`) — so several near-duplicate category pages remain self-canonical after this
run. Open Question #6 sizes this and proposes which extra facets to fold. The old category
pages are otherwise **left unchanged** (lowest-risk; slimming them is a possible follow-up).

### 3.3 Decision B — Info-guide routing

**Decision: standalone top-level `src/pages/*.astro` files that reuse the `guide/[topic]`
chrome + JSON-LD patterns via a new `<InfoGuideLayout>` component — NOT driven by
`knowledge-base.json`'s `TOPIC_META`, NOT under `/guide/`.** (All 3 plans converged.)

Rationale:
- The spec mandates keyword-exact top-level URLs — `/guide/` burial forfeits that.
- `guide/[topic].astro` is a rigid KB-FAQ-card renderer over the 12 fixed `TOPIC_META`
  topics. The new guides are long-form editorial pages (income tables, calculator,
  step-by-step HowTo) — wrong shape. Forcing them in means either per-slug `if` branches
  (the `isEzhednevLanding` anti-pattern) or cramming prose into the pipeline-validated
  `knowledge-base.json`. Both reject.
- Precedent for bespoke top-level pages exists: `calculator.astro`, `compare.astro`,
  `cities.astro`.
- The guides still **pull** KB data where it helps (`getItemsByTopic('доход')` etc.) for
  sourced, fact-checked facts blocks + `citation` JSON-LD — reuse without duplication.
- `guide/[topic].astro` and `guide/index.astro` are **untouched** (additive). Crawler
  reachability for the new guides comes from: the homepage interlink, the hubs' related
  blocks, and `InfoGuideLayout`'s related grid.
- `.md` LLM-mirror variants (`guide/[topic].md.ts` precedent) are **out of scope** this
  run (Open Question #7).

### 3.4 Decision C — `/otzyvy/` aggregate reviews

**Context.** `src/data/reviews.json` is a ~10 MB array of ~19 144 review rows
`{id, jobId, company, jobTitle, name, city, pros, cons, comment, rating, date}` across 8
companies. Reviews surface today in `ReviewsBlock` (homepage) and per-`/companies/{slug}/`
pages — **the company pages already compute and emit `AggregateRating` JSON-LD from this
exact data.** The competing plans flagged the data reads as synthetic seed data (uniform
~4.3 averages, deliberate typos).

**Decision (synthesised, Plan C primary): `/otzyvy/` is a brand-grouped reviews index.
JSON-LD is conservative:**
- **No page-level `AggregateRating`** — a single rating averaged across different
  employers is not a rating of one reviewable entity; engines treat it as misleading
  structured data. Omit entirely. (All 3 plans agree.)
- **Per-brand `Organization` + `aggregateRating` + a bounded `Review[]` (<=6) — emitted
  ONLY for brands that also have a real `/companies/{slug}/` page**, reusing the *exact*
  schema shape `companies/[slug].astro` already emits. Rationale: this introduces **no new
  structured-data risk surface** — the site already marks up this data on company pages;
  `/otzyvy/` simply stays consistent. Brands in `reviews.json` with no company page get a
  visible section but **no `Organization`/rating markup**.
- **Honest-content guards:** drop brands with `< MIN_REVIEWS_PER_BRAND` reviews (proposed
  3); never emit a rating from a brand with zero finite ratings (no `NaN`); clamp every
  `ratingValue` to 1-5; never fabricate. Page is `noindex, follow` if total reviews `=== 0`.
- **Honest framing (from Plan B):** a visible disclaimer that reviews are collected from
  platform participants and not independently verified.
- The page top-level node is a plain `CollectionPage` + `ItemList` of brand sections.

**Open Question #4 stands:** the underlying reviews-provenance question (is this genuine
UGC?) affects `/otzyvy/` AND the existing company pages — escalate to the owner. The
synthesised approach is safe to ship because it is *consistent with current site
behaviour*; if the owner says the data is not genuine UGC, the fix is broader than this
page (it touches company pages too).

### 3.5 Decision D — Homepage optimization scope

**Decision: minimal, fully-reversible, copy-and-interlink edits to `src/pages/index.astro`
only (+ a one-line H1 verify in `HomeHero.astro`). No layout/structure/JS/JobGrid changes.**
`/` is the highest-traffic page — minimal surface area, one-line revert path.

In scope:
1. **`<title>`/meta** — retune the dynamic template so **both** head terms appear
   ("работа курьером" 147K + "курьер вакансии" 45.8K); keep the dynamic vacancy count and
   the `.slice(0,70)`/`.slice(0,170)` caps. Exact copy -> content brief (Open Question #2).
2. **H1** — verify `HomeHero.astro`'s H1 leads with "Работа курьером"; if not, a one-word
   copy edit (that one line only).
3. **Interlink hrefs** — repoint **only the 4 transport-format links** in
   `featuredFormats` / `routeCards` (foot / auto / bicycle / подработка) from the old
   category slugs to the new hub URLs (the hubs are now canonical — internal links point
   at canonical targets). Non-format `routeCards` (`/rabota-kurerom-16-let/`,
   `/companies/`, `/dlya-studentov/`, …) are **not** changed. **Empty-hub fallback:** if a
   target hub is `noindex` (empty — OQ#3), that link keeps the old category slug — a
   primary homepage CTA must never point at a `noindex` page. Otherwise a pure href swap. **B12 must first read `index.astro` (around
   lines 42–62) and enumerate which array — `featuredFormats` vs `routeCards` — holds each
   of the 4 format links** (some links live in only one array), then repoint each once.
4. **One discovery entry** for the info-guides — add a `/skolko-zarabatyvaet-kurer/` card
   to the homepage's hub/discovery links so the guides are crawler-reachable from `/`.

Out of scope: `JobGrid`/toolbar/geo-banner/calculator/schema-structure changes. Sequenced
last, after hubs exist (so interlink targets are live); gets browser QA + a CWV spot-check.

---

## 4. Components

### 4.1 `src/utils/transportHubs.ts` (NEW, ~180 LOC, pure)

No Astro globals, no module-scope `new Date()` (mirrors `cityListingPage.ts` discipline).
Exports:
- `TransportHubKey = 'foot'|'auto'|'bicycle'|'flexible'`; `HubConfig` type
  `{ key, slug, filter:{tag}, h1, eyebrow, categoryFacetPath, faqSeeds, incomeBlurb,
  requirementsBullets }`.
- `HUB_CONFIGS: Readonly<Record<TransportHubKey, HubConfig>>` — the 4-entry registry.
- `buildHubTitle(cfg, count, maxSalary, isEmpty)` -> <=70 chars all branches.
- `buildHubDescription(cfg, count, companyNames, isEmpty)` -> <=170 chars.
- `buildHubFaqItems(cfg, count, companyNames)` -> `FaqItem[]` (type imported from
  `cityListingPage.ts`).
- `buildHubSchemaGraph(args)` -> `@graph`: `CollectionPage`+`ItemList`, `FAQPage`,
  `BreadcrumbList` (`buildBreadcrumbSchema` reused). The `ItemList` carries the first 10
  jobs as `ListItem`s, each `{position, name, url}` (`name` = job title, `url` = the
  `/v/{slug}/` page) — copy the exact `ListItem` shape from
  `cityListingPage.ts::buildPageSchemaGraph`'s category branch (verify it; do not invent a
  new shape).
- `isHubEmpty(jobsData, cfg)` -> `boolean` — shared with `[slug].astro` (Decision A guard)
  and `listingSlugs.ts`.

Config-table + builders (not 4 forked files) because the hubs are ~95% identical; the ~5%
that differs (H1, FAQ seeds, requirement bullets) lives in the config as data.
`categoryFacetPath` (the matching `rabota-kurerom-*` facet) is the single source of truth
for Decision A's canonical map and for an optional "точная фильтрация" link in
`HubCrossLinks`.

### 4.2 `src/components/TransportHub.astro` (NEW)

Presentational hub body. Props `{ config, filteredJobs, isEmpty, faqItems, companyNames,
maxSalary }`. The *page* does the data work + owns `<BaseLayout>` (so it can set `robots`);
the component is pure presentation. Renders: breadcrumb (Главная > Форматы > {h1}); hero
(eyebrow, H1, intro, CTA "Смотреть вакансии" `#vacancies` + "Сравнить" `/compare/`); 4 fact
cards (`buildFactCards` reused); `<JobFilters />`; `<JobGrid initialTag={config.filter.tag}
limit={24} revealable />`; income block (link -> `/skolko-zarabatyvaet-kurer/`);
requirements block (link -> `/kak-stat-kurerom/`); FAQ `<details>` list; `<HubCrossLinks
current={config.key} />`; `<PartnerBanner />`. CSS: reuse the `.listing-*` scoped-style
vocabulary from `[slug].astro` (copy the relevant CSS-variable-based, dark-mode-aware
rules). No global CSS touched.

### 4.3 `src/pages/rabota-{peshim-kurerom,avtokurerom,velokurerom}.astro` + `podrabotka-kurerom.astro` (NEW, 4 files)

Four explicitly-named thin page files (~30-45 LOC each) — **not** a `[hub].astro`
catch-all (avoids ambiguity vs the existing `[slug].astro`; gives clearer per-page QA).
Each: pick `HUB_CONFIGS[key]`; `filterJobsByCriteria(jobsData, cfg.filter)` -> `filteredJobs`;
compute `isEmpty`, `companyNames`, `maxSalary`; build title/desc/FAQ/schema via
`transportHubs.ts`; render `<BaseLayout robots={isEmpty ? 'noindex, follow' :
undefined}><Header/><main><TransportHub .../></main><Footer/></BaseLayout>`. The 4 files
differ only by the `HUB_CONFIGS` key.

### 4.4 `src/components/InfoGuideLayout.astro` (NEW)

Guide chrome extracted (copied, not refactored from the live file) from
`guide/[topic].astro`: `BaseLayout` (`ogType="article"`, `articleSection`,
`articlePublishedTime/ModifiedTime`) -> `Header` -> `.guide-page` -> breadcrumb -> `.guide-hero`
(kicker, H1, lead, "Обновлено: {date}") -> `<slot/>` (the guide's bespoke body) -> related
grid -> `<PartnerBanner/>` -> `Footer`. The `.guide-*` `<style>` is copied verbatim
(self-contained, dark-mode-aware). `InfoGuideLayout` accepts `ogType` (default `'article'`)
and the `article*` props as **overridable** — `/otzyvy/` passes `ogType='website'` (a
reviews index is not an `Article`). B4 also extracts a `<HowToBlock>` component from
`guide/[topic].astro`'s inline HowTo glue (markup + the `HowTo` JSON-LD node) so
`/kak-stat-kurerom/` can compose it. `guide/[topic].astro` is **untouched** (refactoring it
to consume `InfoGuideLayout` is Open Question #8).

### 4.5 `src/utils/infoGuides.ts` (NEW, pure)

`InfoGuideConfig` type `{ slug, h1, kicker, lead, seoTitle, metaDescription, sections,
faqItems, howTo?, relatedGuideSlugs, ctaHubSlug, showCalculator?, kbTopics,
publishedDate, modifiedDate }`; `INFO_GUIDES` registry (3 entries); `buildGuideSchemaGraph`
-> `Article` (`headline` capped at 110 chars per Google's limit — distinct from the
≤70-char `seoTitle`; +`author`/`publisher`/`inLanguage:'ru-RU'`/dates/optional `speakable`)
+ optional `HowTo` (only when `config.howTo` set — never an empty `HowTo`; the node is
produced by the shared `<HowToBlock>` component, §4.4) + `FAQPage` + `BreadcrumbList`. Guide editorial content lives in `INFO_GUIDES` as structured data (large
tables in co-located `.ts`/`.json` if needed). `Article` `datePublished`/`dateModified`
come from the config's own `publishedDate`/`modifiedDate` — NOT from `knowledge-base.json`'s
`generated` date (do not couple a guide's freshness signal to the KB regen cadence).

### 4.6 `src/pages/skolko-zarabatyvaet-kurer.astro` / `kak-stat-kurerom.astro` / `usloviya-raboty-kurerom.astro` (NEW, 3 files)

Thin wrappers: import `INFO_GUIDES[key]`, build schema, render `<InfoGuideLayout>` + the
bespoke body. `/skolko-zarabatyvaet-kurer/` sets `showCalculator:true` -> embeds the reused
`<IncomeCalculator/>` + a funnel `JobGrid` + a prominent "Смотреть вакансии" CTA into a hub
(satisfies intent S6.2 "MUST funnel to vacancies"). **Funnel-feed `JobGrid` props (must be
explicit):** `<JobGrid initialTag="foot" limit={12} revealable={false}
moreHref="/rabota-peshim-kurerom/" moreLabel="Все вакансии" />` — `revealable={false}` =
curated `distributeAcrossCities` mode; `moreHref` points at a hub, NOT the default
`/cities/`. `/kak-stat-kurerom/` carries a `HowTo`: since `guide/[topic].astro`'s HowTo is
inline page-glue (not a component), B4 extracts a `<HowToBlock>` component (markup + the
`HowTo` JSON-LD node) that the guide body composes. Guides ship `index` by default
(editorial = always real content); a unit test fails the build if a guide's `sections` is
empty or below a minimum word count (anti-thin-content guard — see S8.1).

### 4.7 `src/utils/reviewsAggregate.ts` (NEW, ~130 LOC, pure)

`ReviewLike` (reuse the type from `companies.ts` — DRY); `BrandReviewSummary
{ brand, slug, companyHref?, reviewCount, averageRating, ratingDistribution,
sampleReviews }`. `buildReviewAggregate(reviews)` — one pass: group by company; average
(finite ratings only, 1-decimal, clamped 1-5); distribution; `sampleReviews` =
`seededShuffle(brandReviews,'otzyvy-'+company).slice(0, N)`. **Brand → company-page slug:** define a fresh explicit `REVIEWS_BRAND_SLUG` map keyed by
the **exact 8 `reviews.json` display names**. Do NOT reuse `knowledge.ts`'s
`COMPANY_ROUTE_SLUGS` (module-private, keyed by source-id not display name, mostly
`undefined`); do NOT rely on `slugifyCompany` round-tripping. The 8 review brands (Купер,
Альфа-Банк, Efin, Т-Банк, Яндекс Еда, Бургер Кинг, Ozon fresh, Ozon) map 1:1 to the 8
existing `/companies/{slug}/` pages (`kuper-ex-sbermarket`, `alfa-bank`, `efin`, `t-bank`,
`yandex-eda`, `burger-king`, `ozon-fresh`, `ozon`) — so all 8 qualify for per-brand
`Organization` markup (verify the mapping in B2). A test asserts every `REVIEWS_BRAND_SLUG`
value resolves to a real `/companies/{slug}/` route; `companyHref` is set only when the
brand is in the map AND the company page exists. `buildReviewsSchemaGraph(summaries, pageUrl, siteUrl)` — per
Decision C: per-brand `Organization`+`aggregateRating`+<=6 `Review` **only when
`companyHref` exists**; `CollectionPage`+`ItemList` top node; no page-level
`AggregateRating`. `MIN_REVIEWS_PER_BRAND` exported. B2 must first verify
`src/utils/seededShuffle.ts` exists with a `(array, seed)` signature (it backs
`ReviewsBlock`); if absent or differently-shaped, B2 creates/adapts it.

### 4.8 `src/components/ReviewsAggregate.astro` + `src/pages/otzyvy.astro` (NEW)

`ReviewsAggregate.astro`: hero; site-wide summary (total count — *not* a rating); one
`<section>` per brand (name, stars, count, distribution bar, <=6 `.review-card`s reusing
the `ReviewsBlock`/`companies` markup, CTA -> `/companies/{slug}/` when `companyHref`); the
honest-content disclaimer; CTA to hubs. `otzyvy.astro`: imports `reviews.json` +
`reviewsAggregate.ts`, renders via `InfoGuideLayout` chrome with `ogType='website'` (not
`'article'`), sets `robots` for the empty case. Only <=6 reviews/brand reach the HTML — the 10 MB JSON never reaches the client.

### 4.9 `src/components/HubCrossLinks.astro` (NEW, ~60 LOC)

Given `current` (a hub key or `'home'`), renders links to the other hubs + the guides +
`/cities/` + `/companies/`. Used by all 4 hubs and (optionally) the homepage. Pure
presentational, static data — consistent internal linking.

### 4.10 Edits — all additive / backward-compatible

- **`src/pages/[slug].astro`** — add `CATEGORY_CANONICAL_HUB` map + the `canonicalURL`
  prop pass with the `isHubEmpty` guard (Decision A). <=15 LOC; the ~6 000 city pages'
  behaviour is unchanged.
- **`src/utils/listingSlugs.ts`** — extend `getEmptyListingPaths()` with a block iterating
  `HUB_CONFIGS` and adding any empty hub's path (so the sitemap drops an empty hub —
  preserves the documented "sitemap <=> robots agree" invariant). **Path format:** existing
  entries are bare (`/rabota-kurerom-{slug}`, no trailing slash) and `getEmptyListingUrls`
  appends `/`; the hub entries MUST follow the same bare-path convention (`/rabota-peshim-kurerom`)
  so the `astro.config.mjs` sitemap `filter` (`emptyListingUrls.has(fullUrl)`) matches. A
  test asserts `emit-empty-listings.ts` output contains the bare hub path for an empty-hub
  fixture. `emit-empty-listings.ts` and `astro.config.mjs` then pick it up with zero
  further change.
- **`astro.config.mjs`** — `serialize()` adds priority branches keyed by an explicit `Set`
  of the 8 new URLs (not a fragile substring): hubs `0.8`, guides `0.7`, `/otzyvy/` `0.6`.
  Without this they default to `0.3`.
- **`src/pages/index.astro`** — Decision D: title/description strings,
  `featuredFormats`/`routeCards` hrefs -> hubs, one discovery entry -> income guide.
- **`tests/build-output.test.ts`** — the current page-count band is `6730–6770`;
  **re-derive both bounds from an actual post-change build** (the band is
  vacancy-data-dependent — the 8 new routes are only a sanity floor, not the literal new
  bound) and update the band's descriptive comments.

---

## 5. Data model

| Page | Build-time source | Client-shipped |
|------|-------------------|----------------|
| 4 hubs | `jobsData` filtered by `tag` via `filterJobsByCriteria`; `HUB_CONFIGS` static config | rendered job cards only (24 + `<template>` overflow) — same as listing pages |
| `/skolko-zarabatyvaet-kurer/` | `INFO_GUIDES` config; `getItemsByTopic('доход'/'выплаты')`; `IncomeCalculator` rate data; small `JobGrid` feed | calculator rates (already inlined) + ~12 job cards |
| `/kak-stat-kurerom/`, `/usloviya-raboty-kurerom/` | `INFO_GUIDES` config; KB topics (`оформление`/`документы`/`возраст`; `график`/`требования`/`транспорт`) | static HTML, no data payload |
| `/otzyvy/` | `reviews.json` (~19 144 rows, build-time only) + `getCompaniesFromJobs` for `companyHref` | <=6 reviews/brand (~<=48 cards) + aggregate numbers — 10 MB JSON never shipped |
| `/` | unchanged | unchanged |

**Key facts:** transport-hub data already exists — `GeneratedJob.transport` is one of
`foot|auto|bicycle|remote` + a transport tag; `filterJobsByCriteria(jobsData,{tag:'foot'})`
is the exact query the category pages use today — **no new vacancy data**. `podrabotka` =
`tag:'flexible'` (verify populated — Open Question #3). `knowledge-base.json`
(`generated:2026-04-26`) supplies sourced facts. `reviews.json` company names need
normalising to `/companies/{slug}/` slugs via `slugifyCompany`. **Zero new data files;
three new pure helper modules.**

---

## 6. Edge cases & failure modes

- **Empty hub feed** — `filterJobsByCriteria` returns `[]`: page sets `robots="noindex,
  follow"`; `getEmptyListingPaths()` adds the hub -> sitemap drops it; hero/FAQ/info blocks
  still render (evergreen). **Canonical guard:** the matching category page must NOT
  canonical to an empty/noindexed hub — `[slug].astro` checks `isHubEmpty` and falls back
  to self-canonical. (In practice the foot/auto/bicycle/flexible filters match thousands
  of jobs — the guard is correctness insurance.)
- **Honest-content** — the SSR `robots` decision and sitemap inclusion MUST agree
  (documented invariant). Both route through `filterJobsByCriteria` + `HUB_CONFIGS`; a
  unit test asserts parity.
- **Info-guide with no authored content** — a guide whose `sections` is empty would ship
  a thin `index` page. Mitigation: a unit test asserts every `INFO_GUIDES` entry has >=N
  sections + non-empty FAQ; build fails loudly. Guides are never auto-noindexed.
- **JSON-LD with missing data** — hub `ItemList` empty when `jobs=[]` (valid empty array);
  `HowTo` emitted only when `config.howTo` set; `/otzyvy/` — `Organization`/`aggregateRating`
  only when `companyHref` exists and `reviewCount>0`, `ratingValue` never `0`/`NaN`/`>5`,
  no page-level `AggregateRating`; guide `citation` filters out unresolved `source_id`s.
- **Canonical collisions / typos** — a unit test asserts every `CATEGORY_CANONICAL_HUB`
  key is a real `CATEGORIES` slug and every value is one of the 4 real hub URLs (no
  canonical-to-404, no self-loop). Both hub and canonicaled category page appear in the
  sitemap — correct (a canonical does not require sitemap exclusion).
- **Canonical ordering** — the `[slug].astro` canonical edit must ship **after** the hub
  pages exist, else category pages canonical to 404s. Enforced by bead dependencies.
- **`trailingSlash:'always'`** — every internal link to a new page ends with `/`;
  build-output tests assert it.
- **i18n** — the shell UI is RU-only (post-PR#131). All 9 new pages ship RU-only static
  copy, no `data-t` keys; `JobCard`s inside hub `JobGrid`s keep their existing per-vacancy
  fragment i18n (unaffected). Matches intent S8's "scoped RU-only" option.
- **CWV / build cost** — hubs reuse `JobGrid revealable` (identical weight to listing
  pages); `/otzyvy/` renders <=48 cards not 19 144; `reviews.json` 10 MB imported at build
  time only — `companies/[slug].astro` already does this, acceptable, watch-item (Open
  Question #5 — contingency: precompute a `public/reviews-summary.json`); no new fonts/JS.
- **Route collision** — the 8 new slugs match no existing static/dynamic pattern; Astro
  resolves static routes before the `[slug]` catch-all anyway.
- **Build resilience** — the new helper modules are pure total functions (no throws,
  return empty/defaults on bad input), unit-tested before pages consume them.

---

## 7. Security & trust boundaries

- **No new user input, endpoints, forms, or runtime fetches.** All 8 new pages are static
  SSG. The only client JS is reused, already-audited (`JobGrid`, `IncomeCalculator`).
- **`reviews.json`** is repo-committed data rendered into HTML. Astro auto-escapes every
  `{expression}` — review text is XSS-safe by default (as `ReviewsBlock`/`companies`
  already do). **Rule: never `set:html` review-derived content.** The only `set:html` is
  the JSON-LD `<script>` via `BaseLayout` (`JSON.stringify`-d). **Verify** `BaseLayout`'s
  JSON-LD path is `</script>`-safe for review bodies — a build-output test asserts the
  rendered `/otzyvy/` JSON-LD contains no unescaped `</script>`. If `BaseLayout` is unsafe
  here it is a pre-existing site-wide issue — flag separately, do not fix silently.
- **JSON-LD trust** — conservative by design (Decision C): no fabricated/page-level
  `AggregateRating`, ratings clamped, brand markup only for page-backed brands. This
  guards the real trust boundary of an SEO project — a structured-data manual action.
- **Canonical override** — values are compile-time string literals; `BaseLayout` wraps
  `canonicalURL` in `new URL()` so a malformed value fails the build, not production.
- **No secrets**, no new env vars. External links keep `rel="noopener noreferrer
  nofollow"`. No `security-reviewer` escalation trigger fires; the JSON-LD `</script>`
  check is the single security to-do.

---

## 8. Testing strategy

Matches the repo's `vitest` patterns (`tests/*.test.ts` pure-helper unit tests; AAA;
`describe.skipIf(noDist)` build-output tests). Target >=80% coverage on all new helpers.

### 8.1 Unit (pure helpers — the bulk of coverage)
- **`tests/transportHubs.test.ts`** — `HUB_CONFIGS` 4 entries, valid tags, unique slugs;
  `buildHubTitle`<=70 / `buildHubDescription`<=170 all branches; `buildHubFaqItems` non-empty
  well-formed; `buildHubSchemaGraph` — empty `ItemList` when `jobs=[]`, `FAQPage` always
  populated, `BreadcrumbList` well-formed; `isHubEmpty` true/false correct.
- **`tests/infoGuides.test.ts`** — `INFO_GUIDES` 3 entries, **every entry has >=2 sections,
  a non-empty FAQ, and total body word count >=300** (anti-thin-content guard — catches
  placeholder prose, not just empty arrays); `buildGuideSchemaGraph` — `HowTo` present iff
  `config.howTo`; `Article` has author/publisher/dates; `relatedGuideSlugs` resolve.
- **`tests/reviewsAggregate.test.ts`** — `buildReviewAggregate` groups correctly, average
  1-decimal clamped 1-5, non-finite ratings excluded, deterministic `sampleReviews`,
  sorted by count; `buildReviewsSchemaGraph` — **no `Organization`/`aggregateRating` for a
  brand without `companyHref` or with `reviewCount<MIN`**; no page-level `AggregateRating`;
  `ratingValue` never `0`/`>5`; node count correct.
- **`tests/canonicalOverride.test.ts`** — every map key a real `CATEGORIES` slug; every
  value a real hub URL; no hub URL as a key; the emitted `<link rel="canonical">` is an
  absolute URL (build-output check).
- **`tests/listingSlugs.test.ts`** (extend) — `getEmptyListingPaths()` includes a hub iff
  its tag matches zero jobs; normal fixture -> 4 hub paths absent; existing city/category
  behaviour unchanged.

### 8.2 Build-output (`tests/build-output.test.ts` + a new `seo-rollout-build.test.ts`)
- All 8 new routes emit `dist/**/index.html`. The page-count band (`6730–6770`) must be
  **re-derived from an actual post-change build** — the band is vacancy-data-dependent, so
  a blind +8 is only an estimate; update both bounds and the descriptive comments.
- Each hub HTML has `id="jobs-grid"`, `id="vacancies"` (the JobGrid section anchor that
  the hero "Смотреть вакансии" CTA targets), `class="job-card"`, and exactly one
  self-canonical `<link>`.
- Each new page emits one `<script type="application/ld+json">` that `JSON.parse`s and has
  no unescaped `</script>` (the S7 security check).
- Category pages `dist/rabota-kurerom-{peshkom,na-avto,na-velosipede,podrabotka}/` carry
  `<link rel="canonical">` -> the matching hub; an unaffected slug stays self-canonical.
- `/otzyvy/` JSON-LD has no top-level `AggregateRating`; any `Organization` corresponds to
  a brand with a company page; <=48 `.review-card`s.
- Homepage HTML links all 4 hubs + the income guide; existing homepage assertions still pass.
- `sitemap-*.xml` includes the 8 URLs with expected priority; excludes any empty hub.

### 8.3 Verification & manual QA (Phase D)
`npm run generate:data && npm run build && npm test && npm run typecheck && npm run lint`
all green. Note: `scripts/generate-llms.mjs` builds `public/llms-full.txt` from
`knowledge-base.json` only — it does NOT enumerate `src/pages/` routes, so it needs no
change. Separately locate whatever emits `public/llms.txt` and decide whether the 8 new
routes belong there — a small follow-up, not a blocker. Manual browser-QA wave (the repo's established practice — no Playwright):
each hub feed + filters + `JobCard`->`/v/` + `apply_click`; income guide calculator +
`calculator_submit` + CTA; `/otzyvy/` brand sections + company CTAs; homepage interlinks +
head terms in `<title>`; dark mode on all 9; Rich Results Test on one hub / one guide /
`/otzyvy/`; CWV spot-check on a hub + the homepage.

---

## 9. Open questions

1. **(Blocks Wave 2 — record only.)** Does kurerok.ru have a per-brand vacancy data source
   for Золотое Яблоко / Wildberries / Магнит / Самокат / Пятёрочка / Лавка / Додо /
   ВкусВилл? Brand pages cannot be real listings without it — escalate to the owner.
2. **Editorial content authoring.** The 3 guides' prose/income tables and the hubs'
   requirement/FAQ copy are unwritten editorial copy. Who authors it, from which sources
   (`07-content-briefs.md` + `доход`/`оформление` KB topics + `kuper-pay-rates.json`)?
   Final homepage title/H1 copy also needs sign-off.
3. **`flexible` tag populated?** The подработка hub depends on `tag:'flexible'`. Pre-flight
   check `filterJobsByCriteria(jobsData,{tag:'flexible'}).length` > 0 — else it launches
   `noindex`.
4. **`/otzyvy/` reviews provenance.** `reviews.json` reads as synthetic seed data (uniform
   ~4.3, deliberate typos). The synthesised design is *consistent with what company pages
   already emit*, so it adds no new risk — but the owner should confirm the data is
   genuine UGC. If not, the remediation is broader (company pages too).
5. **`reviews.json` build cost.** ~10 MB build-time import. Fine today; if build time
   regresses, precompute `public/reviews-summary.json` via a `scripts/` emitter (YAGNI —
   decide on measurement).
6. **Fold additional facets onto hubs?** The cannibalization is wider than the 4
   exact-match facets: **`tag:'flexible'` is shared by 6 category pages** —
   `podrabotka`, `svobodny-grafik`, `na-vyhodnye`, `vecherom`, `nochyu`, `zhenshchine` —
   all rendering a byte-identical job feed; and `na-samokate` (`tag:'bicycle'`) duplicates
   the velo feed. Canonicaling only `podrabotka`/`na-velosipede` leaves 5 near-duplicate
   category pages competing with the hubs. Folding `svobodny-grafik` / `na-vyhodnye` /
   `vecherom` / `nochyu` → подработка hub and `na-samokate` → велохаб is defensible (same
   feed); `zhenshchine` is a distinct demographic intent and should stay self-canonical.
   A deliberate per-facet SEO decision — decide before or with bead B7.
7. **`.md` LLM-mirror variants** for the new guides (`guide/[topic].md.ts` precedent).
   Deferred — not in the 9-item scope. Note: all 12 KB topics have `.md` mirrors, so the
   new guides would be the only guide-type pages without one — a minor consistency gap to
   flag in the hand-off.
8. **`InfoGuideLayout` adoption by `guide/[topic].astro`.** Refactoring the live file to
   consume the new layout would de-dup the chrome — out of scope (additive guarantee); a
   clean follow-up.
9. **(Phase D, infra.)** The on-disk `/Users/ivan/kurieros` checkout is stale (`eca613a`)
   vs canonical `main` (`e391e08`). Resolve before Phase B/D worktrees branch.

> The plan is not STABLE until #2, #3, #4 are answered (they gate content + indexability).
> #1 and #5-#9 do not block this run's implementation.

---

## 10. Implementation sequencing (Phase B bead seeds)

Dependency-ordered. Beads with no interdependency are parallelizable in worktree subagents.

| Bead | Title | Files | Deps |
|------|-------|-------|------|
| B1 | `transportHubs.ts` helper + tests | `src/utils/transportHubs.ts`, `tests/transportHubs.test.ts` | — |
| B2 | `reviewsAggregate.ts` helper + tests | `src/utils/reviewsAggregate.ts`, `tests/reviewsAggregate.test.ts` | — |
| B3 | `infoGuides.ts` helper skeleton + tests | `src/utils/infoGuides.ts`, `tests/infoGuides.test.ts` | — |
| B4 | Shared components — `InfoGuideLayout`, `HubCrossLinks` | 2 component files | — |
| B5 | `TransportHub.astro` component | `src/components/TransportHub.astro` | B1, B4 |
| B6 | 4 transport-hub page files | 4 `src/pages/*.astro` | B5 |
| B7 | Decision A — canonical map + `listingSlugs.ts` + `astro.config.mjs` + `canonicalOverride.test.ts` | 3 edits + 1 test | B6 |
| B8 | Income guide `/skolko-zarabatyvaet-kurer/` (P0) — author content + page | `INFO_GUIDES` content, `skolko-zarabatyvaet-kurer.astro` | B3, B4, OQ#2 |
| B9 | Guide `/kak-stat-kurerom/` (P1) — content + page (incl. `HowTo`) | content, `kak-stat-kurerom.astro` | B3, B4, OQ#2 |
| B10 | Guide `/usloviya-raboty-kurerom/` (P2) — content + page | content, `usloviya-raboty-kurerom.astro` | B3, B4, OQ#2 |
| B11 | `/otzyvy/` — `ReviewsAggregate.astro` + `otzyvy.astro` | 2 files | B2, B4, OQ#4 |
| B12 | Homepage optimization (Decision D) | `index.astro` (+1 line `HomeHero.astro`) | B6, B8 |
| B13 | Build-output tests + page-count band + full verification | `seo-rollout-build.test.ts`, `build-output.test.ts` | B6-B12 |
| B14 | Browser QA + Rich Results + CWV; indexing hand-off manifest | — | B13 |

**Waves (parallel-worktree model):**
- alpha (parallel): B1, B2, B3, B4 — pure helpers + components, no interdependency.
- beta (parallel after alpha): B5->B6 (hubs), B8/B9/B10 (guides), B11 (`/otzyvy/`).
- gamma (after beta): B7 (canonical/sitemap — needs hubs live), B12 (homepage — needs hubs+guide).
- delta: B13 -> B14, sequential, last.

**Critical path:** B1->B5->B6->B7 (the P0 hubs) and, in parallel, B3->B8 (the P0 income
guide). **B8/B9/B10 are gated on Open Question #2** (editorial content authoring) — if
unanswered, the guide beads stall; resolve OQ#2 before/at the start of wave beta.
**Indexing hand-off** (B14, mechanics owned by `seo-promotion`): Wave 1 = 4 hub
URLs + `/`; Wave 3 = 3 guide URLs + `/otzyvy/`. The 4 canonicaled category facets are
already indexed — their new canonical is picked up on the next crawl, no submission.

---

## 11. Refinement log

- **Round 0 — 2026-05-19 — Synthesis.** Merged competing plans A/B/C. Strong convergence
  on Decisions A, B, D. Decision C resolved toward Plan C's conservative schema (no
  page-level `AggregateRating`; per-brand markup only for page-backed brands) + Plan B's
  disclaimer + Plan A's zero-fabrication rules. Adopted A/C's `listingSlugs.ts` extension
  over B's inline-only. Stayed conservative on facet-folding (4 exact-match facets only;
  `na-samokate` etc. -> Open Question #6). Components = union of A + C.
- **Round 1 — 2026-05-19 — Fresh-eyes review (opus).** Folded in: homepage interlink
  scope clarified (only the 4 format links; empty-hub fallback); flexible-tag
  cannibalization is wider than stated (6 category pages — OQ#6 + Decision A expanded);
  income-guide funnel `JobGrid` props made explicit; `/otzyvy/` brand→company-slug needs
  an explicit lookup table (`slugifyCompany` does not round-trip the display names);
  `ItemList`/`ListItem` element shape specified; `Article.headline` ≤110 cap noted;
  `<HowToBlock>` component extracted (the guide HowTo is inline page-glue, not a
  component); `InfoGuideLayout` `ogType` made overridable for `/otzyvy/`; anti-thin-content
  guard strengthened to a word-count assertion; page-count band corrected to `6730–6770`
  (+8 both bounds); B8–B10 flagged as gated on Open Question #2.
- **Round 2 — 2026-05-19 — Fresh-eyes review (opus).** Folded in: canonical guard must
  match `Astro.props.data.slug` (bare slug), not `params.slug`; `getEmptyListingPaths()`
  hub entries must use the bare-path convention so the sitemap `filter` matches;
  `REVIEWS_BRAND_SLUG` must be a fresh map (dropped the wrong `COMPANY_ROUTE_SLUGS` reuse
  — it is private/source-id-keyed) — confirmed all 8 review brands map 1:1 to the 8
  company pages; `ListItem` shape is `{position, name, url}`; B12 must enumerate the
  homepage format links by reading `index.astro:42-62`; `generate-llms.mjs` added to the
  verify list; `#vacancies` anchor added to build-output assertions; page-count band must
  be re-derived from a real build, not a blind +8; B2 must verify `seededShuffle`; guide
  `Article` dates come from config, not the KB `generated` date.
- **Round 3 — 2026-05-19 — Fresh-eyes review (opus), final pass.** Confirmed the
  architecture is solid — canonical-map keys, the `data.slug` match, the 6 flexible
  facets, and `seededShuffle` all verified correct against the repo. Fixed 2
  self-inflicted inconsistencies from the prior rounds: the §4.10-vs-§8.2 page-count
  contradiction (now uniformly "re-derive from a real build"); the `generate-llms.mjs`
  claim (it builds `llms-full.txt` from the KB only — it does not enumerate page routes).
  **Refinement converged — stopped at 3 rounds:** architecture debates closed, round 3
  found only prior-round cleanup, no new gaps.

---

## 12. Wave δ′ — post-launch-review scope addition

> Added 2026-05-20 after the owner reviewed PR #185 on the local preview. Two gaps
> surfaced that are squarely in scope for "не сломать + доработать SEO/GEO(AI)" and small
> enough to land in the same un-merged PR. Formalised here as Decisions F/G/H + beads
> B15/B16. No new routes — the build page-count band is unchanged.

### 12.1 Decision F — Reviews belong to a brand, not a vacancy

**Context.** `scripts/generate-reviews.ts` generated `REVIEWS_PER_JOB = 4` reviews for
every vacancy in `jobsData`. With thousands of synthetic vacancies per brand this yields
19 144 reviews (Купер 6 104, Альфа-Банк 4 532, …) — counts that read as a mature review
platform the site is not, and `/otzyvy/` showed a uniform ~4.3 average for every brand.

**Decision.** A review logically belongs to a **brand**. The generator loops over brands,
not vacancies. `jobId`/`jobTitle`/`city` become optional *provenance* fields (where the
review was left, what role) — kept for the review-card UI, not for accounting.
`buildReviewAggregate` already groups by `company`; the aggregator itself does not change.

**Forward-looking (OQ#4 real reviews).** A real user review submitted from `/v/{slug}/`
is stored with `jobId`/`jobTitle` filled (provenance); selection for `/otzyvy/` and
`/companies/{slug}/` filters by brand only. `review-feature-design.md` is updated to match.

### 12.2 Decision G — No aggregate-rating threshold

`/otzyvy/` shows whatever real numbers exist. A brand with 12 reviews shows "12 отзывов"
and the real average; a brand with 0 shows an `Organization` with no `aggregateRating`.
No `MIN_REVIEWS_FOR_AGGREGATE` gate and no "we're just starting" placeholder — the owner
judged a placeholder dishonest-by-omission. The existing `MIN_REVIEWS_PER_BRAND` (=3,
drop-the-section-below-this) guard from Decision C stays.

### 12.3 Decision H — Hub city filter via URL hash

The 4 transport hubs gain a client-side city `<select>` above the `JobGrid`. Selecting a
city filters the rendered job cards by a `data-city` attribute. State-resolution priority:
**URL hash (`#city=<slug>`) > `localStorage` (the homepage's shared city key) > "Все
города"**. A hash — not a query string — is used deliberately: engines never read the
fragment, so this adds **zero SEO surface** (no crawl-budget leak, no GA4 noise) while
still being shareable and bookmarkable. The hub canonical stays the bare hub URL.
Per-(format×city) landing pages are explicitly **not** in this run — that is a future
Wave 2.

### 12.4 New beads

| Bead | Title | Files | Deps |
|------|-------|-------|------|
| B15 | Hub city filter (Decision H) | `transportHubs.ts`, `TransportHub.astro`, `JobCard.astro`, 4 hub pages, tests | B6 |
| B16 | Honest per-brand reviews (Decisions F/G) | `generate-reviews.ts`, `reviews.json`, `companies.ts`, review tests, `review-feature-design.md` | B2, B11 |

Both land in PR #185 before merge. Generator parameters (owner-confirmed 2026-05-20):
10–20 reviews per brand (uniform random, seeded), names unique within a brand, ~60/40
clean/typo split, natural rating spread (no per-brand skew). Verification gate is
unchanged (§8.3).

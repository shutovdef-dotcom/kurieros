# Plan A — kurerok.ru SEO Rollout (9 work items)

> Competing-plan artifact. Independent design for Wave 1 (transport hubs + homepage)
> and Wave 3 info-guides, grounded in the real `kurieros-astro` repo.

---

## 1. Intent recap

`kurerok.ru` is a static Astro site (~6 000 pages, `output: 'static'`,
`trailingSlash: 'always'`, GitHub Pages) aggregating Russian courier-job
vacancies. Semantic-core v2 found large demand clusters with no dedicated
landing page. This run ships **9 additive work items** closing the
*unblocked* clusters (~642K impressions/mo):

1. `/rabota-peshim-kurerom/` — пеший хаб (P0, 87.8K)
2. `/rabota-avtokurerom/` — авто хаб (P0, 63K)
3. `/rabota-velokurerom/` — вело хаб (P1, 17.5K)
4. `/podrabotka-kurerom/` — подработка хаб (P1, 18.4K)
5. `/` — homepage SEO optimization (P1, 297K core)
6. `/skolko-zarabatyvaet-kurer/` — info-guide доход (P0, 76.2K)
7. `/kak-stat-kurerom/` — info-guide трудоустройство (P1, 31.8K)
8. `/usloviya-raboty-kurerom/` — info-guide условия (P2, 25.9K)
9. `/otzyvy/` — aggregate reviews (P2, 24.1K)

**Hard constraints:** additive only (do not break the ~6 000 existing
pages), honest content (`index` only when there is real content/`vacancy_count > 0`),
reuse-first (`JobGrid` + `cityListingPage.ts` helpers + the `guide/`
pattern), Astro static, CWV budget, immutable data patterns, small focused
files. Brand pages are explicitly **out of scope** (blocked on a per-brand
data question — Open Question #1).

Total addressed demand ≈ **642K impressions/mo**.

---

## 2. User workflows

The new pages must serve four journeys (all terminating at the GA4
`apply_click` event, currently ~27% — must not regress):

1. **Transport-intent → hub → vacancy → apply.** Searcher on "работа пешим
   курьером" lands on `/rabota-peshim-kurerom/`, sees a live filtered feed of
   `tag:'foot'` vacancies across all cities, reads income/requirements/FAQ
   blocks, clicks a card → existing `/v/{slug}/` → apply.
2. **Income research → guide → hub → apply.** Searcher on "сколько
   зарабатывает курьер" lands on `/skolko-zarabatyvaet-kurer/`, reads the
   income table, uses the calculator, follows a CTA into a transport hub or a
   vacancy. Top-of-funnel — MUST funnel down.
3. **Homepage head-term → homepage → hub.** Searcher on "работа курьером"
   lands on `/`, uses the city/transport toolbar or follows a new interlink
   block into a transport hub.
4. **Reviews research → `/otzyvy/` → brand context → vacancy.** Searcher on
   "отзывы о работе курьером" reads aggregated employer reviews grouped by
   brand, follows a CTA into vacancies/hubs.

A fifth implicit journey: **crawler indexing.** Each new URL must
auto-appear in `sitemap-index.xml` with sensible priority, indexable only
when it has real content, ready for the wave-by-wave `seo-promotion`
hand-off.

---

## 3. Architecture

### 3.1 Component map

```
NEW top-level page files (src/pages/*.astro) — 8 new routes
├── rabota-peshim-kurerom.astro   ─┐
├── rabota-avtokurerom.astro       │  4 transport hubs — ALL render
├── rabota-velokurerom.astro       │  the shared <TransportHub>
├── podrabotka-kurerom.astro      ─┘  (thin per-slug config wrappers)
├── skolko-zarabatyvaet-kurer.astro ─┐
├── kak-stat-kurerom.astro           │ 3 info-guides — ALL render
├── usloviya-raboty-kurerom.astro   ─┘ <InfoGuide> + reuse guide CSS
└── otzyvy.astro                       reviews aggregate

EDIT: src/pages/index.astro          homepage SEO tune (decision D)

NEW shared components (src/components/)
├── TransportHub.astro     hub body: hero+facts, JobGrid, info blocks, FAQ
├── InfoGuide.astro        guide body: hero, sections, FAQ, related, CTA
└── ReviewsAggregate.astro reviews-by-brand body (used by otzyvy.astro)

NEW shared helpers (src/utils/)
├── transportHubs.ts       hub config registry + pure builders
├── infoGuides.ts          guide config registry + pure builders
└── reviewsAggregate.ts    review grouping/rating math (pure)

REUSED as-is (no edit)
├── JobGrid.astro          server-filtered vacancy feed (revealable mode)
├── JobFilters.astro       filter toolbar
├── jobFilters.ts          filterJobsByCriteria — single-source predicate
├── schema.ts              buildBreadcrumbSchema, buildPlaceSchema
├── BaseLayout.astro       title/meta/OG/canonical/robots/@graph JSON-LD
├── Header / Footer / PartnerBanner / IncomeCalculator
└── seededShuffle.ts       deterministic stable ordering

EDIT (backward-compatible, additive only)
├── src/pages/[slug].astro      add category→hub canonical override
├── src/utils/listingSlugs.ts   add hub URLs to empty-listing emitter
└── astro.config.mjs            add hub/guide sitemap priority branches
```

### 3.2 Decision A — Transport hubs vs. existing category pages

**The collision.** `src/pages/[slug].astro` is a catch-all that already
emits four category pages on different slugs:
`rabota-kurerom-peshkom` (`tag:'foot'`), `rabota-kurerom-na-avto`
(`auto`), `rabota-kurerom-na-velosipede` (`bicycle`),
`rabota-kurerom-podrabotka` (`tag:'flexible'`). The new hubs target the
exact same intent and the same job pool. Three options were on the table:
(a) build richer hubs + canonical the category pages to them; (b)
301-redirect/repurpose the category slugs; (c) make hubs the
content+aggregation page, keep category pages as thin facets pointing
`canonical → hub`.

**Decision: Option C — hubs are the canonical content page; the existing
category pages keep their slugs but their `<link rel="canonical">` points
to the matching new hub.** Rationale:

- **301 redirects are not safely available.** GitHub Pages serves static
  files with no server-side redirect layer; a 301 would need an HTML
  `<meta http-equiv="refresh">` or a JS hack — both worse for SEO and users
  than a clean canonical. Option (b) is rejected on infrastructure grounds.
- **The category pages are interlinked from live, indexed surfaces.**
  `src/pages/index.astro` (`featuredFormats`, `routeCards`),
  `src/pages/companies/index.astro` (`brandFormats`), and `knowledge.ts`
  `GEO_LINKS` all hard-link `/rabota-kurerom-na-avto/` etc. Deleting or
  redirecting those slugs would break inbound internal links across the
  6 000-page site — a direct additive-only violation. Keeping the slugs
  live preserves every existing link.
- **A canonical is the textbook de-duplication signal.** Two URLs, same
  intent, same job feed → declare the rich hub canonical; Google/Yandex
  consolidate ranking signals onto it. The category page stays crawlable
  and clickable but cedes ranking to the hub.
- **The hub is genuinely richer**, so it deserves to be canonical: it adds
  income blocks, requirements, a transport-specific FAQ, and a guide-style
  body the bare category listing does not have. The category page is
  effectively a "filtered facet"; the hub is the "landing page".

**Implementation of Decision A:**

1. **New hubs** are 4 thin `src/pages/*.astro` files. Each renders the
   shared `<TransportHub>` component with a per-slug config (tag, hero
   copy, FAQ set). The hub's `JobGrid` uses `initialTag` =
   `foot`/`auto`/`bicycle`, and for `podrabotka-kurerom` `initialTag='flexible'`
   (the real tag in the data — `constants.ts` shows `podrabotka`,
   `svobodny-grafik`, `na-vyhodnye`, `vecherom`, `nochyu` all use
   `tag:'flexible'`). The hub's own `<link rel="canonical">` is its own
   URL (default `BaseLayout` behavior — no override).
2. **Existing catch-all** `src/pages/[slug].astro` gets ONE additive,
   backward-compatible change: a `CATEGORY_CANONICAL_OVERRIDE` lookup keyed
   by category slug. For `peshkom → /rabota-peshim-kurerom/`, `na-avto →
   /rabota-avtokurerom/`, `na-velosipede → /rabota-velokurerom/`,
   `podrabotka → /podrabotka-kurerom/`, the page passes
   `canonicalURL={new URL('/rabota-peshim-kurerom/', Astro.site)}` to
   `BaseLayout`. All other slugs (cities, `eda`, `16-let`, …) get
   `undefined` → `BaseLayout` default (self-canonical). This is a
   ≤15-line, opt-in, data-driven change — it does not touch the ~6 000
   city pages' behavior.
3. **`na-samokate`** (`tag:'bicycle'`) is a near-duplicate of
   `na-velosipede` and is also canonicaled → велохаб. `svobodny-grafik`,
   `na-vyhodnye`, `vecherom`, `nochyu` (all `tag:'flexible'`) → canonical
   to `/podrabotka-kurerom/`, since the подработка hub is the rich
   aggregator for the free-schedule cluster. Captured in the override map;
   it costs nothing extra and consolidates 8 thin facets onto 4 strong
   hubs.

**Why not Option A's "thin facet" framing literally:** Option C *is*
Option A in effect (build hubs + canonical the category pages). The naming
in intent.md §9 overlaps; the substantive choice — canonical, not redirect,
not delete — is what matters and is locked here.

### 3.3 Decision B — Info-guide routing

**Decision: Option A — standalone top-level `src/pages/*.astro` page files,
each reusing the `guide/[topic].astro` component patterns and JSON-LD
shape via a shared `<InfoGuide>` component.** The guides do **not** live
under `/guide/` and do **not** extend the `guide/[topic]` `getStaticPaths`
system. Rationale:

- **The spec explicitly wants top-level URLs** (`/skolko-zarabatyvaet-kurer/`,
  `/kak-stat-kurerom/`, `/usloviya-raboty-kurerom/`). These short,
  keyword-exact slugs are the SEO target; burying them under `/guide/`
  forfeits that. Astro routes a top-level `.astro` file at `/{name}/` with
  `trailingSlash:'always'` — exactly the desired URL.
- **The `guide/[topic]` system is data-driven from `knowledge-base.json`'s
  `TOPIC_META` (12 fixed topics) and one `KnowledgeItem[]` per topic.** The
  three new guides are *long-form editorial pages* (income table +
  calculator, step-by-step instructions, prose) — they do not fit the
  "FAQ-card list per topic" shape of the KB. Forcing them into `TOPIC_META`
  would either (a) require inventing new topics and authoring KB items in
  the rigid `{question, answer_short, answer_long, facts, source_id}`
  schema, or (b) special-casing the topic template — both worse than a
  purpose-built page.
- **There is precedent for bespoke top-level content pages:** `calculator.astro`,
  `compare.astro`, `cities.astro`, `blog.astro` are all standalone
  top-level `.astro` files. The new guides follow that established pattern.
- **The `guide/` index and the 12 KB topics are untouched** — fully
  additive. The new guides *link to* relevant `/guide/{topic}/` pages
  (e.g. `/skolko-zarabatyvaet-kurer/` → `/guide/dohod/`,
  `/kak-stat-kurerom/` → `/guide/oformlenie/`) for topical reinforcement.

**Reuse mechanism.** The `guide/[topic].astro` page has a rich, proven
structure (breadcrumb, hero with kicker/lead/meta, optional HowTo block,
FAQ cards, related grid, `Article`+`HowTo`+`FAQPage`+`BreadcrumbList`
JSON-LD, `ogType="article"`). Plan A extracts the *visual + schema*
patterns into a new `<InfoGuide>` component the three new pages reuse. The
guide page's `<style>` block is copied into `<InfoGuide>` (self-contained,
CSS-custom-property-based, dark-mode-aware). We do **not** refactor
`guide/[topic].astro` to consume `<InfoGuide>` in this run (additive-only;
that refactor is a separate optional cleanup bead).

**`/skolko-zarabatyvaet-kurer/` reuses `IncomeCalculator`** directly
(`src/components/IncomeCalculator.astro` — already a self-contained
island). The guide also reuses `JobGrid` (a small `limit={12}`
non-revealable feed) as its "funnel to vacancies" block, satisfying the
intent's "MUST funnel to vacancies" requirement for this top-of-funnel
page.

**Optional `.md` variant:** `guide/[topic].md.ts` emits a plain-Markdown
twin for LLM clients. Decision: **defer** the `.md` variant for the 3 new
guides (nice-to-have, not in the 9-item scope; trivially addable later).

### 3.4 Decision C — `/otzyvy/` aggregate reviews

**The data.** `src/data/reviews.json` is a 10 MB array of **19 144**
review objects, each shaped `{id, jobId, company, jobTitle, name, city,
pros, cons, comment, rating, date}` (`date` is ISO-8601, e.g.
`"2025-10-21T09:00:00.000Z"`). Eight companies are represented (Купер
6104, Альфа-Банк 4532, Efin 2820, Т-Банк 2756, Яндекс Еда 1596, Бургер
Кинг 596, Ozon fresh 388, Ozon 352). Reviews are **synthetic seed data**
(note the deliberate typos — "Формут", "тежолая" — they read as authentic
UGC).

**Decision: `/otzyvy/` is an aggregate reviews page grouped by brand, with
a per-brand `AggregateRating` and a curated, deterministically-shuffled
sample of `Review` objects per brand.** Design:

- **Page structure:** hero → site-wide summary (total reviews, overall avg
  rating across all 19 144) → **one section per brand**, each with: brand
  name, brand `AggregateRating` (avg + count), top ~3–4 sample reviews
  (`seededShuffle(brandReviews, 'otzyvy-{company}')` — stable across
  builds, mirrors `ReviewsBlock`'s home-page pattern), and a CTA linking to
  that brand's `/companies/{slug}/` page and to relevant vacancies →
  FAQ → CTA to hubs.
- **Aggregation helper** `src/utils/reviewsAggregate.ts` (pure,
  unit-tested): `groupReviewsByCompany(reviews)` → `Map<company,
  Review[]>`; `computeAggregateRating(reviews)` → `{ratingValue,
  reviewCount}` with `ratingValue` rounded to 1 decimal (matching
  `ReviewsBlock`'s `.toFixed(1)`); `buildBrandSummaries(reviews,
  sampleSize)` → deterministic per-brand summaries.
- **JSON-LD safety (critical).** Google's `Review`/`AggregateRating`
  policy: `AggregateRating` is only valid attached to a markup item the
  page is *about* (a `Product`, `Organization`, `LocalBusiness`, …) — a
  bare `AggregateRating` floating in the graph, or one attached to a
  generic `WebPage`, risks a "rating not associated with content" penalty
  or is silently dropped. Plan A's rule:
  - Emit **one `Organization` node per brand**, each carrying its own
    `aggregateRating` (the per-brand avg + count) and a bounded `review`
    array (the same ~3–4 sampled reviews, as `Review` objects with
    `author`, `reviewRating` `{ratingValue, bestRating:5, worstRating:1}`,
    `datePublished`, `reviewBody`).
  - The page-level node is a plain `CollectionPage` with an `ItemList` of
    the brand sections — **no page-level `AggregateRating`**.
  - **Honest-content guard:** a brand section, its `Organization` node, and
    its `aggregateRating` are emitted **only if that brand has ≥ 1 real
    review** in `reviews.json`. `ratingValue` is only emitted when
    `reviewCount > 0`. A brand with zero reviews is simply omitted — no
    empty `AggregateRating` with `ratingValue: 0` (Google rejects/ignores
    those and they erode trust).
  - **Do not invent ratings.** Every `ratingValue` is computed from real
    rows; `reviewCount` is the real array length. No rounding up, no
    minimum-rating floor.
- **Honest-content / noindex for `/otzyvy/` itself:** the page renders only
  if `reviews.json` is non-empty (it has 19 144 rows, so in practice always
  indexable). Defensive rule: if the total review count is `0`, the page
  sets `robots="noindex, follow"` and renders an empty-state. Mirrors the
  hub empty-listing rule; ~3 lines.
- **`reviews.json` is 10 MB** — importing it at *build time* is fine
  (`companies/index.astro` and `ReviewsBlock` already do). The concern is
  *output size*: the page must NOT inline 19 144 reviews into the HTML.
  Plan A renders only the ~3–4 sampled reviews per brand (≤ ~32 reviews
  total in the HTML) plus the aggregate numbers — output stays small. The
  10 MB JSON never reaches the client.

**Why grouped-by-brand, not a flat list:** intent.md §3 and §9 explicitly
say "aggregate reviews of courier employers, **by brand**". Brand grouping
also gives clean, policy-safe JSON-LD (one `Organization` per group) and a
natural funnel (each brand → its `/companies/{slug}/` page).

### 3.5 Decision D — Homepage optimization scope

**Decision: a tightly-scoped, fully-reversible edit to `src/pages/index.astro`
only — title/H1/meta tuning toward the head terms + one new interlink block
to the four transport hubs. No structural, layout, component, or
JobGrid-algorithm changes.** Rationale: `/` is the highest-traffic page
(297K/mo core, existing `apply_click` ~27% must not regress) — the correct
posture is minimal surface area and a trivial revert path.

**In scope (4 changes, all in `index.astro` frontmatter/markup):**

1. **`homepageTitle`** — currently
   `` `Работа курьером 2026: ${totalVacancies} вакансий, ${companies.length} компаний | КурьерОк` ``.
   Retune toward the head terms "работа курьером" + "курьер вакансии" while
   keeping the dynamic count (clickable in SERP) and the ≤70-char
   `.slice(0,70)`. Example new form:
   `` `Работа курьером — ${totalVacancies} вакансий 2026 | КурьерОк` ``.
   Final copy is a content-brief decision (Open Question #5).
2. **H1** — `HomeHero` currently renders the homepage H1. The H1 must
   contain "Работа курьером". This is a one-line copy change inside
   `HomeHero.astro` (or, if `HomeHero` accepts the H1 as a prop, passed
   from `index.astro`). Verify `HomeHero.astro` first — if the H1 is
   hardcoded there, the change is a single string edit; that file is in
   scope **only for that one line**.
3. **`homepageDescription`** — retune to lead with the head terms, keep the
   `.slice(0,170)` cap. Pure copy change.
4. **New interlink block: "Форматы работы"** — a small section linking the
   four NEW transport hubs. The homepage already has a `featuredFormats`
   array pointing at the *old* category slugs (`/rabota-kurerom-na-avto/`
   …). Plan A **repoints `featuredFormats` to the new hub URLs** (the hubs
   are now canonical — internal links should point at canonical targets)
   and, if `featuredFormats` is not visually surfaced as a standalone block
   today, adds a compact `home-chip-row` "Форматы работы" block (the
   `.home-surface-card` / `.home-chip-link` styles already exist in
   `index.astro`'s `<style>` — pure reuse, no new CSS). This satisfies the
   §6 "homepage interlinked to hubs" requirement.

**Explicitly OUT of scope for the homepage (risk control):** no change to
`JobGrid`'s `distributeAcrossCities` algorithm or `limit`; no change to
`HomeToolbar`, `HomeGeoBanner`, `IncomeCalculator`, `ReviewsBlock`,
`HomeFaq` behavior; no change to the geo-detection / city-index lazy-fetch
script; no change to `pageSchemaGraph` structure beyond the
title/description strings flowing into the existing `CollectionPage` node;
brand-page interlinks deferred (brand pages out of scope).

**Reversibility:** every homepage change is a string edit or one
self-contained additive block. Revert = `git revert` of one small commit.
The bead is sequenced **last** (after hubs exist, so interlink targets are
live) and gets explicit browser QA + a CWV spot-check.

---

## 4. Components

One subsection per new page template and per shared helper. Real file
paths; reuse-first.

### 4.1 `src/utils/transportHubs.ts` (NEW helper)

Pure-function module — no Astro globals, no `new Date()` at module scope —
mirroring the `cityListingPage.ts` discipline. Exports:

- `TransportHubConfig` type: `{ slug, tag, h1, eyebrow, faqItems:
  FaqItem[], incomeBlurb, requirementsBlurb, relatedGuideSlug,
  relatedCategorySlug }`.
- `TRANSPORT_HUBS: Record<string, TransportHubConfig>` — the 4-entry
  registry (`rabota-peshim-kurerom`, `rabota-avtokurerom`,
  `rabota-velokurerom`, `podrabotka-kurerom`). `tag` values: `foot`,
  `auto`, `bicycle`, `flexible` respectively.
- `buildHubSeoTitle(config, jobCount, maxSalary, isEmpty)` — composes a
  `≤70`-char title; reuses `formatMoney` / `buildVacancyCountText` patterns.
- `buildHubSeoDescription(config, jobCount, companyNames, isEmpty)` —
  `≤170`-char meta description.
- `buildHubFaqItems(config, jobCount, companyNames)` — returns the per-hub
  FAQ (transport-specific questions from the content briefs).
- `buildHubSchemaGraph({config, title, description, pageUrl, jobs,
  faqItems, siteUrl, dateModifiedIso})` — returns the `@graph` array:
  `CollectionPage` + `ItemList` (first 10 jobs), `FAQPage`,
  `BreadcrumbList` (`buildBreadcrumbSchema` reused from `schema.ts`). Shape
  deliberately matches `cityListingPage.ts`'s `buildPageSchemaGraph`.

**Why a new helper, not extend `cityListingPage.ts`:** `cityListingPage.ts`
is tightly coupled to the `'city'|'category'` `ListingType` and the
catch-all's data shape. A separate small (~200-LOC) `transportHubs.ts`
keeps the catch-all untouched (additive-only) and stays well under the
800-LOC ceiling. The two modules share `FaqItem`/`FactCard` *types* by
importing them from `cityListingPage.ts` (no duplication).

### 4.2 `src/components/TransportHub.astro` (NEW component)

The shared hub body. **Presentational** — props: `{config:
TransportHubConfig, filteredJobs: GeneratedJob[], isEmpty: boolean,
faqItems: FaqItem[], companyNames: string[], maxSalary: number}`. The
*page* file does the data work (so it can set `robots`), the component is
pure presentation. It does **not** own `<BaseLayout>`. Renders: breadcrumb
(Главная > Форматы > {h1}); hero panel (eyebrow, H1, intro, primary CTA
"Смотреть вакансии" `#vacancies`, secondary "Сравнить" `/compare/`); 4 fact
cards (reuse `buildFactCards` from `cityListingPage.ts` — already exported
and pure); `<JobFilters />`; `<JobGrid initialTag={config.tag} limit={24}
revealable />`; an income block (`config.incomeBlurb` + link to
`/skolko-zarabatyvaet-kurer/`); a requirements block
(`config.requirementsBlurb` + link to `/kak-stat-kurerom/`); a FAQ
`<details>` list; an exit-ramp linking the other 3 hubs + `/cities/` +
relevant `/companies/`; `<PartnerBanner />`. CSS: reuse the `.listing-hero`
/ `.listing-fact-grid` / `.nearby-cities` style vocabulary from
`[slug].astro` (copy the relevant scoped rules — CSS-variable-based,
dark-mode-aware). Hub-specific blocks (income/requirements) get a few new
rules. No global CSS touched.

### 4.3 `src/pages/rabota-peshim-kurerom.astro` + 3 siblings (NEW pages)

Four near-identical thin wrappers. Each:

```
---
import BaseLayout from '../layouts/BaseLayout.astro';
import Header from '../components/Header.astro';
import Footer from '../components/Footer.astro';
import TransportHub from '../components/TransportHub.astro';
import jobsData from '../data/jobs';
import { filterJobsByCriteria } from '../utils/jobFilters';
import { TRANSPORT_HUBS, buildHubSeoTitle, buildHubSeoDescription,
         buildHubFaqItems, buildHubSchemaGraph } from '../utils/transportHubs';
import { parseSalary } from '../utils/format';

const config = TRANSPORT_HUBS['rabota-peshim-kurerom'];
const filteredJobs = filterJobsByCriteria(jobsData, { tag: config.tag });
const isEmpty = filteredJobs.length === 0;
const companyNames = Array.from(new Set(filteredJobs.map((j) => j.company)));
const maxSalary = filteredJobs.reduce((a, j) =>
  Math.max(a, parseSalary(j.salary)), 0);
const faqItems = buildHubFaqItems(config, filteredJobs.length, companyNames);
const seoTitle = buildHubSeoTitle(config, filteredJobs.length, maxSalary, isEmpty);
const seoDescription = buildHubSeoDescription(config, filteredJobs.length, companyNames, isEmpty);
const schemaGraph = buildHubSchemaGraph({ config, title: seoTitle,
  description: seoDescription, pageUrl: Astro.url.href,
  jobs: filteredJobs, faqItems, siteUrl: Astro.site,
  dateModifiedIso: new Date().toISOString() });
---
<BaseLayout title={seoTitle} description={seoDescription}
            schemaGraph={schemaGraph}
            robots={isEmpty ? 'noindex, follow' : undefined}>
  <Header />
  <main><TransportHub config={config} filteredJobs={filteredJobs}
          isEmpty={isEmpty} faqItems={faqItems}
          companyNames={companyNames} maxSalary={maxSalary} /></main>
  <Footer />
</BaseLayout>
```

Each file is ~30–40 LOC frontmatter + ~10 LOC markup — within "many small
files". The 4 files differ only in the `TRANSPORT_HUBS[...]` key. (A single
dynamic `[hub].astro` route was considered and **rejected** — Open Question
#2 — because 4 explicit files give clearer routing, simpler per-page QA,
and zero risk of a `getStaticPaths` collision with the existing catch-all.)

### 4.4 `src/utils/infoGuides.ts` (NEW helper)

Pure-function registry for the 3 info-guides. Exports:

- `InfoGuideConfig` type: `{ slug, h1, kicker, lead, seoTitle,
  metaDescription, sections: GuideSection[], faqItems: FaqItem[],
  howTo?: HowToSpec, relatedGuideSlugs: string[], ctaHubSlug: string,
  showCalculator?: boolean, publishedDate, modifiedDate }`. `GuideSection
  = { id, heading, bodyBlocks }`.
- `INFO_GUIDES: Record<string, InfoGuideConfig>` — 3 entries.
- `buildGuideSchemaGraph(config, pageUrl, siteUrl)` — returns `Article`
  (+ `author`/`publisher` Organization, `inLanguage:'ru-RU'`,
  `datePublished`/`dateModified`, optional `speakable`) + optional `HowTo`
  + `FAQPage` + `BreadcrumbList`. Shape copied from `guide/[topic].astro`.

Guide *content* (income tables, step text, prose) is **authored editorial
copy** living in `INFO_GUIDES` as structured data (or in small co-located
`.ts`/`.json` files if a section is large, e.g. the income-by-brand table).
Content authoring is itself a work item (§10) and a content-brief
dependency (Open Question #5). For `/skolko-zarabatyvaet-kurer/` the income
figures should be sourced from the same data the `доход` KB topic and
`kuper-pay-rates.json` use, to stay honest and consistent.

### 4.5 `src/components/InfoGuide.astro` (NEW component)

Shared guide body. Props: `config: InfoGuideConfig`. Renders: breadcrumb
(Главная > {h1}); guide hero (kicker, H1, lead, meta line —
"Обновлено: {date}"); optional HowTo block (same markup as
`guide/[topic].astro`'s `guide-howto`); the editorial `sections` (each an
`<article class="guide-card">` with an anchor-linked `<h2>`); a FAQ
section; a "funnel" block — when `config.showCalculator` is set this
includes `<IncomeCalculator />` and a `<JobGrid limit={12} />` feed + a
prominent CTA to `config.ctaHubSlug`; a related-content grid linking the
`config.relatedGuideSlugs` `/guide/{topic}/` pages and the transport hubs;
`<PartnerBanner />`. CSS: copy the self-contained `<style>` block from
`guide/[topic].astro` (CSS-variable-based, dark-mode-aware, proven). The
page file owns `<BaseLayout>` (`ogType="article"`, `articleSection`,
`articlePublishedTime/ModifiedTime`).

### 4.6 `src/pages/skolko-zarabatyvaet-kurer.astro` / `kak-stat-kurerom.astro` / `usloviya-raboty-kurerom.astro` (NEW pages)

Three thin wrappers, same shape as the hubs: import `INFO_GUIDES[key]`,
build the schema graph, render `<BaseLayout ogType="article" …><InfoGuide
config={config} /></BaseLayout>`. `/skolko-zarabatyvaet-kurer/` sets
`showCalculator: true` so `<InfoGuide>` renders the `IncomeCalculator` +
`JobGrid` funnel block. Honest-content: an info-guide is *editorial* — it
always has real authored content, so it ships `index, follow` by default.
Guard: if a guide's `sections` array is empty (content not yet authored),
the build/test fails loudly via a unit test (§6, §8) — never silently ship
an empty `index` page.

### 4.7 `src/utils/reviewsAggregate.ts` (NEW helper)

Pure module. Exports:

- `Review` type — the `reviews.json` row shape `{id, jobId, company,
  jobTitle, name, city, pros, cons, comment, rating, date}` — and
  `BrandReviewSummary` type `{company, slug?, ratingValue, reviewCount,
  sampleReviews: Review[]}`.
- `groupReviewsByCompany(reviews)` → `Map<string, Review[]>`.
- `computeAggregateRating(reviews)` → `{ratingValue: number; reviewCount:
  number}` — `ratingValue` = mean rounded to 1 decimal; returns
  `{ratingValue:0, reviewCount:0}` for `[]` (caller must not emit a rating
  then).
- `buildBrandSummaries(reviews, sampleSize)` → `BrandReviewSummary[]`,
  sorted by `reviewCount` desc; each brand's `sampleReviews` =
  `seededShuffle(brandReviews, 'otzyvy-' + company).slice(0, sampleSize)`;
  `slug` resolved via a small company-name→`/companies/` slug lookup
  (omitted when no company page exists).
- `buildReviewsSchemaGraph(summaries, pageUrl, siteUrl)` → the `@graph`:
  per-brand `Organization` nodes with `aggregateRating` + bounded `review`
  array, plus a `CollectionPage` + `ItemList`. Only brands with
  `reviewCount > 0` produce a node.

### 4.8 `src/components/ReviewsAggregate.astro` (NEW component)

Reviews-by-brand body. Props: `summaries: BrandReviewSummary[]`,
`overall: {ratingValue, reviewCount}`. Renders: hero; site-wide summary
card; one `<section>` per brand (brand name, star rating, count, sample
review cards reusing the `.review-card` markup vocabulary from
`ReviewsBlock.astro`, CTA to `/companies/{slug}/` when `slug` set); FAQ;
CTA to hubs. Reuses the `renderStars` helper pattern from `ReviewsBlock`.
CSS: copy the `.review-card` / `.reviews-grid` scoped styles from
`ReviewsBlock.astro`. Astro auto-escaping handles all `review.*` text
(same as `ReviewsBlock` today).

### 4.9 `src/pages/otzyvy.astro` (NEW page)

Thin wrapper: imports `reviews.json` + `reviewsAggregate.ts`, computes
`summaries` and `overall`, builds the schema graph, renders
`<BaseLayout robots={overall.reviewCount === 0 ? 'noindex, follow' :
undefined}><ReviewsAggregate … /></BaseLayout>`.

### 4.10 `src/pages/index.astro` (EDIT — Decision D)

Four targeted edits per §3.5: `homepageTitle`, `homepageDescription`,
`featuredFormats` repointed to hub URLs, and a "Форматы работы" interlink
block. Plus a one-line H1 copy edit in `HomeHero.astro` if the H1 is
hardcoded there.

### 4.11 `src/pages/[slug].astro` (EDIT — Decision A)

One additive change: a `CATEGORY_CANONICAL_OVERRIDE: Record<string,
string>` constant + a `canonicalURL` prop passed to `BaseLayout` for the
overridden category slugs. ~15 LOC. The empty-listing / sitemap /
city-page behavior is unchanged.

### 4.12 `src/utils/listingSlugs.ts` (EDIT — sitemap/honest-content)

The new hubs are top-level `.astro` files — `@astrojs/sitemap`
auto-includes them, and they self-noindex when empty via the page-level
`robots` prop. But the sitemap should also **drop an empty hub** (parity
with the city/category pages). Add a small `getEmptyHubPaths()` that checks
each `TRANSPORT_HUBS` entry's tag against `jobsData` via
`filterJobsByCriteria`, and include its output in `getEmptyListingPaths()`
/ `getEmptyListingUrls()`. This keeps the "sitemap and SSR must agree"
invariant (the file's own JSDoc) intact. `scripts/emit-empty-listings.ts`
already calls `getEmptyListingUrls()` — no script change. `astro.config.mjs`
reads `public/empty-listings.json` — no config change for this.

### 4.13 `astro.config.mjs` (EDIT — sitemap priority)

`serialize()` assigns priority by URL substring. The new hubs and guides
match no existing pattern → they fall through to `priority: 0.3,
changefreq: 'monthly'` — too low for P0 landing pages. Add explicit
branches: hub URLs → `priority: 0.8, changefreq: 'weekly'`; the 3 guide
URLs → `priority: 0.7, changefreq: 'weekly'`; `/otzyvy/` → `priority: 0.6`.
Match by an explicit `Set` of the 8 URLs (not a fragile substring) so no
existing URL is re-prioritized. ≤20-LOC additive change to one function.

---

## 5. Data model — what each page consumes

| Page | Build-time data source | Client-shipped data |
|---|---|---|
| 4 transport hubs | `jobsData` (`src/data/jobs.ts`) filtered by `tag` via `filterJobsByCriteria`; `TRANSPORT_HUBS` config (static) | Only the rendered job cards (first 24 + `<template>` overflow), same as existing listing pages — no extra payload |
| `/skolko-zarabatyvaet-kurer/` | `INFO_GUIDES` config (authored content); `IncomeCalculator` consumes `vacancySources` (`src/data/vacancies.ts`); a small `JobGrid` feed reads `jobsData`; income figures sourced from `доход` KB topic + `kuper-pay-rates.json` | Calculator rates (already inlined by `IncomeCalculator` today); ~12 job cards |
| `/kak-stat-kurerom/`, `/usloviya-raboty-kurerom/` | `INFO_GUIDES` config (authored content) only | Static HTML — no data payload |
| `/otzyvy/` | `reviews.json` (19 144 rows) read at **build time only**; grouped/aggregated by `reviewsAggregate.ts` | Only ~3–4 sampled reviews per brand (≤ ~32 cards) + aggregate numbers — the 10 MB JSON never reaches the client |
| `/` (homepage) | unchanged: `jobsData`, `getCompaniesFromJobs`, `getCitiesFromJobs`, `knowledge-base.json` | unchanged |

**Key data facts grounding the design:**

- Transport-hub data **already exists** — `GeneratedJob.transport` ∈
  `foot|auto|bicycle|remote`, and `job.tags` carries a transport tag.
  `filterJobsByCriteria(jobsData, { tag: 'foot' })` is the exact query the
  existing `rabota-kurerom-peshkom` category page uses. **No new vacancy
  data is needed for the hubs.**
- `podrabotka` maps to `tag: 'flexible'` (confirmed in `constants.ts`).
  The подработка hub uses `initialTag='flexible'`.
- `reviews.json` covers 8 companies; brand names there
  ("Купер (ex. СберМаркет)", "Ozon fresh", …) must be normalized/mapped to
  `/companies/{slug}/` slugs via a small lookup in `reviewsAggregate.ts`
  (some review-companies may not have a company page — that CTA is then
  omitted, not broken).
- `knowledge-base.json` (`version 0.1.0`, `generated 2026-04-26`) has a
  `доход` topic with 6 items and an `оформление` topic — the new guides
  link to these for topical reinforcement and may reuse their
  `facts`/`sources` for citations.

---

## 6. Edge cases & failure modes

**Empty vacancy feed (hub).** If `filterJobsByCriteria(jobsData, {tag})`
returns `[]` (e.g. all `bicycle` vacancies expire), the hub page must:
(a) set `robots="noindex, follow"`; (b) render a graceful empty-state
(`JobGrid` already shows a "Вакансии пока не опубликованы" block when
`jobsData` is empty / no matches); (c) be dropped from the sitemap via
`getEmptyHubPaths()` in `listingSlugs.ts`. The hero/FAQ/income blocks still
render (evergreen editorial), so the page is not *thin* — but without a
live feed it should not compete in search, hence noindex.

**Honest-content noindex — the load-bearing invariant.** The SSR `robots`
decision and the sitemap inclusion decision **must agree** (the documented
invariant in `jobFilters.ts` / `listingSlugs.ts` JSDoc). Plan A keeps them
in sync by routing both through `filterJobsByCriteria` + `TRANSPORT_HUBS`
config: the page computes `isEmpty` from `filterJobsByCriteria`, and
`getEmptyHubPaths()` computes the sitemap-drop set from the *same* function
+ the *same* config. A unit test asserts parity (§8).

**Info-guide with no authored content.** A guide whose `INFO_GUIDES`
`sections` array is empty would ship an `index` page with an empty body — a
thin-content trap. Mitigation: a unit test asserts every `INFO_GUIDES`
entry has ≥ N sections and a non-empty FAQ; the build/test fails loudly if
content is missing. Guides are never auto-noindexed (editorial by
definition) — the safety net is the test.

**JSON-LD with missing/zero data.**
- *Hub:* `CollectionPage.mainEntity.ItemList` maps `filteredJobs.slice(0,10)`
  — if `filteredJobs` is empty the `ItemList` is `[]` (valid JSON-LD, just
  empty). `FAQPage` always has items (FAQ is evergreen config).
- *`/otzyvy/`:* a brand `Organization` node and its `aggregateRating` are
  emitted **only when `reviewCount > 0`**. `ratingValue` is never `0` or
  fabricated. A brand with zero reviews → no node, no section. If
  `reviews.json` is entirely empty (defensive), the page noindexes and
  emits only a bare `CollectionPage`.
- *Guide:* `HowTo` is emitted only for guides that define `config.howTo`
  (e.g. `/kak-stat-kurerom/`); guides without it omit the node entirely
  (Google penalizes an empty `HowTo` with no `step`).
- All schema builders are pure functions covered by unit tests asserting
  "no `ratingValue`/`HowTo`/`ItemList` node when the backing data is
  empty".

**Canonical collisions (Decision A).** The new hub `/rabota-peshim-kurerom/`
is self-canonical; the old `rabota-kurerom-peshkom` points
`canonical → /rabota-peshim-kurerom/`. Risk: a typo in
`CATEGORY_CANONICAL_OVERRIDE` could point a category page at a non-existent
or wrong hub → a canonical to a 404. Mitigation: a unit test asserts every
override *value* is one of the 4 real hub URLs and every override *key* is
a real `CATEGORIES` slug. Also: the hub must NOT accidentally canonical to
the category page (would create a loop) — the hub uses `BaseLayout`'s
default self-canonical, never an override.

**Sitemap duplication.** Both the hub and the canonicalized category page
appear in the sitemap (the category page is still a real, crawlable URL).
That is *correct* — a canonical does not require sitemap exclusion; Google
follows the canonical. No de-dup needed. (Only *empty* hubs/categories are
sitemap-dropped, via the empty-listing mechanism.)

**Build failure / missing data files.** `astro.config.mjs` reads
`public/empty-listings.json` and degrades gracefully if absent (logs a
warning). New hub URLs flow into that JSON via `emit-empty-listings.ts` →
`getEmptyListingUrls()` → the new `getEmptyHubPaths()`. If `generate:data`
is skipped, empty hubs simply are not dropped from the sitemap (same
failure mode as today's city pages) — non-fatal. The `reviews.json` import
in `otzyvy.astro` is build-time; if the file is missing the build fails
fast with a clear module-not-found error (acceptable — committed repo
file).

**i18n.** Per intent §8 and `BaseLayout` comments (M2): the shell-UI
dictionary is **Russian-only** (the 11 non-RU slots were byte-identical
clones and removed). The new pages are static editorial RU copy.
**Decision: ship all new static copy RU-only**, consistent with the
current shell. New copy does **not** get `data-t` keys (those drive the
runtime i18n manager, which only has RU). `JobCard`/`JobGrid` content
inside the hubs still translates via the existing per-source fragment
mechanism — unaffected. This is explicitly the "scoped RU-only" option
intent §8 permits.

**CWV / build-time budget.** (a) The hubs reuse `JobGrid` `revealable`
mode — first 24 cards rendered, the rest in a `<template>` — identical
weight to existing listing pages; no CWV regression. (b) `/otzyvy/` renders
≤ ~32 review cards, not 19 144 — small HTML. (c) `reviews.json` is 10 MB:
importing it at build time adds parse cost to **one** page's build; it does
not touch the per-page hot path. Acceptable, but a watch-item — if build
time regresses, `reviewsAggregate.ts` work can be precomputed into a small
`public/reviews-summary.json` by a `generate:data` step (same pattern as
`emit-empty-listings.ts`). Plan A's v1 imports directly (KISS); the
precompute is a documented fallback. (d) No new third-party fonts,
scripts, or large assets. (e) 8 new pages + ~3 components is a tiny
increment on a 6 000-page build.

**`getStaticPaths` collision.** The new hubs are *static* `.astro` files
(`/rabota-peshim-kurerom.astro` → `/rabota-peshim-kurerom/`), NOT catch-all
routes. They cannot collide with `[slug].astro` because their slugs differ
from any `rabota-kurerom-{...}` slug the catch-all emits, and Astro
resolves static routes before dynamic ones anyway. The guides likewise have
unique top-level slugs.

**Stale on-disk checkout.** Intent §11 notes the on-disk checkout is stale
vs GitHub `main`. A Phase-D concern, not a design concern — flagged in Open
Questions, not designed around.

**Reviews authenticity / trust.** `reviews.json` is synthetic seed data
with deliberate typos. Emitting `Review` JSON-LD with `author` names from
fabricated data is a **trust/policy risk** if a regulator or Google treats
it as fake UGC. Mitigation is an Open Question (#4) — Plan A's default is to
emit `AggregateRating` + `Review` schema (the data reads as real reviews
and the page genuinely displays them), but flags this for owner
confirmation. Conservative fallback: render the reviews visually but emit
**no `Review`/`AggregateRating` JSON-LD** until reviews are confirmed
genuine.

---

## 7. Security & trust boundaries

- **No new user input, no new endpoints.** All 8 new pages are static,
  build-time-rendered. No form handler, no query-param parsing, no runtime
  fetch of untrusted data. The only client JS is the **reused** `JobGrid`
  script (already XSS-hardened — `stripEventHandlers`, whitelist-clone,
  audited H10) and `IncomeCalculator` (existing).
- **`reviews.json` is repo-committed data, not user input** — but it is
  rendered into the page. Astro auto-escapes interpolated text (`{...}`),
  so `review.pros`/`cons`/`comment`/`name` are HTML-safe by default (same
  as `ReviewsBlock.astro` today). The JSON-LD builder `JSON.stringify`s
  review text into the `@graph`; `BaseLayout` already does
  `JSON.stringify(...)` + `set:html` for the `<script
  type="application/ld+json">`. **Real review item:** confirm `BaseLayout`'s
  `set:html` JSON-LD path is `</script>`-safe (a review body containing the
  literal `</script>` would break out of the script tag). A `tests/build-output`
  assertion checks the rendered `/otzyvy/` JSON-LD does not contain an
  unescaped `</script>`. If `BaseLayout` is unsafe here it is a pre-existing
  issue affecting all pages — flag separately.
- **No secrets.** Verification tokens / analytics IDs come from env vars
  (existing `BaseLayout` pattern) — the new pages add none.
- **External links** (apply links inside `JobCard`, source links in guide
  citations) keep the existing `rel="noopener noreferrer nofollow"` pattern
  from `guide/[topic].astro`.
- **Canonical override (Decision A)** is the one new "trust boundary": a
  wrong canonical mis-routes ranking signal. Guarded by the §6/§8 unit test
  (every override value is a real hub URL).
- **Honest-content rule** is itself a trust boundary with search engines —
  enforced by the `robots` + sitemap parity described in §6/§8.

No `security-reviewer` escalation trigger fires (no auth, no DB, no user
input, no crypto, no runtime file-system writes). The JSON-LD-escaping
check is the single security to-do.

---

## 8. Testing strategy

Matches the repo's existing **vitest** patterns (`tests/*.test.ts`, pure
unit tests over helper modules; `tests/build-output.test.ts` for
post-build artifact assertions with `describe.skipIf(skipIfNoDist)`).
Target **≥ 80 % coverage** on all new helper modules.

### 8.1 Unit tests (pure helpers — the bulk of coverage)

- **`tests/transportHubs.test.ts`** — for `transportHubs.ts`:
  - `TRANSPORT_HUBS` has exactly 4 entries with valid `tag` values
    (`foot|auto|bicycle|flexible`).
  - `buildHubSeoTitle` ≤ 70 chars in all branches (empty/non-empty,
    with/without `maxSalary`).
  - `buildHubSeoDescription` ≤ 170 chars in all branches.
  - `buildHubFaqItems` returns a non-empty, well-formed `FaqItem[]`.
  - `buildHubSchemaGraph`: `ItemList` is empty when `jobs=[]`; `FAQPage`
    always populated; `BreadcrumbList` well-formed; output is
    `JSON.stringify`-able.
- **`tests/infoGuides.test.ts`** — for `infoGuides.ts`:
  - `INFO_GUIDES` has 3 entries; **every entry has ≥ 1 section and a
    non-empty `faqItems`** (the anti-thin-content guard).
  - `buildGuideSchemaGraph`: `HowTo` node present **iff** `config.howTo`
    set; `Article` node has `author`/`publisher`/`datePublished`; `FAQPage`
    populated.
  - `relatedGuideSlugs` reference real `/guide/{topic}/` slugs (cross-check
    against `TOPIC_META`).
- **`tests/reviewsAggregate.test.ts`** — for `reviewsAggregate.ts`:
  - `groupReviewsByCompany` buckets correctly; total across buckets =
    input length.
  - `computeAggregateRating`: correct mean, 1-decimal rounding; returns
    `{ratingValue:0, reviewCount:0}` for `[]`.
  - `buildBrandSummaries`: deterministic (same input → same `sampleReviews`
    order across two calls — the `seededShuffle` guarantee); sorted by
    `reviewCount` desc.
  - `buildReviewsSchemaGraph`: **no `Organization`/`aggregateRating` node
    for a zero-review brand**; `ratingValue` never `0` or `> 5`;
    `reviewRating` carries `bestRating:5, worstRating:1`; node count equals
    the count of brands with `reviewCount > 0`.
  - **Honest-content parity:** a brand fixture with `[]` reviews produces
    neither a section nor a schema node.
- **`tests/canonicalOverride.test.ts`** — for the Decision-A override map:
  - Every `CATEGORY_CANONICAL_OVERRIDE` key is a real `CATEGORIES` slug.
  - Every value is one of the 4 hub URLs (no canonical-to-404).
  - No hub URL appears as a *key* (no self-loop).
- **`tests/jobFilters.test.ts` extension (or a new `listingSlugs` test)** —
  `getEmptyHubPaths()` returns a hub path **iff**
  `filterJobsByCriteria(jobsData, {tag})` is empty; parity with the SSR
  `isEmpty` decision (mirrors the existing city/category parity test).

### 8.2 Build-output / integration tests (`tests/build-output.test.ts`)

Extend the existing `describe.skipIf(skipIfNoDist)` suite:

- All 8 new routes exist in `dist/`:
  `dist/rabota-peshim-kurerom/index.html`, … `dist/otzyvy/index.html`.
- Update the page-count band (`6730–6770`) → add 8 (new band ~`6738–6778`).
- Each hub HTML contains `id="jobs-grid"` and `class="job-card"` (the
  `JobGrid` rendered).
- Each new page's HTML contains exactly one `<link rel="canonical">` and a
  `<script type="application/ld+json">`; the JSON-LD parses (`JSON.parse`
  round-trip) and does **not** contain an unescaped `</script>` (the §7
  security check).
- A non-empty hub HTML has `robots` = the default index value; an
  artificially-empty fixture-driven case has `noindex, follow`.
- `/otzyvy/` HTML contains per-brand `Organization` JSON-LD with
  `aggregateRating` and ≤ ~32 `.review-card` nodes (NOT 19 144).
- Homepage HTML still passes its existing assertions (city-index lazy
  fetch, no inlined city array) — Decision D must not break the existing
  homepage tests.
- Sitemap: `dist/sitemap-*.xml` includes the 4 hub URLs and 3 guide URLs;
  excludes any empty hub.

### 8.3 E2E / manual QA (matching the repo's "browser QA" wave practice)

The repo has no automated E2E harness (no Playwright in `devDependencies`)
— it uses manual browser QA waves (see the task history). Plan A's E2E = a
scripted manual QA checklist run on `npm run local:preview`:

- Each hub: feed renders, `JobFilters` filters, "Смотреть вакансии"
  anchors, a `JobCard` click → `/v/{slug}/`, `apply_click` fires (GA4
  debug), dark-mode toggle, mobile viewport.
- `/skolko-zarabatyvaet-kurer/`: income table renders, `IncomeCalculator`
  computes + emits `calculator_submit`, CTA → hub works.
- `/otzyvy/`: brand sections render, ratings sane, `/companies/{slug}/`
  CTAs resolve.
- Homepage: new "Форматы работы" block links resolve to the 4 hubs; head
  terms in `<title>`; nothing else regressed.
- A Rich Results / schema validation pass on one hub, one guide, `/otzyvy/`
  (Google Rich Results Test) — confirms no `AggregateRating`/`HowTo`
  warnings.

`npm run typecheck` (`astro check`) and `npm run lint` (eslint) must be
green — the repo gates on both.

---

## 9. Open questions

1. **(Inherited #1, blocks Wave 2 — record only.)** Does kurerok.ru have a
   per-brand vacancy data source for Золотое Яблоко / Wildberries / Магнит /
   Самокат / Пятёрочка / Лавка / Додо / ВкусВилл? Brand pages cannot be
   real vacancy listings without it. Escalate to the site owner; out of
   scope for this run.
2. **4 explicit hub files vs. 1 dynamic `[hub].astro`?** Plan A picks 4
   explicit files (clarity, per-page QA, zero `getStaticPaths` risk). A
   single dynamic route is marginally more DRY. Low-stakes; flagged for the
   synthesis step in case another plan argues strongly for the dynamic
   form.
3. **Should the old category pages (`rabota-kurerom-peshkom` etc.) keep
   their hero/FAQ content, or be slimmed to bare facets** once they
   canonical to the hubs? Plan A's default: **keep them unchanged** (zero
   edit beyond the canonical = lowest risk, fully additive). Slimming is a
   possible follow-up but risks regressing pages that currently rank.
4. **JSON-LD `Review`/`AggregateRating` on `/otzyvy/` given synthetic seed
   data.** Is the `reviews.json` data genuine enough to mark up as real
   UGC? Plan A's default: emit the schema (the page genuinely displays the
   reviews). Conservative fallback: display reviews but emit no
   `Review`/`AggregateRating` JSON-LD until confirmed. **Needs owner
   confirmation** — a Google "fake reviews" manual action is a serious
   risk.
5. **Content authoring for the 3 info-guides.** The income tables, step
   text, and prose are editorial copy not yet written. Who authors it, and
   from which sources? Plan A assumes the `07-content-briefs.md` spec + the
   `доход`/`оформление` KB topics + `kuper-pay-rates.json` are the source
   of truth, and treats authoring as explicit beads (§10). Final copy
   (incl. the exact homepage title/H1) needs sign-off.
6. **`reviews.json` build-cost.** Importing 10 MB at build time is fine for
   one page today, but if build time regresses, precompute a small
   `public/reviews-summary.json` via `generate:data`. Decision deferred to
   measurement during Phase D.
7. **`.md` LLM-variant for the 3 new guides** (`guide/[topic].md.ts` has
   precedent). Deferred — nice-to-have, not in the 9-item scope.

---

## 10. Implementation sequencing (work breakdown into beads)

Beads are self-contained task packets. Dependencies in brackets. Suggested
order respects priority (P0 first) and the dependency graph (helpers before
components before pages; hubs before the homepage interlink).

**Phase 0 — Foundations (no dependencies, parallelizable)**

- **Bead 1 — `transportHubs.ts` helper + tests.** Create
  `src/utils/transportHubs.ts` (config registry + pure builders) and
  `tests/transportHubs.test.ts`. No UI. _[none]_
- **Bead 2 — `reviewsAggregate.ts` helper + tests.** Create
  `src/utils/reviewsAggregate.ts` + `tests/reviewsAggregate.test.ts`.
  _[none]_
- **Bead 3 — `infoGuides.ts` helper skeleton + tests.** Create
  `src/utils/infoGuides.ts` with the `InfoGuideConfig` type, the schema
  builder, and stub configs; `tests/infoGuides.test.ts`. (Content fill is
  Beads 8–10.) _[none]_

**Phase 1 — Transport hubs (P0/P1) — the highest-impact deliverable**

- **Bead 4 — `TransportHub.astro` component.** Build the presentational
  hub component (hero, facts, `JobGrid`, info/FAQ/exit-ramp blocks, CSS).
  _[Bead 1]_
- **Bead 5 — 4 hub page files.** Create `rabota-peshim-kurerom.astro`,
  `rabota-avtokurerom.astro`, `rabota-velokurerom.astro`,
  `podrabotka-kurerom.astro`. Wire `BaseLayout` + honest-content `robots`.
  _[Bead 4]_
- **Bead 6 — Decision A: canonical overrides + sitemap parity.** Add
  `CATEGORY_CANONICAL_OVERRIDE` to `[slug].astro`; add `getEmptyHubPaths()`
  to `listingSlugs.ts`; add the priority branches to `astro.config.mjs`
  `serialize()`. Add `tests/canonicalOverride.test.ts` and the
  `listingSlugs` parity test. _[Bead 5]_

**Phase 2 — Info-guides (P0/P1/P2)**

- **Bead 7 — `InfoGuide.astro` component.** Build the shared guide body
  (hero, sections, HowTo, FAQ, funnel block with `IncomeCalculator` +
  `JobGrid`, related grid, CSS copied from `guide/[topic].astro`).
  _[Bead 3]_
- **Bead 8 — `/skolko-zarabatyvaet-kurer/` (P0).** Author the income
  content into `INFO_GUIDES`; create the page file; wire `IncomeCalculator`
  + the `JobGrid` funnel feed. _[Bead 7, Open Q #5]_
- **Bead 9 — `/kak-stat-kurerom/` (P1).** Author the step-by-step content
  (incl. a `HowTo` spec); create the page file. _[Bead 7, Open Q #5]_
- **Bead 10 — `/usloviya-raboty-kurerom/` (P2).** Author the conditions
  content; create the page file. _[Bead 7, Open Q #5]_

**Phase 3 — Reviews + homepage (P2/P1)**

- **Bead 11 — `ReviewsAggregate.astro` + `/otzyvy/` page (P2).** Build the
  reviews-by-brand component and `otzyvy.astro`; wire honest-content
  `robots`; resolve Open Q #4 (schema emit yes/no) before finalizing the
  JSON-LD. _[Bead 2, Open Q #4]_
- **Bead 12 — Homepage optimization (Decision D) (P1).** Edit `index.astro`
  (`homepageTitle`, `homepageDescription`, repoint `featuredFormats`, add
  the "Форматы работы" block); one-line H1 edit in `HomeHero.astro`.
  Sequenced **after** the hubs exist so the interlink targets are live.
  _[Bead 5]_

**Phase 4 — Verification & hand-off**

- **Bead 13 — Build-output tests + full verification.** Extend
  `tests/build-output.test.ts` (8 new routes, page-count band, canonical /
  JSON-LD / `robots` assertions, sitemap inclusion). Run `npm run build`,
  `npm test`, `npm run typecheck`, `npm run lint` — all green. _[all]_
- **Bead 14 — Browser QA + Rich Results validation.** Run the §8.3 manual
  QA checklist on `local:preview`; Rich Results Test on one hub / one
  guide / `/otzyvy/`; CWV spot-check on a hub and the homepage. _[Bead 13]_
- **Bead 15 — Indexing hand-off.** Produce the wave manifest for the
  `seo-promotion` skill: Wave 1 = 4 hub URLs + `/`; Wave 3 = 3 guide URLs +
  `/otzyvy/`. (Mechanics owned by `seo-promotion`, not this plan.)
  _[Bead 14]_

**Critical path:** Bead 1 → 4 → 5 → 6 (transport hubs, the P0 core) and,
in parallel, Bead 3 → 7 → 8 (P0 income guide). Beads 9–12 fan out after
their component dependency lands. The homepage edit (Bead 12) is
deliberately late and isolated. Reviews (Bead 11) is independent of the
hub/guide chains and can run any time after Bead 2.

**Suggested parallelization for worktree subagents:** {Bead 1, 2, 3}
concurrently; then {Bead 4, 7, 11-prep} concurrently; then {Bead 5, 8};
then {Bead 6, 9, 10, 12}; then Bead 13 → 14 → 15 serially.

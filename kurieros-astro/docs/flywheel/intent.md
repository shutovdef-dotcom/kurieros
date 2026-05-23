# kurerok.ru SEO Rollout — Flywheel Intent

> **Phase A artifact.** Self-contained brief for competing-plan subagents.
> **Scope of this run:** Wave 1 (transport hubs + homepage) + Wave 3 **info-guides only**.
> **Deferred:** all brand pages (Wave 2 + Wave 3 brands) — blocked on an open data question.
> Source spec: `kurieros-stats/semantic-core/run-2026-05-18/08-implementation-plan.md` (+ `00-summary.md`, `06-url-map.csv`, `07-content-briefs.md`).

---

## 1. Problem & opportunity

`kurerok.ru` is a static Astro site (~6 000 pages), an aggregator of courier job vacancies in Russia. Semantic-core v2 (919 queries, 36 clusters, 997 308 impressions/mo from Yandex Wordstat) found large demand clusters with **no dedicated landing page**:

- **Transport demand ~187K/mo** — Пеший 87.8K, Авто 63K, Вело 17.5K, Подработка 18.4K. Today only generic per-transport *category* pages exist (see §7); there is no rich aggregating hub.
- **Informational demand ~158K/mo** — Доход 76.2K, Трудоустройство 31.8K, Условия 25.9K, Отзывы 24.1K. The site has almost no informational content; this is the single largest under-served opportunity.
- **Homepage core 297K/mo** — "работа курьером" (147K), "курьер вакансии" (45.8K). The homepage exists but is not tuned to these head terms or interlinked to hubs.

## 2. Goal

Close the **unblocked** demand clusters with new and optimized pages — **additively**, without breaking the existing ~6 000 pages — so each cluster has a page that can rank, capture the searcher, and funnel them to vacancies (and ultimately the `apply_click` event). Every new page is indexable **only when it has real content** (honest-content rule, §8).

## 3. Scope — the 9 work items in THIS run

| # | Page | URL | Type | Demand/mo | Priority | Status |
|---|------|-----|------|----------:|:--------:|--------|
| 1 | Хаб «Пеший курьер» | `/rabota-peshim-kurerom/` | Transport hub | 87 837 | P0 | new |
| 2 | Хаб «Автокурьер» | `/rabota-avtokurerom/` | Transport hub | 63 046 | P0 | new |
| 3 | Хаб «Велокурьер» | `/rabota-velokurerom/` | Transport hub | 17 483 | P1 | new |
| 4 | Хаб «Подработка курьером» | `/podrabotka-kurerom/` | Hub (free schedule) | 18 396 | P1 | new |
| 5 | Главная — оптимизация | `/` | Optimize existing | 297 365 | P1 | exists |
| 6 | Гайд «Сколько зарабатывает курьер» | `/skolko-zarabatyvaet-kurer/` | Info-guide | 76 239 | P0 | new |
| 7 | Гайд «Как стать курьером» | `/kak-stat-kurerom/` | Info-guide | 31 814 | P1 | new |
| 8 | Гайд «Условия и график работы» | `/usloviya-raboty-kurerom/` | Info-guide | 25 945 | P2 | new |
| 9 | Раздел «Отзывы» | `/otzyvy/` | Reviews aggregate | 24 076 | P2 | new |

Total addressed demand ≈ **642K impressions/mo** (commercial hubs + homepage core + info).

### Per-page briefs (from `07-content-briefs.md`)

- **`/rabota-peshim-kurerom/`** — top queries: пеший курьер (37.7K), пеший курьер яндекс (9.6K), работа пешим курьером (6.3K), пеший курьер вакансии (3.6K). Title: «Работа пешим курьером — вакансии 2026 | КурьерОк». H1: «Работа пешим курьером». Structure: intro → feed of `-foot` vacancies → «сколько зарабатывает пеший курьер» → «как стать / со скольки лет» → документы → FAQ → links to cities & brands.
- **`/rabota-avtokurerom/`** — автокурьер (17.3K), автокурьер яндекс (4K), работа автокурьером (2.9K), отзывы автокурьеров (2.6K), автокурьер на личном авто (913). Title: «Работа автокурьером на личном авто — вакансии | КурьерОк». Structure: intro → `-auto` feed → requirements (авто/права/возраст) → доход → отзывы → FAQ.
- **`/rabota-velokurerom/`** — велокурьер (10.3K), яндекс велокурьер (2K), работа велокурьером (1.1K). `-bicycle` feed.
- **`/podrabotka-kurerom/`** — подработка курьером (8.3K) + свободный график / ежедневно / вечерняя / для студентов. Aggregates free-schedule / part-time vacancies.
- **`/` (homepage)** — tune `<title>`/H1 to "работа курьером" + "курьер вакансии"; add interlinking blocks to the new hubs and (later) brand pages.
- **`/skolko-zarabatyvaet-kurer/`** — сколько зарабатывают курьеры (27.5K), …яндекс (7.1K), …в день (2K), …вб/самокат/озон/на авто. Title: «Сколько зарабатывает курьер в 2026 — доход по брендам и городам | КурьерОк». Structure: income table by brand/type/city → calculator → «от чего зависит доход» → CTA to hubs & vacancies. Top-of-funnel — MUST funnel to vacancies.
- **`/kak-stat-kurerom/`** — как устроиться курьером (17.9K), …в яндекс (2.5K), …вб/пятёрочку/магнит, как школьнику устроиться (1.1K). Step-by-step → breakdown by brand & age → CTA to brand pages & vacancies.
- **`/usloviya-raboty-kurerom/`** — суть работы, договор, часы, график 2/2.
- **`/otzyvy/`** — aggregate reviews of courier employers, by brand.

## 4. Non-goals — explicitly deferred

- **All brand landing pages.** Wave 2 (Золотое Яблоко 60K, Wildberries 27.9K, Магнит 15.9K, Самокат 15.3K, Пятёрочка/X5 14.6K) and the Wave-3 residual brands (Яндекс Лавка 7.9K, Додо 7.1K, ВкусВилл 6K) are **out of scope of this run**. They are blocked on an unanswered question: *does kurerok.ru have a per-brand vacancy data source for these brands?* Without it, a brand page cannot be a real vacancy listing. The plan must record this as the #1 open question but must not design these pages.
- **Geo-page optimization** (Москва, СПб, 16-лет, ежедневная-оплата) — existing pages, separate effort.
- **The indexing campaign mechanics** (IndexNow, Yandex Переобход, Bing, GSC) — operated separately by the `seo-promotion` skill. This plan only needs to define the **hand-off**: which URLs ship in which wave so they can be submitted.

## 5. Target users & search intent

Job-seekers (often low-experience, mobile-first, RU) searching:
- **Commercial** ("работа пешим курьером", "автокурьер вакансии", "подработка курьером") — ready to apply; land them on a hub with a live vacancy feed.
- **Informational** ("сколько зарабатывает курьер", "как стать курьером", "условия работы курьером", "отзывы") — researching; land them on a guide that answers the question **and** funnels to hubs/vacancies.

The conversion goal is the existing GA4 `apply_click` event (currently ~27% — must not regress when info traffic grows).

## 6. User workflows the new pages must serve

1. **Transport-intent search → hub → vacancy → apply.** Searcher lands on `/rabota-peshim-kurerom/`, sees a filtered live feed of foot-courier vacancies across cities, reads the income/requirements blocks, clicks a vacancy → existing `/v/{slug}/` page → apply.
2. **Income research → guide → hub → apply.** Searcher lands on `/skolko-zarabatyvaet-kurer/`, reads the income table, uses the calculator, follows a CTA to a transport hub or vacancy.
3. **Homepage head-term search → homepage → hub/brand.** Searcher on "работа курьером" lands on `/`, uses the city/transport toolbar or follows an interlink to a hub.
4. **Reviews research → `/otzyvy/` → brand/vacancy.** Searcher reads aggregated employer reviews, follows through to vacancies.

## 7. Existing system — what new pages plug into

(From a codebase recon. On-disk checkout is slightly stale; architecture below is current & stable.)

- **City + category pages — `src/pages/[slug].astro`** is a single catch-all that emits BOTH per-city pages (`rabota-kurerom-{city}`) AND category pages. `getStaticPaths` iterates `getCitiesFromJobs(jobsData)` + a `CATEGORIES` list. **Important:** the catch-all ALREADY emits `rabota-kurerom-peshkom` (`tag:'foot'`), `rabota-kurerom-na-avto` (`auto`), `rabota-kurerom-na-velosipede` (`bicycle`), `rabota-kurerom-podrabotka` — i.e. transport/part-time category pages already exist on different slugs. Pure logic lives in `src/utils/cityListingPage.ts` (`buildSeoTitle/Description`, `buildHeroIntro`, `buildFactCards`, `buildFaqItems`, `buildNearbyCityLinks`, `buildPageSchemaGraph`). Blocks: breadcrumb, hero + 4 fact cards, `<JobFilters>`, `<JobGrid revealable limit={24}>`, nearby-cities exit-ramp, `<PartnerBanner>`. JSON-LD graph: `CollectionPage`+`ItemList`, `Place`, `FAQPage`, `BreadcrumbList`. There is an `isEzhednevLanding` special-case — the existing pattern for **bespoke per-slug content** on top of the catch-all.
- **Job/data layer — `src/data/`.** `jobs.ts` builds `GeneratedJob[]` from `vacancies.ts`/`vacancySources` (`src/data/sources/`). Each job has `transport: 'foot'|'auto'|'bicycle'|'remote'` and `tags` including a transport tag. **Querying "all foot vacancies across all cities"** = `filterJobsByCriteria(jobsData, { tag: 'foot' })` — already used by the category pages. Indexing/filter helpers: `src/utils/jobFilters.ts` (`buildJobsByCityMap`, `filterJobsByCriteria`, `jobMatches`, `normalizeCityKey`), `src/utils/cities.ts`, `src/utils/companies.ts`. **Transport-hub data already exists — no new data needed.**
- **JobGrid — `src/components/JobGrid.astro`.** Props: `initialCity`, `initialTag`, `initialSearch`, `limit`, `moreHref`, `moreLabel`, `revealable`. Server-filters via `filterJobsByCriteria`. `revealable` mode = listing pages (all matches, first `limit` shown). A transport hub ≈ `<JobGrid initialTag="foot" revealable limit={24}>`.
- **Guide / info pages — `src/pages/guide/[topic].astro` + `index.astro`.** Driven by `src/data/knowledge-base.json` via `src/utils/knowledge.ts` and a fixed `TOPIC_META` (12 topics). Blocks: breadcrumb, hero, optional `HowTo`, FAQ cards (with facts + sources), related-topics grid. JSON-LD: `Article` (+`citation`, `speakable`), optional `HowTo`, `FAQPage`, `BreadcrumbList`; `ogType="article"`. Also emits a `.md` variant via `guide/[topic].md.ts`. **Blog is a dead stub** (`articles.json` is `[]`).
- **Reviews.** `src/data/reviews.json` exists; reviews surface only inside `ReviewsBlock` (homepage) and per-company pages. **No aggregate `/otzyvy/` page or aggregate-reviews infra exists.**
- **Sitemap & SEO infra.** `@astrojs/sitemap` auto-includes any `src/pages/*.astro` route in `sitemap-index.xml` (6 chunks ≤1000 URLs). `serialize()` assigns priority by URL pattern (`/rabota-kurerom-`→0.7, `/guide/`→0.6, default 0.3). **Honest-content noindex:** `src/utils/listingSlugs.ts` (`getEmptyListingPaths`) → `scripts/emit-empty-listings.ts` writes `public/empty-listings.json` → sitemap `filter` drops them; the page sets `robots="noindex, follow"` when empty. **BaseLayout (`src/layouts/BaseLayout.astro`)** owns all `<title>`/meta/OG/Twitter/canonical/`robots` and emits the `@graph` JSON-LD; props include `title`, `description`, `schemaGraph`, `robots`, `ogType`, `articleSection`, `articlePublishedTime/ModifiedTime`. Schema builders in `src/utils/schema.ts`.
- **None of the 9 target routes exist** as files. The only collisions are conceptual: the existing `rabota-kurerom-peshkom` / `na-avto` / `na-velosipede` / `podrabotka` category pages overlap the new transport hubs (see Decision A).

## 8. Constraints

- **Honest content.** A new page gets `index, follow` only when it has real content/`vacancy_count > 0`; otherwise `noindex, follow`. Hubs must use the existing empty-listing mechanism.
- **Additive only.** Must not break or regress the existing ~6 000 pages. New templates are new files; shared-helper edits must be backward-compatible.
- **Astro static + GitHub Pages.** `output: 'static'`, `trailingSlash: 'always'`. Any new `src/pages/*.astro` is built and auto-sitemapped.
- **Reuse, don't rebuild.** Hubs should reuse `JobGrid` + `cityListingPage.ts` helpers; guides should reuse the `guide/` template's components & JSON-LD patterns. New bespoke utilities only where genuinely needed.
- **Core Web Vitals budget.** The site was recently slimmed; new templates must not regress CWV or build time.
- **i18n.** The site has a translation layer; new static copy should fit the existing i18n approach (or be explicitly scoped RU-only, consistent with current shell-UI).
- **No secrets, immutable data patterns, small focused files** (repo `CLAUDE.md` + global rules).

## 9. Key architectural decisions to resolve

The plan MUST take an explicit position on each (with rationale), or list it in Open Questions:

- **A — Transport hubs vs. existing category pages.** `rabota-kurerom-peshkom` / `na-avto` / `na-velosipede` / `podrabotka` already exist and target the same intent. New dedicated hubs (`/rabota-peshim-kurerom/` etc.) will cannibalize them. Options: (a) build new richer hubs + `canonical` the category pages to them; (b) 301-redirect/repurpose the category pages into the new slugs; (c) make hubs the content+aggregation page and keep category pages as thin facets pointing canonical→hub. Pick one; this is the highest-impact decision.
- **B — Info-guide routing.** The spec wants top-level URLs (`/skolko-zarabatyvaet-kurer/`), but a `guide/[topic]` system already exists. Options: (a) standalone top-level `.astro` page files reusing guide components; (b) extend the guide system to also emit chosen topics at top level; (c) put them under `/guide/`. Pick one.
- **C — `/otzyvy/` aggregate reviews.** No aggregate-reviews page/infra exists; `reviews.json` is available. Design how reviews are aggregated, grouped by brand, and what JSON-LD is safe (`Review`/`AggregateRating` only with real data).
- **D — Homepage optimization scope.** `/` is the highest-traffic page. Decide exactly which changes are in scope (title/H1/meta/interlinking) and how to keep risk minimal and reversible.

## 10. Success criteria

- All 9 work items shipped as additive Astro routes/edits; the existing ~6 000 pages unaffected; build green; CWV not regressed.
- Each new page passes honest-content: `index` only with real content.
- New URLs auto-appear in `sitemap-index.xml` with sensible priority; ready to hand off to the indexing campaign wave-by-wave.
- Reuse-first: hubs on `JobGrid` + `cityListingPage` helpers, guides on the `guide/` pattern; minimal net-new surface area.
- Tracked outcomes (post-launch, owned by `seo-promotion`): pages enter the index < 14 days; cluster impressions/clicks rise in GSC/Webmaster; GA4 `apply_click` conversion does not drop as info traffic grows.

## 11. Out-of-band notes (context only — not for competing-plan agents to design)

- Repo git state needs clarification before implementation (Phase D): the on-disk `/Users/ivan/kurieros` checkout is stale (`eca613a`); canonical `main` is `e391e08` on GitHub. Resolve before Phase B/D worktrees.
- Brand-data open question (§4) gates Wave 2 — escalate to the site owner.

---
id: B5
title: "Implement TransportHub.astro presentational component"
priority: P0
status: todo
dependencies: [B1, B4]
---

# Bead B5 — `TransportHub.astro` component

> A bead is self-contained: an agent must implement it WITHOUT reopening the plan.

## Outcome

One new file exists, compiles without TypeScript errors, and passes lint:

- `src/components/TransportHub.astro` — the hub body component, purely presentational, consumed by all 4 thin hub page files in bead B6.

**Prerequisites:** Beads B1 and B4 must be complete before implementing this bead.
- B1 (`src/utils/transportHubs.ts`) — provides `HubConfig`, and is the source of `config.filter.tag`, `config.incomeBlurb`, `config.requirementsBullets`, `config.key`.
- B4 (`src/components/HubCrossLinks.astro`) — provides `<HubCrossLinks>` rendered by this component.

## Design intent / rationale

All 4 transport hubs share an identical page structure. `TransportHub.astro` carries the full body HTML — the page files (bead B6) own data fetching, schema building, and the `<BaseLayout>` wrapper (so they, not this component, can set `robots="noindex, follow"` for empty hubs). This delegation keeps page files at 30–45 LOC each and keeps the component inspectable as a self-contained unit.

**Reuse mandate (plan §4.2 and §3.1):** The following existing components are imported and used as-is — do NOT reimplement them:
- `JobFilters.astro` — existing vacancy filter toolbar.
- `JobGrid.astro` — existing job listing grid with `revealable` support.
- `PartnerBanner.astro` — existing partner CTA banner.
- `buildFactCards` from `src/utils/cityListingPage.ts` — returns the 4 fact card objects (count, max salary, companies, …); pass the result to the fact-card DOM rendering loop.

**CSS:** Copy the `.listing-*` scoped-style vocabulary from `src/pages/[slug].astro`. These are CSS-variable-based, dark-mode-aware rules. They go into a `<style>` block in this component, not into a global CSS file. Add the comment `/* Styles copied from [slug].astro — hub listing variant. See plan §4.2. */` at the top of the style block to flag future cleanup.

**Funnel links (critical):** The income block must link to `/skolko-zarabatyvaet-kurer/` and the requirements block must link to `/kak-stat-kurerom/`. These inter-page funnels are a core SEO requirement — the build-output tests in B13 assert their presence.

**`#vacancies` anchor (critical):** The `<section>` wrapping `<JobGrid>` must have `id="vacancies"`. The hero CTA button targets `href="#vacancies"`. Build-output tests in B13 assert this anchor exists in every hub page HTML.

**Exact `JobGrid` props for hubs:** `<JobGrid initialTag={config.filter.tag} limit={24} revealable={true} />`. The `revealable={true}` enables the "show more" pattern identical to existing category listing pages.

## Acceptance criteria

- [ ] Component file exists at `src/components/TransportHub.astro`.
- [ ] Props interface declared as `{ config: HubConfig; filteredJobs: GeneratedJob[]; isEmpty: boolean; faqItems: FaqItem[]; companyNames: string[]; maxSalary: number }`.
  - `HubConfig` imported from `src/utils/transportHubs.ts`.
  - `FaqItem` imported from `src/utils/cityListingPage.ts`.
  - `GeneratedJob` imported from the same path used by existing listing pages (check `[slug].astro` for the correct import path — do not guess).
- [ ] Renders a 3-level breadcrumb DOM element: Главная → Форматы → {config.h1}. Breadcrumb item structure must match the schema `BreadcrumbList` in B1's `buildHubSchemaGraph`.
- [ ] Renders a hero section containing:
  - `<p class="listing-eyebrow">{config.eyebrow}</p>`
  - `<h1>{config.h1}</h1>`
  - Intro paragraph (can be a prop or derived from config; must be non-empty)
  - Primary CTA: `<a href="#vacancies">Смотреть вакансии</a>` (button-styled)
  - Secondary CTA: `<a href="/compare/">Сравнить форматы</a>`
- [ ] Renders 4 fact cards by calling `buildFactCards` from `src/utils/cityListingPage.ts` and iterating the result.
- [ ] Renders `<JobFilters />` (existing component; no props changes).
- [ ] Renders `<section id="vacancies">` containing `<JobGrid initialTag={config.filter.tag} limit={24} revealable={true} />`.
- [ ] When `isEmpty=true`: the section with `id="vacancies"` still renders (preserving the anchor target); the `<JobGrid>` is hidden or replaced by a visible placeholder message such as "Вакансии скоро появятся — проверьте позже."; the hero, FAQ, income, and requirements blocks render as normal.
- [ ] Renders income block: text from `config.incomeBlurb` + a link `href="/skolko-zarabatyvaet-kurer/"`.
- [ ] Renders requirements block: `<ul>` of `config.requirementsBullets` + a link `href="/kak-stat-kurerom/"`.
- [ ] Renders FAQ section iterating `faqItems` (each item: `{ question: string; answer: string }`). Rendered as `<dl>` or `<details>` list — match the visual pattern used in `[slug].astro`'s FAQ rendering.
- [ ] Renders `<HubCrossLinks current={config.key} />` (from bead B4).
- [ ] Renders `<PartnerBanner />` (existing component, no props).
- [ ] `<style>` block contains `.listing-*` scoped CSS copied from `src/pages/[slug].astro`, with the comment `/* Styles copied from [slug].astro — hub listing variant. See plan §4.2. */`.
- [ ] No new global CSS introduced — no edits to any `.css` file or global style block.
- [ ] `npm run typecheck` passes — 0 TypeScript errors.
- [ ] `npm run lint` passes.

## Edge cases

- `isEmpty=true` → `<section id="vacancies">` still present (hero CTA target exists); `<JobGrid>` conditionally hidden or replaced.
- `companyNames=[]` → fact card renders 0 companies — no crash, no `undefined` in output.
- `maxSalary=0` → pass the 0 to `buildFactCards` and render whatever it produces (match existing listing page behaviour — do not special-case it in this component).
- `faqItems=[]` → FAQ section renders as an empty block or is conditionally omitted; no crash.
- `config.requirementsBullets=[]` → requirements `<ul>` renders as empty or is omitted; no crash.
- `filteredJobs=[]` with `isEmpty=false` → this state should not occur in practice (isEmpty is derived from filteredJobs in page files), but the component must not crash if it does.

## Failure modes

- **`JobGrid` or `JobFilters` props interface has changed** — TypeScript error. Recovery: inspect `src/components/JobGrid.astro` and `src/components/JobFilters.astro` Props types before writing the call sites. Do not guess prop names.
- **`buildFactCards` return type or signature has changed** — TypeScript error. Recovery: inspect `src/utils/cityListingPage.ts::buildFactCards` signature before calling it.
- **`#vacancies` anchor absent** — B13 build-output test fails. Recovery: add `id="vacancies"` to the section wrapping `<JobGrid>`.
- **Income funnel link absent** — B13 build-output test fails. Recovery: add `href="/skolko-zarabatyvaet-kurer/"` to the income block.
- **`.listing-*` CSS copy diverges from `[slug].astro`** — acknowledged acceptable drift. The comment in the style block flags it. Future cleanup is optional follow-up.
- **`GeneratedJob` import path wrong** — TypeScript error. Recovery: grep for `GeneratedJob` in `src/pages/[slug].astro` or `src/utils/` to find the correct import path.

## Test obligations

**Unit:** No pure-function unit tests — this is a presentational Astro component with no exported functions. Type correctness is enforced by `npm run typecheck`.

**E2E (owned by bead B13 build-output assertions; this bead must be wired into B6 page files before B13 can run):**

- Every hub `dist/*/index.html` contains `id="jobs-grid"` (from `JobGrid`'s root element).
- Every hub `dist/*/index.html` contains `id="vacancies"` (from the section wrapper in this component).
- Every hub `dist/*/index.html` contains `class="job-card"` (rendered vacancy cards — proves `JobGrid` emitted real data).
- Every hub `dist/*/index.html` contains `href="/skolko-zarabatyvaet-kurer/"` (income funnel link).
- Every hub `dist/*/index.html` contains `href="/kak-stat-kurerom/"` (requirements funnel link).
- Every hub `dist/*/index.html` contains exactly one `<link rel="canonical">` (set by `BaseLayout` in the page file).

## Operational / admin hooks

None. Presentational component — no config flags, no observability, no migrations.

## Verification

Run in order:

```sh
npm run typecheck
npm run lint
```

Both must exit 0. Full build verification (rendered hub HTML assertions) is owned by bead B13 and requires the page files from bead B6 to be present.

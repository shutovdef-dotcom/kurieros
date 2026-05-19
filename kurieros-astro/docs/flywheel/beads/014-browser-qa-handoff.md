---
id: "014"
title: Browser QA + Rich Results + CWV spot-check + indexing hand-off manifest
priority: P1
status: todo
dependencies: ["013"]
---

# Bead 014 — Browser QA + Rich Results + CWV + indexing hand-off

> A bead is self-contained: an agent must implement it WITHOUT reopening the plan.

## Outcome

All 9 new/updated pages have been manually browser-tested against the QA checklist below.
A Rich Results Test has been run on one hub, one guide, and `/otzyvy/`. A CWV spot-check
confirms no regression on a hub and the homepage. An indexing hand-off manifest is
delivered to the `seo-promotion` skill detailing Wave 1 (hubs + homepage) and Wave 3
(guides + `/otzyvy/`).

B14 produces no new source files. It is a human-in-the-loop QA gate that must pass
before the branch is merged and indexing is requested.

## Design intent / rationale

**Why manual QA (plan §8.3):**
This repo's established practice is manual browser QA — no Playwright. The site is a
static SSG with no server-side state. The primary risk surfaces are rendering issues,
broken hrefs, and GA4 event misfires — all visible in Chrome DevTools Network and Console.

**Why Rich Results Test:**
The SEO rollout introduces new JSON-LD schema types (`FAQPage`, `Article`, `HowTo`,
`Organization`+`aggregateRating`) across 9 pages. A structured-data manual action from
Google would undo indexing gains across all existing pages. The Rich Results Test at
`https://search.google.com/test/rich-results` is the pre-submit safeguard.

**Why CWV spot-check:**
Decision D explicitly prohibits changes to LCP resources on the homepage. The 4 hubs
reuse `JobGrid revealable` (identical weight to existing listing pages). A spot-check
confirms the rollout does not regress CWV metrics the site has already optimised.

**Indexing hand-off (plan §10 final paragraph):**
The `seo-promotion` skill owns the mechanics of requesting indexing. B14 delivers the
manifest that skill needs:
- **Wave 1** (submit immediately on merge): 4 hub URLs + `/` (homepage).
- **Wave 3** (submit ~2-4 weeks after Wave 1): 3 guide URLs + `/otzyvy/`.

The 4 canonicalized category facets (`/rabota-kurerom-peshkom/` etc.) are already
indexed — their new `<link rel="canonical">` is picked up on the next crawl; no active
URL submission is needed for them.

## Acceptance criteria

- [ ] **Hub QA (all 4 hubs):** for each of `/rabota-peshim-kurerom/`,
      `/rabota-avtokurerom/`, `/rabota-velokurerom/`, `/podrabotka-kurerom/`:
  - [ ] Hero renders with the correct H1 (format-specific text).
  - [ ] Fact cards visible (vacancy count, max salary, company count, city count).
  - [ ] `JobFilters` renders; filtering by tag reloads the vacancy list.
  - [ ] `JobGrid` shows job cards; clicking a `JobCard` navigates to `/v/{slug}/`.
  - [ ] "Смотреть вакансии" CTA scrolls to the `#vacancies` anchor.
  - [ ] Income block links to `/skolko-zarabatyvaet-kurer/`.
  - [ ] Requirements block links to `/kak-stat-kurerom/`.
  - [ ] FAQ `<details>` items open and close.
  - [ ] `HubCrossLinks` links to the other 3 hubs.
  - [ ] `PartnerBanner` renders.
  - [ ] Dark mode: all text readable, no visible contrast failures.
  - [ ] No JavaScript console errors.
- [ ] **Income guide QA (`/skolko-zarabatyvaet-kurer/`):**
  - [ ] `IncomeCalculator` loads and the `calculator_submit` GA4 event fires (confirm in
        Network tab, filter `g/collect`).
  - [ ] Income table visible with real data rows.
  - [ ] Funnel `JobGrid` (limit 12) shows job cards; "Все вакансии" links to
        `/rabota-peshim-kurerom/`.
  - [ ] Breadcrumb visible: Главная > {section} > Сколько зарабатывает курьер.
  - [ ] Dark mode OK. No console errors.
- [ ] **Guide QA (`/kak-stat-kurerom/`, `/usloviya-raboty-kurerom/`):**
  - [ ] HowTo block visible on `/kak-stat-kurerom/`.
  - [ ] FAQ items present and functional on both guides.
  - [ ] Related guide grid links to the other guides.
  - [ ] Dark mode OK. No console errors.
- [ ] **`/otzyvy/` QA:**
  - [ ] 8 brand sections visible, each with star rating, review count, distribution bar.
  - [ ] At most 6 review cards per brand; all card text is escaped (no raw HTML visible).
  - [ ] Company CTA links ("Все вакансии → /companies/{slug}/") present for all 8 brands.
  - [ ] Honest-content disclaimer paragraph visible.
  - [ ] Dark mode: review-card text readable. No console errors.
- [ ] **Homepage QA:**
  - [ ] 4 transport-format links visible and navigate to the correct hub URLs (or fallback
        category slugs if any hub is empty).
  - [ ] Income-guide discovery card/entry visible and links to `/skolko-zarabatyvaet-kurer/`.
  - [ ] Browser tab `<title>` contains "курьер" and is <= 70 chars.
  - [ ] H1 leads with "Работа курьером".
  - [ ] Existing homepage functionality unchanged (city selector, geo-banner, `JobGrid`,
        `IncomeCalculator`, `ReviewsBlock`, `HomeFaq`, `PartnerBanner`).
  - [ ] Dark mode OK. No console errors.
- [ ] **`apply_click` not regressed:** open a hub, click a `JobCard`, confirm
      `apply_click` fires in the GA4 DebugView or Network tab.
- [ ] **Rich Results Test** (`https://search.google.com/test/rich-results`):
  - [ ] One transport hub (e.g. `/rabota-peshim-kurerom/`): `FAQPage` detected and valid;
        no errors or warnings.
  - [ ] One guide (e.g. `/skolko-zarabatyvaet-kurer/`): `Article` valid; `HowTo` valid if
        present; `FAQPage` valid.
  - [ ] `/otzyvy/`: no errors; per-brand `Organization` + `aggregateRating` valid;
        no page-level `AggregateRating` flagged by the tool.
  - [ ] Screenshots or "Detected items" summary pasted into the PR description as evidence.
- [ ] **CWV spot-check** (Chrome DevTools Lighthouse, Mobile preset, Performance only):
  - [ ] One transport hub: LCP < 2.5 s; CLS < 0.1; INP < 200 ms.
  - [ ] Homepage: LCP not regressed vs. pre-rollout baseline (accept ±200 ms tolerance).
  - [ ] Lighthouse scores pasted into the PR description.
- [ ] **Indexing hand-off manifest** delivered to the `seo-promotion` skill (see
      Operational hooks for the exact manifest text).

## Edge cases

- **Hub with no vacancies (noindex):** skip `JobGrid`/`JobCard` QA steps for that hub;
  confirm `<meta name="robots" content="noindex, follow">` is present in `<head>`;
  confirm the hub URL is absent from the sitemap (open `/sitemap-0.xml` in the browser).
  Do not mark the hub's QA checklist items as failures — mark them N/A with a note.
- **`/otzyvy/` in dark mode:** `pros`/`cons` text may have low contrast. Verify each
  brand section explicitly in dark mode.
- **CWV baseline not recorded:** if no pre-rollout Lighthouse report exists, record the
  post-rollout scores as the new baseline and note this in the PR.
- **Rich Results Test requires public URL:** if the branch is only on localhost, use a
  preview deployment URL (Netlify/Vercel draft) or the URL Inspection "Code URL" upload
  in Google Search Console.
- **GA4 DebugView not available:** use the Network tab and filter requests to
  `collect?v=2` or `g/collect` to confirm events fire.

## Failure modes

- **JSON-LD errors in Rich Results Test:** trace the error to the schema node; fix in
  the offending bead (`transportHubs.ts` / B1, `infoGuides.ts` / B3, or
  `reviewsAggregate.ts` / B2); re-run B13 before re-testing. Do not fix schema in the
  page file directly.
- **CWV regression on a hub:** Decision D prohibits new JS. If a hub regresses, the
  culprit is likely in `TransportHub.astro` (B5) or `HubCrossLinks.astro` (B4). Fix
  there; do not alter the homepage or existing listing pages.
- **Console error on `/otzyvy/`:** likely a `null`-dereference on `summary.companyHref`.
  Check `ReviewsAggregate.astro` (B11) for missing optional-chaining. Fix in B11.
- **`apply_click` missing:** the handler is in the existing `JobCard.astro` / vacancy-
  detail scripts — B14 does not modify them. If missing, root cause is in B5/B6. Fix
  there; re-run B13 verification before re-QAing.
- **Indexing hand-off blocked by un-merged branch:** note the expected merge date and the
  preview URL in the manifest. The `seo-promotion` skill can prepare submissions while
  waiting.

## Test obligations

- **Unit:** none. B14 is a manual QA gate.
- **E2E (manual, documented):** the acceptance criteria checklist above IS the E2E test
  plan. Each checkbox must be checked by a human before the bead is marked complete.
- **Evidence required in PR:**
  1. Rich Results Test screenshots or "Detected items" list for hub + guide + `/otzyvy/`.
  2. Lighthouse Performance score card for one hub and the homepage.
  3. Network-tab screenshot showing `apply_click` event firing from a hub `JobCard`.

## Operational / admin hooks

**Indexing hand-off manifest for `seo-promotion` skill.**

Invoke the `seo-promotion` skill with the following after the branch is merged:

```
=== SEO Rollout Indexing Hand-off — kurerok.ru ===

Wave 1 — Submit immediately on merge (4 hubs + homepage):
  https://kurerok.ru/rabota-peshim-kurerom/
  https://kurerok.ru/rabota-avtokurerom/
  https://kurerok.ru/rabota-velokurerom/
  https://kurerok.ru/podrabotka-kurerom/
  https://kurerok.ru/

Canonicalized category pages (no active submission needed — picked up on next crawl):
  /rabota-kurerom-peshkom/        → canonical: /rabota-peshim-kurerom/
  /rabota-kurerom-na-avto/        → canonical: /rabota-avtokurerom/
  /rabota-kurerom-na-velosipede/  → canonical: /rabota-velokurerom/
  /rabota-kurerom-podrabotka/     → canonical: /podrabotka-kurerom/

Wave 3 — Submit ~2-4 weeks after Wave 1 (info-guides + reviews):
  https://kurerok.ru/skolko-zarabatyvaet-kurer/
  https://kurerok.ru/kak-stat-kurerom/
  https://kurerok.ru/usloviya-raboty-kurerom/
  https://kurerok.ru/otzyvy/

  Note: hold /otzyvy/ from Wave 3 submission pending OQ#4 (reviews provenance)
  owner confirmation if still unresolved at Wave 3 time.

Sitemap priorities (already set in astro.config.mjs by B7):
  Hubs: 0.8 | Guides: 0.7 | /otzyvy/: 0.6

Success metrics:
  - Index < 14 days per URL.
  - Cluster clicks rise within 60 days.
  - apply_click rate (~27%) must not regress.
```

**Open Question #4 escalation:** if OQ#4 (reviews provenance) is unresolved at Wave 3
time, hold `/otzyvy/` from the submission list and escalate to the owner before submitting.

**Open Question #7 follow-up:** the new guides lack `.md` LLM-mirror variants (unlike the
12 KB topics that have `guide/[topic].md.ts` mirrors). Flag as a post-launch consistency
gap in the PR; it does not block the indexing hand-off.

**`public/llms.txt`:** if the file is maintained manually, add the 8 new route URLs to it
after the branch is merged. If it is generated, locate the generator script and determine
whether it auto-includes top-level routes.

## Verification

B14 has no automated verification commands. The acceptance gate is the completed QA
checklist above and the delivered indexing manifest.

**Rich Results Test:** `https://search.google.com/test/rich-results`

**CWV spot-check:** Chrome DevTools > Lighthouse tab > Mobile > Performance only.

**GA4 `apply_click`:** Network tab > filter `g/collect` > click a `JobCard` on any hub.

**Final merge gate (last automated check before merge):**
```bash
npm run build && npm test && npm run typecheck && npm run lint
```
All four commands must pass before the branch is merged and Wave 1 indexing is submitted.

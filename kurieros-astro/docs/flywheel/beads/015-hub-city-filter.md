---
id: "015"
title: Hub city filter — client-side, hash-synced (Decision H)
priority: P1
status: todo
dependencies: ["006"]
---

# Bead 015 — Hub city filter

> A bead is self-contained: an agent must implement it WITHOUT reopening the plan.

## Outcome

Each of the 4 transport hubs (`/rabota-peshim-kurerom/`, `/rabota-avtokurerom/`,
`/rabota-velokurerom/`, `/podrabotka-kurerom/`) renders a city `<select>` above the
`JobGrid`. Choosing a city filters the visible job cards to that city; choosing
"Все города" restores the full list. The selection is reflected in the URL hash
(`#city=<slug>`) and persisted in `localStorage` so it is shareable and survives
navigation. No new routes, no SEO surface.

## Design intent / rationale

**Decision H (plan §12.3).** A searcher landing on a transport hub almost always wants
their own city, not all 925. The filter is client-side because the hub is a static page.

**Reuse the existing filter engine.** `JobGrid.astro`'s inline script already has a
correct `filterJobs()` that matches cards by `selectedCity` against `card.dataset.location`
using exact, comma-split, `normalizeCityKey`-normalised semantics (the M1 "Дно ≠ Видное"
substring bug is already fixed there). `JobCard` already emits `data-location`. So B15
does NOT invent a new matching path — it feeds the existing one.

**The overflow-template problem.** A hub renders `<JobGrid limit={24} revealable>` — 24
cards live, the rest stashed in an inert `<template class="jobs-grid-overflow">`.
`filterJobs()` only sees live `.job-card`s, so a naive city filter would miss jobs buried
in the template. Fix: on the FIRST city-filter interaction, materialise the whole overflow
template into the grid (one-time), then every filter call is plain show/hide. The
materialise happens only on an explicit user action — initial load stays light (LCP /
Decision D unaffected).

**Additive JobGrid change only.** The new behaviour is ONE new event listener
(`kurieros:hub-city-filter`) added to `JobGrid.astro`'s inline script. The existing
`kurieros:city-selected` path (homepage / city pages — fetches `/api/grid/{slug}/`) is
NOT touched, so those surfaces carry zero risk.

**Hash, not query (Decision H).** `history.replaceState(null, '', '#city=<slug>')` —
engines never read the fragment, so zero crawl-budget leak and zero GA4 noise; the hub
canonical stays the bare URL. State priority on load: **URL hash > `localStorage` > "Все
города"**.

## Acceptance criteria

- [ ] `transportHubs.ts` exports `extractHubCities(jobs: GeneratedJob[]): {name: string;
      slug: string; count: number}[]` — unique cities across the hub's jobs (splitting
      comma-joined `location`, dropping "Вся Россия"), sorted by `count` desc then name.
- [ ] `TransportHub.astro` renders a `<select id="hub-city-filter" aria-label="Город">`
      with a first `<option value="">Все города</option>` then one option per
      `extractHubCities` entry (`value` = city slug, label = `name` + ` (count)`).
- [ ] The `<select>` is NOT rendered when `isEmpty` (noindex hub).
- [ ] Selecting a city: dispatches `kurieros:hub-city-filter` with `detail.city`;
      writes `#city=<slug>` via `history.replaceState`; writes the homepage-shared
      `localStorage` city key.
- [ ] On load: if `location.hash` has `#city=<slug>` resolvable to a hub city, that city
      is pre-selected and applied; else if the `localStorage` city key matches a hub
      city, that is applied; else "Все города".
- [ ] `JobGrid.astro` gains ONE additive `kurieros:hub-city-filter` listener: it
      materialises the overflow `<template>` into the grid (once), sets the script's
      `selectedCity`, and calls the existing `filterJobs()`. The existing
      `kurieros:city-selected` listener is unchanged.
- [ ] The 4 hub page files pass `cities={extractHubCities(filteredJobs)}` to
      `<TransportHub>`.
- [ ] Dark mode: the `<select>` reuses the `.job-filter-select` look (contrast ≥ 4.5:1).
- [ ] `JobCard.astro` is NOT modified — `data-location` already exists.
- [ ] Canonical, robots, JSON-LD of the hub pages are unchanged.

## Edge cases

- **Empty hub** → no `<select>` rendered (criterion above); the hub is already noindex.
- **`#city=` with an unknown slug** → ignored; falls through to localStorage/default.
- **"Вся Россия" jobs** → always pass the city filter (existing `isNationwide` branch in
  `filterJobs()`) — correct: nationwide jobs are relevant to every city.
- **Materialise cost** → a large hub (e.g. ~1900 foot jobs) makes ~1900 cards live on the
  first city-filter. Acceptable: one-time, post-interaction, `display:none` keeps paint
  bounded. Initial page load is unaffected (still `limit=24`).
- **`localStorage` unavailable** (Safari private mode) → wrap in try/catch; fall back to
  hash/default; never throw.
- **City `<select>` + the 4 `JobFilters` dropdowns** compose: both route through the same
  `filterJobs()`, which already ANDs city with age/transport/employment/citizenship.

## Failure modes

- **Hub city filter shows an empty grid** → the user picked a city; `filterJobs()` with
  zero matches and no active dropdown hides all cards. Mitigation: `extractHubCities` only
  lists cities that have jobs, so the dropdown can't select a 0-job city; a bogus hash is
  ignored. Acceptable.
- **`kurieros:hub-city-filter` fires before `DOMContentLoaded`** → the listener is
  registered inside JobGrid's `DOMContentLoaded` handler; the hub script must dispatch the
  initial (hash/localStorage) filter AFTER `DOMContentLoaded` too. Both run on the same
  event — order is guaranteed by registration order; if flaky, the hub re-dispatches on a
  microtask.
- **Existing homepage/city-page city swap regressed** → it must not be. `kurieros:city-
  selected` is untouched; a build-output + manual check confirms `/` and a city page still
  hot-swap.

## Test obligations

- **Unit (`tests/transportHubs.test.ts`):** `extractHubCities` — dedups comma-joined
  locations, drops "Вся Россия", sorts by count desc, returns `slug` matching
  `normalizeCityKey`-style slugging; empty input → `[]`.
- **Build-output (`tests/seo-rollout-build.test.ts`):** each of the 4 non-empty hubs'
  `dist/**/index.html` contains `<select id="hub-city-filter"` with ≥ 2 `<option>`s; an
  empty-hub fixture has none.
- **E2E (manual, documented in PR):** on a hub preview — pick a city, grid narrows;
  reload with `#city=<slug>`, filter is applied; pick "Все города", full list restored;
  dark mode; no console errors; homepage city switch still works.

## Operational / admin hooks

None. No config, no flags, no migration. The `localStorage` city key MUST be the exact
key the homepage already uses (read `HomeGeoBanner` / `index.astro` to confirm the key
name before writing) — otherwise the cross-page sync silently no-ops.

## Verification

```bash
npm run build && npm test && npm run typecheck && npm run lint
```

All green. Plus the manual hub QA above and a regression check that `/` and one city page
still city-swap.

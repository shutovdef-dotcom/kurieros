# SEO Rollout — Indexing Hand-off Manifest

**Bead:** B14 (`beads/014-browser-qa-handoff.md`)
**Branch:** `claude/seo-rollout`
**Prepared:** 2026-05-19
**Consumed by:** the `seo-promotion` skill — invoke **only after** this branch is merged to
`main` and the change is live on `https://kurerok.ru`.

---

## 1. Hand-off manifest

Paste the block below into the `seo-promotion` skill once the branch is merged and deployed.

```
=== SEO Rollout Indexing Hand-off — kurerok.ru ===

Wave 1 — Submit immediately on merge (4 hubs + homepage):
  https://kurerok.ru/rabota-peshim-kurerom/
  https://kurerok.ru/rabota-avtokurerom/
  https://kurerok.ru/rabota-velokurerom/
  https://kurerok.ru/podrabotka-kurerom/
  https://kurerok.ru/

Canonicalized category pages (no active submission needed — picked up on next crawl):
  /rabota-kurerom-peshkom/        -> canonical: /rabota-peshim-kurerom/
  /rabota-kurerom-na-avto/        -> canonical: /rabota-avtokurerom/
  /rabota-kurerom-na-velosipede/  -> canonical: /rabota-velokurerom/
  /rabota-kurerom-podrabotka/     -> canonical: /podrabotka-kurerom/

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

---

## 2. What shipped (9 pages)

| URL | Type | New / updated | Indexing wave |
|---|---|---|---|
| `/rabota-peshim-kurerom/` | Transport hub | New | Wave 1 |
| `/rabota-avtokurerom/` | Transport hub | New | Wave 1 |
| `/rabota-velokurerom/` | Transport hub | New | Wave 1 |
| `/podrabotka-kurerom/` | Transport hub | New | Wave 1 |
| `/` (homepage) | Homepage | Updated (title, H1, interlinks) | Wave 1 |
| `/skolko-zarabatyvaet-kurer/` | Info guide | New | Wave 3 |
| `/kak-stat-kurerom/` | Info guide | New | Wave 3 |
| `/usloviya-raboty-kurerom/` | Info guide | New | Wave 3 |
| `/otzyvy/` | Reviews aggregate | New | Wave 3 (hold — see §5) |

The 4 pre-existing category facets (`/rabota-kurerom-peshkom/` etc.) gained a
`<link rel="canonical">` to the matching new hub (Decision A). They stay indexable; Google
de-dupes them on the next crawl — no active URL submission needed.

---

## 3. QA evidence

### 3.1 Final merge gate — all green (2026-05-19)

| Check | Result |
|---|---|
| `npm run build` | 6758 pages, no errors |
| `npm test` | 502 passed, 4 skipped (28 files) |
| `npm run typecheck` | 0 errors, 0 warnings, 9 hints |
| `npm run lint` | clean |

### 3.2 Structured-data validation (offline)

The Google Rich Results Test needs a public URL; this branch is localhost-only, so JSON-LD
was validated structurally against the built `dist/` output instead. All 9 pages: exactly
one `<script type="application/ld+json">` block, parses cleanly, sits before `</html>`.

| Page | JSON-LD `@type` graph |
|---|---|
| 4 hubs | `WebSite, CollectionPage, ItemList, FAQPage, BreadcrumbList` |
| `/skolko-zarabatyvaet-kurer/` | `WebSite, Article, FAQPage, BreadcrumbList` |
| `/kak-stat-kurerom/` | `WebSite, Article, HowTo, FAQPage, BreadcrumbList` |
| `/usloviya-raboty-kurerom/` | `WebSite, Article, FAQPage, BreadcrumbList` |
| `/otzyvy/` | `WebSite, CollectionPage (mainEntity=ItemList), Organization x8` |
| `/` (homepage) | `WebSite, CollectionPage, Organization, FAQPage` |

`/otzyvy/` Decision C confirmed: the 8 brand `Organization` nodes each carry an
`aggregateRating`; the `CollectionPage` node has **no** `aggregateRating`, and there is **no**
standalone page-level `AggregateRating` node.

### 3.3 Browser QA

All 9 pages rendered and fetch-checked in the local preview (port 4327): correct H1s, dark
mode readable, single `#vacancies` anchor per hub, FAQ accordions functional, homepage
existing functionality intact. No JavaScript console errors observed.

---

## 4. Pre-merge action items (owner / `seo-promotion`)

These two checks in bead B14 require resources unavailable to a localhost-only branch.
Run them on the deployed preview or production URL **before** submitting Wave 1 for indexing:

- [ ] **Rich Results Test** (`https://search.google.com/test/rich-results`) — run on one hub,
      one guide and `/otzyvy/`. Expectation: `FAQPage` / `Article` / `HowTo` valid; `/otzyvy/`
      shows per-brand `Organization` + `aggregateRating` with no page-level rating flagged.
      Offline structural validation (§3.2) already passed — this is the public-URL confirmation.
- [ ] **Lighthouse CWV spot-check** (Chrome DevTools -> Lighthouse -> Mobile -> Performance) on
      one hub and the homepage. Architectural guarantee: Decision D adds no new JS to the
      homepage, and the hubs reuse the existing `JobGrid` (identical weight to current listing
      pages), so no CWV regression is expected. Record the scores as the new baseline.

Both are non-blocking for the *code* merge but **are** gates before Wave 1 indexing submission.

---

## 5. Follow-ups (non-blocking)

- **OQ#4 — reviews provenance.** `/otzyvy/` currently aggregates synthetic reviews. Hold
  `/otzyvy/` from Wave 3 indexing submission, and from the `llms.txt` listing, until the
  owner confirms provenance (real user-review submission is a separate work-stream —
  see `review-feature-design.md`).
- **OQ#7 — LLM mirrors.** The 3 new guides have no `.md` mirror variant (unlike the 12 KB
  topics with `guide/[topic].md.ts`). Post-launch consistency gap; does not block indexing.
- **`public/llms.txt`.** Updated in this branch: the 4 transport-format links now point at
  the canonical hub URLs, and a "Гиды для курьеров" section lists the 3 new guides.
  `/otzyvy/` was intentionally left out pending OQ#4 — add it when OQ#4 resolves.
  `public/llms-full.txt` is KB-generated (`scripts/generate-llms.mjs`) and needs no change.

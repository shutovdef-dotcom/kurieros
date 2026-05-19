---
id: "010"
title: "Conditions guide /usloviya-raboty-kurerom/ — content + page"
priority: P2
status: todo
dependencies: ["003", "004"]
---

# Bead 010 — Conditions guide `/usloviya-raboty-kurerom/`

> A bead is self-contained: an agent must implement it WITHOUT reopening the plan.

## Outcome

Two things exist when this bead is done:

1. The `INFO_GUIDES` registry in `src/utils/infoGuides.ts` (skeleton created in B3) has a fully authored entry for the conditions guide: prose sections with >=300 words total body content, non-empty FAQ (>=2 items), no `howTo`, no `showCalculator`.
2. `src/pages/usloviya-raboty-kurerom.astro` exists and renders at `/usloviya-raboty-kurerom/`. It is a pure editorial prose/FAQ page — the simplest guide shape, with no calculator and no HowTo step-list. The page is fully indexable.

## Design intent / rationale

**Standalone top-level page, not under `/guide/`.** Decision B: keyword-exact URL `/usloviya-raboty-kurerom/` is required. All 3 competing plans converged. The `guide/[topic].astro` router is a rigid FAQ-card renderer — wrong shape for long-form editorial guides.

**Simplest guide shape among the 3 guides.** Unlike B8 (income calculator + funnel JobGrid) and B9 (HowTo step-list), the conditions guide is pure editorial prose: working conditions, schedule formats, equipment requirements, pay frequency, legal basics. No calculator embed, no `HowTo` schema node. This makes it the most straightforward bead to implement — thin page + content entry only.

**Thin page file — ~35 LOC.** Data and schema in `src/utils/infoGuides.ts`; chrome in `<InfoGuideLayout>` (B4). The page picks the guide config, calls `buildGuideSchemaGraph`, renders `<InfoGuideLayout>` + bespoke body. The bespoke body is prose sections + FAQ — no special components needed beyond what B4 provides.

**KB topics for content sourcing.** Editorial prose is informed by KB topics `'график'`, `'требования'`, `'транспорт'` (via `getItemsByTopic`). These provide sourced, fact-checked facts blocks and `citation` JSON-LD. The prose itself is human-authored.

**Schema nodes: `Article` + `FAQPage` + `BreadcrumbList`.** `buildGuideSchemaGraph` emits exactly these three (all in one `@graph`). No `HowTo` node — the conditions guide is not a step-by-step process. The unit test asserts absence of `HowTo`.

**`Article` dates from config.** `publishedDate` and `modifiedDate` must be real authoring dates — not the KB `generated: "2026-04-26"` date.

**Internal CTA.** The page body must include at least one CTA/link to a transport hub (e.g. `/rabota-peshim-kurerom/`) so readers funnel from conditions research to vacancies. Inline prose link or a closing CTA block — no full `<JobGrid>` needed for this guide.

**GATED on Open Question #2.** Human-authored editorial copy (conditions, schedule formats, equipment requirements) must be available. Do not start until OQ#2 is resolved. The unit test word-count guard (>=300 words) fails loudly on placeholder content.

**P2 priority.** This is the lowest-priority guide (demand: 25 945/mo). If OQ#2 resolves late, B10 may be deferred after B8 (P0) and B9 (P1) land. The bead is self-contained; deferral does not affect other beads.

## Acceptance criteria

- [ ] `src/utils/infoGuides.ts` `INFO_GUIDES` has an entry for `usloviya-raboty-kurerom`.
- [ ] `sections.length >= 2` with real prose content (no placeholder text).
- [ ] Total word count across all sections >= 300 words (enforced by `tests/infoGuides.test.ts`).
- [ ] `faqItems.length >= 2`.
- [ ] `howTo` is absent or `undefined` in the entry.
- [ ] `showCalculator` is absent or `false` in the entry.
- [ ] `publishedDate` and `modifiedDate` are real ISO 8601 date strings (not the KB `generated` date).
- [ ] `src/pages/usloviya-raboty-kurerom.astro` exists and is <=50 LOC.
- [ ] Page imports guide config from `src/utils/infoGuides.ts` and calls `buildGuideSchemaGraph`.
- [ ] `<InfoGuideLayout>` receives `seoTitle`, `metaDescription`, `ogType='article'`, `articlePublishedTime`, `articleModifiedTime`.
- [ ] No `<IncomeCalculator/>` in the page body.
- [ ] No unconditional `<HowToBlock>` call (either absent or guarded by `cfg.howTo`, which is `undefined`).
- [ ] At least one internal CTA link to a transport hub URL with trailing slash.
- [ ] `npm run build` completes; `dist/usloviya-raboty-kurerom/index.html` is emitted.
- [ ] The emitted HTML has no `noindex` meta.
- [ ] Exactly one `<script type="application/ld+json">` in the page; it parses as valid JSON containing `Article` and `FAQPage` nodes but NO `HowTo` node.
- [ ] JSON-LD has no unescaped `</script>` sequence.
- [ ] `npm run typecheck` passes with zero new errors.
- [ ] `npm run lint` passes.
- [ ] `npx vitest run tests/infoGuides.test.ts` passes.

## Edge cases

- **OQ#2 not yet answered.** Do not start. Word-count guard fails loudly.
- **`HowTo` node accidentally emitted.** If the page file imports `<HowToBlock>` without a `cfg.howTo` guard, or if `buildGuideSchemaGraph` defaults to adding a `HowTo` for all entries, the build-output test will fail. Verify `config.howTo` is `undefined` and `buildGuideSchemaGraph` honours it.
- **`showCalculator` accidentally set to `true`.** Unit test asserts `showCalculator` is falsy. Fix the config entry.
- **`Article.headline` cap.** `buildGuideSchemaGraph` caps `headline` at 110 chars. Verify in the built JSON-LD.
- **`relatedGuideSlugs` cross-links.** If the config entry sets `relatedGuideSlugs`, the unit test asserts they resolve to real slugs in `INFO_GUIDES` (B8 and B9 entries must exist first, or this bead must omit `relatedGuideSlugs` until they do).
- **P2 deferral.** If OQ#2 resolves after B8 and B9 are already shipped, B10 can be added in a follow-up commit with no coordination cost — it is fully self-contained.

## Failure modes

- **Word-count guard fails** — placeholder content committed. `npx vitest run` fails clearly. Recovery: author real content.
- **`HowTo` node in JSON-LD** — `buildGuideSchemaGraph` incorrectly adds it. Detection: parse JSON-LD from built HTML and check for `HowTo` type. Recovery: ensure `config.howTo` is `undefined` for this entry and `buildGuideSchemaGraph` does not default-add `HowTo`.
- **`InfoGuideLayout` prop mismatch** — TypeScript error on `npm run typecheck`. Recovery: check `src/components/InfoGuideLayout.astro` Props interface (from B4) and align.
- **Missing hub CTA** — build-output test fails (at least one hub link required). Recovery: add a closing CTA block linking to e.g. `/rabota-peshim-kurerom/`.
- **`Article` missing `author`/`publisher`/`datePublished`** — `buildGuideSchemaGraph` contract from B3. If B3 omitted them, fix B3 first.

## Test obligations

- **Unit (in `tests/infoGuides.test.ts`, extend for this entry):**
  - Entry exists in `INFO_GUIDES` for `usloviya-raboty-kurerom`.
  - `sections.length >= 2`, total word count >= 300.
  - `faqItems.length >= 2`.
  - `howTo` is `undefined`.
  - `showCalculator` is falsy.
  - `buildGuideSchemaGraph` for this entry: no `HowTo` node in `@graph`, has `Article` (with `datePublished`, `dateModified`, `author`, `publisher`), has `FAQPage`.
  - `Article.headline` <= 110 chars.
  - `publishedDate` and `modifiedDate` match ISO 8601 format.
  - If `relatedGuideSlugs` is set, each value is a key in `INFO_GUIDES`.

- **Build-output (in `seo-rollout-build.test.ts`, added by B13):**
  - `dist/usloviya-raboty-kurerom/index.html` exists.
  - No `noindex` in HTML.
  - JSON-LD parses and contains `Article` and `FAQPage` nodes.
  - No `HowTo` node in JSON-LD.
  - Exactly one `<script type="application/ld+json">`.
  - JSON-LD has no unescaped `</script>`.
  - HTML contains at least one link to a transport hub URL.

## Operational / admin hooks

- **GATED on Open Question #2 (editorial content authoring).** Do not start until human-authored guide prose is available. `tests/infoGuides.test.ts` enforces this at CI level.
- **Wave assignment:** `/usloviya-raboty-kurerom/` is in the Wave 3 indexing submission batch (P2, lowest priority of the 3 guides, submitted after `/skolko-zarabatyvaet-kurer/` and `/kak-stat-kurerom/`).
- No env vars, no migrations. Purely additive.

## Verification

```bash
# From worktree root: /tmp/kurerok-seo-rollout/kurieros-astro

# Must pass before build
npx vitest run tests/infoGuides.test.ts

npm run build

ls dist/usloviya-raboty-kurerom/index.html

# No noindex
grep 'noindex' dist/usloviya-raboty-kurerom/index.html  # must return nothing

# Exactly one JSON-LD script
grep -c 'application/ld+json' dist/usloviya-raboty-kurerom/index.html  # expect 1

# JSON-LD valid: Article + FAQPage, no HowTo
node -e "
  const fs = require('fs');
  const html = fs.readFileSync('dist/usloviya-raboty-kurerom/index.html', 'utf8');
  const m = html.match(/<script type=\"application\/ld\+json\">([\s\S]*?)<\/script>/);
  if (!m) throw new Error('No JSON-LD');
  const graph = (JSON.parse(m[1]))['@graph'] || [];
  if (graph.find(n => n['@type'] === 'HowTo')) throw new Error('Unexpected HowTo node');
  if (!graph.find(n => n['@type'] === 'Article')) throw new Error('No Article node');
  if (!graph.find(n => n['@type'] === 'FAQPage')) throw new Error('No FAQPage node');
  console.log('JSON-LD OK: Article + FAQPage, no HowTo');
"

# Hub CTA present
grep 'rabota.*kurerom' dist/usloviya-raboty-kurerom/index.html

npm run typecheck
npm run lint
npx vitest run
```

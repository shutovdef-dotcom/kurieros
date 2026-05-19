---
id: "009"
title: "How-to guide /kak-stat-kurerom/ — content + page (incl. HowTo schema)"
priority: P1
status: todo
dependencies: ["003", "004"]
---

# Bead 009 — How-to guide `/kak-stat-kurerom/`

> A bead is self-contained: an agent must implement it WITHOUT reopening the plan.

## Outcome

Two things exist when this bead is done:

1. The `INFO_GUIDES` registry in `src/utils/infoGuides.ts` (skeleton created in B3) has a fully authored entry for the how-to guide: prose sections with >=300 words total body content, non-empty FAQ (>=2 items), and a populated `howTo` field (>=3 steps for the `HowTo` JSON-LD node).
2. `src/pages/kak-stat-kurerom.astro` exists and renders at `/kak-stat-kurerom/`. The page body composes the `<HowToBlock>` component (extracted by B4) which renders both the step-list markup and the `HowTo` JSON-LD node. The page is fully indexable.

## Design intent / rationale

**Standalone top-level page, not under `/guide/`.** Decision B: keyword-exact URL `/kak-stat-kurerom/` is required. All 3 competing plans converged. The `guide/[topic].astro` router is a rigid FAQ-card renderer — wrong shape for a long-form step-by-step guide. Precedent: `calculator.astro`, `compare.astro` are also bespoke top-level pages.

**Thin page file — ~40 LOC.** Data and schema in `src/utils/infoGuides.ts`; chrome in `<InfoGuideLayout>` (B4). The page file picks the guide config, calls `buildGuideSchemaGraph`, renders `<InfoGuideLayout>` + bespoke body.

**`HowToBlock` component (extracted in B4).** In `guide/[topic].astro` the HowTo glue is inline page code, not a component. B4 extracts a `<HowToBlock>` component that encapsulates both the step-list `<ol>` markup and the `HowTo` JSON-LD node. This bead composes it:
```astro
{cfg.howTo && <HowToBlock steps={cfg.howTo.steps} name={cfg.howTo.name} />}
```
The `HowTo` JSON-LD node is emitted ONLY when `config.howTo` is set — never an empty `HowTo`.

**`howTo` config field structure.** `InfoGuideConfig.howTo` (defined in B3) must contain:
- `name` — the HowTo title string (e.g. "Как стать курьером: пошаговая инструкция").
- `steps` — array of `{ name: string; text: string }` — each step's headline and body. Minimum 3 steps.

**No `showCalculator`.** This is a step-by-step guide, not an income guide. `showCalculator` must be absent or `false`.

**KB topics for content sourcing.** Editorial prose is sourced from KB topics `'оформление'`, `'документы'`, `'возраст'` (via `getItemsByTopic`). These provide sourced, fact-checked facts blocks and `citation` JSON-LD. The prose itself is human-authored.

**`Article` dates from config.** `publishedDate` and `modifiedDate` must be real authoring dates in the config entry — not the KB `generated: "2026-04-26"` date.

**Schema emission — single `@graph`.** `buildGuideSchemaGraph` aggregates all nodes (`Article`, `HowTo`, `FAQPage`, `BreadcrumbList`) into one `@graph` array emitted by `<InfoGuideLayout>`. `<HowToBlock>` must NOT emit its own separate `<script type="application/ld+json">` if the `HowTo` node is already in the `@graph`. Coordinate with B3/B4 to confirm the emission strategy before implementing.

**GATED on Open Question #2.** Human-authored editorial copy (step-by-step instructions, requirements, tips) must be available. Do not start until OQ#2 is resolved. The unit test word-count guard (>=300 words) and the HowTo steps check fail loudly on placeholder content.

## Acceptance criteria

- [ ] `src/utils/infoGuides.ts` `INFO_GUIDES` has an entry for `kak-stat-kurerom`.
- [ ] `sections.length >= 2` with real prose content.
- [ ] Total word count >= 300 words (enforced by `tests/infoGuides.test.ts`).
- [ ] `faqItems.length >= 2`.
- [ ] `howTo` is set: `howTo.steps.length >= 3`; each step has non-empty `name` and `text`.
- [ ] `showCalculator` is absent or `false`.
- [ ] `publishedDate` and `modifiedDate` are real ISO 8601 date strings.
- [ ] `src/pages/kak-stat-kurerom.astro` exists and is <=50 LOC.
- [ ] Page imports guide config from `src/utils/infoGuides.ts` and calls `buildGuideSchemaGraph`.
- [ ] `<InfoGuideLayout>` receives `seoTitle`, `metaDescription`, `ogType='article'`, `articlePublishedTime`, `articleModifiedTime`.
- [ ] Page body renders `<HowToBlock>` (guarded by `cfg.howTo`).
- [ ] `npm run build` completes; `dist/kak-stat-kurerom/index.html` is emitted.
- [ ] The emitted HTML has no `noindex` meta.
- [ ] Exactly one `<script type="application/ld+json">` in the page; it parses as valid JSON containing `Article`, `HowTo`, and `FAQPage` nodes.
- [ ] `HowTo` `step` array in the JSON-LD has >=3 entries.
- [ ] JSON-LD has no unescaped `</script>` sequence.
- [ ] `npm run typecheck` passes with zero new errors.
- [ ] `npm run lint` passes.
- [ ] `npx vitest run tests/infoGuides.test.ts` passes.

## Edge cases

- **OQ#2 not yet answered.** Do not start. Word-count and HowTo steps guards fail loudly.
- **B4 not yet done.** `<HowToBlock>` component does not exist → build error. Resolve B4 first (B9 depends on B4).
- **`cfg.howTo` is `undefined` on other guides.** The `{cfg.howTo && <HowToBlock .../>}` guard ensures B8's and B10's page files don't accidentally try to render `<HowToBlock>`. Do not break this guard.
- **Duplicate `<script type="application/ld+json">` tags.** If `<HowToBlock>` emits its own `<script>` AND `<InfoGuideLayout>` also emits the full `@graph`, the page has 2 JSON-LD scripts. The build-output test asserts exactly 1. Coordinate schema emission with B3/B4 before implementing.
- **Steps array with <3 items.** Unit test fails. Add real content before committing.
- **`Article.headline` cap.** `buildGuideSchemaGraph` caps `headline` at 110 chars. Verify in the built JSON-LD.

## Failure modes

- **Word-count guard fails** — placeholder content. `npx vitest run` fails clearly. Recovery: author real content.
- **`HowToBlock` prop mismatch** — TypeScript error. Recovery: check `src/components/HowToBlock.astro` Props interface (from B4) and align.
- **`HowTo` node absent from JSON-LD** — `buildGuideSchemaGraph` did not emit it. Detection: parse JSON-LD from built HTML; check for `HowTo` type. Recovery: verify B3's implementation honours `config.howTo` when set.
- **2 JSON-LD scripts in HTML** — `<HowToBlock>` emits a duplicate. Detection: `grep -c 'application/ld+json'` on built HTML (expect 1). Recovery: remove the extra emission from `HowToBlock` — the node belongs in the `@graph` from `buildGuideSchemaGraph`.

## Test obligations

- **Unit (in `tests/infoGuides.test.ts`, extend for this entry):**
  - Entry exists in `INFO_GUIDES` for `kak-stat-kurerom`.
  - `sections.length >= 2`, total word count >= 300.
  - `faqItems.length >= 2`.
  - `howTo` defined; `howTo.steps.length >= 3`; each step has non-empty `name` and `text`.
  - `showCalculator` is falsy.
  - `buildGuideSchemaGraph` emits a `HowTo` node in the `@graph`.
  - `buildGuideSchemaGraph` emits `Article` (with `datePublished`, `dateModified`, `author`, `publisher`) and `FAQPage`.
  - `Article.headline` <= 110 chars.

- **Build-output (in `seo-rollout-build.test.ts`, added by B13):**
  - `dist/kak-stat-kurerom/index.html` exists.
  - No `noindex` in HTML.
  - JSON-LD parses and contains `Article`, `HowTo`, `FAQPage` nodes.
  - `HowTo.step.length >= 3`.
  - JSON-LD has no unescaped `</script>`.
  - Exactly one `<script type="application/ld+json">` in the HTML.

## Operational / admin hooks

- **GATED on Open Question #2 (editorial content authoring).** Do not start until human-authored guide prose is available. `tests/infoGuides.test.ts` enforces this at CI level.
- **Wave assignment:** `/kak-stat-kurerom/` is in the Wave 3 indexing submission batch (P1 guide).
- No env vars, no migrations. Purely additive.

## Verification

```bash
# From worktree root: /tmp/kurerok-seo-rollout/kurieros-astro

# Must pass before build
npx vitest run tests/infoGuides.test.ts

npm run build

ls dist/kak-stat-kurerom/index.html

# No noindex
grep 'noindex' dist/kak-stat-kurerom/index.html  # must return nothing

# Exactly one JSON-LD script
grep -c 'application/ld+json' dist/kak-stat-kurerom/index.html  # expect 1

# JSON-LD valid, contains HowTo with >=3 steps
node -e "
  const fs = require('fs');
  const html = fs.readFileSync('dist/kak-stat-kurerom/index.html', 'utf8');
  const m = html.match(/<script type=\"application\/ld\+json\">([\s\S]*?)<\/script>/);
  if (!m) throw new Error('No JSON-LD');
  const graph = (JSON.parse(m[1]))['@graph'] || [];
  const howTo = graph.find(n => n['@type'] === 'HowTo');
  if (!howTo) throw new Error('No HowTo node');
  if (howTo.step.length < 3) throw new Error('Need >=3 steps, got ' + howTo.step.length);
  console.log('HowTo OK:', howTo.step.length, 'steps');
"

npm run typecheck
npm run lint
npx vitest run
```

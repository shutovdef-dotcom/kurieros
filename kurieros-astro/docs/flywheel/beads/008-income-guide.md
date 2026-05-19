---
id: "008"
title: "Income guide /skolko-zarabatyvaet-kurer/ — content + page"
priority: P0
status: todo
dependencies: ["003", "004"]
---

# Bead 008 — Income guide `/skolko-zarabatyvaet-kurer/`

> A bead is self-contained: an agent must implement it WITHOUT reopening the plan.

## Outcome

Two things exist when this bead is done:

1. The `INFO_GUIDES` registry in `src/utils/infoGuides.ts` (skeleton created in B3) has a fully authored entry for the income guide: slug key, prose sections with >=300 words total body content, non-empty FAQ (>=2 items), `showCalculator: true` flag, and real `publishedDate`/`modifiedDate` ISO 8601 dates.
2. `src/pages/skolko-zarabatyvaet-kurer.astro` exists and renders the income guide at `/skolko-zarabatyvaet-kurer/` with `<IncomeCalculator/>`, a funnel `<JobGrid>`, and a "Смотреть вакансии" CTA into the пеший hub. The page is fully indexable.

## Design intent / rationale

**Standalone top-level page, not under `/guide/`.** The spec mandates the keyword-exact URL `/skolko-zarabatyvaet-kurer/`. Routing under `/guide/` buries the slug and forfeits the head-term ranking signal. This is Decision B, which all 3 competing plans converged on.

**Thin page file — ~40 LOC.** Data and schema live in `src/utils/infoGuides.ts`; chrome is provided by `src/components/InfoGuideLayout.astro` (B4). The page file picks `INFO_GUIDES['skolko-zarabatyvaet-kurer']`, calls `buildGuideSchemaGraph`, renders `<InfoGuideLayout>` + bespoke body.

**Funnel is the primary SEO requirement.** Searchers on "сколько зарабатывает курьер" are top-of-funnel. The page MUST funnel to vacancies. Required body elements:
- `<IncomeCalculator/>` (reused as-is).
- Funnel `<JobGrid>` with these exact props — do not deviate:
  ```astro
  <JobGrid
    initialTag="foot"
    limit={12}
    revealable={false}
    moreHref="/rabota-peshim-kurerom/"
    moreLabel="Все вакансии"
  />
  ```
  `revealable={false}` = curated `distributeAcrossCities` mode. `moreHref` points at the пеший hub (highest-demand transport type), NOT the default `/cities/`.
- A "Смотреть вакансии" CTA button/link pointing to `/rabota-peshim-kurerom/`.

**`showCalculator: true` in the `INFO_GUIDES` config entry.** The income guide is the only guide with the calculator. The flag lives in the config so `tests/infoGuides.test.ts` can assert it, and the page file guards with `{cfg.showCalculator && <IncomeCalculator />}`.

**No `HowTo` for this guide.** This is an income-research guide, not a step-by-step process. `config.howTo` must be absent/`undefined` → `buildGuideSchemaGraph` must not emit a `HowTo` node.

**`Article` dates come from config, not the KB `generated` date.** Set `publishedDate` and `modifiedDate` in the `INFO_GUIDES` entry to real authoring dates. Decoupling from `knowledge-base.json`'s `generated: "2026-04-26"` ensures the guide's freshness signal reflects actual updates, not KB regen cadence.

**`Article.headline` cap.** `buildGuideSchemaGraph` caps `headline` at 110 chars (Google's documented limit) — distinct from the <=70-char `seoTitle`. Do not conflate.

**GATED on Open Question #2.** The editorial prose (income tables, rates, sources) is human-authored content from the content brief (`docs/07-content-briefs.md`) + `getItemsByTopic('доход')` / `getItemsByTopic('выплаты')` KB items. **Do not start this bead until OQ#2 is answered and content is available.** The `tests/infoGuides.test.ts` word-count guard (>=300 words) will fail fast if placeholder text is committed — the build will not pass.

## Acceptance criteria

- [ ] `src/utils/infoGuides.ts` `INFO_GUIDES` has an entry for this guide with the correct slug key.
- [ ] The entry's `sections` contains >=2 sections with real prose content (no placeholder text).
- [ ] Total word count across all sections is >=300 words (enforced by `tests/infoGuides.test.ts`).
- [ ] `faqItems.length >= 2`.
- [ ] `showCalculator: true` is set in the entry.
- [ ] `howTo` is absent or `undefined` in the entry (no HowTo for this guide).
- [ ] `publishedDate` and `modifiedDate` are real ISO 8601 date strings (not the KB `generated` date).
- [ ] `src/pages/skolko-zarabatyvaet-kurer.astro` exists and is <=50 LOC.
- [ ] The page imports the guide config from `src/utils/infoGuides.ts` and calls `buildGuideSchemaGraph`.
- [ ] `<InfoGuideLayout>` receives `seoTitle`, `metaDescription`, `ogType='article'`, `articlePublishedTime`, `articleModifiedTime`.
- [ ] `<IncomeCalculator/>` is rendered (guarded by `cfg.showCalculator`).
- [ ] `<JobGrid initialTag="foot" limit={12} revealable={false} moreHref="/rabota-peshim-kurerom/" moreLabel="Все вакансии" />` is rendered exactly as specified.
- [ ] A "Смотреть вакансии" CTA links to `/rabota-peshim-kurerom/` (with trailing slash).
- [ ] `npm run build` completes; `dist/skolko-zarabatyvaet-kurer/index.html` is emitted.
- [ ] The emitted HTML contains no `noindex` meta (guide pages are always indexable).
- [ ] The emitted HTML has exactly one `<script type="application/ld+json">` that parses as valid JSON with an `Article` type node and no `HowTo` node.
- [ ] The JSON-LD has no unescaped `</script>` sequence (security check from §7).
- [ ] `npm run typecheck` passes with zero new errors.
- [ ] `npm run lint` passes.
- [ ] `npx vitest run tests/infoGuides.test.ts` passes.

## Edge cases

- **OQ#2 not yet answered.** Do not start. The unit test word-count guard will fail loudly — this is intentional. Commit real content only.
- **`moreHref` must have trailing slash** (`trailingSlash:'always'`). Hard-code `/rabota-peshim-kurerom/` with the slash.
- **KB data pull.** `getItemsByTopic('доход')` / `getItemsByTopic('выплаты')` are used to source facts into the authored prose — the content itself is human-written, not auto-generated from the KB.
- **`buildGuideSchemaGraph` `headline` cap.** The `Article.headline` in JSON-LD must be <=110 chars. If the guide's `h1` exceeds 110 chars, `buildGuideSchemaGraph` truncates. Verify the emitted JSON-LD `headline` field length.
- **`revealable={false}` prop must be typed boolean, not string.** Pass as `{false}`, not `"false"`.
- **`<InfoGuideLayout>` `ogType` default is `'article'`** — no need to pass it explicitly for this guide. Only `/otzyvy/` overrides to `'website'`.

## Failure modes

- **Word-count guard fails** — placeholder content committed. `npx vitest run tests/infoGuides.test.ts` fails with a clear message. Recovery: author real content before committing.
- **`<JobGrid>` props mismatch** — TypeScript error on `npm run typecheck`. Recovery: check `JobGrid.astro`'s Props interface and align.
- **`moreHref` points to `/cities/` (default)** — funnel breaks; content CTA is ineffective. Detection: `grep 'moreHref\|cities' dist/skolko-zarabatyvaet-kurer/index.html`. Recovery: set `moreHref="/rabota-peshim-kurerom/"` explicitly.
- **`Article` JSON-LD missing `author`/`publisher`/`datePublished`** — `buildGuideSchemaGraph` must include these (contract from B3). If B3 omitted them, fix B3 first. Detection: parse JSON-LD from built HTML and check keys.

## Test obligations

- **Unit (in `tests/infoGuides.test.ts`, established by B3 — extend for this guide's entry):**
  - Entry exists in `INFO_GUIDES`.
  - `sections.length >= 2`.
  - Total body word count >= 300.
  - `faqItems.length >= 2`.
  - `showCalculator === true`.
  - `howTo` is undefined.
  - `buildGuideSchemaGraph` for this entry: no `HowTo` node, has `Article`, has `FAQPage`.
  - `Article.headline` <= 110 chars.
  - `publishedDate` and `modifiedDate` match ISO 8601 format.

- **Build-output (in `seo-rollout-build.test.ts`, added by B13):**
  - `dist/skolko-zarabatyvaet-kurer/index.html` exists.
  - No `noindex` in HTML.
  - JSON-LD parses without error and contains `Article` type.
  - JSON-LD contains no unescaped `</script>`.
  - HTML contains CTA href to `/rabota-peshim-kurerom/`.

## Operational / admin hooks

- **GATED on Open Question #2 (editorial content authoring).** This bead must not begin until the content owner has authored guide prose. The `tests/infoGuides.test.ts` word-count guard enforces this at CI level.
- **Wave assignment:** this URL (`/skolko-zarabatyvaet-kurer/`) is in the Wave 3 indexing submission batch (owned by `seo-promotion`, executed in B14). It is the P0 guide.
- No env vars, no migrations. Purely additive.

## Verification

```bash
# From worktree root: /tmp/kurerok-seo-rollout/kurieros-astro

# Must pass before build
npx vitest run tests/infoGuides.test.ts

npm run build

# Confirm output
ls dist/skolko-zarabatyvaet-kurer/index.html

# No noindex
grep 'noindex' dist/skolko-zarabatyvaet-kurer/index.html  # must return nothing

# JSON-LD parseable and valid
node -e "
  const fs = require('fs');
  const html = fs.readFileSync('dist/skolko-zarabatyvaet-kurer/index.html', 'utf8');
  const m = html.match(/<script type=\"application\/ld\+json\">([\s\S]*?)<\/script>/);
  if (!m) throw new Error('No JSON-LD found');
  const obj = JSON.parse(m[1]);
  const graph = obj['@graph'] || [obj];
  const article = graph.find(n => n['@type'] === 'Article');
  if (!article) throw new Error('No Article node');
  if (article.headline.length > 110) throw new Error('headline too long');
  console.log('JSON-LD OK, headline:', article.headline.length, 'chars');
"

# Confirm funnel CTA present
grep 'rabota-peshim-kurerom' dist/skolko-zarabatyvaet-kurer/index.html

npm run typecheck
npm run lint
npx vitest run
```

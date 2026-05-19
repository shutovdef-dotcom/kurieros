---
id: B4
title: "Implement InfoGuideLayout.astro, HubCrossLinks.astro, and HowToBlock.astro"
priority: P0
status: todo
dependencies: []
---

# Bead B4 — Shared components: `InfoGuideLayout`, `HubCrossLinks`, `HowToBlock`

> A bead is self-contained: an agent must implement it WITHOUT reopening the plan.

## Outcome

Three new component files exist, compile without TypeScript errors, and pass lint:

- `src/components/InfoGuideLayout.astro` — guide chrome (breadcrumb, hero, slot, related grid, `PartnerBanner`, footer), reused by all 3 info-guide pages and `/otzyvy/`.
- `src/components/HubCrossLinks.astro` — interlink block with links to all hubs, info-guides, `/cities/`, `/companies/`, used by all 4 hub page files and optionally the homepage.
- `src/components/HowToBlock.astro` — renders HowTo step list markup + emits its own inline `HowTo` JSON-LD `<script>`, used by `/kak-stat-kurerom/`.

`guide/[topic].astro` is **not touched** — extracting `InfoGuideLayout` is done by copying, not by refactoring the live file. (Refactoring the live file is Open Question #8, deferred.)

## Design intent / rationale

**`InfoGuideLayout.astro`:** The guide chrome in `guide/[topic].astro` is inlined — breadcrumb, `.guide-hero` (kicker, H1, lead, updated date), `<slot/>`, related grid, `PartnerBanner`. This bead copies it into a reusable component rather than refactoring the live file, preserving the additive-only invariant. The `<style>` block is copied verbatim (scoped, dark-mode-aware `.guide-*` rules). Two design decisions embedded in props:
- `ogType` defaults to `'article'` (correct for guides) but is overridable — `/otzyvy/` passes `ogType='website'` because a reviews index is not an `Article`.
- `articlePublishedTime` / `articleModifiedTime` are optional — guides use them; `/otzyvy/` does not.

**`HubCrossLinks.astro`:** Renders links to all 4 hub pages (excluding the current page's hub), the 3 info-guide pages, `/cities/`, and `/companies/`. Per the plan (§4.9): "pure presentational, static data". The plan's bead seed table lists B4 with no dependencies, which means `HubCrossLinks` must NOT import from `transportHubs.ts` (B1). Instead, the 4 hub slug/title pairs are inlined as a static array in the component file — they are compile-time constants that change only if a hub is renamed.

**`HowToBlock.astro`:** Accepts a `HowToConfig` prop and renders an ordered step list + a `<script type="application/ld+json">` with the `HowTo` node. The `HowTo` JSON-LD is co-located with the markup here rather than inside `buildGuideSchemaGraph` (bead B3). Rationale: the HowTo node is tightly coupled to the DOM step list; this mirrors the inline pattern `guide/[topic].astro` uses for its existing HowTo glue. `buildGuideSchemaGraph` in B3 therefore does NOT include a `HowTo` node — `HowToBlock` owns it.

## Acceptance criteria

### `InfoGuideLayout.astro`

- [ ] Props accepted: `title: string`, `description: string`, `ogType?: string` (default `'article'`), `articleSection?: string`, `articlePublishedTime?: string`, `articleModifiedTime?: string`, `kicker: string`, `h1: string`, `lead: string`, `updatedDate?: string`, `canonicalURL?: string`, `robots?: string`.
- [ ] Wraps content in `<BaseLayout>` forwarding `title`, `description`, `ogType`, `canonicalURL`, `robots` props to it.
- [ ] Renders `<Header />` and `<Footer />` (existing components, imported from their current paths).
- [ ] Renders a breadcrumb: Главная → Статьи → {h1} above the hero section.
- [ ] Renders `.guide-hero`: kicker in `<p class="guide-kicker">`, H1 in `<h1>`, lead in a `<p>`, and "Обновлено: {updatedDate}" when `updatedDate` is provided (line absent when omitted).
- [ ] `<slot/>` is placed after the hero, before the related grid.
- [ ] Renders `<PartnerBanner />` (existing component).
- [ ] The `<style>` block contains the `.guide-*` scoped CSS copied from `guide/[topic].astro` — self-contained, dark-mode-aware (uses CSS custom properties, not hard-coded colours).
- [ ] A code comment at the top of the `<style>` block reads: `/* Styles copied from guide/[topic].astro — see Open Question #8 for de-dup. */`
- [ ] When `ogType='website'` is passed, `BaseLayout` receives `ogType='website'` (not the default `'article'`).
- [ ] `npm run typecheck` passes — 0 TypeScript errors in this component.

### `HubCrossLinks.astro`

- [ ] Accepts prop: `current: 'foot' | 'auto' | 'bicycle' | 'flexible' | 'home'`.
- [ ] Hub link data is defined as an inlined static array in the component (not imported from `transportHubs.ts`). The array contains 4 entries: `{ key, href, label }`:
  - `{ key: 'foot', href: '/rabota-peshim-kurerom/', label: 'Пеший курьер' }`
  - `{ key: 'auto', href: '/rabota-avtokurerom/', label: 'Автокурьер' }`
  - `{ key: 'bicycle', href: '/rabota-velokurerom/', label: 'Велокурьер' }`
  - `{ key: 'flexible', href: '/podrabotka-kurerom/', label: 'Подработка' }`
- [ ] When `current` matches a hub `key`, that hub's link is omitted from the rendered output.
- [ ] When `current='home'`, all 4 hub links are rendered.
- [ ] Renders links to the 3 info-guide pages:
  - `/skolko-zarabatyvaet-kurer/` — "Сколько зарабатывает курьер"
  - `/kak-stat-kurerom/` — "Как стать курьером"
  - `/usloviya-raboty-kurerom/` — "Условия работы"
- [ ] Renders links to `/cities/` ("Вакансии по городам") and `/companies/` ("Работодатели").
- [ ] Every rendered `href` ends with `/` (respects `trailingSlash: 'always'`).
- [ ] `npm run typecheck` passes.

### `HowToBlock.astro`

- [ ] Accepts prop: `howTo: HowToConfig` (import `HowToConfig` from `src/utils/infoGuides.ts`, which is bead B3; use the type from there).
- [ ] Renders an `<ol>` where each `<li>` contains: the step `name` as a `<h3>` (or `<strong>`) and `text` as a `<p>`.
- [ ] Emits a `<script type="application/ld+json">` with: `{ "@type": "HowTo", "name": howTo.name, "step": howTo.steps.map(s => ({ "@type": "HowToStep", "name": s.name, "text": s.text })) }`.
- [ ] The JSON-LD is built with `JSON.stringify(...)` — no raw string concatenation (XSS-safe).
- [ ] When `howTo.steps` is empty, the component renders nothing (no `<ol>`, no JSON-LD script) — never emits an empty `HowTo` node.
- [ ] `npm run typecheck` passes.

## Edge cases

- `InfoGuideLayout` — `updatedDate` omitted: no "Обновлено:" line rendered.
- `InfoGuideLayout` — `canonicalURL` omitted: `BaseLayout` handles the default (self-canonical); no error.
- `HubCrossLinks` — `current='foot'`: 3 hub links rendered (auto, bicycle, flexible), not 4.
- `HubCrossLinks` — `current='home'`: all 4 hub links rendered.
- `HowToBlock` — `howTo.steps = []`: component renders nothing; the empty-steps guard must come before the JSON-LD `<script>` tag (so a zero-step `HowTo` is never emitted).
- `HowToBlock` — step `text` contains `</script>` substring: `JSON.stringify` escapes it as `"<\/script>"` — safe by default.

## Failure modes

- **`BaseLayout` props interface changes** — TypeScript error in `InfoGuideLayout`. Recovery: inspect `src/components/BaseLayout.astro`'s `Props` interface and re-align the forwarded props.
- **`.guide-*` CSS copy diverges from `guide/[topic].astro`** — acknowledged acceptable drift (refactoring is OQ#8). The comment `/* Styles copied from guide/[topic].astro — see Open Question #8 for de-dup. */` flags this for future cleanup.
- **`HowToBlock` missing empty-step guard** — an empty `HowTo` JSON-LD is invalid structured data and would flag in Google's Rich Results Test. The build-output test in B13 catches this. Recovery: add `{howTo.steps.length > 0 && <ol>...</ol>}` guard.
- **`HubCrossLinks` href missing trailing slash** — Astro's `trailingSlash: 'always'` will redirect in dev but the static build produces the href as-is. Recovery: ensure every hardcoded href in the static array ends with `/`.
- **`HowToConfig` type not yet exported (B3 not complete)** — TypeScript error. Recovery: if implementing B4 before B3, temporarily stub the type as `interface HowToConfig { name: string; steps: Array<{ name: string; text: string }> }` with a `// TODO: remove when B3 merged` comment, then remove the stub when B3 lands.

## Test obligations

**Unit:** No pure-function unit tests — these are Astro presentational components with no exported functions. Type correctness is covered by `npm run typecheck`.

**E2E (owned by bead B13 build-output assertions):**

- Rendered hub page HTML contains anchor tags for `/rabota-peshim-kurerom/`, `/rabota-avtokurerom/`, `/rabota-velokurerom/`, `/podrabotka-kurerom/` (from `HubCrossLinks`).
- Rendered guide page HTML has an element with `class="guide-kicker"` (from `InfoGuideLayout`).
- Rendered `/kak-stat-kurerom/` HTML contains `<script type="application/ld+json">` with `"@type": "HowTo"`.
- The HowTo JSON-LD `<script>` contains no unescaped `</script>` substring.

## Operational / admin hooks

None. Pure presentational components — no config flags, no observability, no migrations.

## Verification

Run in order:

```sh
npm run typecheck
npm run lint
```

Both must exit 0. Full build verification is owned by bead B13 (requires page files from B6/B8/B9/B10 to exercise these components end-to-end in the build output).

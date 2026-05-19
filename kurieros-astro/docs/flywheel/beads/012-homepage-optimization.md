---
id: "012"
title: Homepage optimization — title/meta retune + hub interlinks + income guide discovery
priority: P1
status: todo
dependencies: ["006", "008"]
---

# Bead 012 — Homepage optimization (Decision D)

> A bead is self-contained: an agent must implement it WITHOUT reopening the plan.

## Outcome

`src/pages/index.astro` is edited with minimal, fully-reversible changes. Optionally
`src/components/home/HomeHero.astro` gets a one-line H1 edit if its H1 does not lead
with "Работа курьером". No layout, no JS, no schema-structure changes.

Specifically:
1. `<title>` / `<meta name="description">` templates are retuned to surface both head
   terms: "работа курьером" (147K/mo) and "курьер вакансии" (45.8K/mo).
2. The `hubLinks` array in `index.astro` gains one discovery entry pointing to
   `/skolko-zarabatyvaet-kurer/`.
3. Four transport-format link entries are added to `index.astro` pointing at the new
   hub URLs (with an empty-hub fallback rule).
4. `HomeHero.astro` H1 is verified; if it does not lead with "Работа курьером", exactly
   one short phrase is prepended to the existing text.

## Design intent / rationale

**Decision D (plan §3.5) — minimal surface area, one-line revert path.**

`/` is the highest-traffic page. Every change carries outsized risk. Scope is deliberately
narrow: copy strings and href values only. No changes to `JobGrid`, toolbar, geo-banner,
calculator, `ReviewsBlock`, `HomeFaq`, `PartnerBanner`, or any JS.

**Pre-read requirement (from plan §3.5 Round 2):**
B12 must first read `src/pages/index.astro` around lines 42-62 to enumerate which
array holds each of the 4 format links before repointing them. As of bead-authoring time
(2026-05-19), `index.astro` contains:
- Lines 57-79: `hubLinks` array with 4 entries: `/compare/`, `/companies/`, `/cities/`,
  `/guide/`. None of these is a transport-format link.
- Lines 80-81: `homepageTitle` / `homepageDescription` string templates.
- The `featuredFormats` / `routeCards` arrays mentioned in the plan do **not** yet exist
  in `index.astro` — they are introduced by B12 itself.

**Title / meta retune (item 1):**
Current `homepageTitle` (line 80):
```ts
const homepageTitle = `Работа курьером 2026: ${totalVacancies} вакансий, ${companies.length} компаний | КурьерОк`.slice(0, 70);
```
"Работа курьером" (147K term) is present. "Курьер вакансии" (45.8K) is absent. A
plausible revised template (final copy subject to OQ#2 sign-off):
```ts
const homepageTitle = `Работа курьером: ${totalVacancies} вакансий курьера 2026 | КурьерОк`.slice(0, 70);
```
Keep the `.slice(0,70)` guard. Verify the template with max realistic values
(`totalVacancies=9999, companies.length=99`) stays within 70 chars before slicing.
For `homepageDescription` (line 81): keep the 170-char cap; add "вакансии курьеров"
or "работа курьером" within the first 80 chars.

**H1 verify and fix (item 2):**
Current `HomeHero.astro` H1 (lines 24-27):
```html
<h1 id="hero-v2-title" class="hero-v2-title">
  Найди свою смену.
  <span class="hero-v2-title-accent">Получи деньги уже&nbsp;завтра.</span>
</h1>
```
This H1 does NOT lead with "Работа курьером". Decision D requires a one-phrase fix. A
minimal change that preserves the existing rhythm and ARIA attributes:
```html
<h1 id="hero-v2-title" class="hero-v2-title">
  Работа курьером — найди свою смену.
  <span class="hero-v2-title-accent">Получи деньги уже&nbsp;завтра.</span>
</h1>
```
The `id="hero-v2-title"` attribute and any `aria-labelledby` references must be
preserved unchanged. Final wording subject to OQ#2.

**Interlink repoints (item 3):**
Add 4 transport-format link entries. The old category slugs and new hub targets are:
```
/rabota-kurerom-peshkom/        → /rabota-peshim-kurerom/    (пеший / foot)
/rabota-kurerom-na-avto/        → /rabota-avtokurerom/       (авто / auto)
/rabota-kurerom-na-velosipede/  → /rabota-velokurerom/       (велосипед / bicycle)
/rabota-kurerom-podrabotka/     → /podrabotka-kurerom/       (подработка / flexible)
```
**Empty-hub fallback rule:** if `isHubEmpty(jobsData, HUB_CONFIGS[key])` is `true` at
build time for a hub, that link retains the old category slug — a primary homepage CTA
must never point at a `noindex` page. Import `isHubEmpty` and `HUB_CONFIGS` from
`../utils/transportHubs` (requires B1 complete). Implement as a ternary per entry:
```ts
href: isHubEmpty(jobsData, HUB_CONFIGS.flexible) ? '/rabota-kurerom-podrabotka/' : '/podrabotka-kurerom/',
```
Add the 4 entries as a new `transportFormatLinks` const or fold into `hubLinks`; either
placement is acceptable so long as they appear in the rendered homepage body in a
prominent position (above the fold or immediately following the hero `JobGrid`).

**Income-guide discovery entry (item 4):**
Add one entry to `hubLinks` (or an equivalent discovery section):
```ts
{
  href: '/skolko-zarabatyvaet-kurer/',
  title: 'Сколько зарабатывает курьер',
  text: 'Реальные ставки, формула дохода и калькулятор заработка.',
}
```
This makes the guide crawler-reachable from `/` (plan §4.10, user workflow 2).
Adding it to `hubLinks` also adds a `ListItem` in the homepage `CollectionPage` JSON-LD
— this is correct and desired.

**Sequencing:** B12 must run after B6 (hub pages exist) and B8 (income guide exists) so
the interlink targets resolve at runtime. It is the last non-test bead.

## Acceptance criteria

- [ ] `index.astro` `homepageTitle` template produces a string containing "курьер
      вакансии" or equivalent (e.g. "вакансий курьера") within the 70-char cap.
- [ ] `index.astro` `homepageDescription` contains "курьер" and fits within 170 chars.
- [ ] `HomeHero.astro` H1 text starts with "Работа курьером" (exact match on first word
      pair); `id="hero-v2-title"` and any `aria-labelledby` reference are unchanged.
- [ ] `index.astro` contains 4 transport-format link entries with hrefs pointing at
      `/rabota-peshim-kurerom/`, `/rabota-avtokurerom/`, `/rabota-velokurerom/`, and
      `/podrabotka-kurerom/` (or their fallback category slugs if the hub is empty).
- [ ] `index.astro` contains a `hubLinks` entry (or equivalent) with
      `href: '/skolko-zarabatyvaet-kurer/'`.
- [ ] `dist/index.html` after `npm run build` contains all 4 hub hrefs (or fallbacks)
      and the income-guide href.
- [ ] No `JobGrid`, toolbar, `ReviewsBlock`, `IncomeCalculator`, `HomeFaq`,
      `PartnerBanner`, `HomeGeoBanner`, or inline `<script>` props are modified.
- [ ] All existing `tests/build-output.test.ts` assertions still pass.
- [ ] `npm run build`, `npm run typecheck`, `npm run lint` pass.

## Edge cases

- **One or more hubs is empty at build time (Open Question #3):** the подработка hub
  depends on `tag:'flexible'`. If `isHubEmpty(jobsData, HUB_CONFIGS.flexible)` is `true`,
  use the fallback slug `/rabota-kurerom-podrabotka/`. Apply the same check to all 4.
- **`<title>` exceeds 70 chars after substitution:** the `.slice(0,70)` guard is already
  in place; preserve it. Verify the template string (with large but realistic values) is
  <= 70 chars before slicing.
- **`hubLinks` JSON-LD `ItemList` grows by 1:** adding the income-guide entry to
  `hubLinks` adds one more `ListItem` to the homepage `CollectionPage` JSON-LD. This is
  correct — the guide is a real navigational destination.
- **Old category slugs remaining in other contexts:** after B12, the old transport-format
  slugs (`/rabota-kurerom-peshkom/` etc.) will still appear in `JobCard` hrefs, `[slug].astro`
  output, and possibly `knowledge.ts` geo-links. Do not change those. Only the primary
  homepage CTA links are updated by this bead.
- **`HomeHero.astro` ARIA:** `aria-labelledby="hero-v2-title"` in the parent `<section>`
  must continue to reference the same `id`. Do not change the `id`.

## Failure modes

- **B6 (hub pages) not complete:** href points at a 404 at runtime. Build succeeds but
  QA catches it in B14. Fix: run B6 first (declared dependency).
- **B8 (income guide) not complete:** `/skolko-zarabatyvaet-kurer/` href is a 404 at
  runtime. Fix: run B8 first (declared dependency).
- **B1 (`transportHubs.ts`) not complete:** `isHubEmpty` import fails at build time.
  Fix: run B1 first (transitive dependency via B6).
- **Template exceeds 70 chars:** the `.slice(0,70)` guard truncates silently, potentially
  cutting mid-word. Detection: the verification spot-check asserts `<= 70` before
  slicing. Fix: shorten the template.
- **H1 edit changes visual rendering unexpectedly:** check in both light and dark mode.
  The `.hero-v2-title` CSS is scoped to `HomeHero.astro` — any long-word addition may
  affect line breaks. Review in the browser QA (B14).

## Test obligations

- **Unit:** no new unit test file for B12. The title-length invariant is checked via the
  build-output spot-check below.
- **Build-output (authored in B13, listed here for traceability):**
  - `dist/index.html` contains links to all 4 hub hrefs (or fallback slugs).
  - `dist/index.html` contains `/skolko-zarabatyvaet-kurer/`.
  - `dist/index.html` `<title>` contains "курьер" and is <=70 chars.
  - `dist/index.html` H1 leads with "Работа курьером".
  - Existing homepage build-output assertions still pass.
- **Manual QA (B14):**
  - All 4 transport-format links visible and clickable.
  - Income guide CTA visible and leads to the correct page.
  - `<title>` in browser tab is correct.
  - H1 is correct in both light and dark mode.
  - CWV spot-check (LCP not regressed vs. baseline).

## Operational / admin hooks

- **Open Question #2 (editorial copy):** final `<title>`, `<meta description>`, and H1
  copy must be signed off. Placeholders in this bead are safe to ship; update before
  launch if OQ#2 is resolved.
- **Open Question #3 (flexible tag populated):** run
  `filterJobsByCriteria(jobsData, {tag:'flexible'}).length` before shipping. Document
  the result in the PR. If 0, confirm the fallback slug is in place.
- **CWV:** Decision D prohibits changes to LCP resources (hero image, `JobGrid`). A CWV
  spot-check (B14) must confirm no regression on the homepage.
- **Revert path:** all changes are in the frontmatter of `index.astro` and one line of
  `HomeHero.astro`. A single `git revert` undoes the entire bead in <30 seconds.

## Verification

Run these exact commands from the worktree root
(`/tmp/kurerok-seo-rollout/kurieros-astro`):

```bash
# 1. Full build
npm run build

# 2. Type-check
npm run typecheck

# 3. Lint
npm run lint

# 4. Existing build-output tests must still pass
npx vitest run tests/build-output.test.ts

# 5. Homepage spot checks
node -e "
const fs = require('fs');
const html = fs.readFileSync('dist/index.html', 'utf8');

// Title checks
const titleMatch = html.match(/<title>(.*?)<\/title>/)?.[1] ?? '';
console.assert(titleMatch.length <= 70, 'Title too long: ' + titleMatch.length + ' chars');
console.assert(/курьер/i.test(titleMatch), 'Title missing «курьер»: ' + titleMatch);
console.log('Title OK:', titleMatch);

// H1 check
console.assert(html.includes('Работа курьером'), 'H1 does not lead with «Работа курьером»');

// Hub links
const hubs = [
  ['rabota-peshim-kurerom', 'rabota-kurerom-peshkom'],
  ['rabota-avtokurerom', 'rabota-kurerom-na-avto'],
  ['rabota-velokurerom', 'rabota-kurerom-na-velosipede'],
  ['podrabotka-kurerom', 'rabota-kurerom-podrabotka'],
];
hubs.forEach(([hub, fallback]) => {
  const hasDirect = html.includes('/' + hub + '/');
  const hasFallback = html.includes('/' + fallback + '/');
  console.assert(hasDirect || hasFallback, 'Missing hub link for: ' + hub);
});

// Income guide
console.assert(html.includes('/skolko-zarabatyvaet-kurer/'), 'Missing income guide link');

console.log('All homepage spot checks passed.');
"
```

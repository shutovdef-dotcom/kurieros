# Полный аудит проекта — 2026-06-07

Цель: зафиксировать текущее состояние `kurieros-astro`, архитектурные риски,
результаты проверок, уже закрытые P1 fixes и оставшиеся решения перед
релизом/внешними действиями.

## Scope

- Текущая ветка: `codex/page-weight-listings`.
- Проект: Astro static site для `kurerok.ru`.
- Regression window: примерно последние 50 коммитов от `HEAD~50..HEAD`.
- Проверялись: архитектура, generated data, listing/hub flow, vacancy pages,
  SEO/schema, security surface, visual QA, production gates.

Последние 50 коммитов в основном затрагивали:

- Самокат: новая вакансия, города, логотип, переводы.
- JobPosting/schema/SEO rollout.
- thin-listing `noindex` + sitemap exclusions.
- city insights и postal/geo coverage.
- reviews `/otzyvy/`.
- city-grid fragments и security hardening DOM-swap.
- крупные refactors home/compare/vacancy/data.

## Documentation Added

- `README.md` — обновлённая карта проекта, команды, preview flow.
- `docs/project-overview.md` — маршруты, каталоги, generated artifacts.
- `docs/architecture.md` — текущая архитектура и invariants.
- `docs/qa-and-release-checklist.md` — gates, visual QA и handoff rules.

## Verification Evidence

Прошедшие проверки после P1 batch:

- `npm run build` — PASS, 8702 pages built.
- `npm test` — PASS: 37 test files passed, 1 skipped; 631 tests passed,
  4 skipped.
- `npm run lint` — PASS.
- `npm run typecheck` — PASS, 0 errors / 0 warnings; остаются 6 accepted
  tooling hints.
- `npx --yes html-validate dist/index.html dist/podrabotka-kurerom/index.html dist/otzyvy/index.html dist/compare/index.html`
  — PASS, 0 errors.
- `npm audit --audit-level=moderate` — PASS, 0 vulnerabilities after the
  dev-only `yaml-language-server -> yaml@2.8.3` override.
- `git diff --check` — PASS.
- Strict high-confidence secret scan — реальных секретов не найдено.
- Sitemap/robots assertion — PASS: local sitemap has `0` `/api/grid/` and
  `0` `/api/grid-batch/` URLs; `/podrabotka-kurerom/` and `/compare/` remain
  present; `robots.txt` blocks both service fragment paths.
- Visual Browser QA — PASS:
  `output/visual-browser-qa/p1-accessibility/report.md` has 90 OK / 0 FAIL
  across Chrome + WebKit, mobile/tablet/desktop; focused compare runtime QA in
  `output/visual-browser-qa/p1-compare-runtime/report.md` has 18 OK / 0 FAIL.
- Pre-deploy vacancy Visual Browser QA — PASS:
  `output/visual-browser-qa/predeploy-vacancy-expanded/report.md` has 90 OK /
  0 FAIL across 5 high-priority `/v/*` routes, Chrome + WebKit, 6
  mobile/tablet viewports and 3 desktop viewports. Aggregated metrics:
  max horizontal overflow 1px, 0 blank pages, 0 missing main content,
  0 missing job cards, 0 console errors/warnings.
- Preview отвечает на `http://127.0.0.1:4323/`.

Проверки с остаточными замечаниями:

- `npm run test:coverage` — PASS after pre-deploy coverage tests:
  statements 95.02%, branches 83%, functions 92.46%, lines 96.35%.
- `npm run typecheck` still reports 6 non-blocking hints in CommonJS infra,
  Astro `define:vars` inline scripts, and the intentional font preload
  `onload` pattern.
- Full `npm run build` updates generated translation/review artifacts; review
  those generated diffs before commit.
- Final pre-deploy gate after docs/test/typecheck/QA updates: build, tests,
  coverage, lint, typecheck, html-validate, audit, secret scan,
  sitemap/robots assertions, preview `curl -I`, and `git diff --check` all
  pass locally.

## Already Changed Before Fix Freeze

До запроса "пока не делать правки" уже были внесены несколько точечных
исправлений. Решение пользователя от 2026-06-07: оставить эти hotfixes в
ветке и продолжить P1 fixes.

- `src/utils/reviewsAggregate.ts` — добавлен mapping `Самокат -> samokat`.
- `src/pages/otzyvy.astro` и tests — cap отзывов обновлён с 48 до 54 для
  9 брендов; SEO title укорочен до 42 символов.
- `src/components/TransportHub.astro` и transport hub pages — удалён
  неиспользуемый prop `maxSalary`.
- `src/utils/transportHubs.ts` — убран неиспользуемый параметр `cfg` во
  внутреннем helper.
- `src/components/VacancyTKey.astro` — Astro props приведены к `Props`, чтобы
  снять hint.
- `src/components/vacancy/VacancyIncomeScenarios.astro` — mobile table
  переведена в card layout на узких viewport; focused QA проходит.

## Findings To Discuss

### P0

Критичных блокеров на уровне "сайт не собирается / основные страницы не
отдаются / явный секрет в коде" не найдено.

### P1 — Mobile overflow на странице вакансии

Evidence:

- Visual QA route: `/v/yandex-eda-courier-moskva-foot/`.
- Chrome `360x740`: `scroll.width=361`, `clientWidth=360`.
- До точечного hotfix было 10 overflow elements, основной источник:
  `.vacancy-income-table` с шириной 390px внутри 360px viewport.
- После P1 fix таблица дохода на `max-width: 600px` рендерится как набор
  компактных карточек, без скрытого table header и без ширины больше
  контейнера.
- Focused QA artifact:
  `output/visual-browser-qa/vacancy-income-overflow-fixed/report.md`.
- Chrome и WebKit/Safari-engine прошли на `360`, `375`, `390`, `414`, `430`,
  `768`.
- Manual 360px screenshots подтверждают, что `.vacancy-income-table-wrap` и
  `.vacancy-income-table` имеют ширину `294px`; остаточный page-level
  `overflowX=1` не связан с таблицей и не даёт outlier elements.

Что обсудить:

- Перед Yandex recrawl расширить regression check на несколько
  high-priority `/v/*` pages, а не только на один sample route.
- Desktop можно оставить table layout: проблема была именно в узких mobile
  viewport.

### P1 — HTML/accessibility validation debt

Status: fixed locally on 2026-06-07.

RED evidence before fix:

- `html-validate` on `/`, `/podrabotka-kurerom/`, `/otzyvy/`, `/compare/`
  found 133 errors.
- Main categories: `no-inline-style`, `hidden-focusable`,
  `aria-label-misuse`, `unique-landmark`, and `element-permitted-content`.

Fixes applied:

- `Header.astro`: unique site header landmark label.
- `OzonLeadModal.astro`: removed focusable content from an `aria-hidden`
  subtree and replaced nested modal `header` with non-landmark markup.
- `JobCard.astro`: removed invalid `aria-label` from visible non-interactive
  experience pills.
- `HomeHero.astro`: removed decorative `span` children from `dl`; separators
  now come from CSS.
- `Logo.astro`: replaced inline sizing/color styles with CSS classes/vars.
- `ReviewsAggregate.astro`: replaced inline width bars with semantic `meter`
  elements.
- `CompareGrid.astro` and compare runtime scripts: replaced static and runtime
  `--cols` inline styles with `compare-grid--cols-0..12` classes.

GREEN evidence:

- `html-validate` on the same key pages now passes with 0 errors.
- Runtime compare smoke in Chrome and WebKit at 360px confirmed city filter
  output uses `compare-grid--cols-12`, has no inline `style` attribute, and
  renders 12 columns as expected.

### P1/P2 — Reviews regression от Самоката

Evidence:

- Новые commits добавили Самокат reviews/brand, но aggregate map раньше знал
  только 8 брендов.
- Тест `/otzyvy/ has at most 48 review-card elements` начал падать, потому
  что фактически стало 54 карточки.

Текущее состояние:

- Mapping уже добавлен до freeze.
- Tests обновлены на 9 брендов / 54 карточки.

Что обсудить:

- Оставить этот fix как регрессионный hotfix.
- Или откатить и вынести в отдельный PR/батч, если хотим строго только docs.

### P2 — Dependency advisory

Status: fixed locally on 2026-06-07.

Evidence before fix:

- `npm audit --audit-level=moderate` found the YAML stack overflow advisory
  (`GHSA-48c2-rrv3-qjmp`) through the dev dependency chain
  `@astrojs/check -> @astrojs/language-server -> volar-service-yaml -> yaml-language-server -> yaml`.
- `npm audit fix --force` proposed a risky breaking/downgrade path, so it was
  not used.

Fix:

- Added a scoped npm override for `yaml-language-server` to use `yaml@2.8.3`.
- Updated `package-lock.json` with `npm install --package-lock-only` and
  reinstalled dependencies.

GREEN evidence:

- `npm audit --audit-level=moderate` now returns `found 0 vulnerabilities`.
- `npm test`, `npm run typecheck`, and `npm run build` remain green after the
  override.

### P2 — Branch coverage ниже целевого 80%

Status: fixed locally on 2026-06-07.

Evidence:

- Before pre-deploy tests: `npm run test:coverage` passed, but branch coverage
  was 77.86%.

Fix:

- Added `getCompaniesFromJobs` tests in `tests/utils/companies.test.ts` for
  grouping, review aggregation, normalized/fallback apply links, cities,
  transport labels, sparse-source fallback, and company-type copy.

GREEN evidence:

- `npm run test:coverage` now passes with branch coverage 83%.

### P2 — Typecheck hints / tooling noise

Evidence:

- `npm run typecheck` без ошибок, но оставляет hints.
- После генерации `coverage/` Astro check видел `coverage/prettify.js`, что
  создавало шум; это исправлено через `tsconfig.json` exclude.

Основные hints:

- `infra/autopost.js` и `infra/telegram-bot.js`: CommonJS hint.
- Astro inline script hints для `define:vars` false positives.
- `src/layouts/BaseLayout.astro`: hints на preload `onload/rel`.

Status 2026-06-07:

- `coverage/`, `output/` и `.playwright-cli/` исключены из typecheck surface.
- Unused `infra/autopost.js` variables removed.
- JSON-LD scripts in `HowToBlock.astro` and `BaseLayout.astro` now explicitly
  use `is:inline`.
- Typecheck result improved from 12 hints to 6 accepted hints.

Что обсудить:

- Либо оставить CommonJS infra scripts как runtime choice, либо отдельным
  батчем перевести infra на ESM.
- Не менять font preload pattern ради silence без отдельного perf/UX решения.

### P1/P2 — Daily-pay landing page weight

Status: local pre-deploy build looks fixed; production verification is pending
until deploy.

Evidence:

- Yandex Webmaster had previously removed
  `/rabota-kurerom-ezhednevnaya-oplata/` because it failed to download.
- Live production `HEAD` on 2026-06-07 still reports `content-length:
  11386436` (about 10.8 MB).
- Local pre-deploy preview returns `200 OK`.
- Local generated HTML is about 344 KB, has canonical
  `https://kurerok.ru/rabota-kurerom-ezhednevnaya-oplata/`, robots
  `index, follow`, `#jobs-grid`, 33 initial job-card matches, and batch
  loading for the remaining 2073 jobs.
- Local sitemap includes the canonical daily-pay URL and
  `public/empty-listings.json` does not exclude it.

What remains:

- After deploy, verify production `content-length`/download size drops from
  the current 10.8 MB range to the local batched size.
- Only then submit the URL for Yandex recrawl.

### Pre-deploy generated artifacts review

Status: reviewed at a sample/diff-pattern level on 2026-06-07.

Expected generated changes:

- `public/vacancy-translations/*/ozon-*.json`: generated `updated_date`
  changed from 29 May 2026 to 7 June 2026.
- `public/vacancy-translations/*/samokat-courier.json`: new generated
  translation files for the Самокат source.
- `src/data/reviews.json`: new Самокат reviews added; later T-Банк review IDs
  shift accordingly.
- `public/empty-listings.json`: `https://kurerok.ru/rabota-kurerom-samokat/`
  removed from empty listings because Самокат is now populated.

Before commit:

- Review these generated diffs as intentional data output, not hand-authored
  copy changes.

### P2 — Large-file architecture risks

Evidence:

- `src/components/JobGrid.astro` — 1342 lines.
- `src/styles/index.css` — 1195 lines.
- `src/layouts/BaseLayout.astro` — 843 lines.
- `src/pages/v/[slug].astro` — 813 lines.
- `src/components/OzonLeadModal.astro` — 756 lines.
- `src/components/vacancy/VacancyHero.astro` — 720 lines.
- `src/components/ReviewsAggregate.astro` — 658 lines.

Что обсудить:

- Не делать большой рефактор одним заходом.
- Выбрать 1-2 файла с максимальным risk/reward.
- Для `JobGrid` логично вынести browser controller/lazy batch behavior в
  typed TS modules с тестируемыми pure helpers.
- Для `BaseLayout` разделить head/meta, schema, analytics и i18n runtime.

### P2 — Visual QA процесс нужно сделать обязательным gate

Evidence:

- Visual QA поймал mobile overflow, который build/lint/tests не ловят.
- Основной пользовательский трафик мобильный, значит desktop-only acceptance
  недостаточен.

Что обсудить:

- Добавить в release checklist обязательные affected-route visual QA для:
  - Chrome.
  - WebKit/Safari-engine.
  - mobile `360/375/390/414/430/768`.
  - desktop `1366/1440/1920`.
- Для больших UI changes делать screenshots review до handoff.

Status 2026-06-07:

- Added this as a documented release gate in
  `docs/qa-and-release-checklist.md`.
- P1 accessibility batch used the full matrix on `/`, `/podrabotka-kurerom/`,
  `/otzyvy/`, `/compare/`, and `/v/yandex-eda-courier-moskva-foot/`.
- Focused compare runtime QA was added after removing JS-created inline
  styles.
- Pre-deploy expanded vacancy QA used the full matrix on:
  `/v/yandex-eda-courier-moskva-foot/`,
  `/v/kuper-auto-courier-rostov-na-donu-auto/`,
  `/v/samokat-courier-moskva-bicycle/`,
  `/v/ozon-courier-moskva-auto/`,
  `/v/ozon-fresh-order-picker-moskva-foot/`.

### P3 — Preview handoff automation

Evidence:

- Пользователь постоянно просит localhost links после визуальных изменений.
- `docs/qa-and-release-checklist.md` уже описывает preview handoff, но это
  пока процесс, не автоматический hook.

Что обсудить:

- Оставить как Codex skill/process.
- Или добавить lightweight script, который:
  - проверяет/поднимает preview;
  - делает `curl -I` affected URLs;
  - печатает готовые localhost links;
  - опционально запускает visual QA.

## Architecture Assessment

В целом архитектура после последних ~50 коммитов выглядит связной:

- Data generation отделена от render surface.
- Listing filters, city indexes и sitemap/noindex имеют выделенные helpers.
- Heavy listings разгружаются batch endpoints.
- City hot-swap использует fragment endpoint и DOM sanitization.
- JSON-LD serialization закрывает `<script>`-breakout через escaping.

Главные риски не в "сломана архитектура", а в размерах отдельных файлов,
остаточных accepted typecheck hints и необходимости не пропускать documented
mobile visual QA gate перед релизами.

## Recommended Next Discussion Order

1. External: deploy локально проверенной ветки, затем production sitemap/robots
   checks.
2. External: отправить Yandex sitemap recrawl только после production проверки.
3. P1/P2: после деплоя проверить production daily-pay page weight и отправить
   URL в Yandex recrawl только после подтверждения лёгкой страницы.
4. P2: документировать или отдельным батчем убрать оставшиеся accepted
   typecheck hints.
5. P2/P3: начать первый крупный refactor batch с `JobGrid`.

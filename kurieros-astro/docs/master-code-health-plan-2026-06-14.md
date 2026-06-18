# Master code health plan, 2026-06-14

## Scope

Этот план собирает в одну очередь результаты:

- `docs/full-project-audit-2026-06-07.md`;
- `docs/performance-audit-2026-06-14.md`;
- `docs/backlog.md`;
- `PROPOSED_CODE_FILE_REORGANIZATION_PLAN.md`;
- текущих локальных проверок после GA4/grid/Worker/code-health правок.

Ограничения: не менять тексты вакансий, slugs, домен, DNS, email, реферальные
реквизиты и ручной контент без отдельного решения. План ниже относится к коду,
архитектуре, тестам, DX, производительности и проверкам.

## Source disposition audit

Этот раздел связывает исходные audit/backlog/reorg документы с текущим
решением, чтобы очередь была единой и проверяемой.

### `docs/full-project-audit-2026-06-07.md`

- P1 mobile overflow на странице вакансии: уже закрыто до этого плана;
  остается в visual QA regression surface.
- P1 HTML/accessibility validation debt: уже закрыто до этого плана;
  key-route html-validate остается release check.
- P1/P2 reviews regression от Самоката: уже закрыто до этого плана.
- P2 dependency advisory: уже закрыто через npm override; `npm audit` остается
  release check.
- P2 branch coverage ниже 80%: закрыто; `npm run check` теперь включает
  coverage gate.
- P2 typecheck hints/tooling noise: частично закрыто раньше; оставшиеся
  accepted hints не меняются без отдельного infra/perf решения.
- P1/P2 daily-pay page weight: local code fix подтвержден раньше; production
  verification/recrawl — external read/action boundary, не code-only.
- P2 large-file architecture risks: закрыто батчами JobGrid, BaseLayout,
  vacancy helpers; оставшиеся крупные UI/CSS зоны идут маленькими batches.
- P2 visual QA gate: документирован в `docs/qa-and-release-checklist.md`;
  применялся к browser-observable изменениям этого плана.
- P3 preview handoff automation: оставлено как documented process/skill;
  автоматический hook не добавлялся, потому что Codex hooks здесь недоступны.

### `docs/performance-audit-2026-06-14.md`

- Company pages initial HTML weight: реализовано через company vacancy batch
  endpoint.
- City-neighbour lookup: уже оптимизирован, теперь закреплен `check:perf`.
- Vacancy detail `selectTopN` helpers: вынесено в `src/utils/vacancyPage.ts`
  и покрыто тестами.
- GA4 delegated listeners: вынесено/покрыто до этого master plan batch.

### `docs/backlog.md`

- `CALC-1`: выполнен после owner approval; страница вакансии получила
  режимы `hourly` / `estimated_hourly` / `monthly_derived_hourly` /
  `meeting` / `monthly` / `hidden`, а skill добавления вакансий теперь
  требует выбрать режим калькулятора.
- `HUB-FLEX-1`: text edits hold; owner подтвердил, что вечерние/ночные
  категории остаются частью `flexible`, без исключения из выборки.
- `CSS-1`: approved header/navigation scoped batch выполнен с screenshot QA;
  broader semantic-selector lint cleanup остается отдельным маленьким batch.
- `REVIEW-SAMPLE-1`: approved behavioral unification выполнена; тексты отзывов
  не редактировались.

### `PROPOSED_CODE_FILE_REORGANIZATION_PLAN.md`

- Worker test surface: выполнено до этого плана; `check:worker` включен в
  `check`.
- Vacancy-detail pure helpers: выполнено через `src/utils/vacancyPage.ts`.
- JobGrid controller extraction: выполнено.
- BaseLayout runtime extraction: выполнено.
- Unified `npm run check`: выполнено, плюс добавлены `check:perf` и
  `check:release`.

## Current baseline

- Сборка проходит: `npm run build`.
- Типы проходят: `npm run typecheck`.
- Линт проходит: `npm run lint`.
- Тесты проходят: `npm test`.
- Coverage gate активен: `npm run test:coverage`, глобальный порог 80%.
- Worker gate активен: `npm run check:worker`.
- Performance baseline зафиксирован: `docs/performance-audit-2026-06-14.md`.
- GA4-события вынесены в bundled browser module и покрыты тестом.
- `src/pages/v/[slug].astro` частично разгружен через `src/utils/vacancyPage.ts`.

## Priority batches

### P0. Verification gate consolidation

Status: completed locally on 2026-06-14.

Цель: одна команда для локального pre-release контроля, чтобы следующие
рефакторинги не зависели от ручного чеклиста.

Сделать:

- добавить `npm run check` для lint/typecheck/coverage/worker gate;
- добавить `npm run check:perf` для текущего benchmark city-neighbours;
- добавить `npm run check:release` для build + check + perf + `git diff --check`;
- закрепить наличие этих scripts тестом в `tests/codeHealth.test.ts`.

Acceptance:

- `npm run check` проходит;
- `npm run check:perf` проходит: p95 `52.393ms` при threshold `150ms`;
- `git diff --check` проходит.

### P1. JobGrid controller extraction

Status: completed locally on 2026-06-14.

Цель: снизить риск в самом крупном пользовательском модуле без изменения HTML
контента и карточек вакансий.

Сделать:

- вынести inline browser-controller из `src/components/JobGrid.astro` в
  bundled module `src/scripts/jobGridController.js`;
- оставить Astro-разметку и данные без смысловых изменений;
- покрыть ключевые selectors/data attributes smoke-тестом;
- прогнать desktop/mobile browser QA по основным grid routes.

Acceptance:

- размеры/порядок первичных карточек не меняются;
- batch loading, city select, filters, compare toggle и apply clicks работают;
- GA4-события `apply_click`, `vacancy_open`, `grid_reveal_more`,
  `grid_city_select`, `grid_filter_change`, `compare_toggle` продолжают
  стрелять в DOM-level тестах или browser QA;
- `npm run check:release` проходит.

Local result:

- `src/components/JobGrid.astro`: 1355 -> 514 physical lines, max-lines
  disable removed;
- new bundled controller: `src/scripts/jobGridController.js`;
- sanitizer duplicate removed from grid controller; controller imports
  `src/scripts/sanitize.js`;
- Chrome mobile/desktop smoke: reveal-more `24 -> 48` cards, overflowX `0`,
  compare toggle writes `compareList`, city hot-swap returns Moscow cards;
- WebKit mobile/desktop smoke: reveal-more `24 -> 48` cards, overflowX `0`;
- `npm run check`, `npm run build`, `npm run check:perf` and
  `git diff --check` pass after the extraction; latest perf p95 `48.741ms`;
- automated full visual runner was stopped after a Playwright CLI hang; partial
  failures were external Google Fonts timeouts, not controller errors.

### P1. Company page weight reduction

Status: completed locally on 2026-06-14.

Цель: убрать самый большой оставшийся HTML-вес после фикса тяжёлых hubs.

Факты baseline:

- `dist/companies/kuper-ex-sbermarket/index.html`: 2.19 MB;
- `dist/companies/alfa-bank/index.html`: 1.87 MB;
- `dist/companies/efin/index.html`: 1.20 MB;
- `dist/companies/t-bank/index.html`: 1.17 MB.

Сделать:

- найти конкретный источник веса на company pages;
- вынести вторичные списки/отзывы/длинные блоки в deterministic static batch
  endpoint, если источник веса подтверждён;
- сохранить выше-the-fold контент, canonical и JSON-LD.

Acceptance:

- top company HTML заметно меньше baseline;
- production-relevant pages возвращают 200 локально;
- sitemap/robots/canonical не меняются неожиданно;
- browser QA на company page desktop + mobile проходит.

Local result:

- источник веса подтверждён: company pages рендерили весь список вакансий
  бренда в основном HTML;
- добавлен общий карточный компонент `src/components/company/CompanyVacancyCard.astro`;
- добавлен deterministic static batch layer:
  `src/utils/companyVacancyBatches.ts`,
  `src/pages/api/company-vacancies/[companySlug]/[page].astro`,
  `src/scripts/companyVacanciesController.js`;
- `src/pages/companies/[slug].astro` теперь рендерит первые 24 вакансии и
  догружает остальные batch-фрагментами без изменения текстов вакансий/slugs;
- sitemap filter обновлён: `/api/company-vacancies/` исключён из sitemap,
  guard добавлен в `tests/companyVacancyBatches.test.ts`;
- post-build размеры:
  - `kuper-ex-sbermarket`: `2,186,608 -> 594,099` bytes;
  - `alfa-bank`: `1,871,991 -> 557,733` bytes;
  - `efin`: `1,203,004 -> 424,644` bytes;
  - `t-bank`: `1,167,613 -> 407,208` bytes;
- batch-фрагменты: `kuper-ex-sbermarket/2` `27,202` bytes,
  `alfa-bank/2` `29,932` bytes;
- build output: `8902` Astro pages, `8903` HTML files including `404.html`;
- `npm run build`, `npm run check`, `npm run check:perf` and
  `git diff --check` pass after the change; latest perf p95 `50.484ms`;
- sitemap artifact check passes: no `api/company-vacancies` URLs in
  `dist/sitemap-*.xml`;
- Chrome/WebKit mobile+desktop smoke passes on
  `/companies/kuper-ex-sbermarket/`: `24 -> 48` cards after click, status text
  updates, overflowX `0`, no console/page errors.

### P2. BaseLayout runtime split

Status: completed locally on 2026-06-14.

Цель: уменьшить хрупкость `src/layouts/BaseLayout.astro`.

Сделать:

- вынести browser i18n/runtime logic в отдельный `src/scripts/...` module;
- оставить head/meta/schema generation в Astro layout;
- проверить, что analytics, language switcher и JSON-LD serialization не
  меняют поведение.

Acceptance:

- `BaseLayout.astro` меньше и без новых max-lines исключений;
- `npm run check:release` проходит;
- основные страницы без console errors в browser QA.

Local result:

- поздний browser runtime вынесен из `src/layouts/BaseLayout.astro`:
  - `src/scripts/regionDetector.js` — best-effort geo/IP detection и событие
    `kurieros:region-detected`;
  - `src/scripts/i18nRuntime.js` — `window.kurieros_i18n`,
    `window.translations`, fragment loading/cache и `kurieros:lang-change`;
- anti-FOUC theme inline, owner mute, analytics injection, meta/canonical/OG и
  JSON-LD оставлены в layout без смысловых изменений;
- `BaseLayout.astro`: около `800 -> 353` lines;
- guard обновлён в `tests/codeHealth.test.ts`: layout импортирует runtime
  modules, не содержит geo fetch/i18n manager inline, остаётся меньше 450 lines;
- browser smoke на `/v/yandex-eda-courier-moskva-foot/` в Chrome/WebKit
  mobile+desktop: `window.kurieros_i18n` и `window.translations` появляются,
  `setLanguage('uz')` грузит vacancy fragment, `html[lang]` становится `uz`,
  fragment failures `0`, console/page errors `0`;
- `npm run build`, `npm run check`, `npm run check:perf` and
  `git diff --check` pass after the split; latest perf p95 `52.069ms`.

### P2. Review sample helper extraction and unification

Status: completed locally on 2026-06-14 after owner approval for behavioral
sample unification.

Цель: убрать дублирование deterministic review sampling без изменения
текстов отзывов и сделать видимые брендовые выборки согласованными между
страницами.

Сделано:

- добавлен shared helper `src/utils/reviewSamples.ts`;
- `ReviewsBlock.astro`, `reviewsAggregate.ts` и `companies/[slug].astro`
  используют общий helper вместо локального shuffle/slice кода;
- aggregate/vacancy surfaces используют один брендовый seed
  `otzyvy-${brand}` и показывают одинаковые 6 review ids;
- company pages показывают первые 4 review ids из того же брендового sample;
- sample предпочитает уникальные имена и города, а к повтору имени
  возвращается только если в пуле не хватает уникальных авторов;
- homepage teaser сохраняет отдельный seed `reviews-home` и уникальные имена;
- добавлен `tests/reviewSamples.test.ts` с parity checks и guard против
  мутации input arrays.

Acceptance:

- targeted lint/tests прошли;
- source-level check по 9 брендам: aggregate ids == vacancy ids, company ids
  == prefix aggregate ids, имена уникальны, города уникальны;
- full release checks см. latest verification snapshot.

### P3. CSS selector cleanup

Status: first approved scoped batch completed locally on 2026-06-14; broader
semantic-selector/stylelint cleanup remains open for later small batches.

Цель: снизить visual regression risk от bare HTML selectors в
`src/styles/index.css`.

Сделать:

- заменить самые рискованные bare selectors на scoped classes;
- начать с header/navigation, затем двигаться маленькими visual batches;
- добавить CSS lint rule только после первого успешного scoped batch.

Acceptance:

- desktop/mobile screenshots не показывают регрессий;
- no large one-shot rewrite;
- build/lint/typecheck проходят.

Local result:

- `Header.astro` получил `class="site-header"`;
- bare `header`/desktop `nav` rules in `src/styles/index.css` scoped to
  `.site-header`;
- obsolete `.guide-hero` reset removed because the leaking bare `header`
  selector no longer applies to guide heroes;
- Chrome/WebKit mobile+desktop manual QA: header remains sticky, guide hero is
  normal static block, overflowX `0` on checked routes;
- screenshots saved under `output/visual-browser-qa/manual-css-header/`.

## Hold / needs explicit approval

Эти пункты не выполнять в рамках code-only плана без отдельного разрешения,
потому что они могут менять видимый текст, смысл страницы или бизнес-логику:

- `HUB-FLEX-1`: text edits для flexible hub/categories; показывать before/after
  owner approval перед любым изменением текста;
- любые изменения вакансий, источников вакансий, slugs, домена, DNS, email,
  referral ids.

## Operating rule

Двигаемся батчами сверху вниз. После каждого батча:

1. обновить статус в этом документе;
2. прогнать acceptance checks батча;
3. если менялся browser behavior, сделать preview/browser QA;
4. только затем переходить к следующему батчу.

## Completion boundary

As of 2026-06-14, the code-only portion of this master plan is complete
locally:

- all source audit/reorg/performance/backlog items are either implemented,
  already-fixed, documented as release gates, external-only, or approval-gated;
- implemented batches have local verification evidence in their sections;
- remaining hold/open items require explicit owner choice because they change
  visible calculator behavior, editorial text, or broader CSS governance.

Latest verification snapshot:

- `npm run build`: pass, `8902` pages built;
- `npm run check`: pass, 46 test files passed / 1 skipped, 675 tests passed /
  4 skipped, coverage `94.2%` statements and `82.44%` branches;
- `npm run check:perf`: pass, city-neighbours p95 `47.328ms` at threshold
  `150ms`;
- `git diff --check`: pass;
- sitemap artifact check: no `/api/grid/`, `/api/grid-batch/`, or
  `/api/company-vacancies/` URLs in generated `dist/sitemap-*.xml`.

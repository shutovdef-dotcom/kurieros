# КурьерОК Astro

Статический Astro-сайт для `kurerok.ru`: каталог курьерских вакансий,
городские и форматные хабы, страницы вакансий, сравнение, калькулятор,
гайды, отзывы и SEO/GEO-страницы.

## Быстрый старт

```sh
npm install
npm run build
npm run preview -- --host 127.0.0.1 --port 4323
```

Локальные wrapper-скрипты:

```sh
npm run local:build
npm run local:preview
npm run local:dev
```

Обычный preview для проверки в браузере:

- `http://127.0.0.1:4323/`
- `http://127.0.0.1:4323/podrabotka-kurerom/`
- `http://127.0.0.1:4323/rabota-peshim-kurerom/`
- `http://127.0.0.1:4323/compare/`

## Основные команды

```sh
npm run generate:data       # i18n, отзывы, llms, empty-listings
npm run build               # production static build в dist/
npm run preview             # preview production-сборки
npm run typecheck           # astro check
npm run lint                # eslint по src/ и scripts/
npm test                    # vitest
npm run test:coverage       # vitest coverage
npm run lint:worker         # eslint по workers/
npm run test:worker         # vitest для Cloudflare Worker
npm run check:worker        # lint + tests Worker
npm run bench:city-neighbours # performance guard для geo-соседей городов
npm run check               # lint + typecheck + coverage + worker gate
npm run check:perf          # performance guard
npm run check:release       # build + check + perf + git diff --check
```

`npm run build` автоматически запускает `generate:data` через `prebuild`.
Для code-only проверки поверх уже сгенерированных данных можно запускать
`npx astro build`: это пересобирает `dist/`, но не перезаписывает входные
данные вакансий и переводов. `dist/` не редактируется вручную.

## Документация

- [Карта проекта](docs/project-overview.md)
- [Архитектура](docs/architecture.md)
- [QA и релизные проверки](docs/qa-and-release-checklist.md)
- [CSS conventions](docs/css-conventions.md)
- [Design tokens](docs/design-tokens.md)
- [Backlog](docs/backlog.md)
- [Master code health plan](docs/master-code-health-plan-2026-06-14.md)
- [Performance audit](docs/performance-audit-2026-06-14.md)

## Ключевые поверхности

- `src/pages/[slug].astro` — городские и категорийные listing pages.
- `src/components/TransportHub.astro` — 4 транспортных хаба.
- `src/components/JobGrid.astro` — сетка вакансий, фильтры, city hot-swap,
  compare state и lazy batch loading; browser controller живёт в
  `src/scripts/jobGridController.js`.
- `src/components/ListingCityFilter.astro` — фильтр listing pages по городу;
  сохранённый город не применяет тяжёлый hub-фильтр на загрузке, явный
  `#city=<slug>` применяет его как deep link.
- `src/components/JobCard.astro` — карточка вакансии.
- `src/pages/api/grid/[citySlug].astro` — статический HTML-фрагмент city grid.
- `src/pages/api/grid-batch/[listingSlug]/[page].astro` — batch-фрагменты
  для догрузки карточек.
- `src/pages/api/company-vacancies/[companySlug]/[page].astro` —
  batch-фрагменты вакансий на страницах компаний.
- `src/pages/v/[slug].astro` — детальная страница вакансии.
- `src/utils/vacancyPage.ts` — pure helpers для детальной страницы вакансии.
- `src/utils/reviewSamples.ts` — deterministic sampling отзывов без
  дублирования shuffle/slice логики.
- `src/scripts/reviews/submitReview.ts` — отправка отзывов в optional
  `PUBLIC_REVIEWS_API` с локальным fallback для preview/dev.
- `workers/ozon-lead/src/index.js` — Cloudflare Worker для Ozon lead-form,
  экспортирует testable helpers и валидирует заявки на серверной стороне.
- `src/layouts/BaseLayout.astro` — head, schema, analytics, модалки,
  imports для runtime i18n/region modules.
- `src/scripts/regionDetector.js` и `src/scripts/i18nRuntime.js` —
  browser runtime для региона и переводов.
- `src/utils/geoDistance.ts` — поиск ближайших городов для city insights,
  оптимизирован bounded top-k без full sort всего каталога.
- `astro.config.mjs` — sitemap, build timestamp, empty-listings guard.

## Данные

- `src/data/vacancies.ts` и `src/data/sources/*` — исходники вакансий.
- `src/data/jobs.ts` — сгенерированный каталог вакансий.
- `src/data/cities-dataset.ts`, `src/data/cityGeo.json`,
  `src/data/cityPostal.json` — города, гео и почтовые данные.
- `src/data/translations/` — shell UI dictionary.
- `src/data/i18n/clauses/*` и `src/data/vacancy-translations-source/*` —
  источники переводов вакансий.
- `public/vacancy-translations/<lang>/<sourceSlug>.json` — runtime-фрагменты
  переводов после генерации.
- `public/empty-listings.json` — thin-listing exclusion для sitemap.

## Минимальный чек перед handoff

```sh
npm run check:release
```

Для более быстрого локального цикла без полной сборки:

```sh
npm run check
npm run check:perf
git diff --check
```

Для визуальных или браузерных правок дополнительно:

```sh
PATH='/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin' \
QA_BASE_URL='http://127.0.0.1:4323' \
QA_ROUTES='/podrabotka-kurerom/ /rabota-peshim-kurerom/ /compare/' \
.agents/skills/visual-browser-qa/scripts/run-visual-browser-qa.sh
```

## Работа с preview

После визуальных, SEO, routing или browser-observable изменений:

1. Собрать проект.
2. Поднять или проверить preview на `127.0.0.1:4323`.
3. Проверить точные affected URLs через `curl -I`.
4. Для UI пройти Chrome + WebKit/Safari-engine, особенно mobile viewports.
5. В финальном handoff дать конкретные localhost-ссылки.

Live-проверки выполняются read-only: HTTP status основных маршрутов,
`sitemap-index.xml`, `robots.txt`, JSON API, безопасный `OPTIONS` preflight
для Worker и browser smoke без отправки лидов или публикации изменений.

## Важные ограничения

- Не менять домен, DNS, email, slugs и реферальные реквизиты без отдельного
  явного запроса.
- Не редактировать `dist/` вручную.
- Не откатывать чужие незакоммиченные изменения.
- Для новых глобальных CSS-правил следовать `docs/css-conventions.md`.
- Для крупных визуальных изменений запускать mobile-first visual QA.

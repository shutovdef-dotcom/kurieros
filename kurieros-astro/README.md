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
```

`npm run build` автоматически запускает `generate:data` через `prebuild`.
`dist/` не редактируется вручную.

## Документация

- [Карта проекта](docs/project-overview.md)
- [Архитектура](docs/architecture.md)
- [QA и релизные проверки](docs/qa-and-release-checklist.md)
- [CSS conventions](docs/css-conventions.md)
- [Design tokens](docs/design-tokens.md)
- [Backlog](docs/backlog.md)

## Ключевые поверхности

- `src/pages/[slug].astro` — городские и категорийные listing pages.
- `src/components/TransportHub.astro` — 4 транспортных хаба.
- `src/components/JobGrid.astro` — сетка вакансий, фильтры, city hot-swap,
  compare state и lazy batch loading.
- `src/components/JobCard.astro` — карточка вакансии.
- `src/pages/api/grid/[citySlug].astro` — статический HTML-фрагмент city grid.
- `src/pages/api/grid-batch/[listingSlug]/[page].astro` — batch-фрагменты
  для догрузки карточек.
- `src/pages/v/[slug].astro` — детальная страница вакансии.
- `src/layouts/BaseLayout.astro` — head, schema, analytics, модалки,
  runtime i18n fragments.
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
npm run build
npm test
npm run lint
npm run typecheck
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

## Важные ограничения

- Не менять домен, DNS, email, slugs и реферальные реквизиты без отдельного
  явного запроса.
- Не редактировать `dist/` вручную.
- Не откатывать чужие незакоммиченные изменения.
- Для новых глобальных CSS-правил следовать `docs/css-conventions.md`.
- Для крупных визуальных изменений запускать mobile-first visual QA.

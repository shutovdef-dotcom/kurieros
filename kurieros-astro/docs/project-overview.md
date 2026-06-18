# Карта проекта

Документ фиксирует текущую рабочую поверхность проекта, чтобы новые правки
не начинались с повторного поиска по всему репозиторию.

## Назначение

`kurieros-astro` — static Astro-проект для сайта `kurerok.ru`. Основная
задача сайта: привести пользователя к подходящей курьерской вакансии или
сравнению форматов через городские, категорийные и транспортные страницы.

## Основные пользовательские маршруты

- `/` — главная, подбор города и вход в вакансии.
- `/rabota-kurerom-{city}/` — городские страницы.
- `/rabota-kurerom-{category}/` — категорийные страницы.
- `/podrabotka-kurerom/`, `/rabota-peshim-kurerom/`,
  `/rabota-avtokurerom/`, `/rabota-velokurerom/` — транспортные/форматные
  хабы.
- `/v/{slug}/` — страница вакансии.
- `/companies/` и `/companies/{slug}/` — компании.
- `/compare/` — сравнение вакансий.
- `/calculator/` — калькулятор дохода.
- `/guide/`, `/blog/`, `/otzyvy/`, `/cities/` — контентные и справочные
  разделы.

## Каталоги

```text
src/
  components/   Astro-компоненты, карточки, фильтры, хабы, модалки
  data/         вакансии, города, компании, переводы, отзывы, статьи
  layouts/      BaseLayout и общий head/runtime
  pages/        статические и динамические маршруты Astro
  scripts/      браузерные TS/JS модули
  styles/       глобальные стили и темы
  utils/        бизнес-логика, фильтры, schema, индексы

scripts/        генераторы данных и локальные shell wrapper-скрипты
tests/          Vitest unit/build-output tests
public/         favicon, robots, llms, generated public fragments
docs/           проектная документация, SEO/design/backlog материалы
workers/        отдельные worker-поверхности
```

## Генерация данных

`npm run generate:data` выполняет:

1. i18n extraction/assembly/tests.
2. validation translation keys.
3. генерацию per-source vacancy translations.
4. генерацию aggregate reviews.
5. генерацию `llms.txt` / `llms-full.txt`.
6. генерацию `public/empty-listings.json`.

`npm run build` запускает эту цепочку автоматически через `prebuild`.

## Сгенерированные артефакты

- `dist/` — production static build, не редактируется вручную.
- `public/vacancy-translations/` — runtime JSON fragments.
- `public/empty-listings.json` — используется `astro.config.mjs` для sitemap.
- `public/llms.txt`, `public/llms-full.txt` — answer-engine файлы.

## Тестовая поверхность

Тесты покрывают:

- фильтрацию вакансий и city matching;
- schema/JobPosting;
- compare list/grid parity;
- i18n assembly safety;
- city insights;
- reviews aggregate;
- review sampling helpers;
- vacancy page pure helpers;
- Cloudflare Worker validation/helpers;
- generated build output после `npm run build`;
- page-weight invariants для city/grid/company batch endpoints.

## Где смотреть при типовых задачах

| Задача | Файлы |
| --- | --- |
| Карточка вакансии | `src/components/JobCard.astro` |
| Сетка/фильтры/догрузка | `src/components/JobGrid.astro`, `src/scripts/jobGridController.js` |
| Городские/категорийные страницы | `src/pages/[slug].astro` |
| Транспортные хабы | `src/components/TransportHub.astro`, `src/pages/rabota-*.astro` |
| Детальная вакансия | `src/pages/v/[slug].astro`, `src/components/vacancy/*`, `src/utils/vacancyPage.ts` |
| Страницы компаний | `src/pages/companies/[slug].astro`, `src/components/company/*`, `src/pages/api/company-vacancies/[companySlug]/[page].astro` |
| Sitemap/noindex | `astro.config.mjs`, `src/utils/listingSlugs.ts` |
| Schema.org | `src/utils/schema.ts`, page-level schema builders |
| Runtime i18n | `src/scripts/i18nRuntime.js`, `src/scripts/regionDetector.js`, `src/data/translations/*` |
| Отзывы | `src/components/ReviewsBlock.astro`, `src/utils/reviewsAggregate.ts`, `src/utils/reviewSamples.ts` |
| Visual QA | `.agents/skills/visual-browser-qa/` |
| Preview handoff | `.agents/skills/local-preview-handoff/` |

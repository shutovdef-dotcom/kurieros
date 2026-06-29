# Архитектура

Этот документ описывает текущую архитектуру сайта и основные инварианты,
которые нельзя ломать при будущих правках.

## Высокоуровневая схема

```text
source vacancy data
  -> scripts/generate-*.ts
  -> src/data/jobs.ts + public generated assets
  -> Astro static pages
  -> dist/
```

Сайт собирается как static output. Большинство пользовательских страниц
предрендерятся во время `astro build`; API routes в этом проекте тоже
используются как статические HTML/JSON-фрагменты.

## Listing pages

`src/pages/[slug].astro` генерирует два типа страниц:

- city listings: `/rabota-kurerom-{city}/`;
- category listings: `/rabota-kurerom-{category}/`.

Критичный invariant: фильтрация вакансий на странице, sitemap/noindex
логика и batch endpoints должны использовать один и тот же predicate.

Источник истины:

- `src/utils/jobFilters.ts`
- `src/utils/jobsByCityIndex.ts`
- `src/utils/citiesIndex.ts`
- `src/utils/listingSlugs.ts`

`src/pages/[slug].astro` использует `jobsByCity` для city lookups и
`filterJobsByCriteria` для category/tag/search.

## JobGrid и lazy loading

`src/components/JobGrid.astro` работает в двух режимах:

- обычный curated limit для главной;
- `revealable=true` для listing/hub pages.

Для тяжёлых страниц `revealable=true` рендерит только первый batch
из 24 вакансий в основном HTML. Остальные карточки доступны через:

```text
/api/grid-batch/[listingSlug]/[page]/
```

Этот endpoint рендерит тот же `JobCard`, поэтому разметка карточек не
дублируется в JS.

Browser behavior сетки вынесен в bundled module:

- `src/scripts/jobGridController.js` — filters, compare state, reveal-more,
  city hot-swap и analytics events.
- `src/scripts/sanitize.js` — общий DOM sanitizer для HTML-фрагментов.

## City hot-swap

При смене города клиентский код в `JobGrid.astro` fetch-ит не полную
страницу города, а статический фрагмент:

```text
/api/grid/[citySlug]/
```

Endpoint возвращает только `#jobs-grid`. Клиент переносит элементы через
whitelist DOM clone, а не через прямой `innerHTML`, и дополнительно чистит
опасные attributes/URLs.

Связанные файлы:

- `src/pages/api/grid/[citySlug].astro`
- `src/components/JobGrid.astro`
- `src/scripts/sanitize.js`
- `tests/sanitize.test.ts`
- `tests/sanitizeParity.test.ts`

## Batch endpoints

`src/utils/listingBatches.ts` строит соответствие:

- city listing slug -> city jobs;
- category listing slug -> category jobs;
- hub slug -> hub jobs.

`src/pages/api/grid-batch/[listingSlug]/[page].astro` использует эту функцию
и отдаёт `.jobs-grid-batch` с `data-overflow-count` и `data-next-batch-url`.

Sitemap обязан исключать `/api/grid-batch/`, потому что это технические
фрагменты, а не пользовательские страницы.

## Company pages

`src/pages/companies/[slug].astro` генерирует страницу компании. Чтобы
страницы крупных брендов не разрастались до мегабайтов HTML, основной HTML
рендерит первый batch вакансий компании, а остальные вакансии доступны через
статический fragment endpoint:

```text
/api/company-vacancies/[companySlug]/[page]/
```

Источник batch-инвариантов:

- `src/components/company/CompanyVacancyCard.astro`
- `src/utils/companyVacancyBatches.ts`
- `src/pages/api/company-vacancies/[companySlug]/[page].astro`
- `src/scripts/companyVacanciesController.js`

Sitemap обязан исключать `/api/company-vacancies/`: это технические
фрагменты, не самостоятельные landing pages.

SEO-инвариант: `/companies/{slug}/` — главная индексируемая страница
работодателя. Брендовые листинги вакансий остаются коммерческими
страницами и при совпадении интента canonical-ятся на страницу компании.
Карта и чеклист добавления новых работодателей: `docs/seo/company-seo-architecture.md`.

## Transport hubs

Транспортные хабы:

- `/podrabotka-kurerom/`
- `/rabota-peshim-kurerom/`
- `/rabota-avtokurerom/`
- `/rabota-velokurerom/`

Page files отвечают за data/schema/BaseLayout. `TransportHub.astro`
отвечает за body, hero, фильтры, city select, JobGrid, FAQ и cross-links.

## Vacancy pages

`src/pages/v/[slug].astro` генерирует страницу на каждую вакансию из
`src/data/jobs.ts`.

Ключевые зависимости:

- `src/utils/schema.ts` — JobPosting/Breadcrumb schema.
- `src/components/vacancy/*` — секции вакансии.
- `src/data/vacancies.ts` и `src/data/sources/*` — исходные offer данные.
- `src/utils/applyCta.ts` — CTA label/logic.

## BaseLayout

`src/layouts/BaseLayout.astro` отвечает за:

- canonical/robots/OG/meta;
- favicon stack;
- structured data graph;
- theme persistence;
- analytics injection only in production;
- owner mute flag;
- imports browser runtime modules for region detection and vacancy
  translation fragments;
- global modals.

Browser runtime вынесен из layout:

- `src/scripts/regionDetector.js` — best-effort geo/IP detection.
- `src/scripts/i18nRuntime.js` — `window.kurieros_i18n`,
  `window.translations`, fragment cache и language switching.

Критичный security invariant: JSON-LD сериализуется через
`JSON.stringify(...).replace(/</g, '\\u003c')`, чтобы строки не могли
закрыть `<script type="application/ld+json">`.

## SEO and indexing

`astro.config.mjs`:

- задаёт `site`, `base`, `output: static`;
- добавляет sitemap;
- исключает технические routes и empty listings;
- выставляет sitemap priorities/changefreq;
- держит единый `__BUILD_TIMESTAMP__` для cache-busting runtime fragments.

Thin listings с 0-1 вакансией:

- получают `noindex, follow` на page level;
- исключаются из sitemap через `public/empty-listings.json`.

## Styling

Глобальные стили живут в:

- `src/styles/index.css`
- `src/styles/themes.css`

Scoped styles в `.astro` компонентах предпочтительны для компонентной
верстки. Глобальные bare selectors для `header`, `main`, `section`,
`article`, `aside`, `nav`, `footer` запрещены правилами
`docs/css-conventions.md`.

Карточки вакансий используют container queries для внутренних метрик:
layout зависит от ширины карточки, а не всего viewport.

## Known architecture risks

Эти зоны не обязательно сломаны, но требуют осторожности:

- `JobGrid.astro` всё ещё крупный UI composition file, но browser controller
  уже вынесен в module.
- `BaseLayout.astro` всё ещё совмещает head, analytics и модалки, но region
  detection/i18n runtime уже вынесены в modules.
- `src/pages/v/[slug].astro` содержит много render-side бизнес-логики.
- `OzonLeadModal.astro` крупный и чувствительный к UX/security ошибкам.
- `src/styles/index.css` большой; глобальные изменения могут иметь широкий
  blast radius.

При рефакторинге этих зон лучше работать маленькими батчами и закреплять
каждый шаг тестом или browser QA.

# Kurieros Astro

Статический Astro-проект для сайта `kurieros` с вакансиями курьеров, страницами городов и категорий, сравнением вакансий и блогом.

## Стек

- `Astro`
- `@astrojs/sitemap`
- локальный `Node.js` из `/Users/ivan/Documents/scratch/node-v22.14.0-darwin-arm64`

## Основные команды

Из папки `/Users/ivan/Documents/scratch/kurieros/kurieros-astro`:

```sh
npm install
npm run generate:data
npm run build
npm run dev
npm run preview
```

Локальные скрипты через встроенный Node:

```sh
./scripts/build-local.sh
./scripts/dev-local.sh
./scripts/preview-local.sh
```

## Локальная проверка

- `build`: собирает статический сайт в `dist/`
- `dev`: запускает dev-сервер Astro
- `preview`: поднимает локальный preview production-сборки

Если нужен локальный Node из репозитория, он добавляется через скрипты в `scripts/`.

## SEO аналитика (production)

В `BaseLayout` уже добавлено подключение аналитики для production-сборок:

- `PUBLIC_GA4_MEASUREMENT_ID` — ID счётчика Google Analytics 4 (например, `G-XXXXXXX`)
- `PUBLIC_YANDEX_METRIKA_ID` — ID счётчика Яндекс.Метрики

## Структура проекта

```text
src/
  components/   UI-компоненты и клиентские скрипты
  data/         вакансии, переводы, статьи, отзывы
  layouts/      базовый layout
  pages/        страницы сайта и динамические маршруты
  styles/       глобальные стили и темы
  utils/        вспомогательные функции

public/         статические файлы
scripts/        локальные команды сборки и dev-preview
docs/           вспомогательные заметки
```

## Важные поверхности

- `src/pages/[slug].astro` — страницы городов и категорий
- `src/components/JobGrid.astro` — фильтрация и вывод сетки вакансий
- `src/components/JobCard.astro` — карточка вакансии
- `src/pages/compare.astro` — страница сравнения вакансий
- `src/layouts/BaseLayout.astro` — общий layout и глобальные модалки
- `src/styles/index.css` — глобальные стили

## Данные

- `src/data/vacancies.ts` — исходники базовых вакансий
- `src/data/jobs.ts` — сгенерированный список вакансий
- `src/data/translations/` — общий shell-UI словарь (Russian only после PR #131)
- `src/data/i18n/clauses/<lang>.json` — клаузный словарь переводов (PR #130)
- `src/data/vacancy-translations-source/<lang>.json` — собранные per-source фрагменты, генерируются из клаузных словарей
- `public/vacancy-translations/<lang>/<sourceSlug>.json` — runtime-фрагменты, грузятся в браузере
- `src/data/articles.json` — блог
- `src/data/reviews.json` — отзывы

## Checklist перед merge

```sh
npm run build
```

Для UI-правок стоит отдельно проверить:

- главную страницу
- одну страницу города
- одну страницу категории
- страницу сравнения
- одну страницу вакансии

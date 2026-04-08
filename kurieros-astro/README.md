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

- `src/data/jobs.json` — вакансии
- `src/data/translations.ts` и `src/data/job_translations.json` — переводы
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

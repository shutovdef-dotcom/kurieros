# Backlog — отложенные правки

Список технических задач, которые осознанно отложены, чтобы не раздувать
текущий PR. Каждая запись — самодостаточное ТЗ: можно взять в работу
без дополнительного контекста.

Статусы: **open** — ещё не сделано / **in_progress** — кто-то взял /
**done** — сделано (переезжает в `kurieros-stats/code-fixes-*.md` и
удаляется отсюда).

---

## Open

### HUB-FLEX-1 — Ревизия хаба «Подработка» и категорий после расширения тега `flexible`

**Дата:** 2026-05-22
**Статус 2026-06-14:** owner решил не исключать вечерние/ночные категории из
`flexible`. Любые текстовые правки по хабу делать только через before/after и
после отдельного approval.
**Контекст:** тег `flexible` стал data-driven — выводится из поля
`schedule` через `src/utils/flexibleSchedule.ts`, а не хардкодится на
Яндекс Еде. Выборка выросла с 399 вакансий / 1 компании до 3020 / 8.
Это меняет наполнение `/podrabotka-kurerom/` и 5 категорийных фасетов,
которые фильтруются по тегу `flexible`.

**Где живёт проблема:**
- `src/utils/transportHubs.ts` (`HUB_CONFIGS.flexible`) + `TransportHub.astro` —
  FAQ и вводные тексты хаба писались под узкую выборку; проверить, что
  формулировки корректны при 8 компаниях.
- `src/data/constants.ts` — категории `vecherom` («Вечерняя подработка»)
  и `nochyu` («Ночная смена») замаплены на тег `flexible`, который по
  смыслу шире времени суток. Маппинг категория→тег огрублён.

**Что хочется (acceptance criteria):**
1. Перечитать FAQ и вводные тексты хаба «Подработка» — убедиться, что
   они не подразумевают одну компанию / один формат.
2. Решить судьбу `vecherom` / `nochyu`: отдельные теги по времени суток
   (`evening` / `night`) либо переименование категорий под широкую выборку.

**Effort:** S–M.
**Impact:** не блокирует — хаб и категории наполнены валидными
вакансиями; вопрос точности копирайта и семантики категорий.

**Связано:** PR SEO-rollout (#185), `src/utils/flexibleSchedule.ts`.

---

### CSS-1 — Системно убрать селекторы по голому HTML-тегу из `src/styles/`

**Дата:** 2026-05-23
**Статус 2026-06-14:** header/navigation scoped batch выполнен с manual
Chrome/WebKit screenshot QA. Остается более широкий cleanup по другим
semantic selectors и возможный stylelint-гейт отдельным маленьким batch.
**Контекст:** в `src/styles/index.css` есть правила вида `header { … }` —
селекторы по голому HTML-тегу. Это матчит любой такой тег на любой
странице, что привело к утечке стилей сайтовой шапки (`position:sticky`,
`backdrop-filter`, `display:flex`) на `<header class="guide-hero">` в
инфо-гайдах (`InfoGuideLayout.astro`) и pre-existing страницах
`/guide/[topic]/`, `/guide/`. На PR #185 — точечный фикс: `.guide-hero`
reset в `index.css` (specificity класса бьёт голый тег). Эта запись —
план по корневому фиксу.

**Где живёт проблема:**
- `src/styles/index.css` — голый селектор `header { … }` минимум в 8
  местах (строки 36, 143, 176, 204, 252, 282, 831, 852). Прогнать
  grep'ом и для других семантических тегов (`body`, `main`, `nav`,
  `section`, `article`, `aside`, `footer`).
- `src/components/Header.astro:5` — сайтовая шапка использует голый
  `<header>` (нужен класс `site-header`).

**Что хочется (acceptance criteria):**
1. Переименовать `header { … }` → `header.site-header { … }` в
   `index.css` (8 вхождений + вложенные селекторы).
2. Добавить `class="site-header"` в `<header>` в `Header.astro`.
3. Прогнать ту же чистку для других голых селекторов семантических
   тегов в `index.css`.
4. Поднять `stylelint` + `stylelint-config-standard`, прописать правило
   `selector-no-qualifying-type` (или `selector-max-type: 0`) на
   `src/styles/*.css`. Добавить `lint:css` скрипт, вшить в гейт.
5. После C — `.guide-hero` reset, добавленный в `index.css` на PR #185,
   становится не нужен. Удалить.

**Effort:** M. Обязательный ручной smoke сайтовой шапки на mobile +
desktop после правки. Линтер потребует чистки существующих нарушений.

**Impact:** убирает целый класс багов «глобальное правило по тегу
протекает на любой такой тег в проекте».

**Связано:** соседняя запись HUB-FLEX-1, коммит этого PR с точечным
`.guide-hero` reset в `index.css`, `docs/css-conventions.md`.

---

### REVIEW-SAMPLE-1 — Унифицировать сэмпл отзывов между `/otzyvy/` и `/v/{slug}/`

**Дата:** 2026-05-23
**Статус 2026-06-14:** выполнено локально после owner approval. Aggregate и
vacancy surfaces используют одинаковые 6 brand review ids; company pages берут
первые 4 из того же sample; helper предпочитает уникальные имена и города.
**Контекст:** `ReviewsBlock.astro` (на странице вакансии) и
`ReviewsAggregate.astro` (на `/otzyvy/`) используют разные seed-строки при
выборке 6 отзывов из бренд-пула. У первой это
`seededShuffle(brandReviews, 'reviews-${company}').slice(0, 6)`, у второй —
собственная логика в `reviewsAggregate.ts` → `buildReviewAggregate()`. Пул
один и тот же, рейтинг считается одинаково, но видимые 6 имён отличаются.
Замечено в ручном QA: на `/v/ozon-courier-bryansk-auto/` блок показал
{Алексей, Санжар, Дастан, Иван, Улан, Давид}, а на `/otzyvy/` Ozon-секция
показала {Гайк, Аслан, Иван, Санжар, Армен, Шерзод}. Пересечение — 2.
Пользователь, кликнувший с `/otzyvy/` → на вакансию того же бренда, видит
другие имена.

**Где живёт:**
- `src/components/ReviewsBlock.astro` —
  `seededShuffle(brandReviews, 'reviews-${company}').slice(0, 6)`.
- `src/utils/reviewsAggregate.ts` — `buildReviewAggregate()` строит
  `summary.sampleReviews`.

**Что хочется (acceptance criteria):**
1. Один источник истины для «топ-6 отзывов бренда» — общий хелпер
   `pickBrandSample(reviews, brand, count = 6)` в
   `src/utils/reviewsAggregate.ts` с фиксированным seed.
2. Обе странички используют этот хелпер.
3. Unit-тест: для одного бренда и одного пула — обе странички получают
   идентичный массив `id`.

**Effort:** S (~30 строк, 2 файла + 1 тест).

**Impact:** UX-консистентность при cross-page навигации
(`/otzyvy/` → `/v/{vacancy-of-same-brand}/`).

**Связано:** PR SEO-rollout (#185), B16 — honest per-brand reviews.

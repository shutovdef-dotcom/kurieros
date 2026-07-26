# Google vacancy restore — 2026-07-23

## Решение

Основной спад показов был на `/v/`, а не на городских страницах и не на `/guide/`.
После деплоя selective vacancy indexing от 2026-07-01 большая часть карточек вакансий
начала отдавать `noindex` и выпала из sitemap. Для возврата Google-показов включён режим
полного восстановления индексируемости активных карточек вакансий:

- все активные `/v/.../` снова `index, follow`;
- все активные `/v/.../` снова попадают в `sitemap-vacancies-*.xml`;
- прежние причины индексации (`gsc_valid_jobposting`, `top_city_allowlist`, `local_score`,
  `gsc_vacancy_intent`) сохраняются для аналитики;
- финальный fallback для ранее отсечённых страниц помечается как `google_full_restore`;
- `HARD_NOINDEX_VACANCY_PATHS` остаётся выше полного восстановления, чтобы при необходимости
  точечно исключать реально плохие URL.

## Почему полный откат оправдан

До selective indexing Google уже давал сайту максимальные показы за счёт широкой `/v/` поверхности.
Изменения ради Яндекса не дали сопоставимого выигрыша, а риск для Google стал прямым: live HTML и
sitemap сами сообщали поиску, что индексировать нужно только малую часть вакансий. Поэтому текущий
приоритет — вернуть рабочую Google-модель и уже потом аккуратно улучшать качество страниц без
массового `noindex`.

## Ежедневная карусель переобхода

Добавлен локальный планировщик очереди:

```bash
npm run recrawl:carousel -- --write-default
npm run recrawl:carousel -- --engine=google-indexing-api --write-default
npm run recrawl:automation
```

Для Яндекса он строит очередь на 150 URL/день:

- примерно 100 URL из GSC-страниц, где уже были клики/показы или рекомендация `index_detail`;
- примерно 50 URL из остального восстановленного `/v/` хвоста;
- каждый день карусель сдвигается, поэтому URL не залипают в одном и том же топе;
- вывод остаётся dry-run очередью: фактическая отправка в Webmaster или URL Inspection — отдельное
  внешнее действие после явного подтверждения.

Для Google отдельный режим `--engine=google-indexing-api` строит очередь на 200 URL/день, потому что
это дефолтный дневной лимит `publish` в Google Indexing API. Это не GSC manual request: фактическая
отправка допустима только для URL с валидным `JobPosting`/`BroadcastEvent` structured data,
авторизованным service account и явным подтверждением запуска.

Google Search Console не имеет массового textarea-переобхода как Яндекс. Без Indexing API эта очередь
используется только как список приоритетных URL для выборочного URL Inspection.

## JobPosting для Google Indexing API

2026-07-26 по решению владельца сайта `JobPosting` расширен на всю активную `/v/` поверхность:

- все 6 685 активных `/v/.../` остаются `index, follow`;
- `JobPosting` включается на всех 6 685 страницах;
- эти же 6 685 URL попадают в `googleIndexingApiEligiblePaths` внутри
  `src/generated/vacancy-indexability.json`;
- дневная Google API очередь берёт из этого списка 200 URL/день.

Чтобы не выдумывать данные, optional-поля остаются source-aware:

- строки с `salaryConfidence: "estimated"` получают `JobPosting`, но без `baseSalary`;
- lead-form или непроверенный apply-flow получают `JobPosting`, но `directApply=false`;
- `datePosted` берётся из `postedAt`, а если источник не отдаёт отдельную дату публикации — из
  существующего `updatedAt` snapshot этой вакансии.

Файл правил: `src/data/jobPostingVerifiedCohort.ts`.

## Автоматический операторский запуск

Для ежедневного локального запуска добавлена команда:

```bash
npm run recrawl:automation
npm run google:indexing:daily
```

`npm run recrawl:automation` делает только безопасную подготовку:

- генерирует `output/recrawl-carousel/yandex-YYYY-MM-DD.{json,txt}`;
- генерирует `output/recrawl-carousel/google-indexing-api-YYYY-MM-DD.{json,txt}`;
- проверяет production `sitemap-index.xml` и первые URL из очереди через `HEAD` с fallback на `GET`;
- пишет человекочитаемый отчёт `output/recrawl-carousel/recrawl-automation-YYYY-MM-DD.md`;
- не отправляет URL в Яндекс Вебмастер, Google Search Console, Indexing API или IndexNow.

`npm run google:indexing:daily` строит те же очереди и дополнительно пытается отправить Google
200 URL через Indexing API. Скрипт fail-closed: перед вызовом API он проверяет live HTML каждого URL
на наличие `JobPosting`, а без service account завершится ошибкой `skipped_missing_credentials`.
Для Яндекса следующий шаг остаётся ручным: взять TXT-очередь и отправить её через Webmaster →
“Переобход страниц”.

Dry-run проверки Google submit-скрипта:

```bash
npm run google:indexing:submit -- --dry-run
```

Реальная отправка 200 URL выполняется только после production-деплоя, service account с доступом к
Search Console property и двух явных safety-флагов:

```bash
npm run google:indexing:submit -- \
  --service-account /absolute/path/to/service-account.json \
  --confirm-submit \
  --confirm-supported-content
```

Результат реальной отправки пишется в
`output/recrawl-carousel/google-indexing-api-submit-YYYY-MM-DD.jsonl`.

## Что проверять после релиза

1. В production HTML у восстановленных URL нет `noindex`.
2. `sitemap-vacancies-*.xml` снова содержит все активные `/v/`.
3. В GSC отслеживать:
   - показы `/v/` по дням;
   - страницы “Excluded by noindex” по выборке старых URL;
   - дату последнего скачивания sitemap;
   - URL Inspection для 5-10 URL из ежедневной очереди.
4. В Яндекс Webmaster при ручной отправке фиксировать дату, quota и статус `В очереди`.

## Не смешивать с откликом Ozon

Отключённый отклик в карточке Ozon — отдельный слой качества источника/перехода
(`applyFlowVerified`, `applyVerifiedAt`, `sourceCheckedAt`). Он не должен блокировать возврат
индексируемости, если сама страница активна и канонична.

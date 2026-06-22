# QA и релизные проверки

Эта инструкция описывает обязательные проверки после изменений, которые
затрагивают код, данные, визуал, SEO или маршруты.

## Минимальный локальный gate

```sh
npm run check:release
```

`check:release` запускает production build, lint, typecheck, coverage,
Worker gate, performance guard и `git diff --check`.

Если нужно разложить gate на отдельные команды:

```sh
npm run build
npm test
npm run test:coverage
npm run lint
npm run typecheck
npm run check:worker
npm run check:perf
npx --yes html-validate dist/index.html dist/podrabotka-kurerom/index.html dist/otzyvy/index.html dist/compare/index.html
npm audit --audit-level=moderate
git diff --check
```

Если менялись generated data inputs, запускать полный `npm run build`, а не
только `npx astro build`, потому что `prebuild` обновляет public/generated
артефакты.

Coverage target: branch coverage must stay at `80%+`.

Generated QA/coverage folders (`coverage/`, `output/`, `.playwright-cli/`) must
stay outside the Astro typecheck surface.

## Security/local scan

```sh
npm audit --audit-level=moderate
rg --files-with-matches "sk-|api[_-]?key|secret|password|token" \
  -g '!node_modules' -g '!dist' -g '!package-lock.json'
```

Секреты не печатать в отчётах. Если найден `.env`, показывать только имена
ключей и факт наличия файла, не значения.

## Browser preview handoff

После browser-observable изменений:

```sh
npm run build
npm run preview -- --host 127.0.0.1 --port 4323
curl -I http://127.0.0.1:4323/podrabotka-kurerom/
```

Если порт `4323` занят другим процессом, использовать следующий свободный
порт и все ссылки в handoff давать с фактическим портом.

## Visual QA

Для UI/layout/scroll/filter/lazy-load изменений запускать проектный runner:

```sh
PATH='/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin' \
QA_BASE_URL='http://127.0.0.1:4323' \
QA_ROUTES='/podrabotka-kurerom/ /rabota-peshim-kurerom/ /rabota-avtokurerom/ /compare/' \
.agents/skills/visual-browser-qa/scripts/run-visual-browser-qa.sh
```

Минимальная матрица:

- Chrome + WebKit/Safari-engine.
- Mobile first: `360x740`, `375x667`, `390x844`, `414x896`, `430x932`,
  `768x1024`.
- Desktop: `1366x768`, `1440x900`, `1920x1080`.

Проверять не только automated status, но и screenshots. Нельзя завершать
handoff, если есть horizontal overflow, обрезанный текст, перекрытия,
пустой экран или сломанный основной flow.

Для быстрой проверки дефолтных маршрутов можно использовать npm-алиас:

```sh
QA_BASE_URL='http://127.0.0.1:4323' \
QA_ROUTES='/ /rabota-kurerom-moskva/ /v/yandex-eda-courier-moskva-foot/ /companies/tetrika/' \
QA_VIEWPORTS='mobile-360:360:740 mobile-390:390:844 desktop-1366:1366:768' \
npm run qa:visual
```

## Site-size architecture QA

После изменений, которые влияют на вес сайта, i18n runtime, batch endpoints или
общие layout-скрипты:

```sh
npm run build
npm run test:site-size
npm run size:dist:check
```

Ручная проверка в браузере:

1. Открыть `/`, `/rabota-kurerom-moskva/`,
   `/v/yandex-eda-courier-moskva-foot/`, `/companies/tetrika/`.
2. В Network проверить, что `/i18n/shell.json`,
   `/bootstrap/theme-init.js` и `/bootstrap/owner-mute.js` грузятся как
   отдельные файлы, а не inline-копии в HTML.
3. На русском языке вакансионные fragments не должны грузиться до смены языка.
4. После смены языка на карточке/деталке должен грузиться только нужный
   `/vacancy-translations/<lang>/<sourceSlug>.json`, а не общий мегасловарь.
5. В Console не должно быть runtime errors, `kurieros:*load-failed` events или
   warnings от i18n runtime.
6. Проверить, что кнопка догрузки карточек продолжает получать HTML из
   `/api/grid-batch/.../`, а смена города получает `/api/grid/<slug>/`.

## Speed comparison

Для сравнения текущего продакшена, локальной версии из `dist/` и модельной
оценки Timeweb:

```sh
npm run build
npm run preview -- --host 127.0.0.1 --port 4323
npm run perf:compare-hosts
```

По умолчанию проверяются `/`, `/rabota-kurerom-moskva/`,
`/v/yandex-eda-courier-moskva-foot/`, `/companies/tetrika/`. Отчёт пишется в
`output/perf/host-speed-*/report.md` и `report.json`.

Timeweb в этом тесте не измеряется напрямую, пока сайт туда не загружен:
это прогнозная строка `timeweb-estimate`. Допущения можно менять:

```sh
TIMEWEB_TTFB_MS=160 \
TIMEWEB_BANDWIDTH_MBPS=50 \
TIMEWEB_COMPRESSION_RATIO=0.28 \
npm run perf:compare-hosts
```

## Regression checks for listing changes

Если менялись `JobGrid`, `JobCard`, listing pages, хабы или API fragments:

1. Проверить heavy listing:
   - `/podrabotka-kurerom/`
   - должно быть 24 карточки в initial HTML.
   - кнопка должна грузить batch 2, затем batch 3.
2. Проверить city listing:
   - `/rabota-kurerom-moskva/`
   - city hot-swap должен fetch-ить `/api/grid/<slug>/`.
3. Проверить batch endpoint:
   - `/api/grid-batch/podrabotka-kurerom/2/`
   - должен отдавать `.jobs-grid-batch`.
4. Проверить sitemap:
   - не должен содержать `/api/grid-batch/`.
   - не должен содержать `/api/grid/`.
   - не должен содержать `/api/company-vacancies/`.
   - `robots.txt` должен блокировать `/api/grid/`, `/api/grid-batch/` и
     `/api/company-vacancies/`.
5. Проверить mobile карточки:
   - доход/график/образование/опыт не должны наезжать друг на друга.
   - pill `Без опыта` не должен выходить за контейнер.

Если менялись company pages или `src/components/company/*`:

1. Проверить крупный бренд:
   - `/companies/kuper-ex-sbermarket/`
   - initial HTML должен содержать первый batch вакансий, а кнопка должна
     догружать следующий batch.
2. Проверить fragment endpoint:
   - `/api/company-vacancies/kuper-ex-sbermarket/2/`
   - должен отдавать карточки вакансий без full page shell.
3. Проверить sitemap:
   - `/api/company-vacancies/` не должен попадать в `dist/sitemap-*.xml`.

## SEO checks

Для SEO/routing/schema изменений:

- canonical на affected pages;
- `robots` для thin listings;
- sitemap chunks;
- JobPosting JSON-LD на `/v/*`;
- FAQ/ItemList/WebPage schema на хабах и listings;
- отсутствие технических fragment URLs в sitemap;
- `robots.txt`;
- `llms.txt` / `llms-full.txt`, если менялся answer-engine контент.

## Documentation handoff

После крупного аудита или серии фиксов обновить:

- `README.md`, если изменились команды/структура/preview flow.
- `docs/architecture.md`, если изменились page/data/batch invariants.
- `docs/qa-and-release-checklist.md`, если изменились gates.
- `docs/master-code-health-plan-2026-06-14.md`, если закрывается пункт
  code-health очереди.
- `docs/backlog.md` или audit report, если найдены новые риски.

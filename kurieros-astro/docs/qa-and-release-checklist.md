# QA и релизные проверки

Эта инструкция описывает обязательные проверки после изменений, которые
затрагивают код, данные, визуал, SEO или маршруты.

## Минимальный локальный gate

```sh
npm run build
npm test
npm run test:coverage
npm run lint
npm run typecheck
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
   - `robots.txt` должен блокировать `/api/grid/` и `/api/grid-batch/`.
5. Проверить mobile карточки:
   - доход/график/образование/опыт не должны наезжать друг на друга.
   - pill `Без опыта` не должен выходить за контейнер.

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
- `docs/backlog.md` или audit report, если найдены новые риски.

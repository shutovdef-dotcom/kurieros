# КурьерОК pseudo-command router

Псевдо-команды работают как короткие маршруты для Codex. Это не нативные slash-команды UI: если пользователь пишет команду в чате, Codex должен открыть этот файл, выбрать маршрут и выполнить задачу без загрузки полного ECC.

## Правила

- Не спрашивать подтверждение для обычных правок сайта, сборки, SEO/GEO-задач и чистки кода.
- Спрашивать или явно останавливаться только перед сменой домена, DNS, email, платёжных/реферальных реквизитов, удалением данных или destructive git-командами.
- Держать вывод коротким: что изменено, какие проверки прошли, что осталось.
- Не читать skill bodies заранее; открывать только skill, который нужен текущей команде.
- Не искать по `dist/`, кроме проверки результата после сборки.

## Команды сайта

### `/ui-cleanup`

Исправить визуальные, смысловые и адаптивные ошибки.

- Route: `src/pages/`, `src/components/`, `src/styles/index.css`.
- Skills: `frontend-patterns`; `frontend-design` только для заметной переработки внешнего вида; `playwright` только при реальной визуальной проверке.
- Checks: `npm run build`; HTML validate для затронутых страниц, если менялась разметка.

### `/city-pages`

Привести городские страницы к компактному виду, где вакансии видны раньше контентных блоков.

- Route: `src/pages/[slug].astro`, данные страниц, `JobGrid`.
- Goal: убрать лишние hero/плашки, ускорить путь к вакансиям, сохранить SEO-блоки ниже.
- Checks: build; выборочная HTML-проверка 1-2 городов.

### `/compare-mobile`

Исправить мобильную таблицу сравнения.

- Route: `src/pages/compare.astro`, `src/styles/index.css`.
- Goal: первая колонка sticky, первая колонка плюс 3 вакансии помещаются, текст переносится внутри ячеек.
- Checks: build; при необходимости Playwright screenshot.

### `/brand-rename`

Привести видимое написание бренда к `КурьерОК`.

- Route: `src/`, `public/` только если есть видимый текст.
- Do not change: `kurerok.ru`, email, DNS, slugs, canonical URLs.
- Checks: `rg "Курьерок|курьерок|КУРЬЕРОК" src public`; build.

## SEO/GEO

### `/seo-audit`

Найти и приоритизировать SEO-задачи.

- Skills: `seo`, `indexlift-seo-auditor`.
- Output: P0/P1/P2 список, затронутые страницы, минимальная реализация.
- Checks: sitemap/robots/canonical/schema/title/description/internal links.

### `/seo-implement`

Взять следующий SEO-пункт и реализовать маленьким батчем.

- Skills: `seo`.
- Scope: один тип страниц или один кластер правок за раз.
- Checks: build; validate pages touched.

### `/geo-ai`

Оптимизировать сайт под AI Overviews, Yandex/Алиса, Perplexity и другие answer engines.

- Skills: `seo`, `research-ops`; `indexlift-seo-auditor` для аудита.
- Goal: явные ответы, FAQ, entity consistency, schema, цитируемые блоки, сравнения, короткие summaries.
- Checks: build; schema sanity by inspecting generated HTML only where needed.

### `/content-rewrite`

Переписать слабые блог-посты и SEO-блоки под текущую задачу привлечения рефералов.

- Route: `src/data/articles.json`, `src/pages/blog/`, related utilities.
- Goal: полезность, доверие, конверсия в вакансии, отсутствие воды.
- Checks: build; sample rendered blog page.

## Referral Monetization

### `/ref-links`

Подготовить таблицу реферальных вакансий и источников.

- Priority: прямой работодатель выше CPA, если условия сравнимы.
- Output: компания, вакансия, прямой URL, CPA URL, статус регистрации, что нужно от пользователя.
- Do not invent referral URLs; mark unknown as `нужно получить`.

### `/vacancy-publish`

Добавить реальные вакансии на сайт.

- Route: `src/data/vacancies.ts`, `src/data/jobs.ts`, company data, vacancy pages.
- Goal: реальные условия, честная ссылка, понятный CTA.
- Checks: build; выборочная страница вакансии.

## Ops

### `/build-check`

Запустить минимальную проверку проекта.

- Command: `PATH='/Users/ivan/Documents/scratch/node-v22.14.0-darwin-arm64/bin:/usr/bin:/bin:/usr/sbin:/sbin' npm run build`
- Add HTML validate only when markup was changed.
- Output: pass/fail, key error lines only.

### `/preview`

Показать или проверить локальный вид сайта.

- Prefer existing local server if running.
- Use Playwright only when actual browser behavior or screenshot is needed.
- Never print screenshot buffers; save files and report path.

### `/deploy-check`

Проверить готовность к публикации.

- Check: git status, build, generated pages, domain-sensitive config.
- Do not push, commit, or change DNS unless explicitly requested.

### `/dns-check`

Проверить DNS/домен.

- Use only targeted DNS/curl checks.
- Output concise: A/CNAME status, GitHub Pages readiness, blockers.

### `/handoff`

Сделать компактный handoff для нового чата.

- Include: current goal, files changed, important constraints, checks run, next 3 steps.
- Do not include large diffs or logs.

### `/context-lean`

Уменьшить расход контекста.

- Avoid bulk reads and full skill loading.
- Prefer small file ranges, `rg` with narrow patterns, no `dist/` scans by default.
- Suggest `/compact` or new chat after research, implementation, deploy, or UI phases.

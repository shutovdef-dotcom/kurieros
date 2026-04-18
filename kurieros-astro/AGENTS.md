# КурьерОК: лёгкий Codex-контекст

Этот файл заменяет полный ECC-контекст для ежедневной работы над сайтом. Держи его коротким: большие skills, MCP и справочники открывай только по явному триггеру задачи.

## Проект

- Astro static site для `kurerok.ru`.
- Основной код: `src/`; сборка: `dist/`.
- Не редактируй `dist/` вручную: он обновляется через сборку.
- Не меняй домен, DNS-значения, email-адреса и slugs без отдельного запроса.

## Команды

- Build: `PATH='/Users/ivan/Documents/scratch/node-v22.14.0-darwin-arm64/bin:/usr/bin:/bin:/usr/sbin:/sbin' npm run build`
- HTML check: `PATH='/Users/ivan/Documents/scratch/node-v22.14.0-darwin-arm64/bin:/usr/bin:/bin:/usr/sbin:/sbin' npx --yes html-validate dist/index.html`
- Local preview обычно доступен на `http://127.0.0.1:4323/`.

## Псевдо-команды

- Каталог маршрутов: `COMMANDS.md`.
- Если сообщение начинается с `/...`, воспринимай это как intent-router, а не как нативную команду CLI.
- Для неизвестной команды выбери ближайший маршрут из `COMMANDS.md` и продолжай без лишних вопросов.
- Не загружай полный ECC: открывай только skill, который нужен выбранному маршруту.

## Экономия контекста

- Читай только нужные файлы и небольшие диапазоны строк.
- Не ищи по `dist/`, если достаточно `src/`.
- Не печатай полные build logs, огромные diffs, base64, PNG buffers или минифицированный HTML.
- После крупного этапа делай короткий handoff: что изменено, важные файлы, следующие шаги, проверки.
- Для длинных цепочек предлагай `/compact` или новый чат.

## Skill Router

- SEO/GEO: `seo`, `indexlift-seo-auditor`, `research-ops`.
- UI/frontend: `frontend-patterns`, `frontend-design`, `playwright` только для реальной визуальной проверки.
- GitHub/PR: GitHub plugin skills.
- Browser/screenshot: `playwright`; сохраняй артефакты в файл, не печатай binary output.
- Context/token: `strategic-compact`, `agent-sort`.

## Рабочий стиль

- Для обычных правок используй lean-подход: маленькая правка, одна сборка, короткий отчёт.
- Для сложных задач сначала планируй, затем реализуй батчами.
- Не запускай тяжёлые проверки повторно без причины.

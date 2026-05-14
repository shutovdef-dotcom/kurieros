# Skill: добавление новой CPA-вакансии в КурьерОк

Этот файл — операционный playbook агента, который добавляет новую
CPA-вакансию на kurerok.ru. Он agent-agnostic: работает в Claude Code,
Codex или любом ином агенте, у которого есть доступ к репозиторию
`/Users/ivan/kurieros/kurieros-astro`.

**Главная задача skill'а:** получить на вход партнёрскую реф-ссылку +
сырые таблицы (любой формат: Google Sheets, скопированный TSV/CSV,
маркдаун, plain text, partner email) → выдать готовый `VacancySource`
в стандартизированной форме (см. `docs/vacancy-generation-input.md`),
готовый к `npm run generate:data && npm run build`, с пройденной
валидацией и финальным отчётом.

Не входит в задачу: качественные переводы на 11 не-RU языков (автоматом
ставятся пустые stub'ы в файлах `src/data/vacancy-translations-source/<lang>.json`,
которые fallback'ятся к русскому до тех пор пока кто-то не заполнит реальные
переводы), Ozon-каталог (закрытая подсистема, не трогать).

Ниже — сначала контекст и схема данных (для холодного старта агента),
затем алгоритм работы, парсинг входа, нормализация, валидация и формат
финального отчёта.

```text
Ты работаешь с сайтом КурьерОк в репозитории:
/Users/ivan/kurieros/kurieros-astro

Задача: добавить новые вакансии курьеров/представителей на сайт без поломки текущей генерации страниц.

Важный контекст проекта:
- Это Astro static site для kurerok.ru.
- Основной код в src/, сборка в dist/. dist вручную не редактировать.
- Текущий стек: Astro ^6.1.3, npm, TypeScript/TSX-скрипты, Node ≥22.12.
- Команды:
  - npm run generate:data        # vacancy-translations + reviews + llms
  - npm run build                # запускает prebuild → generate:data
  - npm run dev -- --host 127.0.0.1 --port 4321
- Astro config: output static, trailingSlash always, sitemap исключает /owner/.
- Сайт генерирует вакансии из src/data/vacancies.ts через src/data/jobs.ts.
- НОВЫЕ вакансии добавляются ТОЛЬКО как стандартный CPA-флоу: партнёрская
  реф-ссылка → внешний редирект по клику на «Откликнуться». Никаких модалок,
  Worker'ов или кастомных лид-форм. Если просят «как Ozon» — переспроси,
  это исключение, не паттерн.
- Ozon — закрытый, готовый сабсистем (5 sklad + 4 fresh роли,
  src/data/ozonOffers.ts + workers/ozon-lead/ + JSON-каталоги). НЕ ТРОГАЙ
  его при добавлении новой вакансии. Документация по нему ниже только
  чтобы было ясно, что эти файлы и магический префикс 'lead-form:ozon'
  существуют не зря — но расширять Ozon-каталог можно только по явному
  отдельному запросу.
- Не добавляй отдельные страницы вакансий руками: одна VacancySource с offers
  генерирует много страниц /v/<slug>/.
- Не откатывай существующие незакоммиченные изменения без отдельного разрешения.

Текущее состояние данных (на момент написания, требует свежей сверки):
- 18 базовых vacancySources: 9 рукописных в vacancies.ts (id 1..9) +
  9 Ozon-генерируемых в ozonOffers.ts (id 10..18, 5 sklad + 4 fresh).
- ≈4 500–5 500 активных GeneratedJob (точный count = wc -l на dist/v/*/).
- 6 брендов: Яндекс Еда, Купер (ex. СберМаркет), Т-Банк, Efin, Альфа-Банк, Ozon
  (включая Ozon fresh).
- Поддерживаемые транспорты: foot, bicycle, auto, remote.
- Поддерживаемые языки: ru, uz, tg, ky, hy, kk, az, uk, be, hi, vi, zh
  (источник истины — SUPPORTED_LANGUAGES в src/data/translations/types.ts).
- Следующий id для новой рукописной вакансии: max(id) + 1 (сейчас 19, если
  список vacancySources не изменился). Свериться:
  grep -E '^\s+id: [0-9]+' src/data/vacancies.ts | tail -1.

Ключевые файлы:
- src/data/vacancyTypes.ts                — типы VacancySource, VacancyOffer,
  VacancyContent, GeneratedJob, OzonLeadFormMeta, PayModel, TransportMode,
  TransportProvision, EmploymentFormat, MedicalBookRequirement, SalaryConfidence.
- src/data/vacancies.ts                   — рукописные базовые вакансии +
  Ozon hourly-fallback post-processing. Экспортирует финальный vacancySources.
- src/data/ozonOffers.ts                  — генератор Ozon VacancySource[]
  (5 sklad-ролей: rocket:courier, ff:truckDriver, ff:operator,
  ff:electricStackerDriver, ff:brigadier; 4 fresh-роли: express:courier,
  express:operator, express:adminPersonal, express:factoryKitchen).
- src/data/ozon-vacancies.json            — каталог sklad-форм (cityID,
  hireObjectUUID), обновляется через node tools/fetch-ozon-vacancies.mjs.
- src/data/ozon-fresh-vacancies.json      — каталог fresh-форм.
- src/data/alfa-bank-vacancies.json       — города и offers Альфа-Банка из
  Google Sheets. Строки `Москва Алтуфьево`, `Москва Университет`,
  `Москва ЦСКА`, `Новая Москва`, `Троицк (Новая Москва)` считаются
  дублями города `Москва`.
- src/data/efin-vacancies.json            — offer-строки Efin.
- src/data/tbank-vacancies.json           — offer-строки Т-Банка.
- src/data/partnerLinks.ts                — ЦЕНТРАЛЬНЫЙ реестр партнёрских
  URL и логотипов. Все *_APPLY и *_LOGO живут здесь, и здесь же агрегатор
  PARTNER_LINKS. Любая новая компания добавляется ТОЛЬКО сюда → потом
  импортируется в vacancies.ts / ozonOffers.ts.
- src/data/jobs.ts                        — превращает vacancySources в
  GeneratedJob (slug, labels, details, translations, transportProvision-
  fallback, ozonLeadForm forwarding).
- src/data/translations/types.ts          — SUPPORTED_LANGUAGES, типы языков.
- docs/vacancy-generation-input.md        — формат входных данных для новой
  вакансии (читать обязательно).
- src/pages/v/[slug].astro                — страница отдельной вакансии.
- src/components/JobCard.astro            — карточка вакансии (содержит
  ozonDataAttrs() — атрибуты для OzonLeadModal).
- src/components/JobGrid.astro            — список, поиск и фильтры.
- src/components/OzonLeadModal.astro      — модалка заявки Ozon (POST в
  workers/ozon-lead/ → recruitment.ozon.ru).
- workers/ozon-lead/                      — Cloudflare Worker, валидирует
  тройку (vacancy, cityID, hireObjectUUID) против src/whitelist.js.
  После любых правок ozonOffers.ts / *.json запусти
  node tools/build-worker-whitelist.mjs.
- src/pages/[slug].astro                  — страницы городов и категорий.
- src/pages/companies/[slug].astro + src/utils/companies.ts — страницы компаний.
- src/pages/owner/vacancies.astro         — закрытая owner-форма, которая
  генерирует объект для вставки в vacancySources.
- public/vacancy-translations/*.json и src/data/vacancy-translations/*.json
  — сгенерированные переводы, не редактировать руками без причины
  (перегенерируется через npm run generate:vacancy-translations).
- src/data/reviews.json                   — генерируется npm run generate:reviews.
- public/llms-full.txt                    — генерируется npm run generate:llms.

Как устроена модель:
- VacancySource:
  - id              number
  - slug            string
  - company         { name, logo }
  - content         Record<SupportedLanguage, VacancyContent>
  - defaults        { ageFrom, medicalBook?, employmentFormats, schedule,
                      education?, citizenship?, uniform?, os? }
  - offers          VacancyOffer[]
  - extraTags?      string[]
  - isHot?          boolean
- VacancyContent:
  - title           string  (поддерживает плейсхолдеры {city} и {cityPrep})
  - shortDescription string  ({city} / {cityPrep})
  - description     string  ({city} / {cityPrep})
  - requirements    string[]   ({city} / {cityPrep} в каждом элементе)
  - benefits        string[]   ({city} / {cityPrep})
  - requiredDocuments string[] ({city} / {cityPrep})
  - labels?         string[]
  - searchTags?     string[]
  Плейсхолдеры:
    {city}     → имя города как есть («Москва»)
    {cityPrep} → предложный падеж («в Москве», «в Санкт-Петербурге»);
                 для городов вне CITY_DATASET — fallback «в <Город>».
                 Резолвится в jobs.ts:interpolate().
- VacancyOffer:
  - city            string
  - transport       'foot' | 'bicycle' | 'auto' | 'remote'
  - transportProvision?  'own' | 'company' | 'not_required'
                    Default в jobs.ts: foot/remote → not_required;
                    bicycle/auto → own. Указывай явно, если транспорт
                    выдаётся компанией (например, велосипед в аренду).
  - pay             PayModel — { currency: 'RUB',
                                 monthly?, hourly?, perOrder?, perShift?,
                                 guaranteed?, bonusText?,
                                 rate?, paymentFrequency }
                    Каждый из *Range — { min?, max?, text } (text обязателен).
  - isActive        boolean
  - updatedAt       'YYYY-MM-DD'
  - sourceUrl?      string
  - salaryConfidence 'official' | 'partner' | 'estimated'
  - ageFrom?, citizenship?, medicalBook?, employmentFormats?, schedule?
  - applyLink?      string  (магический префикс 'lead-form:ozon' открывает
                    OzonLeadModal вместо внешнего редиректа — только для Ozon)
  - cityDistricts?, priority?
  - requirementsOverride?, benefitsOverride?, requiredDocumentsOverride?
                    Поддерживают ДВЕ формы:
                      • string[]  — одинаково для всех языков;
                      • Partial<Record<SupportedLanguage, string[]>>
                        — отдельный список на каждый язык.
  - ozonLeadForm?   только для Ozon-офферов; { vacancy, customer?,
                    cityID, hireObjectUUID, hireObjectLabel? }
- GeneratedJob slug строится как:
  source.slug + "-" + slugifyCity(offer.city) + "-" + offer.transport
- vacancySources POST-PROCESSED: для Ozon-офферов без pay.hourly финальный
  экспорт подменяет pay на buildPay(fallbackHourly), где fallbackHourly =
  best Y.Eda/Купер часовая в этом городе × детерминистический jitter
  (fnv1a по slug-city-transport, 0.880..0.979). Чтобы посмотреть «сырой»
  Ozon-источник — читай _initialSources / ozonOffers.ts напрямую.

Рекомендуемый порядок работы:
1. Прочитай docs/vacancy-generation-input.md, src/data/vacancyTypes.ts,
   src/data/partnerLinks.ts, package.json. Глянь свежий ID:
   grep -E '^\s+id: [0-9]+' src/data/vacancies.ts | tail -1.
2. Посмотри текущие vacancySources в src/data/vacancies.ts и не меняй чужую
   структуру без нужды.
3. Партнёрские URL и логотипы добавляй ТОЛЬКО в src/data/partnerLinks.ts
   (константы *_APPLY, *_LOGO + запись в PARTNER_LINKS).
4. Если городов много (>20) — создай src/data/<company>-vacancies.json и
   импортируй его в src/data/vacancies.ts. Если мало — добавляй offers
   прямо в vacancies.ts.
5. Для новой компании заведи константы: COMPANY_NAME, COMPANY_LOGO,
   APPLY_LINK, CITIZENSHIP, EMPLOYMENT_FORMATS — но логотип/ссылку бери
   из partnerLinks.ts (re-export, а не литерал).
6. Для applyLink добавляй UTM:
   - utm_source=kurerok
   - utm_medium=vacancy
   - utm_campaign=<company-or-role-slug>
   - utm_content=<citySlug>-<transport-or-role>
7. Контент пиши ПЛОСКИМ объектом `content: VacancyContent` — только
   на русском, без обёрток. Резолвер `resolveLocalizedContent()` в
   `jobs.ts` сам мерджит переводы из per-language файлов
   `src/data/vacancy-translations-source/<lang>.json` поверх русского.
   Переводимые поля: `shortDescription`, `description`, `requirements`,
   `benefits`, `requiredDocuments`. Title/labels/searchTags/city/salary
   НЕ переводим — они русские на всех языках по политике (см.
   правила skill'а ниже). При создании новой вакансии **обязательно**
   добавь stub `"<your-slug>": {}` во все 11 lang-файлов — strict-mode
   build script упадёт без этого. В финальном отчёте отметь сколько
   stub-ключей × языков ждут перевода.
8. Добавь новый объект в _initialSources (внутри vacancies.ts), не
   мутируй чужие записи. Финальный экспорт vacancySources собирается
   автоматически (Ozon hourly-fallback не затронет твою компанию,
   если slug не начинается с 'ozon-').
9. Запусти npm run generate:data.
10. Запусти npm run build.
11. Проверь хотя бы одну новую страницу /v/<generated-slug>/, страницу
    компании /companies/<slug>/ и одну страницу города /[citySlug]/.

Ozon — НЕ ТРОГАТЬ. Готовая закрытая подсистема (ozonOffers.ts +
workers/ozon-lead/ + JSON-каталоги + магический applyLink 'lead-form:ozon'
+ tools/build-worker-whitelist.mjs). Расширение Ozon-каталога не входит
в этот сценарий. Если пользователь просит добавить «новую вакансию» —
это всегда стандартный CPA-флоу с реф-ссылкой, не Ozon.

Что запросить у пользователя, если данных не хватает:
- название вакансии и компании;
- логотип;
- ссылка отклика;
- города и транспорты;
- зарплата по городам/транспорту;
- частота выплат;
- формат оформления;
- возраст;
- гражданство;
- нужна ли медкнижка;
- график;
- документы;
- требования и преимущества;
- источник условий;
- дата обновления условий;
- какие offers активны.

Безопасные значения по умолчанию, если пользователь разрешил:
- ageFrom: 18
- medicalBook: unknown
- employmentFormats: ["self_employed"]
- currency: RUB
- salaryConfidence: partner
- applyLink: "#"
- isActive: true
- education: "Не требуется"
- os: "Android или iOS"

Перед финальным ответом обязательно сообщи:
- какие файлы изменены;
- сколько VacancySource и GeneratedJob получилось после генерации;
- какие команды проверки прошли;
- какие данные остались примерными или требуют подтверждения.
```

## Быстрый ввод данных для пользователя

Если нужно собрать данные в этом же диалоге, попроси заполнить:

```yaml
vacancy:
  title:
  company:
  logo:
  applyLink:
  sourceUrl:
  updatedAt:
  isHot:

content:
  shortDescription:
  description:
  requirements:
  benefits:
  requiredDocuments:
  labels:
  searchTags:

defaults:
  ageFrom:
  medicalBook:
  employmentFormats:
  schedule:
  education:
  citizenship:
  uniform:
  os:

offers:
  - city:
    transport:                # foot | bicycle | auto | remote
    transportProvision:       # own | company | not_required (опционально, default по транспорту)
    monthlyMin:
    monthlyMax:
    monthlyText:
    hourlyMin:                # опционально — питает калькулятор дохода
    hourlyMax:
    hourlyText:
    guaranteedText:           # опционально — гарантированный минимум, например «гарантируем 80 000 ₽/мес»
    bonusText:                # опционально — бонус-структура одной строкой
    rate:
    paymentFrequency:
    salaryConfidence:         # official | partner | estimated
    isActive:
    sourceUrl:
    cityDistricts:
    priority:
    requirementsOverride:     # string[] ИЛИ { ru: [...], uz: [...], ... }
    benefitsOverride:         # string[] ИЛИ { ru: [...], uz: [...], ... }
    requiredDocumentsOverride: # string[] ИЛИ { ru: [...], uz: [...], ... }
```

---

## Контракт I/O

**Вход (от пользователя):**
- Реф-ссылка партнёра (CPA, обязательно).
- Один или несколько артефактов с данными в любом формате:
  Google Sheets URL, скопированный TSV/CSV, маркдаун-таблица, plain text,
  partner email, текстовое описание вакансии.
- Опционально: логотип (URL или путь), предпочтительный slug, флаг isHot.

**Выход (PR-ready):**
- Изменения в `src/data/partnerLinks.ts` (новые `*_APPLY` и `*_LOGO`
  константы + запись в `PARTNER_LINKS`).
- Новый объект в `_initialSources` массиве в `src/data/vacancies.ts`
  ИЛИ новый JSON-файл `src/data/<company>-vacancies.json` + его импорт
  в `vacancies.ts` (если городов > 20).
- Прошедшие команды: `npm run generate:data` и `npm run build`.
- Структурированный финальный отчёт пользователю (см. ниже).

**Что skill НЕ делает:**
- Не правит Ozon (`ozonOffers.ts`, `ozon-vacancies.json`,
  `ozon-fresh-vacancies.json`, `workers/ozon-lead/`).
- Не делает ручной перевод 11 не-RU языков. Добавляет пустые stub'ы
  `"<slug>": {}` в каждый из 11 файлов `src/data/vacancy-translations-source/<lang>.json`
  как маркер «нужны переводы», и явно флагает пользователю.
- Не модифицирует существующие vacancySources чужих компаний.
- Не коммитит и не пушит — оставляет изменения в worktree, отчитывается.

---

## Алгоритм работы (canonical)

1. **Прочитать справочники** — `docs/vacancy-generation-input.md` (формат),
   `src/data/vacancyTypes.ts` (типы), `src/data/partnerLinks.ts`
   (как добавляется партнёр), `src/data/vacancies.ts` (структура
   существующих VacancySource).
2. **Получить свежий следующий id** — max ID **по обоим файлам**, +1.
   Однострочник:
   `grep -hE '^\s+id: [0-9]+,' src/data/vacancies.ts src/data/ozonOffers.ts | grep -oE '[0-9]+' | sort -n | tail -1`
   → прибавить 1. На момент написания → 19. **Не использовать**
   `tail -1 vacancies.ts` без учёта ozonOffers.ts — иначе попадёшь
   в зарезервированный диапазон 10..18.
3. **Распарсить вход** (см. «Парсинг входных таблиц»).
4. **Нормализовать города** против `src/data/cities-dataset.ts`
   (см. «Нормализация городов»).
5. **Распарсить зарплаты** → PayModel на каждый (city × transport)
   (см. «Парсинг зарплат»).
6. **Если есть text-описание** — распилить на
   requirements/benefits/requiredDocuments (см. «Парсинг описания»).
7. **Зарегистрировать партнёра в `partnerLinks.ts`**:
   - `<COMPANY>_APPLY` — base referral URL (без UTM, только partner-
     specific `erid`/`oprid`). UTM добавляются динамически в helper.
   - `<COMPANY>_LOGO` — путь или URL (см. «Логотип»).
   - Добавить запись в `PARTNER_LINKS` aggregate.
8. **Собрать VacancySource**:
   - `id` = шаг 2.
   - `slug` — kebab-case по конвенции `<company-shortname>-<role>`,
     где role — должность или транспорт. Примеры из существующих:
     `yandex-eda-courier`, `kuper-foot-courier`, `kuper-order-picker`,
     `tbank-outbound-b2b-operator`, `alfa-bank-representative`.
     Если ролей несколько на одну компанию — отдельный VacancySource
     на каждую роль (как Kuper: foot/bike/auto/picker = 4 источника).
   - `company.name`, `company.logo` — импортом из `partnerLinks.ts`,
     не литералом.
   - `content` — плоский RU-объект `VacancyContent` (БЕЗ обёрток вроде
     `createKuperLocalizedContent`). Title/labels/searchTags остаются RU
     на всех языках по политике. Переводимые поля (shortDescription,
     description, requirements, benefits, requiredDocuments) идут через
     отдельный реестр — см. §«Переводы».
   - `defaults` — общие для всей компании
     (`ageFrom`, `medicalBook`, `employmentFormats`, `schedule`,
     `education`, `citizenship`, `uniform`, `os`).
   - `offers[]` — по нормализованным (city × transport) парам.
   - **`applyLink` строится через helper**, не литералом, см.
     «build<Company>ApplyLink — обязательный паттерн».
9. **Решить bucket-ом** (где хранить данные):

   | Кейс | Куда | Прецедент |
   | --- | --- | --- |
   | ≤ 20 городов, 1 роль | offers[] прямо в `_initialSources` в `vacancies.ts` | Yandex Eda |
   | ≤ 20 городов, 2-4 роли | по одному VacancySource на роль, всё в `_initialSources` | Kuper, T-Bank |
   | > 20 городов | отдельный `src/data/<company>-vacancies.json` (массив raw-строк) + helper в `vacancies.ts`, который мапит JSON в `VacancyOffer[]` | Альфа-Банк, Efin |
   | Live-источник (форма, скрапинг) | отдельный TS-модуль `src/data/<company>Offers.ts`, экспортирующий `<company>VacancySources: VacancySource[]` | Ozon (только) |

   В JSON-файл кладёт сырые строки от партнёра (city, transport,
   monthlyMin, monthlyMax, sourceUrl, …), а в `vacancies.ts` —
   helper `mapTo<Company>Offers(rawJson) => VacancyOffer[]`, который
   нормализует и собирает PayModel/applyLink.
10. **Прогнать валидацию** (см. «Валидация перед коммитом»).
11. **`npm run generate:data && npm run build`**. Не подавлять ошибки.
12. **Sanity-проверка после build**: `ls dist/v/<slug>-*/index.html | wc -l`
    ≈ числу активных offers; `ls dist/companies/<companySlug>/index.html`
    существует.
13. **Финальный отчёт** (см. «Финальный отчёт»).

---

## Парсинг входных таблиц

Партнёрские данные приходят в разных форматах. Универсальные правила.

### Распознавание формата

| Формат | Признак | Что делать |
| --- | --- | --- |
| Google Sheets URL | `docs.google.com/spreadsheets/d/...` | если нет read-доступа — попросить экспорт в TSV/CSV или открытый share-link |
| TSV / CSV | табы или запятые между колонками | парсить по разделителю; первая строка обычно — заголовок |
| Markdown-таблица | строки начинаются с `\|` | парсить как TSV, заголовок — вторая строка после `\|---\|` |
| Plain text список | «Москва — 80–140k, foot», по строке на город | regex по строке: (город)(разделитель)(зарплата)(разделитель)(транспорт?) |
| Заголовок + bullets | «Условия:» + список | бить на секции по заголовкам, см. «Парсинг описания» |
| Partner email / wall-of-text | связный текст | сначала вытащить таблицу/список (если есть), остаток — в описание |

### Канонизация имён колонок

Любые синонимы → канонические имена (case-insensitive, по leading-substring):

| Синонимы | Каноническое |
| --- | --- |
| `Город`, `City`, `Локация`, `City name`, `Населённый пункт` | `city` |
| `Транспорт`, `Mode`, `Тип курьера`, `Способ доставки` | `transport` |
| `Зарплата`, `Salary`, `Доход`, `Pay`, `Заработок`, `ЗП`, `Оплата` | salary-block (см. «Парсинг зарплат») |
| `от`, `min`, `от X ₽` | min |
| `до`, `max`, `до Y ₽` | max |
| `Ставка`, `Rate`, `Тариф` | `rate` |
| `Выплаты`, `Frequency`, `Периодичность` | `paymentFrequency` |
| `Источник`, `Source`, `URL`, `Линк` | `sourceUrl` |
| `Возраст`, `Age`, `с какого возраста`, `от лет` | `ageFrom` |
| `Гражданство`, `Citizenship`, `Подданство` | `citizenship` |
| `Медкнижка`, `СЭС`, `ЛМК` | `medicalBook` |
| `Оформление`, `Формат`, `Employment`, `Тип занятости` | `employmentFormats` |
| `График`, `Schedule`, `Часы работы` | `schedule` |

Если в шапке встречается колонка, не подходящая ни под один синоним —
**не игнорировать молча**, флагать пользователю в отчёте.

---

## Нормализация городов

Источник истины — `src/data/cities-dataset.ts` (~1280 городов из
pensnarik/russian-cities, население ≥ 5000). Slugifier — `slugifyCity`
в `src/utils/cities.ts` (ASCII-транслитерация).

**Шаги:**

1. Из таблицы вытащить уникальные значения `city`.
2. Для каждого:
   - **Точное совпадение** с `name` в `CITY_DATASET` → использовать как есть.
   - **Город+район** (паттерны: «Москва Алтуфьево», «Москва (центр)»,
     «Санкт-Петербург Сенная», «Новая Москва», «Троицк (Новая Москва)»,
     «Москва ВАО», «СПб Юг») → мапить на базовый город,
     уникальный район класть в `cityDistricts` (если несколько разных
     районов в одном городе → массив).
   - **Известный псевдоним** (СПб → Санкт-Петербург, Питер → Санкт-Петербург,
     Мск → Москва, Екб → Екатеринбург, Нск → Новосибирск) → каноническое имя.
   - **Опечатка / непохожее на dataset** (например «Кемерово» с лишним
     пробелом, латиница в названии) → попытаться `levenshtein < 2` от
     ближайшего, при попадании — нормализовать; иначе **флагать** пользователю.
   - **Город не из dataset** (мелкий, < 5000 населения) → НЕ блокировать,
     но в отчёте сказать: «город X отрендерится с population=0,
     prep-case дефолтный «в X», подумайте о добавлении в dataset».
3. **Дубликаты по (city, transport)** → первая активная запись
   выигрывает; остальные либо `isActive: false`, либо мерджатся,
   если данные дополняются (например, разные районы — район в `cityDistricts`).

---

## Парсинг зарплат

### Числа

Поддерживаемые формы → значение:

| Партнёрская форма | Числовое значение |
| --- | --- |
| `120000`, `120 000`, `120,000` | 120000 |
| `120к`, `120K`, `120k`, `120 тыс`, `120тыс` | 120000 |
| `1.5к`, `1,5K` | 1500 |
| `120 000 ₽`, `120к руб`, `120 K RUB`, `120 000 Р` | 120000 (валюта отбрасывается) |

**Не-RUB валюта** (`$`, `€`, `KZT`, `UZS`, `USD`, `EUR`) — НЕ парсить,
**флагать** пользователю. Сейчас код поддерживает только `currency: 'RUB'`.

### Период (`PayModel.<key>`)

| Подсказка в тексте | Поле |
| --- | --- |
| `/мес`, `в месяц`, `в мес`, `monthly`, `мес.` | `monthly` |
| `/час`, `в час`, `/h`, `hourly`, `час.` | `hourly` |
| `/заказ`, `за заказ`, `/order`, `с заказа` | `perOrder` |
| `/смена`, `за смену`, `/shift`, `со смены` | `perShift` |
| «гарантируем», «оклад», «минимум гарантирован» | `guaranteed` (text only) |
| «бонус», «премия», «надбавка» | `bonusText` (text only) |

### Min / Max

| Партнёрская форма | min | max |
| --- | --- | --- |
| `от 80000` | 80000 | — |
| `до 140000` | — | 140000 |
| `от 80 до 140 тыс`, `80–140к`, `80-140к`, `80—140 тыс` | 80000 | 140000 |
| `120000` (одиночное число без подсказок) | flag: уточнить, ставить только text |

### Сборка `text` (поле обязательное)

Если у тебя есть min/max, но нет partner-supplied text — собирай по правилу:

| Условие | text |
| --- | --- |
| есть max | `до {fmt(max)} ₽/мес` |
| только min | `от {fmt(min)} ₽/мес` |
| min == max | `{fmt(min)} ₽/мес` |
| период не monthly | подставлять `/час`, `/смена`, `/заказ` |

`fmt(n)` — пробелы по тысячам (`120 000`), не запятые.

### paymentFrequency — дефолты

Если партнёр не указал:

| Транспорт | Default |
| --- | --- |
| `foot`, `bicycle`, `auto` | `Еженедельно` |
| `remote` | `2 раза в месяц` |

Партнёрские формулировки оставлять как есть («Ежедневно», «После каждой
смены», «Онлайн на карту», «1 раз в 2 недели»).

### Калькулятор дохода

Калькулятор на сайте использует `pay.hourly`. Если у города только
`monthly`, а калькулятор должен работать → производная по модели,
которая используется в `buildPay()` в `src/data/vacancies.ts:371`:
`monthly = hourly × 12 × 30 = hourly × 360`. То есть
`hourly ≈ monthly / 360`. Делать **только с явного разрешения
пользователя**, в отчёте подсветить.

---

## Парсинг описания

Если партнёр прислал wall-of-text:

1. Бить на блоки по заголовкам и пустым строкам.
2. Классифицировать блок по ключевому слову/первому глаголу:

| Ключи | Куда |
| --- | --- |
| «Требуется», «Нужно», «Должен», «От курьера», «Обязательно» | `requirements` |
| «Получишь», «Предлагаем», «Бонусы», «Условия», «Преимущества», «Что даём» | `benefits` |
| «Документы», «Что нужно из документов», «Из документов» | `requiredDocuments` |

3. Каждый bullet — отдельный элемент массива (без `;` в одной строке).
4. Если блок не классифицируется автоматом — **спросить** пользователя.

### Минимальный safe-default (если описания нет совсем)

```ts
content: {
  title: '<Должность> <Компании> {cityPrep}',
  shortDescription: '<Должность> в <Компании>: гибкий график и регулярные выплаты.',
  description: 'Компания <Компания> ищет <должность> {cityPrep}. Полный набор условий — на странице партнёра.',
  requirements: ['Смартфон на Android или iOS'],
  benefits: ['Свободный график', 'Регулярные выплаты'],
  requiredDocuments: ['Паспорт', 'ИНН', 'СНИЛС'],
  labels: ['Свободный график', 'Без опыта'],
  searchTags: ['<компания>', '<должность>'],
}
// Translations: добавь stub во все 11 файлов
// src/data/vacancy-translations-source/<lang>.json:
//   "<slug>": {}
// Без stub'а strict-mode build script упадёт.
```

В отчёте обязательно: **«контент — заглушка, заменить»**.

---

## Переводы — единая система (TRANS-1)

**Архитектура хранения:**
- `VacancySource.content` в `vacancies.ts` / `ozonOffers.ts` — **только русский**,
  плоский объект `VacancyContent`. Никаких `createKuperLocalizedContent` или
  Object.fromEntries по языкам — это удалено.
- Per-language overrides — в `src/data/vacancy-translations-source/<lang>.json`
  × 11 файлов (uz, tg, ky, hy, kk, az, uk, be, hi, vi, zh). `ru.json` нет —
  русский живёт в коде.
- Резолвер `resolveLocalizedContent(source, language)` в `jobs.ts` мержит
  RU из кода с overrides из per-lang файлов. Fallback к RU если перевода
  нет.

**Что переводим:** `shortDescription`, `description`, `requirements`,
`benefits`, `requiredDocuments`. Что НЕ переводим: `title`, `labels`,
`searchTags`, city name, salary numbers. (Title содержит название
должности + компании + города — это бренд + личные имена, политика «не
переводим».)

**Runtime (TRANS-1):** Build emits per-source фрагменты в
`public/vacancy-translations/<lang>/<sourceSlug>.json` (12 langs × 19
sources = 228 файлов). Клиент при переключении языка грузит только
фрагменты тех источников, которые видны на текущей странице (через
`data-vacancy-source-slug` атрибут на карточке/hero). Детальная страница
грузит 1 фрагмент (~80KB-2MB) вместо старого комбинированного 20MB файла.

**Что делает skill при добавлении новой вакансии:**

1. Авторит RU `content: VacancyContent` плоско в `vacancies.ts`.
2. **Обязательно** добавляет stub `"<slug>": {}` в КАЖДЫЙ из 11
   файлов `src/data/vacancy-translations-source/<lang>.json`.
   Без этого strict-mode build script упадёт с понятной ошибкой.
3. В финальном отчёте флагает: «11 stub'ов добавлено в lang-файлы,
   5 переводимых полей × 11 языков = 55 ключей ждут реального перевода».

**Stub-пример (что положить в каждый lang-файл):**

```json
// src/data/vacancy-translations-source/uz.json (и в 10 остальных)
{
  "alfa-bank-representative": {},
  ...
  "<your-new-slug>": {}
}
```

**Реальный перевод (отдельная задача, не в этот skill):** заполнить
поля в lang-файле:

```json
// src/data/vacancy-translations-source/uz.json
{
  "your-new-slug": {
    "shortDescription": "Узбекский короткий текст",
    "description": "Узбекский полный текст с {city}",
    "requirements": ["Требование 1 узбекским", "Требование 2"],
    "benefits": ["Преимущество 1", "Преимущество 2"],
    "requiredDocuments": ["Паспорт"]
  }
}
```

Резолвер сам подтянет — пересборка не нужна, только `npm run build`.

**Build-time проверки (auto в `generate-vacancy-translations.ts`):**

- Каждый `source.slug` ИЗ vacancies.ts/ozonOffers.ts должен быть ключом
  в каждом lang-файле (даже как `{}`) — иначе build error.
- Лишние ключи в lang-файлах (не соответствующие никаким source.slug) —
  тоже build error. Если переименовываешь slug — обнови все 11 файлов.

---

## Транспорт — словарь подсказок

| Партнёрская формулировка | TransportMode |
| --- | --- |
| «пеший», «пешком», «foot», «walking» | `foot` |
| «вело», «велосипед», «самокат», «scooter», «bicycle», «велик» | `bicycle` |
| «авто», «машина», «легковой», «car», «driver», «свой авто» | `auto` |
| «удалёнка», «офис», «оператор», «remote», «диспетчер», «онлайн» | `remote` |

`transportProvision`:

| Партнёрская формулировка | Значение |
| --- | --- |
| «свой транспорт», «на своём», «требуется свой …» | `own` |
| «велосипед/самокат в аренду», «выдаём транспорт», «компания предоставляет» | `company` |
| Транспорт не нужен (foot/remote) | `not_required` |
| Не указано | дефолт по транспорту (foot/remote → `not_required`, bicycle/auto → `own`) |

---

## UTM — обязательный формат

К `applyLink` каждого offer добавлять:

```
?utm_source=kurerok
&utm_medium=vacancy
&utm_campaign=<company-or-role-slug>
&utm_content=<citySlug>-<transport-or-role>
```

**Важно:** если партнёрская реф-ссылка уже несёт `erid`, `oprid`,
`affid` или другие обязательные tracking-параметры — их **сохранить**,
наши UTM добавлять через `&` (не затирать существующие). Если в реф-
ссылке уже есть `utm_source=` — флагать пользователю и спросить,
перезаписывать или нет (двойные UTM ломают аналитику партнёра).

### `build<Company>ApplyLink` — обязательный паттерн

UTM **никогда не пишутся литералом** в `applyLink: "https://..."`.
Вместо этого создаётся локальный helper в `src/data/vacancies.ts`,
который строит URL динамически. Смотри precedent:
`buildAlfaBankApplyLink` (vacancies.ts:874), `buildTBankApplyLink`
(vacancies.ts:757), `buildEfinApplyLink`, `buildKuperApplyLink`,
`buildYandexEdaApplyLink`. Канонический шаблон:

```typescript
const <COMPANY>_APPLY_LINK = <COMPANY>_APPLY; // re-export from partnerLinks.ts

const build<Company>ApplyLink = (city: string, role: <RoleType>) => {
  const url = new URL(<COMPANY>_APPLY_LINK);
  const citySlug = slugifyCity(city);

  url.searchParams.set('utm_source', 'kurerok');
  url.searchParams.set('utm_medium', 'vacancy');
  url.searchParams.set('utm_campaign', `<company>-${role}`);
  url.searchParams.set('utm_content', `${citySlug}-${role}`);

  return url.toString();
};

// в offer:
{ city: 'Москва', transport: 'foot',
  applyLink: build<Company>ApplyLink('Москва', 'foot'),
  ... }
```

Зачем helper, а не литерал:
- одна точка для смены UTM-схемы (если партнёр поменяет требования);
- партнёрские tracking-параметры сохраняются автоматически — `new URL`
  парсит исходную ссылку с её `erid` и т.п., а `searchParams.set` только
  добавляет/обновляет UTM;
- `slugifyCity` гарантирует консистентность с slug страницы.

### Логотип партнёра

Приоритет (от лучшего к худшему):
1. **Локальный SVG** в `public/logos/<company>.svg` — единственный
   способ избежать broken-image при падении партнёрского CDN. Используется
   для Yandex Eda, Альфа-Банк, Ozon. Если партнёр прислал PNG/JPG —
   попроси SVG или, если есть только bitmap, положи его как
   `/logos/<company>.png` и в `<COMPANY>_LOGO` укажи этот путь
   (но в отчёте флагнуть «логотип не SVG, рекомендуется заменить»).
2. **Партнёрский CDN** (`https://agents.pampadu.ru/api/file/...`) —
   precedent для Kuper, T-Банк, Efin. Допустимо, если SVG нет; CDN стабилен.
3. **Hot-link на сторонний хост** (Wikimedia, partner site) — **не
   делать**, даже если работает сейчас. Прецедент: PR #106 заменил
   wikimedia hot-link на локальный SVG.

После добавления SVG в `public/logos/` — обязательно проверить, что он
рендерится: `ls public/logos/<company>.svg && file public/logos/<company>.svg`.

---

## Валидация перед коммитом

Перед `npm run build` прогнать:

1. **Уникальные id**:
   `grep -E '^\s+id: [0-9]+,' src/data/vacancies.ts | sort -u | uniq -d`
   — должно быть пусто.
2. **Новый id ≥ 19** и не в диапазоне 10..18 (Ozon).
3. **Каждый offer имеет**: `city`, `transport`, `pay.text`,
   `pay.paymentFrequency`, `salaryConfidence`, `isActive`,
   `updatedAt` в формате YYYY-MM-DD.
4. **applyLink** в коде — ВСЕГДА вызов `build<Company>ApplyLink(...)`,
   никогда не литерал URL и не голая константа `<COMPANY>_APPLY` без
   UTM-обёртки. Проверка:
   `grep -nE "applyLink:\s*['\"\\\`]https?://" src/data/vacancies.ts`
   — должно быть пусто (исключение: магический префикс
   `'lead-form:ozon'` в Ozon-коде, но мы Ozon не трогаем).
   Дополнительно: `grep -nE "applyLink:\s*[A-Z_]+_APPLY[^_]" src/data/vacancies.ts`
   — тоже должно быть пусто (значит UTM не построен через helper).
5. **`VacancySource.content` — плоский RU-объект** (без обёрток). Для
   каждого нового slug'а проверь что во всех 11 файлах
   `src/data/vacancy-translations-source/<lang>.json` появилась запись
   `"<slug>": {}` (минимум stub). Strict-mode build script ловит
   отсутствующие slug'и с понятной ошибкой.
6. **Slug не пересекается** с существующими:
   `grep -nE 'slug: ['"'"'"]<новый-slug>' src/data/vacancies.ts src/data/ozonOffers.ts`
   — только одна запись (твоя).
7. **Все города** из offers — либо в `CITY_DATASET`, либо явно подтверждены
   пользователем как «новый, ниже порога 5000».

После `npm run build`:

8. **Страницы вакансий собрались**:
   `ls dist/v/<slug>-*/index.html | wc -l` = число активных offers
   (Astro генерирует один путь на (sourceSlug × city × transport),
   локализация — клиентская, отдельных языковых путей нет).
9. **Страница компании**: `ls dist/companies/<companySlug>/index.html`
   существует.
10. **Открыть одну страницу** /v/<slug>/ и проверить:
    - заголовок из `content.ru.title` (с подставленным `{city}` / `{cityPrep}`);
    - кнопка «Откликнуться» ведёт на ожидаемый URL с UTM;
    - зарплата на странице совпадает с `pay.text`;
    - районы (если есть) показаны.
11. **`git status --short` чистый по чужим файлам** — в diff должны быть
    ТОЛЬКО ожидаемые файлы:
    - `src/data/partnerLinks.ts`
    - `src/data/vacancies.ts`
    - (опционально) `src/data/<company>-vacancies.json`
    - (опционально) `public/logos/<company>.svg`
    - Авто-генерируемые: `src/data/vacancy-translations/*.json`,
      `public/vacancy-translations/*.json`, `public/llms-full.txt`
      (нормально, не трогать). Чужие исходники в diff — баг.
12. **Smoke-test в dev** (опционально, но рекомендуется):
    `npm run dev -- --host 127.0.0.1 --port 4321`, открыть
    `http://127.0.0.1:4321/v/<slug>-moskva-foot/`, убедиться что
    рендерится без ошибок в консоли и `applyLink` ведёт куда ожидается.

Если что-то из 1–12 не сходится — НЕ переходить к финальному отчёту,
сначала чинить.

---

## Что обязательно флагать обратно пользователю

Все ниже — **в финальном отчёте**, отдельным блоком `⚠ Требует внимания`:

- **Города не из CITY_DATASET** — список + предложение добавить (или
  подтвердить, что пропускаем).
- **Любая валюта кроме RUB** в исходных данных.
- **Зарплата без min/max и без понятного периода** — поставлен только
  `pay.text`, числовые поля пустые → калькулятор не сработает на этом
  оффере.
- **Города, где partner-данные противоречат** базовому описанию
  (требуется override или раздельная VacancySource).
- **Переводы** — RU fallback на всех 11 не-RU языках. Stub'ы
  `"<slug>": {}` добавлены во все файлы
  `src/data/vacancy-translations-source/<lang>.json`. Реальные переводы
  (shortDescription, description, requirements, benefits, requiredDocuments)
  нужно дописать вручную или через переводчика — это отдельная задача.
- **referralLink уже содержит `utm_source=`** → возможен конфликт UTM,
  спросить, перезаписывать ли.
- **min > max** или одинаковые нулевые значения в исходных данных.
- **Колонки в шапке таблицы**, не подошедшие ни под один синоним —
  список + значения первой строки для контекста.
- **Партнёр требует не-CPA флоу** (модалка, лид-форма) — это вне
  скоупа skill, переспросить.
- **Партнёр запрещает добавление UTM** к реф-ссылке (бывает у банков
  и страховых: «передавайте ссылку байт-в-байт») — оставить
  `<COMPANY>_APPLY` как есть, helper не строить, в `applyLink`
  использовать константу напрямую. Явно подсветить в отчёте, что
  будет невозможно различать клики по городам/транспорту.
- **Логотип не SVG** (только PNG/JPG) — рекомендация заменить на SVG.
- **Город в реф-ссылке как path-сегмент** (`/apply/moskva/`, не query) —
  helper должен делать `url.pathname.replace(...)`, а не `searchParams`.
  Прецедент в коде: сейчас такого нет; если встретится — действовать
  по аналогии с `new URL` API и явно описать в коде.

---

## Финальный отчёт

После прохождения валидации и build обязательно вернуть пользователю
структурированный отчёт:

```
✅ Добавлена вакансия: <Компания> — <Должность> (id <N>)

Изменённые файлы:
- src/data/partnerLinks.ts                (новые *_APPLY, *_LOGO)
- src/data/vacancies.ts                   (новый VacancySource)
- src/data/<company>-vacancies.json       (если был создан)
- public/logos/<company>.svg              (если добавлен)

Сборка:
- VacancySource: <X> (было <Y>, стало <Y+1>)
- GeneratedJob: <Z> новых офферов
- npm run generate:data — OK
- npm run build — OK
- dist/v/<slug>-*: <N> страниц
- dist/companies/<companySlug>/: OK

Примеры страниц:
- https://kurerok.ru/v/<slug>-moskva-foot/
- https://kurerok.ru/companies/<companySlug>/

⚠ Требует внимания:
- <список из секции «Что обязательно флагать»>

Следующие шаги:
- Перевести 5 полей (shortDescription, description, requirements, benefits, requiredDocuments) на 11 не-RU языков. Stub'ы уже стоят в `src/data/vacancy-translations-source/<lang>.json` под ключом `"<slug>"`.
- Проверить визуально 1-2 страницы вакансии в браузере.
- Закоммитить (skill сам не коммитит).
```

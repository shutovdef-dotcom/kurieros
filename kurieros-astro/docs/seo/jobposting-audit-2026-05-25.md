# JobPosting JSON-LD audit — 2026-05-25

Аудит структурированной разметки `JobPosting` на страницах вакансий
`/v/{slug}/`. Цель — найти проблемы, из-за которых вакансии могут не
попасть в Google for Jobs / Rich Results или показываться с потерями
информации.

## Методология

1. Отобраны 5 архетипических страниц (5 разных брендов, 4 транспорта,
   разные форматы зарплаты).
2. Для каждой через `curl + python3` извлечён JSON-LD блок с
   `@type: JobPosting` (raw, без AI-обработки).
3. Каждое поле сверено с
   [Google for Jobs developer guide](https://developers.google.com/search/docs/appearance/structured-data/job-posting)
   и Schema.org JobPosting spec.
4. Прогон через `https://search.google.com/test/rich-results` —
   планируется после Phase B fix-ов (ручная проверка в браузере).

## Отобранные страницы

| # | URL | Архетип | Что проверяет |
|---|---|---|---|
| 1 | `/v/burger-king-cook-cashier-moskva-foot/` | monthly + Москва, повар | base path |
| 2 | `/v/kuper-foot-courier-sankt-peterburg-foot/` | hourly + monthly + СПб | hourly/monthly комбо |
| 3 | `/v/tbank-outbound-b2b-operator-barnaul-remote/` | удалёнка | `jobLocationType: TELECOMMUTE` |
| 4 | `/v/alfa-bank-representative-moskva-foot/` | банк представитель | non-courier role |
| 5 | `/v/yandex-eda-courier-moskva-foot/` | per-order / без monthly | пути без `baseSalary` |

## Сводная таблица findings

| ID | Severity | Описание | Затронуто | Где фиксить |
|---|---|---|---|---|
| **A** | 🔴 ERROR | `hiringOrganization.logo` — relative URL (`/logos/alfa-bank.svg`) вместо absolute | 2/5 (Alfa-Bank, Yandex Eda) | `[slug].astro` — резолвить через `new URL(logo, Astro.site).toString()` |
| **B** | 🔴 ERROR | Удалёнка без `jobLocationType: TELECOMMUTE` + синтетический физический адрес | 1/5 (T-Bank operator B2B) — но касается всех `transport === 'remote'` | `schema.ts` + `[slug].astro` |
| **C** | 🟠 HIGH | `baseSalary.minValue = max × 0.6` хардкод — реальные `pay.monthly.min` из данных игнорируются | 5/5 | `schema.ts` + `[slug].astro` |
| **D** | 🟡 MEDIUM | `industry: "Курьерская доставка"` для всех — нерелевантно для повара, оператора call-центра, банк-представителя | 5/5 | `schema.ts` — параметризовать, default-ить per-company |
| **E** | 🟡 MEDIUM | `occupationalCategory: "53-3031 Driver/Sales Workers"` для всех — для повара 35-3023, оператора 43-2011 | 5/5 | `schema.ts` — параметризовать |
| **F** | 🟡 MEDIUM | `employmentType: [FULL_TIME]` для смешанных графиков (гибкий: «подработка ИЛИ полная») | 2/5 (BK, Alfa-Bank) | `mapEmploymentTypeToSchema` — расширить regex |
| **G** | 🟢 LOW | `hiringOrganization.sameAs` → наша же страница; нет `.url` (homepage работодателя) | 5/5 | `schema.ts` + новая мапа `COMPANY_HOMEPAGES` |
| **H** | 🟢 LOW (defer) | `jobLocation.streetAddress: "Красная площадь, 1"` — синтетический landmark для города. Не technically wrong, но может насторожить anti-spam | 5/5 | `cityAddresses.ts` — backlog item, не в этом PR |
| **I** | 🟢 LOW (defer) | `jobBenefits` и `qualifications` как `string` (semicolon-separated) вместо `string[]` | 5/5 | `schema.ts` — backlog, низкий impact |

## Что фиксим в этом PR

**Phase B scope** (зелёный коридор):

1. **Fix A** — absolute `hiringOrganization.logo` URL (relative resolve через `Astro.site`)
2. **Fix B** — `jobLocationType: TELECOMMUTE` + опустить `jobLocation` для удалёнки (или `applicantLocationRequirements` only)
3. **Fix C** — `baseSalary.{minValue, maxValue}` из реальных `pay.monthly.{min, max}`, без 60% эвристики
4. **Fix D** — `industry` параметризовать; жёсткая мапа per-company (Бургер Кинг → «Общественное питание», T-Bank/Alfa → «Финансовые услуги», Яндекс Еда/Купер → «Курьерская доставка»)
5. **Fix E** — `occupationalCategory` параметризовать; мапа per-source-slug (cook → 35-3023, operator → 43-2011, representative → 41-2031, courier → 53-3031)
6. **Fix F** — расширить `mapEmploymentTypeToSchema` чтобы детектить «гибкий» / «можно подработка» / «5/2 или 2/2» как `[FULL_TIME, PART_TIME]`
7. **Fix G** — добавить `hiringOrganization.url` → homepage работодателя; новая мапа `COMPANY_HOMEPAGES`

## Что отложено в backlog

- **Fix H** — synthetic city addresses (Красная площадь / Невский / Площадь Советов) → backlog item
- **Fix I** — `jobBenefits`/`qualifications` как массивы строк → backlog item

## Raw findings — per URL

### 1. Burger King повар Москва

**JSON-LD highlights:**
- `employmentType: ["FULL_TIME"]` — ⚠️ должно быть `[FULL_TIME, PART_TIME]` (schedule: «гибкий: подработка ИЛИ полная»)
- `industry: "Курьерская доставка"` — ⚠️ для повара должно быть «Общественное питание»
- `occupationalCategory: "53-3031 Driver/Sales Workers"` — ⚠️ для повара 35-3023 «Fast Food and Counter Workers»
- `baseSalary.minValue: 56400` — ⚠️ это 60% от max (94000); реальный min должен быть из данных
- `hiringOrganization.logo: https://agents.pampadu.ru/...` — ✅ absolute

### 2. Купер пеший СПб

**JSON-LD highlights:**
- `employmentType: ["CONTRACTOR"]` — ✅ корректно (самозанятость)
- `baseSalary.minValue: 105624` — ⚠️ 60% от max (176040)
- `description` — ⚠️ короткое (~150 символов); Google рекомендует ≥250 для полноценной карточки

### 3. T-Bank operator B2B Барнаул (удалёнка)

**JSON-LD highlights:**
- 🔴 **`jobLocation.address.streetAddress: "Площадь Советов, 1"`** в Барнауле + **нет `jobLocationType: TELECOMMUTE`**, хотя `description` явно говорит «формат работы полностью удалённый»
- `baseSalary.minValue: 42000` — ⚠️ 60% от max (70000)

### 4. Альфа-Банк представитель Москва

**JSON-LD highlights:**
- 🔴 **`hiringOrganization.logo: "/logos/alfa-bank.svg"`** — relative URL, для Googlebot нерезолвится
- `employmentType: ["FULL_TIME"]` — ⚠️ schedule «5/2, 2/2, 4/2 или 3/2» — есть part-time варианты
- `industry: "Курьерская доставка"` — ⚠️ для банка должно быть «Финансовые услуги»
- `occupationalCategory: "53-3031"` — ⚠️ для представителя банка 41-2031 «Retail Salespersons»
- `baseSalary.minValue: 72000` — ⚠️ 60% от max (120000)

### 5. Яндекс Еда пеший Москва

**JSON-LD highlights:**
- 🔴 **`hiringOrganization.logo: "/logos/yandex-eda.svg"`** — relative URL
- `employmentType: ["CONTRACTOR"]` — ✅ корректно (ГПХ/самозанятость)
- `industry: "Курьерская доставка"` — ✅ корректно
- `baseSalary.minValue: 64152` — ⚠️ 60% от max (106920)

## Verification — после Phase B

Все 7 fix-ов применены, верификация через локальный build + extract JSON-LD из `dist/v/{slug}/index.html`:

| Page | Fix | Baseline → After |
|---|---|---|
| burger-king-cook-cashier-moskva-foot | F | `[FULL_TIME]` → `[FULL_TIME, PART_TIME]` ✅ |
| burger-king-cook-cashier-moskva-foot | D | `Курьерская доставка` → `Общественное питание` ✅ |
| burger-king-cook-cashier-moskva-foot | E | `53-3031` → `35-3023 Fast Food and Counter Workers` ✅ |
| burger-king-cook-cashier-moskva-foot | C | `minValue: 56400 (60%)` → `minValue: 64000` (real data) ✅ |
| burger-king-cook-cashier-moskva-foot | G | (нет url) → `url: "https://burgerking.ru/"` ✅ |
| kuper-foot-courier-sankt-peterburg-foot | G | (нет url) → `url: "https://kuper.ru/"` ✅ |
| kuper-foot-courier-sankt-peterburg-foot | C | `minValue: 105624 (60%)` → `minValue: 176040` (single-point — реальный min отсутствует в данных) ✅ |
| tbank-outbound-b2b-operator-barnaul-remote | B | синтетич. адрес «Площадь Советов, 1» + нет TELECOMMUTE → `addressCountry: "RU"` only + `jobLocationType: "TELECOMMUTE"` ✅ |
| tbank-outbound-b2b-operator-barnaul-remote | D | `Курьерская доставка` → `Финансовые услуги` ✅ |
| tbank-outbound-b2b-operator-barnaul-remote | E | `53-3031` → `41-9041 Telemarketers` ✅ |
| alfa-bank-representative-moskva-foot | A | `/logos/alfa-bank.svg` (relative) → `https://kurerok.ru/logos/alfa-bank.svg` (absolute) ✅ |
| alfa-bank-representative-moskva-foot | D | `Курьерская доставка` → `Финансовые услуги` ✅ |
| alfa-bank-representative-moskva-foot | E | `53-3031` → `41-2031 Retail Salespersons` ✅ |
| yandex-eda-courier-moskva-foot | A | `/logos/yandex-eda.svg` (relative) → `https://kurerok.ru/logos/yandex-eda.svg` (absolute) ✅ |
| yandex-eda-courier-moskva-foot | G | (нет url) → `url: "https://eda.yandex.ru/"` ✅ |

## Regression caught during verification

Fix F (combined `employmentTypeLabel + scheduleText`) изначально создавал false-positive для T-Bank operator B2B — regex `/полн/` ловил `"полностью"` в фразе `"полностью удалённый формат"` и помечал роль `FULL_TIME`. Исправлено через negative lookahead `/полн(?!остью)/`. Добавлены 3 regression-guard теста (positive + negative).

## Test suite

После всех fix-ов:
- `npm test`: **579 passed, 4 skipped** (включая 34 новых теста в `tests/schema.test.ts`)
- `npm run typecheck`: **0 errors**
- `npm run lint`: **clean**
- `npm run build`: **6758 pages built in 30s**

## Связанные документы

- Backlog после этого PR — добавить H, I (synthetic addresses + array fields)
- Связано с `kurieros-stats/semantic-core/run-2026-05-18/08-implementation-plan.md` — пункт P2 SEO

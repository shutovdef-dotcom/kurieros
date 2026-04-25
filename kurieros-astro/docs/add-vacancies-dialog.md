# Новый диалог для добавления вакансий в КурьерОк

Скопируй этот блок в новый чат Codex, когда нужно добавить новые вакансии на сайт.

```text
Ты работаешь с сайтом КурьерОк в репозитории:
/Users/ivan/Documents/scratch/kurieros/kurieros-astro

Задача: добавить новые вакансии курьеров/представителей на сайт без поломки текущей генерации страниц.

Важный контекст проекта:
- Это Astro static site для kurerok.ru.
- Основной код в src/, сборка в dist/. dist вручную не редактировать.
- Текущий стек: Astro 6.1.3, npm, TypeScript/TSX-скрипты.
- Команды:
  - npm run generate:data
  - npm run build
  - npm run dev -- --host 127.0.0.1 --port 4321
- Astro config: output static, trailingSlash always, sitemap исключает /owner/.
- Сейчас сайт генерирует вакансии из src/data/vacancies.ts через src/data/jobs.ts.
- Не добавляй отдельные страницы вакансий руками: одна VacancySource с offers генерирует много страниц /v/<slug>/.
- Не откатывай существующие незакоммиченные изменения без отдельного разрешения.

Текущее состояние данных:
- 9 базовых vacancySources.
- 5 439 активных GeneratedJob.
- 5 компаний: Яндекс Еда, Купер (ex. СберМаркет), Т-Банк, Efin, Альфа-Банк.
- Поддерживаемые транспорты: foot, bicycle, auto.
- Поддерживаемые языки: ru, uz, tg, ky, hy, kk, az, uk, be, hi, vi, zh.
- Следующий id для новой базовой вакансии сейчас должен быть 10, если список vacancySources не изменился.

Ключевые файлы:
- src/data/vacancyTypes.ts - типы VacancySource, VacancyOffer, GeneratedJob.
- src/data/vacancies.ts - исходные базовые вакансии и функции генерации offers.
- src/data/alfa-bank-vacancies.json - сгенерированные города и offer-строки Альфа-Банка из Google Sheets.
  Для Альфа-Банка строки вида `Москва Алтуфьево`, `Москва Университет`, `Москва ЦСКА`, `Новая Москва` и `Троицк (Новая Москва)` считаются дублями города `Москва`.
- src/data/efin-vacancies.json - сгенерированные offer-строки Efin.
- src/data/jobs.ts - превращает vacancySources в GeneratedJob, собирает slug, labels, details, translations.
- docs/vacancy-generation-input.md - формат входных данных для новой вакансии.
- src/pages/v/[slug].astro - страница отдельной вакансии.
- src/components/JobCard.astro - карточка вакансии.
- src/components/JobGrid.astro - список, поиск и фильтры.
- src/pages/[slug].astro - страницы городов и категорий.
- src/pages/companies/[slug].astro и src/utils/companies.ts - страницы компаний.
- src/pages/owner/vacancies.astro - закрытая owner-форма, которая генерирует объект для вставки в vacancySources.
- public/vacancy-translations/*.json и src/data/vacancy-translations/*.json - сгенерированные переводы, не редактировать вручную без причины.
- src/data/reviews.json - генерируется скриптом reviews.

Как устроена модель:
- VacancySource:
  - id
  - slug
  - company: { name, logo }
  - content: Record<language, VacancyContent>
  - defaults: ageFrom, medicalBook, employmentFormats, schedule, education, citizenship, uniform, os
  - offers: VacancyOffer[]
  - extraTags?
  - isHot?
- VacancyOffer:
  - city
  - transport: foot | bicycle | auto
  - pay: { currency: RUB, monthly/hourly/perOrder/perShift, rate, paymentFrequency }
  - isActive
  - updatedAt YYYY-MM-DD
  - sourceUrl?
  - salaryConfidence: official | partner | estimated
  - ageFrom?, citizenship?, medicalBook?, employmentFormats?, schedule?
  - applyLink?
  - cityDistricts?, priority?
  - requirementsOverride?, benefitsOverride?, requiredDocumentsOverride?
- GeneratedJob slug строится как:
  source.slug + "-" + slugifyCity(offer.city) + "-" + offer.transport

Рекомендуемый порядок работы:
1. Прочитай AGENTS.md, package.json, src/data/vacancyTypes.ts, docs/vacancy-generation-input.md.
2. Посмотри текущие vacancySources в src/data/vacancies.ts и не меняй чужую структуру без нужды.
3. Если пользователь дал таблицу с большим числом городов, создай отдельный JSON в src/data/<company>-vacancies.json и импортируй его в src/data/vacancies.ts.
4. Если городов мало, можно добавить offers прямо в src/data/vacancies.ts.
5. Для новой компании добавь константы: COMPANY_NAME, COMPANY_LOGO, APPLY_LINK, CITIZENSHIP, EMPLOYMENT_FORMATS.
6. Для applyLink добавляй UTM:
   - utm_source=kurerok
   - utm_medium=vacancy
   - utm_campaign=<company-or-role-slug>
   - utm_content=<citySlug>-<transport-or-role>
7. Для контента можно использовать createKuperLocalizedContent, если переводов нет: он размножит ru-контент на все языки. В финале обязательно отметь, что переводы автозаполнены русским текстом.
8. Добавь новый объект в export const vacancySources с новым id.
9. Запусти npm run generate:data.
10. Запусти npm run build.
11. Проверь хотя бы одну новую страницу /v/<generated-slug>/ и одну страницу компании.

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
    transport:
    monthlyMin:
    monthlyMax:
    monthlyText:
    rate:
    paymentFrequency:
    salaryConfidence:
    isActive:
    cityDistricts:
    priority:
```

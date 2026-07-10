# План роста Google и Яндекса для kurerok.ru

Статус: готов к исполнению. Organic-направление запускается независимо; публикация Яндекс-фида — только после P0-решения по юридической пригодности.

Дата плана: 10 июля 2026 года.

Горизонт:

- 6 недель — техническая стабилизация, CTR и organic growth;
- 8–12 недель — доверие, внешние упоминания и устойчивое расширение;
- основной baseline — 29 июня — 5 июля 2026 года;
- сравнение — 22–28 июня 2026 года.

Исходная аналитика: [недельный отчёт Google и Яндекса](/Users/ivan/Documents/kurieros-stats/reports/2026-07-10-google-yandex-weekly-analytics.md).

## 1. Решение в одном абзаце

Первый месяц не следует тратить на массовое производство новых страниц. Главная возможность находится в исправлении качества уже существующей поверхности:

1. установить правдивые даты вакансий и sitemap;
2. привести JobPosting к требованиям Google;
3. перестроить Яндекс-фид из 9 658 формально уникальных записей в небольшой проверяемый cohort реальных индексируемых страниц;
4. только после этого запускать CTR-эксперименты и расширять сильные кластеры: Horugvino, города, Купер, возраст и метро.

Восстановление Яндекс-фида является условным направлением. По актуальным правилам Яндекса сервис вакансий должен работать через юридическое лицо или ИП, публиковать обязательные реквизиты и рабочий телефон и проходить контрольную заявку. Сейчас сайт указывает только статус НПД. Пока владелец не подтвердит соответствие этим условиям, повторная модерация фида запрещена этим планом. Organic SEO Google и Яндекса при этом продолжается независимо.

## 2. Исходная точка

### 2.1 Поисковая эффективность

| Метрика | Baseline | Диагноз |
|---|---:|---|
| Google clicks | 45 в неделю | +21,6%, но рост пока неустойчив |
| Google impressions | 2 490 | −3,9%; охват не растёт |
| Google CTR | 1,81% | вырос с 1,43% |
| Google position | 10,1 | ухудшилась с 8,5 |
| Google Job rich clicks | 25 | 55,6% всех Google-кликов |
| Google Job rich CTR | 2,79% | сильный канал, который нужно защитить |
| Google valid JobPosting | 29 | было 387; локальная сборка содержит 635 |
| Google valid Breadcrumbs | 68 | было 408; локальная сборка содержит около 8 071 |
| Google discovered, not indexed | 279 | выросло на 195 |
| Yandex impressions | 68 в неделю | +33,3%, но с очень малой базы |
| Yandex clicks | 1 | недостаточно для устойчивого вывода |
| Yandex position | 16,69 | ухудшилась с 11,41 |
| Yandex pages in search | 10 на конец недели, 14 на 10 июля | aggregate важнее sample endpoint |
| Yandex feed | 0 из 9 658 прошли | полный quality block |

### 2.2 Факты из текущего кода

Техническая валидность XML скрывает несколько содержательных нарушений:

- фид содержит 9 658 exact offer URL, но после удаления hash-фрагментов остаётся 6 634 реальных landing URL;
- 3 024 записи являются псевдоуникальными hash-вариантами одних и тех же страниц;
- только 635 уникальных landing pages фида являются indexable, 5 999 имеют noindex;
- 8 792 из 9 658 offer rows, или 91%, ведут на noindex-поверхность;
- 843 sets состоят из 804 city, 19 category, 4 hub и 16 company sets;
- семь flexible-наборов имеют один и тот же состав из 7 890 offers;
- 14 sets из восьми групп являются полностью избыточными по составу;
- 9 473 offers передают партнёрский tracking-домен как значение поля Сайт работодателя; 185 передают внутренний URL kurerok.ru;
- все 9 658 picture URL построены только из 15 физических логотипов;
- Ozon получает updatedAt текущей сборки;
- validThrough вакансии продлевается от даты каждой сборки ещё на 60 дней;
- все sitemap URL получают одинаковый lastmod текущей сборки;
- три brand facets имеют canonical на company pages, но остаются в sitemap;
- все 312 metro pages используют два общих городских пула без station-specific вакансий.

Эти факты означают, что простое увеличение числа offers, sets или страниц ухудшит риск-профиль.

## 3. Цели и ограничения

### 3.1 Цели на 4–6 недель

Ниже указаны lagging outcome targets, а не гарантии релиза. Их оценивают по rolling 28 days, matched controls и сопоставимому query mix. Они не заменяют технические release gates.

| Направление | Baseline | Цель | Защитный порог |
|---|---:|---:|---:|
| Google clicks | 45/нед | 56–62/нед | не ниже 35 две недели подряд |
| Google impressions | 2 490/нед | минимум +10% | не ниже baseline после окончания переобработки |
| Google CTR | 1,81% | 2,1–2,3% | не ниже 1,7% |
| Google position | 10,1 | не хуже 9,5, затем 9,0 | ухудшение не более чем на 1,5 |
| Job rich CTR | 2,79% | минимум 3,3% | не ниже 2,5% |
| Valid JobPosting | 29 | ориентир 100 через 2–3 недели и 300 через 4–6, только если source eligibility audit подтверждает такой cohort | invalid всегда 0 |
| Valid Breadcrumbs | 68 | минимум 250 | invalid всегда 0 |
| Horugvino CTR | 0% при позиции 3,6 | минимум 2% | позиция не хуже 5 |
| Discovered, not indexed | 279 | ниже 200 | не растёт две недели подряд |
| Yandex organic impressions | 68/нед | 100–140/нед | не ниже 50 две недели подряд |
| Yandex organic clicks | 1/нед | минимум 3/нед | оценивать по rolling 28 days |
| Yandex pages in search | 14 | минимум 25 | no LOW_QUALITY wave |
| Yandex metro impressions | 12/нед | минимум 25/нед | removed не выше appeared два среза |
| Возрастной кластер | 47 impressions | минимум 60 | CTR минимум 2% |

Управляемые leading gates:

| Gate | Требование |
|---|---|
| Structured data | 30 из 30 live URL проходят validation, invalid = 0 |
| Vacancy provenance | каждая schema vacancy открыта, имеет source-backed role, salary, datePosted и рабочий apply-flow |
| Sitemap | 200 + index, follow + self-canonical; stable truthful lastmod |
| Feed | normalized URL unique, landing соответствует offer, 25 из 25 manual sample clean |
| Experiment | зафиксированы treatment/control, изменяется одна переменная |
| Surface | изменение не более ±5% за release без отдельного approval |

Защитные пороги по трафику применяются только после двух последовательных срезов и проверки сезонности, изменения спроса и query mix.

Цели Яндекс-фида применяются только после прохождения eligibility gate:

| Срок после нового crawl | Цель |
|---|---|
| 48–72 часа | статус не заблокирован, passed больше 0 |
| 7 дней | минимум 25 sets in search, минимум 80% pilot offers passed |
| 14 дней | минимум 90% pilot offers passed, ноль повторяющихся системных ошибок |

### 3.2 Бизнес-метрика

Поисковые клики не считаются успехом сами по себе. Главная downstream-метрика:

- organic landing → vacancy_open → apply_click;
- отдельно Google organic, Yandex organic и Yandex feed;
- apply-click rate не должен ухудшиться более чем на 10% относительно фактического baseline первой недели;
- исторический ориентир около 27% из прежнего rollout-документа сначала нужно перепроверить в аналитике.

### 3.3 Неподвижные ограничения

- Не менять домен, email, slug или юридические данные без отдельного подтверждения владельца.
- Не публиковать вымышленные адреса, индексы, даты, работодателей, вакансии и зарплаты.
- Не возвращать hash-дубли для искусственного увеличения числа offers или sets.
- Не отправлять новый фид, запрос на переобход или обращение в поддержку без явного согласования.
- Не менять одновременно global indexability и содержание всех страниц.
- Не расширять metro, пока нет честного station-specific слоя.
- Не покупать ссылки и не использовать массовые каталоги.
- Не оценивать результат по одной неделе или только по видимой query-таблице GSC.

## 4. Зависимости и параллельность

Критический путь:

    Baseline и freeze
      ├─→ Правдивые даты и sitemap
      │     ├─→ Google JobPosting
      │     │     └─→ CTR experiments
      │     ├─→ Yandex feed v2
      │     └─→ Controlled indexability
      └─→ Analytics adapter
            ├─→ City, Kuper и age cohorts
            └─→ Metro pilot

Отдельный внешний gate:

    ИП/юрлицо + реквизиты + телефон + moderation flow
      └─→ разрешение на отправку Yandex feed v2

Можно выполнять параллельно:

- eligibility-аудит владельца и технический аудит дат;
- analytics adapter и sitemap regression;
- age content research и feed v2 validator;
- JobPosting schema и подготовку metro data model после стабилизации дат.

Нельзя выполнять параллельно:

- менять JobPosting schema и одновременно запускать title CTR-test на тех же URL;
- менять global vacancy indexability и metro indexability одним релизом;
- расширять feed до получения семи стабильных дней на pilot cohort.

## 5. Пакет 0 — baseline, observability и freeze

Приоритет: P0.

Срок: 0–1 рабочий день.

Ответственный профиль: SEO/data.

Предлагаемая ветка: codex/seo-00-observability.

### Контекст

Сейчас weekly data мало, GSC скрывает около 60% query-level impressions, а Yandex aggregate и samples расходятся. Нельзя безопасно оценивать изменения без стабильных cohort-отчётов.

### Задачи

1. Зафиксировать контрольные cohorts:

   - 30 indexable vacancy pages разных компаний и типов;
   - 10 Horugvino/Ozon warehouse pages;
   - 10–15 zero-click Google treatment pages и равный matched control;
   - 6 city pages: Среднеуральск, Первомайск, Тимашевск, Карталы, Металлострой, Чкаловск;
   - 10 metro pilot pages;
   - Kuper company hub;
   - age guide.

2. Сохранить machine-readable baseline:

   - sitemap URL count и hash;
   - feed offers, normalized landing URLs, sets и physical pictures;
   - indexability reason counts;
   - JobPosting/Breadcrumb counts из dist;
   - GSC и Yandex weekly KPI.

3. Добавить read-only audit command, который не меняет generated manifests.

4. Ввести release guard:

   - изменение indexable surface более ±5% требует отдельного review;
   - падение JobPosting count более 5% блокирует release;
   - появление non-self-canonical URL в sitemap блокирует release.

5. Заморозить массовое добавление metro и новые doorway-like facets до конца первых двух недель.

### Основные файлы

- [package.json](/Users/ivan/Documents/kurieros/kurieros-astro/package.json)
- [scripts](/Users/ivan/Documents/kurieros/kurieros-astro/scripts)
- [vacancy indexability emitter](/Users/ivan/Documents/kurieros/kurieros-astro/scripts/emit-vacancy-indexability.ts)
- [dist build tests](/Users/ivan/Documents/kurieros/kurieros-astro/tests/build-output.test.ts)

### Verification

    npm run build
    npm run test:dist
    npm run check:yandex-feed

### Exit criteria

- baseline воспроизводим одной командой;
- две одинаковые сборки дают одинаковые SEO counts;
- cohorts сохранены с причиной выбора;
- audit ничего не отправляет во внешние сервисы.

### Rollback

Этот пакет добавляет только наблюдаемость. При ошибке удалить audit wiring; не менять production surface.

## 6. Пакет 1 — eligibility gate Яндекс-фида

Приоритет: P0, внешний блокер.

Срок: решение владельца в течение 1 рабочего дня.

Ответственный профиль: владелец/юридический и операционный.

PR: отсутствует до получения настоящих данных.

### Контекст

Актуальные [правила проверки сервисов вакансий Яндекса](https://yandex.ru/support/webmaster/ru/feed/vacancy) требуют:

- действующее юридическое лицо или ИП;
- публичные обязательные реквизиты;
- рабочий телефон;
- минимум 25 корректных sets;
- отдельную страницу предложения;
- отсутствие popups на главной и offer pages;
- возможность подтвердить заявку или звонок при модерации.

Сейчас About/Footer указывают владельца как плательщика НПД и ИНН. ОГРНИП/юрлицо, телефон, адрес и часы обработки не опубликованы.

### Решение владельца

Вариант A — владелец также зарегистрирован как ИП или работает через подходящее юрлицо:

1. подтвердить настоящие реквизиты;
2. определить официальный рабочий телефон;
3. определить часы и ответственного за контрольную заявку;
4. отдельно согласовать изменения About, Contacts, Footer и Privacy;
5. перейти к feed v2.

Вариант B — существует только статус НПД без ИП:

1. не запрашивать повторную модерацию фида;
2. убрать восстановление enriched feed из KPI;
3. продолжить весь organic-план;
4. не публиковать фиктивные реквизиты.

### UX gate

- Home geo modal необходимо заменить ненавязчивым inline banner либо отключить для moderation flow.
- Lead-form modal на vacancy pages следует преобразовать во встроенную форму или отдельную страницу, либо исключить эти offers из pilot feed.
- Изменение popup UX является визуальным и требует local preview handoff и Chrome/Safari/WebKit mobile QA.

### Exit criteria

- задокументирован вариант A или B;
- при варианте A есть реальные реквизиты, телефон, часы и владелец moderation flow;
- до выполнения criteria никакой feed recheck не отправляется.

## 7. Пакет 2 — правдивые даты и sitemap

Приоритет: P0.

Срок: 2–4 рабочих дня.

Ответственный профиль: data/backend + SEO.

Предлагаемая ветка: codex/seo-01-truthful-freshness.

### Контекст

Сейчас несколько независимых механизмов сообщают поисковикам, что почти весь сайт изменился при каждом build:

- Ozon updatedAt строится через текущую дату;
- validThrough продлевается от build date;
- sitemap lastmod равен build date для всех URL;
- WebPage dateModified на ряде страниц равен текущей дате.

Это может заставлять поисковики постоянно переобрабатывать неизменившуюся поверхность. Связь с текущим падением GSC valid items является гипотезой, но сам сигнал объективно неверен. Google отдельно требует точный lastmod для вакансий в [официальной документации JobPosting](https://developers.google.com/search/docs/appearance/structured-data/job-posting).

### Задачи

1. Развести поля:

   - postedAt — исходная дата публикации;
   - sourceCheckedAt — дата реальной проверки upstream;
   - contentUpdatedAt — дата фактического изменения;
   - validThrough — только реальный срок, если он известен.

2. Для Ozon:

   - сохранить exportedAt или fetchedAt внутри обоих source JSON;
   - обновлять дату только fetch-tools;
   - запретить new Date при обычной сборке.

3. Для evergreen jobs:

   - не продлевать validThrough автоматически;
   - если срок неизвестен, не выдумывать его;
   - возраст sourceCheckedAt использовать как сигнал quarantine/recheck, а не как доказательство закрытия;
   - убрать JobPosting только при explicit inactive/expired, подтверждённом исчезновении upstream либо неработающем apply-flow;
   - 14/30 дней использовать как очередь повторной проверки, не как автоматический срок снятия;
   - массовое снятие выполнять отдельными batches не более 5% surface с control cohort и rollback manifest.

4. Sitemap:

   - убрать глобальный lastmod текущей сборки;
   - использовать source/content dates по типу URL либо опускать lastmod, если точной даты нет;
   - исключить все non-self-canonical URLs;
   - отдельно исключить brand facets Kuper, Ozon и Samokat, canonical которых ведёт на company pages.

5. Убрать build-date dateModified на страницах, контент которых фактически не менялся.

6. Добавить invariant:

   - sitemap URL отвечает 200;
   - index, follow;
   - self-canonical;
   - отсутствует в noindex manifests.

### Основные файлы

- [astro.config.mjs](/Users/ivan/Documents/kurieros/kurieros-astro/astro.config.mjs)
- [ozonOffers.ts](/Users/ivan/Documents/kurieros/kurieros-astro/src/data/ozonOffers.ts)
- [vacancyTypes.ts](/Users/ivan/Documents/kurieros/kurieros-astro/src/data/vacancyTypes.ts)
- [jobPostingDates.ts](/Users/ivan/Documents/kurieros/kurieros-astro/src/utils/jobPostingDates.ts)
- [vacancy page](/Users/ivan/Documents/kurieros/kurieros-astro/src/pages/v/[slug].astro)
- [companySeo.ts](/Users/ivan/Documents/kurieros/kurieros-astro/src/utils/companySeo.ts)

### Tests

- два одинаковых build дают одинаковые dates и sitemap hash;
- refresh одного source изменяет только связанные URLs;
- unknown expiry не превращается в build plus 60 days;
- canonical alternates отсутствуют в sitemap;
- indexability meta и sitemap меняются атомарно.

### Verification

    npx vitest run tests/jobPostingDates.test.ts tests/companySeo.test.ts tests/build-output.test.ts
    npm run build
    npm run test:dist
    npm run check:release

### Exit criteria

- 0 build-generated freshness dates в индексируемой SEO-поверхности;
- 0 canonical conflicts в sitemap;
- surface count изменился не более чем на согласованный предел;
- локально остаётся ожидаемый cohort JobPosting, изменение документировано.

### Rollback

- вернуть предыдущий date manifest, а не new Date behavior;
- routes не удалять;
- не откатывать exclusion non-self-canonical URLs из sitemap.

## 8. Пакет 3 — Yandex vacancy feed v2

Приоритет: P0, но публикация зависит от пакета 1.

Срок: 3–5 рабочих дней на код и локальный QA.

Ответственный профиль: data/backend + SEO.

Предлагаемая ветка: codex/seo-02-yandex-feed-v2.

### Контекст

[Требования Яндекса к фиду вакансий](https://yandex.ru/support/webmaster/ru/search-appearance/vacancies) прямо говорят, что:

- offer URL должен быть уникален без учёта меток;
- set должен иметь минимум три разных URL;
- передавать весь каталог не обязательно;
- достаточно sets, которые действительно нужно обогатить.

Текущий фид противоречит духу этих правил: hash-дубли, noindex landings, tracking URLs в поле работодателя и многотысячные sets, большая часть которых не видна в основном HTML.

### Стратегия pilot-first

Первый feed v2 должен быть меньше, но проверяем полностью:

- только уникальные normalized landing pages;
- только indexable detail pages;
- только актуальные offers;
- 40–60 сильных city sets, с запасом относительно минимума 25;
- от 5 до 24 offers на set;
- минимум три разных работодателя только для multi-employer city sets;
- минимум три разных названия;
- каждый offer виден в основном HTML set page;
- set page отвечает 200, indexable и self-canonical;
- wide category, hub, company и metro sets исключены из первого pilot.

### Задачи

1. Перевести feed input с jobsData на detail/indexable surface либо явно дедуплировать по canonical detail path.

2. Удалить 3 024 hash-offer duplicates.

3. После dedupe пересобрать sets; не пытаться вернуть прежние 1 046 через anchors.

4. Удалить семантически дублирующиеся sets с идентичным составом и intent:

   - шесть flexible facets и hub не должны одновременно нести один состав;
   - category/hub canonical pairs не должны дублировать друг друга;
   - Kuper category/company duplicate set должен иметь один canonical owner.
   - один offer может оставаться в нескольких разных релевантных sets;
   - company set может быть single-employer, если landing и offers действительно соответствуют employer intent.

5. Исправить поле Сайт работодателя:

   - использовать verified official homepage из companyHomepages;
   - не использовать affiliate/tracking apply URL;
   - опускать поле, если official homepage неизвестен.

6. Отдельно решить remote duplicates:

   - 188 одинаковых T-Bank titles должны быть подтверждены как отдельные региональные jobs;
   - иначе одна nationwide landing page и один offer либо временное исключение.

7. Name validation:

   - уникальность по vendor + role + real region;
   - без keyword stuffing;
   - морфологические пары Пушкин/Пушкино и подобные должны сохранять исходный location.

8. Images:

   - HEAD/GET 200;
   - Content-Type image;
   - без HTML и неожиданных redirects;
   - exact picture URL уникален для каждого offer;
   - URL стабилен между одинаковыми сборками;
   - если Яндекс не подтверждает query-string uniqueness, использовать стабильный per-offer path/alias, а не случайный cache-busting query;
   - physical asset можно переиспользовать, но validator отдельно показывает число base logos;
   - 100 pending items сгруппировать по 15 base logos.

9. Validator должен выдавать reason report:

   - source jobs;
   - normalized unique pages;
   - indexable pages;
   - exclusions by reason;
   - qualified sets;
   - duplicate set compositions with the same intent;
   - duplicate names;
   - duplicate exact picture URLs;
   - physical pictures;
   - stale offers.

10. Собрать локальный feed-v2 artifact. Production URL не переключать до ручной проверки и решения владельца.

### Основные файлы

- [yandexVacancyFeed.ts](/Users/ivan/Documents/kurieros/kurieros-astro/src/utils/yandexVacancyFeed.ts)
- [feed validator](/Users/ivan/Documents/kurieros/kurieros-astro/scripts/validate-yandex-vacancy-feed.ts)
- [feed tests](/Users/ivan/Documents/kurieros/kurieros-astro/tests/yandexVacancyFeed.test.ts)
- [vacancyIndexability.ts](/Users/ivan/Documents/kurieros/kurieros-astro/src/utils/vacancyIndexability.ts)
- [companyHomepages.ts](/Users/ivan/Documents/kurieros/kurieros-astro/src/data/companyHomepages.ts)

### Manual moderation rehearsal

Перед публикацией случайно выбрать 25 sets и проверить:

- set title соответствует странице;
- каждый offer действительно входит в set;
- name, vendor, region, salary и schedule совпадают с HTML;
- application path работает;
- не происходит подмена на аналогичную vacancy;
- отсутствует popup либо offer исключён;
- contact/phone flow готов к проверке.

Для повторной модерации требуется 25 из 25 без дефектов, хотя официальный порог блокировки — более 4%.

### Verification

    npm run check:yandex-feed
    npx vitest run tests/yandexVacancyFeed.test.ts tests/vacancyIndexability.test.ts
    npm run build
    npm run test:dist

### Exit criteria

- exact offers равно unique normalized base landing URLs;
- 0 offer на noindex/noncanonical landing;
- 0 tracking URLs в поле работодателя;
- 0 семантически дублирующихся sets с одинаковым intent и составом;
- multi-membership offer допускается только для разных релевантных sets;
- 0 duplicate exact picture URLs, все picture URLs стабильны и доступны;
- минимум 40 qualified pilot sets;
- 25 из 25 manual sample clean;
- production feed ещё не отправлен без отдельного approval.

### External release sequence

Только после approval:

1. переключить production feed на pilot;
2. дождаться crawl;
3. проверить parser и passed;
4. убедиться, что Яндекс видит минимум 25 qualified sets;
5. подготовить evidence packet;
6. отдельно согласовать отправку обращения в поддержку.

### Rollback

- вернуть последнюю технически читаемую pilot-version;
- не возвращать current 9 658/843 автоматически;
- при parser error откатить endpoint;
- при двух дефектах в sample 25 остановить recheck;
- расширять максимум на 100–200 offers после семи стабильных дней.

## 9. Пакет 4 — Google JobPosting и Breadcrumb coverage

Приоритет: P0.

Срок: 3–5 рабочих дней.

Ответственный профиль: backend/SEO.

Предлагаемая ветка: codex/seo-03-jobposting-integrity.

Зависимость: пакет 2.

### Контекст

Job rich results дают более половины Google clicks. Локальная сборка содержит 635 JobPosting, но GSC обработал только 29. Число 635 является техническим count, а не доказательством eligibility. Сначала нужно гарантировать provenance, соответствие и стабильность, затем пересчитать допустимый cohort и ждать crawl.

### Задачи

1. Source-by-source eligibility gate:

   - вакансия явно открыта и принимает кандидатов;
   - известна оригинальная employer datePosted, а не дата build/fetch;
   - role и salary подтверждены upstream и совпадают с visible content;
   - apply-flow работает и не заменяет вакансию аналогичной;
   - страница описывает реальную позицию, а не affiliate-only solicitation;
   - при отсутствии оригинальной даты или доказательства открытой позиции JobPosting не эмитится до получения данных.

2. JobPosting title:

   - ввести source-backed roleTitle без employer, city, salary и рекламных слов;
   - тот же roleTitle дословно вывести в видимом контенте как название должности;
   - использовать его в JobPosting.title;
   - document title может оставаться полным и CTR-oriented;
   - render-test подтверждает, что schema title дословно присутствует в visible page.

3. Description:

   - полное представление видимого job content;
   - обязанности, требования, график, образование/опыт и преимущества;
   - никакого schema-only текста, отсутствующего на странице.

4. Dates:

   - original postedAt;
   - source-verified freshness;
   - real validThrough либо отсутствие свойства;
   - возраст проверки отправляет vacancy в recheck queue;
   - schema снимается только по explicit inactive/expired, исчезновению upstream или broken apply-flow.

5. Location:

   - использовать реальный upstream workplace address, если он существует;
   - у Ozon уже есть hireObjectLabel, включая адрес Хоругвино;
   - не выдумывать postalCode и streetAddress;
   - metro hints не превращать в jobLocation.

6. Apply:

   - directApply только при фактическом соответствии Google flow;
   - application path должен работать;
   - canonical detail URL не должен подменяться affiliate URL.

7. Breadcrumb:

   - проверить 30 pages из разных архетипов;
   - breadcrumb URLs 200/self-canonical;
   - JobPosting только на single-job pages.

8. После deployment:

   - Rich Results Test на 30 URL;
   - URL Inspection на малой выборке;
   - ждать обработки минимум 7–14 дней;
   - Indexing API рассматривать отдельным пакетом только с service account и approval.

### Основные файлы

- [schema.ts](/Users/ivan/Documents/kurieros/kurieros-astro/src/utils/schema.ts)
- [vacancy page](/Users/ivan/Documents/kurieros/kurieros-astro/src/pages/v/[slug].astro)
- [VacancyContentSections](/Users/ivan/Documents/kurieros/kurieros-astro/src/components/vacancy/VacancyContentSections.astro)
- [jobLocationAddress.ts](/Users/ivan/Documents/kurieros/kurieros-astro/src/utils/jobLocationAddress.ts)
- [jobPostingDates.ts](/Users/ivan/Documents/kurieros/kurieros-astro/src/utils/jobPostingDates.ts)
- [schema tests](/Users/ivan/Documents/kurieros/kurieros-astro/tests/schema.test.ts)

### Verification

    npx vitest run tests/schema.test.ts tests/jobLocationAddress.test.ts tests/jobPostingDates.test.ts tests/vacancyStructuredData.test.ts
    npm run build
    npm run test:dist

### Exit criteria

- 30 из 30 pages без Rich Results errors;
- 30 из 30 pages прошли source eligibility gate;
- JobPosting.title дословно присутствует в visible content;
- invalid JobPosting = 0;
- datePosted и lastmod стабильны между identical builds;
- real address используется только source-gated;
- provenance-qualified JobPosting count пересчитан и документирован;
- targets 100/300 пересмотрены, если eligible cohort меньше.

### Rollback

- optional address fields отключаются source flag;
- при появлении invalid items schema patch откатывается отдельно, URL не меняются;
- если Job rich clicks падают более 25% две недели подряд, остановить CTR work и расследовать.

## 10. Пакет 5 — analytics adapter для Google и Метрики

Приоритет: P1, до content experiments.

Срок: 1–2 рабочих дня.

Ответственный профиль: frontend/analytics.

Предлагаемая ветка: codex/seo-04-search-funnel-measurement.

### Контекст

Сейчас GA4 получает custom events, а Яндекс Метрика в основном pageview/clickmap. Обработчики также прекращают работу, если gtag отсутствует. Официальная документация Яндекса рекомендует Метрику для учёта конверсий внутри vacancy answers.

### Задачи

1. Ввести единый trackEvent adapter для GA4 и ym reachGoal.

2. Dual-write:

   - vacancy_open;
   - apply_click;
   - grid_filter_change;
   - ozon_lead_open/submit;
   - apply_redirect_start.

3. Добавить безопасные dimensions:

   - page_type;
   - landing_cluster;
   - indexability_reason;
   - source_slug;
   - company;
   - city;
   - transport.

4. Не передавать имя, телефон, email и иные персональные данные.

5. Внешнее создание goals/custom dimensions выполнить только после отдельного approval.

### Основные файлы

- [analytics init](/Users/ivan/Documents/kurieros/kurieros-astro/public/bootstrap/analytics-init.js)
- [analytics events](/Users/ivan/Documents/kurieros/kurieros-astro/src/scripts/analyticsEvents.ts)
- [analytics tests](/Users/ivan/Documents/kurieros/kurieros-astro/tests/analyticsEvents.test.ts)
- [Ozon lead events](/Users/ivan/Documents/kurieros/kurieros-astro/src/scripts/ozonLeadModal.js)

### Verification

    npx vitest run tests/analyticsEvents.test.ts
    npm run typecheck
    npm run lint
    npm run build

В local preview проверить четыре сценария: GA4 + Metrika, только GA4, только Metrika, обе системы отключены. Payload inspect должен подтверждать отсутствие PII.

### Deploy protocol

1. Выпустить adapter без создания внешних goals.
2. Проверить, что current GA4 events не потеряны.
3. После отдельного approval создать Metrika goals/custom dimensions.
4. Зафиксировать первую полную неделю funnel baseline до content experiments.

### Exit criteria

- GA4 and Metrika receive the same semantic events;
- disabled GA4 no longer disables Metrika;
- no PII in payload;
- organic funnel report строится по engine/page cohort.

### Rollback

Dual-write adapter отключается независимо от страниц и SEO markup.

## 11. Пакет 6 — Google CTR experiments

Приоритет: P1.

Срок: запуск на второй неделе, оценка 14–28 дней.

Ответственный профиль: SEO/content.

Предлагаемая ветка: codex/seo-05-vacancy-ctr-cohort.

Зависимость: пакеты 2, 4 и 5.

### Experiment A — Horugvino

Baseline:

- 85 impressions;
- 0 clicks;
- average position 3,6;
- все показы через Job listing;
- одна landing page;
- cannibalization не обнаружена.

Сначала техническая integrity:

- role-only schema title;
- source-backed address д. Хоругвино, д. 35/2;
- truthful dates;
- complete description;
- schedule, salary, food, transport и без опыта видны пользователю.

Затем один CTR change:

- HTML title candidate: Работа на складе Ozon в Хоругвино — от 70 000 ₽, график 2/2;
- canonical и slug не менять;
- сравнить с Kemerovo/Ozon warehouse cohort.

Success:

- минимум 100 новых impressions или 14–21 день;
- CTR минимум 2%;
- position не хуже 5.

Stop:

- position ухудшается более чем на 2 после достаточного объёма;
- rich result исчезает;
- mismatch между schema и visible content.

### Experiment B — matched vacancy cohort

Treatment:

- 10–15 URL;
- минимум 10 impressions;
- position 1–8;
- CTR 0.

Control:

- такой же company/role type;
- близкая position;
- без copy changes.

Порядок переменных:

1. schema integrity;
2. HTML title;
3. meta description/visible first-screen value.

Evaluation:

- mobile отдельно, поскольку он даёт 81,4% impressions и 86,7% clicks;
- минимум 100 impressions на cohort или 14–21 день;
- success: +1 percentage point CTR treatment versus control;
- guardrail: position не хуже более чем на 1.

### Основные файлы и входные артефакты

- [weekly analytics report](/Users/ivan/Documents/kurieros-stats/reports/2026-07-10-google-yandex-weekly-analytics.md)
- [vacancy page](/Users/ivan/Documents/kurieros/kurieros-astro/src/pages/v/[slug].astro)
- [vacancy title helper](/Users/ivan/Documents/kurieros/kurieros-astro/src/utils/vacancySeoTitle.ts)
- [VacancyHero](/Users/ivan/Documents/kurieros/kurieros-astro/src/components/vacancy/VacancyHero.astro)
- treatment/control manifest, созданный пакетом 0.

### Verification

    npx vitest run tests/vacancySeoTitle.test.ts tests/vacancyPage.test.ts tests/schema.test.ts
    npm run build
    npm run test:dist
    npm run qa:visual

### Deploy and observation protocol

1. Зафиксировать pre-period cohort.
2. Выпустить только schema integrity и дождаться reprocessing.
3. Затем изменить одну CTR-переменную treatment cohort.
4. Не менять control до окончания окна.
5. Снимать outcome после 100 impressions или 14–21 дней, затем подтверждать rolling 28 days.

### Exit and rollback

- winner документирован по mobile/desktop и versus control;
- при position regression более 2, исчезновении rich result или content mismatch вернуть предыдущий title/copy;
- schema rollback не должен откатывать truthful dates;
- новый experiment не запускается, пока текущий не закрыт.

## 12. Пакеты 7A–7C — city, Kuper и age intent

Приоритет: P1.

Срок: недели 2–4.

Эти три пакета имеют разные failure domains и выпускаются отдельными PR. Они могут выполняться параллельно после пакетов 2 и 5.

### 12.1 Пакет 7A — city cohort

Ответственный профиль: SEO/content.

Ветка: codex/seo-06-city-cohort.

Зависимости: truthful dates/sitemap и analytics adapter.

Вход: weekly report и cohort manifest из пакета 0.

Первая когорта:

- Среднеуральск;
- Первомайск;
- Тимашевск;
- Карталы;
- Металлострой;
- Чкаловск.

Действия:

- реальные roles и employers;
- local salary table из текущих offers;
- честная география;
- ссылки на exact detail pages;
- полезные соседние города;
- убрать из CityClusterGuide внутренние SEO-термины вроде Главный URL кластера и Интент;
- не тратить CTR-ресурс на Москву с position 32,3 до роста relevance/authority.

Файлы:

- [citySeoClusters.ts](/Users/ivan/Documents/kurieros/kurieros-astro/src/utils/citySeoClusters.ts)
- [CityClusterGuide](/Users/ivan/Documents/kurieros/kurieros-astro/src/components/CityClusterGuide.astro)
- [city listing page](/Users/ivan/Documents/kurieros/kurieros-astro/src/pages/[slug].astro)
- [city cluster tests](/Users/ivan/Documents/kurieros/kurieros-astro/tests/citySeoClusters.test.ts)

Verification:

    npx vitest run tests/citySeoClusters.test.ts tests/build-output.test.ts
    npm run build
    npm run test:dist
    npm run qa:visual

Deploy/observation:

- выпускать только шесть treatment pages;
- остальные cities являются control;
- наблюдать минимум 14–28 дней.

Exit:

- aggregate CTR минимум 2%;
- clicks минимум на 4 из 6 pages;
- average position не хуже 8;
- visible facts совпадают с source offers.

Rollback:

- вернуть content/config cohort;
- не откатывать truthful sitemap;
- при position regression более 2 остановить expansion.

### 12.2 Пакет 7B — Kuper brand intent

Ответственный профиль: SEO/content/schema.

Ветка: codex/seo-07-kuper-brand.

Зависимости: truthful sitemap и analytics adapter.

Правильный URL: /companies/kuper-ex-sbermarket/. Slug не меняется.

Действия:

- убрать canonicalized /rabota-kurerom-kuper/ из sitemap;
- сохранить company page владельцем broad brand intent;
- локальные detail pages продолжают отвечать за role + city;
- добавить Organization alternateName Купер и СберМаркет после schema review;
- контекстные ссылки из age, payouts, penalties, compare и relevant city pages;
- обновлять guide facts только с verified date.

Файлы:

- [companyGuides.ts](/Users/ivan/Documents/kurieros/kurieros-astro/src/data/companyGuides.ts)
- [company page](/Users/ivan/Documents/kurieros/kurieros-astro/src/pages/companies/[slug].astro)
- [companySeo.ts](/Users/ivan/Documents/kurieros/kurieros-astro/src/utils/companySeo.ts)
- [company SEO tests](/Users/ivan/Documents/kurieros/kurieros-astro/tests/companySeo.test.ts)

Verification:

    npx vitest run tests/companySeo.test.ts tests/companiesIndexLinks.test.ts tests/schema.test.ts
    npm run build
    npm run test:dist
    npm run qa:visual

Deploy/observation:

- company hub является treatment;
- local Kuper vacancies и другие brand hubs являются guardrails;
- окно минимум 28 дней из-за низкой query volume.

Exit:

- company hub получает 30–50% видимых impressions broad query купер;
- CTR company hub минимум 2%;
- local vacancy intent не теряет clicks;
- sitemap canonical conflict = 0.

Rollback:

- вернуть copy/links/alternateName отдельно;
- canonical owner и slug не менять;
- при потере local clicks остановить дальнейшую перелинковку.

### 12.3 Пакет 7C — age guide

Ответственный профиль: research/content.

Ветка: codex/seo-08-age-guide.

Зависимости: analytics adapter; official source research должен быть завершён до content edit.

Baseline: 47 из 68 Yandex impressions относятся к age intent.

Действия:

- проверить требования по официальным источникам брендов;
- разделить пеший, вело, авто, сборщик и банк;
- сравнительная таблица бренд × роль × возраст × согласие × оформление × verified date;
- отдельные source-backed FAQ по Яндекс Еде, Куперу, Ozon, Самокату и банкам;
- links to relevant company pages and actual vacancies;
- не создавать пачку doorway age pages;
- сократить дубли в general how-to guide до summary и ссылки.

Файлы:

- [knowledge-base.json](/Users/ivan/Documents/kurieros/kurieros-astro/src/data/knowledge-base.json)
- [knowledge.ts](/Users/ivan/Documents/kurieros/kurieros-astro/src/utils/knowledge.ts)
- [guide topic page](/Users/ivan/Documents/kurieros/kurieros-astro/src/pages/guide/[topic].astro)

Verification:

    npx vitest run tests/knowledge.test.ts tests/schema.test.ts tests/seo-surface.test.ts
    npm run build
    npm run test:dist
    npm run qa:visual

Новый knowledge test должен проверять source IDs, unique item IDs, verified dates и совпадение visible FAQ с JSON-LD.

Deploy/observation:

- менять один existing URL, не создавать новые routes;
- сохранить pre-period age query cohort;
- наблюдать минимум 28 дней.

Exit:

- age impressions минимум 60;
- CTR минимум 2%;
- clicks минимум по двум разным queries;
- 0 facts без official source и verified date.

Rollback:

- вернуть неподтверждённые facts/content block;
- URL и existing internal links сохранить;
- при CTR/position regression сравнить query mix до следующего change.

Visual/content changes во всех трёх пакетах требуют local preview handoff и multi-browser mobile QA.

## 13. Пакет 8 — metro quality pilot

Приоритет: P1/P2.

Срок: data model на неделе 3, оценка после 28 дней.

Ответственный профиль: data + SEO/frontend.

Предлагаемая ветка: codex/seo-09-metro-quality-cohort.

### Контекст

Текущие 312 pages используют city pool. Формулировка рядом с метро не подтверждена location data. Related stations выбираются по соседству в массиве, а не по реальной географии.

### Правило продукта

Реальная station-local ценность является обязательным условием indexability:

1. есть offers, чья близость или транспортная доступность подтверждена source-backed address/coordinates;
2. страница содержит verified station-specific информацию и честно отделяет local offers от city fallback;
3. search demand определяет только приоритет пилота, но сам по себе не делает страницу качественной.

### Задачи

1. Заморозить expansion на 7–14 дней.

2. Выбрать 10 treatment pages:

   - Марьина Роща;
   - Лермонтовский проспект;
   - Солнцево;
   - Юго-Западная;
   - четыре pages с clicks;
   - ещё две pages с visible demand.

3. Добавить data model:

   - official station line/topology;
   - district;
   - coordinates;
   - verified workplace coordinates where available;
   - actual distance/transit relation.

4. До появления данных:

   - убрать недоказанные claims рядом;
   - городской pool обозначить как fallback;
   - не добавлять JobPosting на metro pages.

5. После 28 дней внедрить metro indexability manifest:

   - treatment with real locality;
   - control;
   - слабые страницы переводятся в noindex, follow и исключаются из sitemap batches не более 5% общей surface за один release;
   - между batches выдерживается observation window и сравнивается fixed control;
   - массовый noindex нельзя совмещать с global vacancy changes.

6. Related stations строить по topology/distance, не по array order.

### Основные файлы

- [metro page](/Users/ivan/Documents/kurieros/kurieros-astro/src/pages/metro/[metroCity]/[stationSlug].astro)
- [metroStations.json](/Users/ivan/Documents/kurieros/kurieros-astro/src/data/metroStations.json)
- [metroStations.ts](/Users/ivan/Documents/kurieros/kurieros-astro/src/data/metroStations.ts)
- [metro utility](/Users/ivan/Documents/kurieros/kurieros-astro/src/utils/metroStations.ts)

### Verification

    npx vitest run tests/metroStations.test.ts tests/build-output.test.ts tests/seo-surface.test.ts
    npm run build
    npm run test:dist
    npm run qa:visual

После deployment проверить treatment/control в Chrome и Safari/WebKit на mobile и desktop, затем зафиксировать 28-day observation window.

### Success

- pilot CTR минимум 3% Google и минимум 2% Яндекс;
- Yandex metro impressions минимум 25 в неделю;
- appeared выше removed;
- local offers являются основной подборкой treatment pages;
- no LOW_QUALITY signal.

### Stop and rollback

- если removed выше appeared два последовательных updates, expansion останавливается;
- при LOW_QUALITY treatment замораживается;
- rollback через previous manifest, routes не удаляются;
- noindex cohort не возвращается в sitemap до новой проверки.

Visual changes require local preview handoff and browser QA on Chrome, Safari/WebKit and several mobile viewports.

## 14. Пакет 9 — controlled expansion и trust

Приоритет: P2.

Срок: недели 5–12.

Ответственный профиль: SEO/content/partnerships.

Тип: operational runbook. Каждый indexability, feed, content или trust batch оформляется отдельным small PR; не объединять failure domains.

Ветка для каждого batch: codex/seo-scale-YYYYMMDD-{surface}.

Входные артефакты:

- последний 28-day cohort report;
- current sitemap/feed counts and hashes;
- previous generated manifest;
- reason report для каждого URL/offer;
- подтверждение, что stop conditions не активны.

### Controlled indexability

- vacancy promotion только после устойчивого спроса в двух окнах;
- demotion только после 6–8 недель без impressions и при low uniqueness;
- GSC snapshot refresh раз в 2–4 недели;
- отдельный score для vacancy, city, company и metro;
- reason report для каждой promotion/demotion;
- максимум ±5% surface per release без отдельного review.

### Feed expansion

Если feed восстановлен:

- добавлять 100–200 offers;
- ждать семь стабильных дней;
- повторять manual 25-set sample;
- rollback при systematic error;
- не расширять category/company sets до доказанной visible relevance.

### Trust и ИКС

Порядок:

1. настоящие реквизиты и контакты;
2. единая contact information;
3. editorial methodology и vacancy freshness policy;
4. ежемесячный оригинальный salary/vacancy report;
5. естественные mentions у career media, regional portals, student employment centers и partners.

Цель 8–12 недель:

- 5–10 тематических referring domains;
- реальный referral traffic;
- внешние ссылки появляются в Webmaster;
- ИКС становится выше 0 после накопления данных.

Не использовать paid links и mass directories. Яндекс описывает ИКС как показатель полезности и удовлетворённости, а не как счётчик ссылок: [официальная справка об ИКС](https://yandex.ru/support/webmaster/ru/site-quality-index).

### Broken links

36 Yandex samples проверять live:

- 200/indexable — оставить;
- 200/noindex — оценить пользовательскую пользу;
- 404/redirect/robots — исправить source link generator;
- stale sample не считать активной ошибкой без live confirmation.

### Основные файлы

- [vacancy indexability policy](/Users/ivan/Documents/kurieros/kurieros-astro/src/data/vacancyIndexabilityPolicy.ts)
- [vacancy indexability emitter](/Users/ivan/Documents/kurieros/kurieros-astro/scripts/emit-vacancy-indexability.ts)
- [sitemap config](/Users/ivan/Documents/kurieros/kurieros-astro/astro.config.mjs)
- [feed generator](/Users/ivan/Documents/kurieros/kurieros-astro/src/utils/yandexVacancyFeed.ts)
- metro manifest/policy из пакета 8;
- content source files конкретного approved batch.

### Verification

    npm run build
    npm run check:yandex-feed
    npm run test:dist
    npm run check:release
    git diff --check

Перед deploy сравнить counts/hash с предыдущим release. После deploy соблюдать выбранное observation window и не запускать следующий batch раньше gate.

### Exit criteria

- batch не превышает ±5% relevant surface;
- reason report заполнен для каждого change;
- release gates зелёные;
- control cohort не изменён;
- lagging outcomes оценены после observation window;
- outreach/публикации/обращения во внешние организации не отправлены без отдельного approval.

### Rollback

- indexability/metro: вернуть предыдущий generated manifest;
- feed: вернуть последнюю stable pilot version;
- content: откатить только affected cohort, URL не удалять;
- broken links: вернуть link generator only if new destinations fail;
- external trust actions необратимы, поэтому сначала готовить drafts и получать approval.

## 15. Measurement cadence

### Ежедневно первые семь дней после critical releases

- Yandex feed crawl;
- passed/rejected;
- sets;
- name/image errors;
- Google enhancement invalid items;
- build surface counts.

### Дважды в неделю

- Yandex aggregate pages in search;
- appeared/removed;
- diagnostics;
- GSC JobPosting/Breadcrumb trend;
- sitemap discovered count.

### Еженедельно

- Google clicks, impressions, CTR, position;
- mobile and desktop separately;
- Job listing/details;
- cohorts: Horugvino, treatment/control, city, Kuper, metro, age;
- organic funnel to apply_click;
- indexability reasons and sitemap diff.

### Раз в 28 дней

- решение по победителям experiments;
- promotion/demotion;
- feed expansion;
- external links/ИКС;
- roadmap mutation review.

## 16. Общие stop conditions

Остановить rollout и расследовать:

- Yandex feed passed = 0 после нового crawl — останавливает только feed path;
- два defects в manual sample 25;
- Google invalid JobPosting больше 0;
- Job rich clicks падают более 25% две недели подряд;
- Google clicks падают более 25% две недели подряд;
- Yandex pages in search падают более 20% два сопоставимых updates подряд;
- metro removed выше appeared два updates;
- sitemap surface меняется более ±5% без approval;
- любой факт в markup не виден или противоречит странице;
- legal/contact data не подтверждены владельцем — останавливает только feed publish path.

Немедленные stop conditions — parser/schema invalid, содержательное несоответствие страницы и markup, юридическая непригодность или неработающая заявка. Traffic/index-based stop conditions срабатывают только после двух сопоставимых срезов и проверки сезонности, query mix, matched control и задержки переобработки поисковиком.

## 17. Release gate

Для каждого PR:

    npm run lint
    npm run typecheck
    npm test
    npm run build
    npm run test:dist
    npm run check:yandex-feed
    npm run check:release
    git diff --check

Дополнительные gates:

- feed PR: normalized URL, set relevance, images и 25-set rehearsal;
- schema PR: 30 Rich Results URL after deploy;
- content/metro UX: local preview handoff и visual browser QA;
- external Webmaster actions: отдельное user approval.

## 18. План PR и очередность

| Порядок | Ветка | Результат | Зависимость |
|---:|---|---|---|
| 0 | codex/seo-00-observability | baseline, cohorts, release guards | нет |
| 1 | codex/seo-01-truthful-freshness | stable dates, correct sitemap | PR0 |
| 2A | codex/seo-02-yandex-feed-v2 | local quality pilot | PR1 + eligibility for publish |
| 2B | codex/seo-03-jobposting-integrity | Google schema integrity | PR1 |
| 2C | codex/seo-04-search-funnel-measurement | GA4/Metrika dual-write | PR0 |
| 3 | codex/seo-05-vacancy-ctr-cohort | Horugvino + matched test | PR2B + PR2C |
| 4A | codex/seo-06-city-cohort | city cohort | PR1 + PR2C |
| 4B | codex/seo-07-kuper-brand | Kuper brand cohort | PR1 + PR2C |
| 4C | codex/seo-08-age-guide | source-backed age content | PR2C |
| 5 | codex/seo-09-metro-quality-cohort | local metro pilot | PR1 + station-local data model |
| 6 | отдельные small batches | controlled expansion | 7 stable days / 28-day cohort |

## 19. Anti-patterns

Запрещено:

- увеличивать raw URL count через hashes или query strings;
- давать всем страницам текущий lastmod;
- продлевать vacancy expiry только из-за deploy;
- использовать affiliate URL как официальный сайт работодателя;
- считать noindex page пригодной feed landing без отдельного основания;
- включать thousands of offers в set page, где в HTML видно 24;
- писать уникальный SEO-текст поверх одного и того же city pool и считать страницу локальной;
- исправлять Google warnings вымышленным streetAddress/postalCode;
- запускать несколько CTR-переменных одновременно;
- оценивать experiment до минимального impressions/window;
- менять slug Kuper или создавать alias без отдельного запроса;
- отправлять external requests автоматически.

## 20. Mutation protocol

План является живым, но изменяется только по правилам:

1. Новое доказательство записывается с датой и источником.
2. Step можно split, если он затрагивает разные failure domains.
3. Step можно skip только с documented reason и последствиями для KPI.
4. Feed expansion нельзя re-order раньше eligibility и pilot gates.
5. Mass indexability нельзя re-order раньше двух недель stable observations.
6. KPI target меняется только после 28-day baseline, а не из-за одного дня.
7. Все внешние действия остаются manual approval points.

## 21. Первые пять действий

1. Владелец отвечает, есть ли ИП/юрлицо и рабочий телефон для moderation; без этого feed publish path закрыт.
2. Реализуется PR0 с baseline/cohorts и SEO surface guard.
3. Исправляются Ozon dates, validThrough и sitemap lastmod.
4. Параллельно собираются локальные feed v2 и JobPosting integrity PR.
5. После deployment и обработки поисковиками запускается только один CTR-test — Horugvino; остальные content cohorts стартуют после analytics adapter.

## 22. Независимая проверка плана

Проведён adversarial review с фокусом на требования Google JobPosting, правила Яндекс-фида, безопасные rollback и cold-start исполнимость. Критических дефектов не обнаружено. Все шесть замечаний высокой важности и два средней важности устранены в этой версии: добавлены source eligibility gate, точное совпадение видимого `roleTitle` и schema, evidence-based снятие вакансий, station-local gate, корректная семантика memberships, строгая проверка picture URL, разделение leading/lagging KPI и самостоятельные briefs пакетов 5–9.

## 23. Источники

- [Недельная аналитика kurerok.ru](/Users/ivan/Documents/kurieros-stats/reports/2026-07-10-google-yandex-weekly-analytics.md)
- [Google JobPosting structured data](https://developers.google.com/search/docs/appearance/structured-data/job-posting)
- [Яндекс: вакансии и структура фида](https://yandex.ru/support/webmaster/ru/search-appearance/vacancies)
- [Яндекс: проверка качества сервисов вакансий](https://yandex.ru/support/webmaster/ru/feed/vacancy)
- [Яндекс: малоценные и маловостребованные страницы](https://yandex.ru/support/webmaster/ru/site-indexing/low-demand)
- [Яндекс: индекс качества сайта](https://yandex.ru/support/webmaster/ru/site-quality-index)

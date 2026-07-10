# Редакционный план: 100 материалов для kurerok.ru

Статус: готов к реализации; публикации и запросы на индексирование не выполнялись.

Дата решения: 10 июля 2026 года.

Предварительный период выпуска: 3 августа 2026 — 17 февраля 2027 года, один материал каждые два дня. Старт допустим только после запуска полноценного блога и подготовки минимум 12 проверенных материалов. Если технический запуск сдвигается, весь календарь сдвигается целиком с сохранением интервала в два дня.

## 1. Решение

Не публиковать 100 новых статей одновременно и не датировать их задним числом.

Правильная схема:

1. Подготовить всю очередь как drafts.
2. Выпускать один URL каждые два дня.
3. Показывать поисковикам только фактически вышедшие материалы.
4. После каждой десятки оценивать crawl, indexability, показы и каннибализацию; lagging 28-day gate допускает не более 14 следующих публикаций, после чего очередь обязана остановиться без положительного результата.
5. Для Google использовать sitemap, внутренние ссылки и выборочную URL Inspection. Google Indexing API для обычных статей запрещён.
6. Для Яндекса передавать каждый реально новый URL через IndexNow один раз; ручной «Переобход» оставить пилотным и проблемным URL.

Google не «всё равно» на даты. Он сопоставляет видимую дату, structured data, sitemap, внутренние сигналы и момент первого обнаружения URL. Задняя дата не создаёт возраст или доверие, а противоречие дат ухудшает качество сигналов.

## 2. На каких данных построен план

### 2.1 Реальные запросы

- GSC, 23 апреля — 8 июля 2026: 65 000 показов, 1 560 кликов и 1 000 раскрытых top queries. Артефакты: [строки 1–500](/Users/ivan/Documents/kurieros-stats/screenshots/content-plan-2026-07-10/gsc-performance-3m-500.txt) и [строки 501–1000](/Users/ivan/Documents/kurieros-stats/screenshots/content-plan-2026-07-10/gsc-performance-3m-501-1000.txt).
- GSC export, 1–27 июня: 2 108 видимых уникальных запросов, 12 583 показа и 152 клика.
- Яндекс, 10 апреля — 8 июля: 181 query row, 395 показов и 2 клика. Артефакт: [популярные запросы](/Users/ivan/Documents/kurieros-stats/screenshots/content-plan-2026-07-10/yandex-popular-queries-3m-all.txt).
- Яндекс, 29 июня — 5 июля: возрастной интент дал 38 запросов и 47 показов, или 69,1% недельного охвата; metro дал 11 запросов и 12 показов.
- Wordstat v3: 1 061 запрос, 37 кластеров и около 1,06 млн широких показов в месяц. Источник: [семантическое ядро](/Users/ivan/Documents/kurieros-stats/semantic-core/run-2026-05-29/00-summary.md).
- Общая недельная диагностика: [Google и Яндекс, 29 июня — 5 июля](/Users/ivan/Documents/kurieros-stats/reports/2026-07-10-google-yandex-weekly-analytics.md).

### 2.2 Подтверждённые возможности

| Сигнал | Масштаб | Как использовать |
|---|---:|---|
| Общие городские «работа/вакансии» | 1 362 запроса / 8 842 показа в июньском GSC export | Улучшать существующие city pages, не создавать статьи-клоны |
| Склад/сборщик | 67 запросов / 1 305 показов | Писать только про различия ролей, оформление и экономику |
| Horugvino | 20 запросов / 1 150 показов | Максимум один отдельный информационный материал; вакансии остаются на `/v/` и city surface |
| Ozon | 162 запроса / 1 134 показа | Разбор ролей, дохода, Ozon vs Ozon Fresh |
| Купер/СберМаркет | 61 запрос / 557 показов | Company page владеет brand intent; блог — сравнения и конкретные механики |
| Оформление/самозанятость | 23 запроса / 207 показов | НПД, чеки, договор, сборщик-самозанятый |
| График/подработка | 68 запросов / 189 показов | Слоты, вечера, выходные, совмещение |
| Доход/выплаты | 42 запроса / 130 показов | Чистая экономика, выплаты, расходы |
| Возраст | главный кластер Яндекса | Broad answer остаётся на `/guide/vozrast/`; блог только про отдельные сценарии и исследования |

## 3. Что не превращать в блог-посты

| Интент | Канонический владелец |
|---|---|
| Общая работа и вакансии курьера | `/` |
| Работа в городе | `/rabota-kurerom-{city}/` |
| Работа у метро | `/metro/{city}/{station}/` после station-local quality gate |
| Конкретная вакансия | `/v/{slug}/` |
| Компания/работодатель | `/companies/{slug}/` |
| Broad возраст | `/guide/vozrast/` |
| Broad «сколько зарабатывает курьер» | `/skolko-zarabatyvaet-kurer/`; `/guide/dohod/` остаётся справочником конкретных форматов и фактов |
| Broad «как стать/устроиться курьером» | `/kak-stat-kurerom/`; `/guide/oformlenie/` отвечает только за НПД, ГПХ, документы и договор |
| Broad «условия работы курьером» | `/usloviya-raboty-kurerom/`; `/guide/grafik/` отвечает только за время, слоты и смены |
| Пеший/авто/вело intent | соответствующие коммерческие transport hubs |

Запросы `купер`, `вакансии компании купер`, `работа курьером в Тимашевске`, `вакансии Партизанск`, `работа у метро Марьина Роща`, `работа на складе в Хоругвино` не должны получать ещё один общий блоговый URL.

## 4. Текущее техническое ограничение

Блог сейчас фактически выключен:

- [articles.json](/Users/ivan/Documents/kurieros/kurieros-astro/src/data/articles.json) пуст;
- [blog.astro](/Users/ivan/Documents/kurieros/kurieros-astro/src/pages/blog.astro) является `noindex, follow` заглушкой;
- маршрута `src/pages/blog/[slug].astro` нет;
- `/blog/` исключён из sitemap;
- ссылки на блог скрыты в Header, Footer и на главной;
- 20 прежних статей были удалены как low-quality content, поэтому старые тексты нельзя просто вернуть.

Перед первой публикацией нужен отдельный implementation package:

1. Astro Content Collection `src/content/blog/*.md` вместо большого JSON.
2. Поля `slug`, `title`, `description`, `status`, `publishAt`, `datePublished`, `dateModified`, `author`, `primaryIntent`, `pillarHref`, `commercialHref`, `relatedSlugs`, `sources`, `checkedAt`.
3. Персистентный release ledger/cursor хранит `slug`, фактическое время выхода, revision и результат deploy для каждого опубликованного материала. Он должен находиться в version-controlled state или durable transactional store; временный CI artifact не считается хранилищем. Build fail-closed, если ledger отсутствует, повреждён или расходится с production manifest.
4. Один успешный scheduled deploy продвигает cursor ровно на один eligible slug. После outage просроченная очередь не догоняется массово: выходит только следующий материал, остальные даты сдвигаются на два дня.
5. Маршрут генерируется только для slug, уже зафиксированных в ledger. Условие `publishAt <= build time` само по себе недостаточно.
6. Future drafts не попадают в HTML, sitemap, RSS, llms.txt и внутренние ссылки.
7. `BlogPosting`, Breadcrumbs, видимая дата, автор, редакционная политика и источники.
8. До первого scheduled build удалить глобальный `lastmod: new Date()` из `astro.config.mjs`: каждый URL должен получать собственную дату реального изменения, иначе deploy блога будет ложно «обновлять» тысячи страниц.
9. Плановый build/deploy каждые два дня. В статическом Astro будущая дата сама ничего не публикует.
10. Kill switch `CONTENT_SCHEDULE_PAUSED=true` для остановки очереди без удаления drafts и без продвижения cursor.

## 5. Правило исторических URL и дат

В Git-истории найдено 15 пригодных к полной переработке старых URL. Для них:

- сохранить прежний slug;
- исходный `datePublished` сохранять только после подтверждения production/GSC-истории;
- фактический повторный выпуск указывать как `dateModified`;
- на странице показывать обе даты: «Опубликовано» и «Обновлено»;
- если история не подтверждена, использовать новую дату как `datePublished`.

Для остальных 85 материалов:

```text
visible publication date = actual release time
BlogPosting.datePublished = actual release time
article:published_time = actual release time
sitemap lastmod = actual release time
dateModified = отсутствует до существенного обновления
```

Git-история хранит следующие candidate dates. Это доказательство существования редакционной записи, но не само по себе доказательство, что URL был доступен поисковику в этот день; перед сохранением старой `datePublished` нужно сверить GSC, production-архив или crawl evidence.

| Исторический slug | Candidate `datePublished` |
|---|---|
| `skolko-zarabatyvaet-kurer-yandex-eda-2026` | 2026-04-05 |
| `kak-vybrat-kompaniyu-dlya-raboty-kurerom` | 2026-04-04 |
| `kurer-na-lichnom-avto-rashody-i-pribyl` | 2026-04-02 |
| `podrabotka-kurerom-posle-osnovnoy-raboty` | 2026-04-01 |
| `rabota-kurerom-zimoy` | 2026-03-27 |
| `kak-ponyat-chto-vakansiya-kurera-plohaya` | 2026-03-26 |
| `kak-povysit-dohod-kureru-bez-pererabotok` | 2026-03-25 |
| `sravnenie-yandex-eda-samokat-ozon` | 2026-03-24 |
| `nuzhen-li-elektrovelosiped-kureru` | 2026-03-23 |
| `kak-proyti-pervuyu-nedelyu-kurerom` | 2026-03-22 |
| `kak-vybrat-rayon-dlya-raboty-kurerom` | 2026-04-06 |
| `kak-kureru-vesti-uchet-dohodov-i-rashodov` | 2026-04-07 |
| `rabota-kurerom-v-malenkom-gorode` | 2026-04-08 |
| `pochemu-kurery-uhodyat-iz-dostavki` | 2026-04-09 |
| `kak-pereyti-iz-podrabotki-v-polnyy-grafik-kurerom` | 2026-04-10 |

Оставшиеся пять старых slugs не возвращать как статьи: их head intent уже принадлежит более сильной текущей странице. После подтверждения механизма redirect на Timeweb подготовить 301:

| Старый slug | Новый владелец |
|---|---|
| `peshiy-ili-velokurer-chto-vygodnee` | `/guide/transport/` |
| `samozanyatost-dlya-kurera-prosto` | `/guide/oformlenie/` |
| `kakuyu-medknizhku-nuzhno-kureru` | `/guide/medknizhka/` |
| `vakansii-dlya-studentov-kurerom` | `/rabota-kurerom-dlya-studentov/` |
| `ezhednevnye-ili-ezhenedelnye-vyplaty` | `/guide/vyplaty/` |

## 6. Календарь из 100 материалов

Обозначения:

- `rewrite` — полный новый материал на подтверждённом историческом slug;
- `new` — новый узкий informational URL;
- `research` — оригинальный материал на собственных данных; без достаточной выборки выпуск запрещён;
- дата — плановый production release, а не фиктивная дата публикации;
- календарь после Wave 1 условный: stop condition сдвигает все последующие даты.

### Wave 1 — пилот

| № | Выпуск | Тип | Материал и slug | Интент / основной владелец |
|---:|---|---|---|---|
| 1 | 2026-08-03 | rewrite | **Доход курьера Яндекс Еды: как посчитать чистую сумму за смену** — `skolko-zarabatyvaet-kurer-yandex-eda-2026` | `сколько зарабатывает курьер Яндекс Еды` → `/guide/dohod/` |
| 2 | 2026-08-05 | rewrite | **Как выбрать компанию для работы курьером: 12 проверяемых критериев** — `kak-vybrat-kompaniyu-dlya-raboty-kurerom` | сравнение работодателей → `/guide/sravnenie/` |
| 3 | 2026-08-07 | rewrite | **Курьер на личном авто: расходы, налоги и чистая прибыль** — `kurer-na-lichnom-avto-rashody-i-pribyl` | доход автокурьера → `/guide/transport/` |
| 4 | 2026-08-09 | rewrite | **Первая неделя курьером: что происходит от анкеты до пятой смены** — `kak-proyti-pervuyu-nedelyu-kurerom` | работа без опыта → `/guide/trebovaniya/` |
| 5 | 2026-08-11 | rewrite | **Нужен ли электровелосипед курьеру: расчёт окупаемости** — `nuzhen-li-elektrovelosiped-kureru` | электровелосипед для курьеров → `/guide/transport/` |
| 6 | 2026-08-13 | new | **Сколько зарабатывает водитель Ozon: считаем доход после расходов** — `dohod-voditelya-ozon-posle-rashodov` | `водитель Ozon зарплата` → `/companies/ozon/` |
| 7 | 2026-08-15 | new | **Сколько платят курьерам Купера: из чего складывается выплата** — `skolko-platyat-kureram-kupera` | `купер сколько платят курьерам` → `/companies/kuper-ex-sbermarket/` |
| 8 | 2026-08-17 | new | **Бренд, партнёр или парк: с кем курьер фактически заключает договор** — `s-kem-kurer-zaklyuchaet-dogovor` | сторона договора → `/guide/oformlenie/` |
| 9 | 2026-08-19 | new | **Как проверить вакансию курьера и не попасть на мошенников** — `kak-proverit-vakansiyu-kurera` | безопасное трудоустройство → `/guide/trebovaniya/` |
| 10 | 2026-08-21 | research | **Индекс доходов курьеров: срез вакансий за II квартал 2026** — `indeks-dohodov-kurerov-q2-2026` | оригинальный data asset → `/guide/dohod/` |

### Wave 2 — экономика и выбор режима

| № | Выпуск | Тип | Материал и slug | Интент / основной владелец |
|---:|---|---|---|---|
| 11 | 2026-08-23 | rewrite | **Подработка курьером после основной работы: реалистичный график** — `podrabotka-kurerom-posle-osnovnoy-raboty` | совмещение → `/guide/grafik/` |
| 12 | 2026-08-25 | rewrite | **Как повысить доход курьеру без переработок** — `kak-povysit-dohod-kureru-bez-pererabotok` | оптимизация дохода → `/guide/dohod/` |
| 13 | 2026-08-27 | rewrite | **Яндекс Еда, Самокат или Ozon Fresh: сравнение форматов, а не рекламы** — `sravnenie-yandex-eda-samokat-ozon` | employer comparison → `/compare/` |
| 14 | 2026-08-29 | rewrite | **Как выбрать район для работы курьером: спрос, расстояния и возврат домой** — `kak-vybrat-rayon-dlya-raboty-kurerom` | выбор зоны → `/guide/grafik/` |
| 15 | 2026-08-31 | rewrite | **Как курьеру вести учёт доходов и расходов** — `kak-kureru-vesti-uchet-dohodov-i-rashodov` | чистый доход → `/guide/dohod/` |
| 16 | 2026-09-02 | new | **Сколько остаётся курьеру после НПД, связи, питания и транспорта** — `chistyy-dohod-kurera-posle-rashodov` | чистый доход → `/guide/dohod/` |
| 17 | 2026-09-04 | new | **Доход курьера за смену 4, 6, 8 и 12 часов: четыре сценария** — `dohod-kurera-za-4-6-8-12-chasov` | доход за день/час → `/guide/dohod/` |
| 18 | 2026-09-06 | new | **Почасовая ставка или оплата за заказ: какой риск несёт курьер** — `pochasovaya-stavka-ili-oplata-za-zakaz` | модель оплаты → `/guide/vyplaty/` |
| 19 | 2026-09-08 | new | **Как выбирать слоты: доход, штрафы и право отказаться** — `kak-vybirat-sloty-kureru` | слоты → `/guide/grafik/` |
| 20 | 2026-09-10 | research | **Доход курьера в городах-миллионниках: сопоставимый срез вакансий** — `dohod-kurera-goroda-millionniki-2026` | оригинальное сравнение городов → city hubs |

### Wave 3 — нагрузка и выбор роли

| № | Выпуск | Тип | Материал и slug | Интент / основной владелец |
|---:|---|---|---|---|
| 21 | 2026-09-12 | rewrite | **Работа курьером в маленьком городе: спрос, расстояния и простой** — `rabota-kurerom-v-malenkom-gorode` | малые города → `/cities/` |
| 22 | 2026-09-14 | rewrite | **Как перейти из подработки в полный график курьером** — `kak-pereyti-iz-podrabotki-v-polnyy-grafik-kurerom` | смена режима → `/guide/grafik/` |
| 23 | 2026-09-16 | rewrite | **Почему курьеры уходят из доставки: причины по интервью, а не догадки** — `pochemu-kurery-uhodyat-iz-dostavki` | retention; выпуск только после реальной выборки |
| 24 | 2026-09-18 | rewrite | **Как понять, что вакансия курьера плохая: красные флаги до отклика** — `kak-ponyat-chto-vakansiya-kurera-plohaya` | проверка вакансии → `/guide/trebovaniya/` |
| 25 | 2026-09-20 | new | **Подработка курьером по выходным: сколько смен брать без выгорания** — `podrabotka-kurerom-po-vyhodnym` | выходные → `/guide/grafik/` |
| 26 | 2026-09-22 | new | **Вечерние смены курьера: часы пик, транспорт и возвращение домой** — `vechernie-smeny-kurera` | вечерняя работа → `/guide/grafik/` |
| 27 | 2026-09-24 | new | **Как совмещать учёбу и доставку: расписание без пропусков** — `kak-sovmeschat-uchebu-i-dostavku` | студентам → `/guide/vozrast/` |
| 28 | 2026-09-26 | new | **Ночная смена курьера: когда она выгодна и что проверить заранее** — `nochnaya-smena-kurera` | ночная работа → `/guide/grafik/` |
| 29 | 2026-09-28 | new | **Нет заказов на смене: почему возникает простой и как его считать** — `prostoy-kurera-net-zakazov` | простой/доход → `/guide/dohod/` |
| 30 | 2026-09-30 | new | **Ozon и Ozon Fresh: чем отличаются курьерские и складские роли** — `ozon-i-ozon-fresh-razlichiya-rabot` | role comparison → `/companies/ozon/` |

### Wave 4 — выплаты и измеримый доход

| № | Выпуск | Тип | Материал и slug | Интент / основной владелец |
|---:|---|---|---|---|
| 31 | 2026-10-02 | new | **Как частота выплат влияет на бюджет курьера, комиссии и кассовые разрывы** — `chastota-vyplat-i-byudzhet-kurera` | финансовое планирование → `/guide/vyplaty/` |
| 32 | 2026-10-04 | new | **Почему задержалась выплата курьеру: проверка статуса по шагам** — `zaderzhka-vyplaty-kureru` | задержка выплаты → `/guide/vyplaty/` |
| 33 | 2026-10-06 | new | **Сколько заказов нужно для 100, 150 и 200 тысяч рублей в месяц** — `skolko-zakazov-dlya-100-150-200-tysyach` | целевой доход → `/guide/dohod/` |
| 34 | 2026-10-08 | new | **Часы пик, дождь и бонусные пороги: когда надбавка окупает нагрузку** — `chasy-pik-dozhd-i-bonusy-kurera` | бонусы/погода → `/guide/dohod/` |
| 35 | 2026-10-10 | new | **Представитель банка или курьер доставки: сравнение чистого дохода** — `predstavitel-banka-ili-kurer-dostavki` | банковский представитель → `/compare/` |
| 36 | 2026-10-12 | new | **Ставка сборщика заказов Купера: час, смена и бонусы** — `stavka-sborshchika-zakazov-kupera` | сборщик/зарплата → `/companies/kuper-ex-sbermarket/` |
| 37 | 2026-10-14 | new | **Доход курьера Самоката: как читать обещанную ставку** — `dohod-kurera-samokata` | `сколько зарабатывает курьер Самоката` → `/companies/samokat/` |
| 38 | 2026-10-16 | new | **Свободный график в договоре и приложении: пять реальных ограничений** — `ogranicheniya-svobodnogo-grafika-kurera` | ограничения графика → `/guide/grafik/` |
| 39 | 2026-10-18 | new | **Отмена слота и невыход на смену: какие последствия проверить в договоре** — `otmena-slota-i-nevyhod-na-smenu` | условия/штрафы → `/guide/shtrafy/` |
| 40 | 2026-10-20 | research | **Индекс доходов курьеров за III квартал 2026** — `indeks-dohodov-kurerov-q3-2026` | повторяемое исследование → `/guide/dohod/` |

### Wave 5 — транспорт и сезонность

| № | Выпуск | Тип | Материал и slug | Интент / основной владелец |
|---:|---|---|---|---|
| 41 | 2026-10-22 | rewrite | **Работа курьером зимой: доход, одежда, аккумулятор и безопасность** — `rabota-kurerom-zimoy` | сезонность → `/guide/transport/` |
| 42 | 2026-10-24 | new | **Дождь, жара и гололёд: когда курьеру лучше не выходить на линию** — `pogoda-i-bezopasnost-kurera` | безопасность/погода → `/guide/transport/` |
| 43 | 2026-10-26 | new | **Сколько километров проходит пеший курьер за смену** — `skolko-kilometrov-prohodit-peshiy-kurer` | пеший формат → `/rabota-peshim-kurerom/` |
| 44 | 2026-10-28 | new | **Как устроена смена велокурьера: маршрут, заряд и перерывы** — `kak-ustroena-smena-velokurera` | велокурьер → `/rabota-velokurerom/` |
| 45 | 2026-10-30 | new | **Велосипед или электросамокат для доставки: сравнение ограничений** — `velosiped-ili-elektrosamokat-dlya-dostavki` | выбор транспорта → `/guide/transport/` |
| 46 | 2026-11-01 | new | **Электровелосипед курьеру: купить, арендовать или взять посменно** — `elektrovelosiped-kupit-ili-arendovat` | аренда/покупка → `/guide/transport/` |
| 47 | 2026-11-03 | new | **Запас хода электровелосипеда зимой: как планировать смену** — `zapas-hoda-elektrovelosipeda-zimoy` | батарея/зима → `/guide/transport/` |
| 48 | 2026-11-05 | new | **Ремонт велосипеда курьера: какие расходы закладывать в месяц** — `rashody-na-remont-velosipeda-kurera` | эксплуатационные расходы → `/guide/dohod/` |
| 49 | 2026-11-07 | new | **Личный автомобиль для доставки: документы, страховка и ограничения** — `lichnyy-avtomobil-dlya-dostavki` | автокурьер → `/rabota-avtokurerom/` |
| 50 | 2026-11-09 | research | **Стоимость рабочего комплекта курьера: пешком, вело и авто** — `stoimost-komplekta-kurera-2026` | собственный ценовой срез → `/guide/transport/` |

### Wave 6 — Ozon и Купер

| № | Выпуск | Тип | Материал и slug | Интент / основной владелец |
|---:|---|---|---|---|
| 51 | 2026-11-11 | new | **Анкета курьера Ozon: что проверить до получения оффера** — `anketa-i-offer-kurera-ozon` | оформление Ozon → `/companies/ozon/` |
| 52 | 2026-11-13 | new | **Дорога на склад Ozon в Хоругвино: как посчитать время и стоимость поездки** — `doroga-na-sklad-ozon-horugvino` | commute economics; city/vacancy pages сохраняют job intent |
| 53 | 2026-11-15 | new | **Оператор склада и обработчик товаров Ozon: в чём разница** — `operator-sklada-ili-obrabotchik-tovarov-ozon` | role comparison → Ozon company/vacancy surface |
| 54 | 2026-11-17 | new | **Курьер, склад или водитель Ozon: как выбрать подходящую роль** — `kurer-sklad-ili-voditel-ozon` | role choice → `/companies/ozon/` |
| 55 | 2026-11-19 | new | **Почему условия Ozon Fresh различаются по городам и партнёрам** — `ozon-fresh-usloviya-po-gorodam` | условия/источник оффера → `/companies/ozon-fresh/` |
| 56 | 2026-11-21 | new | **Купер в вакансии и в договоре: как проверить работодателя или партнёра** — `kuper-rabotodatel-ili-partner` | employer identity → `/companies/kuper-ex-sbermarket/` |
| 57 | 2026-11-23 | new | **Курьер или сборщик заказов в Купере: сравнение смены и дохода** — `kurer-ili-sborshchik-kuper` | role comparison → company hub |
| 58 | 2026-11-25 | new | **Пеший, вело- и автокурьер Купера: что меняется кроме транспорта** — `formaty-kurerov-kupera` | transport roles → company hub |
| 59 | 2026-11-27 | new | **Реферальная программа Купера: как проверить актуальные условия** — `referalnaya-programma-kupera` | точный GSC intent → company hub |
| 60 | 2026-11-29 | research | **Какие роли чаще всего публикуют Ozon и Купер: срез собственной базы** — `roli-ozon-i-kuper-v-baze-vakansiy` | оригинальный vacancy-data asset |

### Wave 7 — Самокат, Яндекс и банковские представители

| № | Выпуск | Тип | Материал и slug | Интент / основной владелец |
|---:|---|---|---|---|
| 61 | 2026-12-01 | new | **Как устроена смена курьера Самоката: даркстор, зона и заказы** — `kak-ustroena-smena-kurera-samokata` | роль/процесс → `/companies/samokat/` |
| 62 | 2026-12-03 | new | **Как часто платят курьерам Самоката и что сверять в расчёте** — `vyplaty-kureram-samokata` | выплаты Самоката → `/guide/vyplaty/` |
| 63 | 2026-12-05 | new | **Слоты Самоката: выбор, отмена и дополнительные смены** — `sloty-samokata-dlya-kurera` | график Самоката → `/guide/grafik/` |
| 64 | 2026-12-07 | new | **Отзывы о работе в Самокате: как отделить проверяемый факт от эмоции** — `kak-chitat-otzyvy-o-samokate` | Samokat-specific reviews → `/companies/samokat/` |
| 65 | 2026-12-09 | new | **Пеший или велокурьер Яндекс Еды: сравнение одной смены** — `peshiy-ili-velokurer-yandex-edy` | transport comparison → `/companies/yandex-eda/` |
| 66 | 2026-12-11 | new | **Яндекс Еда и Яндекс Лавка: чем отличаются роли курьера** — `yandex-eda-ili-yandex-lavka` | source-gated comparison → `/companies/yandex-eda/`; без официального источника заменить reserve brief |
| 67 | 2026-12-13 | new | **Первая смена в Яндекс Еде: что проверить до выхода** — `pervaya-smena-yandex-eda` | first-shift intent → company hub |
| 68 | 2026-12-15 | new | **Первый выезд представителя Альфа-Банка: документы, маршрут и передача карты** — `pervyy-vyezd-predstavitelya-alfa-banka` | first-day scenario → `/companies/alfa-bank/` |
| 69 | 2026-12-17 | new | **Альфа-Банк или Т-Банк: сравнение работы выездного представителя** — `alfa-bank-ili-t-bank-predstavitel` | bank role comparison → `/compare/` |
| 70 | 2026-12-19 | research | **Как работодатели платят курьерам: за час, заказ, смену или результат** — `modeli-oplaty-kurerov-issledovanie-2026` | собственная классификация офферов |

### Wave 8 — бренды и работа до 18 лет

| № | Выпуск | Тип | Материал и slug | Интент / основной владелец |
|---:|---|---|---|---|
| 71 | 2026-12-21 | new | **Курьер Золотого Яблока: как отличить прямую вакансию от партнёрской** — `kurer-zolotogo-yabloka-pryamaya-ili-partnerskaya-vakansiya` | source/ownership gate; без официального источника заменить reserve brief |
| 72 | 2026-12-23 | new | **X5, Пятёрочка и Чижик: кто оформляет курьера и за что платит** — `x5-pyaterochka-chizhik-oformlenie-kurera` | role/employer distinction → `/companies/x5-dostavka/` |
| 73 | 2026-12-25 | new | **Курьер Магнита: магазин, доставка или партнёр — как читать вакансию** — `kurer-magnita-kak-chitat-vakansiyu` | source/ownership gate; без официального источника заменить reserve brief |
| 74 | 2026-12-27 | new | **Курьер Wildberries: доставка клиенту, до ПВЗ или партнёрская роль** — `kurer-wildberries-vidy-roley` | source/ownership gate; без официального источника заменить reserve brief |
| 75 | 2026-12-29 | new | **Курьер, повар или кассир Burger King: сравнение обязанностей и смен** — `burger-king-kurer-povar-ili-kassir` | подтверждённый GSC role intent |
| 76 | 2026-12-31 | new | **Документы курьера в 16–17 лет: согласие родителей и договор** — `dokumenty-kurera-16-17-let` | support intent → `/guide/vozrast/` |
| 77 | 2027-01-02 | new | **Какие форматы доставки доступны до 18 лет: официальные условия сервисов** — `formaty-dostavki-do-18-let` | support intent; broad answer остаётся `/guide/vozrast/` |
| 78 | 2027-01-04 | new | **Анкета курьера без опыта: что писать и чего не обещать** — `anketa-kurera-bez-opyta` | first-job intent → `/guide/trebovaniya/` |
| 79 | 2027-01-06 | new | **Что взять на первую смену курьера: короткий проверяемый чек-лист** — `chto-vzyat-na-pervuyu-smenu-kurera` | first shift → `/guide/trebovaniya/` |
| 80 | 2027-01-08 | research | **Вакансии для 16–17 лет в собственной базе: какие роли действительно встречаются** — `vakansii-dlya-16-17-let-issledovanie` | original dataset; правила возраста остаются на `/guide/vozrast/` |

### Wave 9 — оформление и проверка условий

| № | Выпуск | Тип | Материал и slug | Интент / основной владелец |
|---:|---|---|---|---|
| 81 | 2027-01-10 | new | **Самозанятый сборщик заказов: что означает этот статус** — `samozanyatyy-sborshchik-zakazov` | подтверждённый GSC cluster → `/guide/oformlenie/` |
| 82 | 2027-01-12 | new | **Как курьеру формировать чеки НПД и сверять выплаты** — `cheki-npd-dlya-kurera` | НПД/чеки → `/guide/oformlenie/` |
| 83 | 2027-01-14 | new | **Договор курьера: 15 пунктов, которые нужно прочитать до подписи** — `dogovor-kurera-chto-proverit` | contract intent → `/guide/oformlenie/` |
| 84 | 2027-01-16 | new | **Проверка миграционных документов перед анкетой: пять типичных несоответствий** — `proverka-migratsionnyh-dokumentov-kurera` | application errors → `/guide/grazhdanstvo/` |
| 85 | 2027-01-18 | new | **Кто оплачивает и продлевает медкнижку курьера: вопросы работодателю** — `oplata-i-prodlenie-medknizhki-kurera` | cost/renewal scenario → `/guide/medknizhka/` |
| 86 | 2027-01-20 | new | **Какие вопросы задать рекрутеру курьерской вакансии** — `voprosy-rekruteru-kurerskoy-vakansii` | pre-apply checklist → `/guide/trebovaniya/` |
| 87 | 2027-01-22 | new | **Что проверить в оффере: доход, график, удержания и работодатель** — `kak-proverit-offer-kurera` | offer review → `/guide/trebovaniya/` |
| 88 | 2027-01-24 | new | **Пробная смена курьера: когда и как должна быть описана оплата** — `probnaya-smena-kurera-oplata` | trial-shift intent → `/guide/vyplaty/` |
| 89 | 2027-01-26 | new | **Как читать отзывы курьеров: выборка, дата и проверяемые факты** — `kak-chitat-otzyvy-kurerov` | reviews methodology → `/guide/sravnenie/` |
| 90 | 2027-01-28 | research | **Какие условия работодателей изменились за полгода: аудит источников** — `audit-usloviy-raboty-kurerom-2027` | source freshness asset |

### Wave 10 — безопасность, карьера и годовые данные

| № | Выпуск | Тип | Материал и slug | Интент / основной владелец |
|---:|---|---|---|---|
| 91 | 2027-01-30 | new | **Как сравнить 2–4 вакансии курьера по единому чек-листу** — `kak-sravnit-vakansii-kurera` | comparison method → `/compare/` |
| 92 | 2027-02-01 | new | **Почему отказали после анкеты курьера и что можно проверить** — `otkaz-posle-ankety-kurera` | application outcome → `/guide/trebovaniya/` |
| 93 | 2027-02-03 | new | **Резюме курьера без опыта: факты вместо шаблонных качеств** — `rezume-kurera-bez-opyta` | first-job intent → `/guide/trebovaniya/` |
| 94 | 2027-02-05 | new | **Рейтинг, отмены и блокировки курьерского аккаунта: как читать правила сервиса** — `reyting-otmeny-i-blokirovki-kurera` | account rules → `/guide/shtrafy/` |
| 95 | 2027-02-07 | new | **Как сообщить о невыходе на смену: доказательства, сроки и форс-мажор** — `kak-soobshchit-o-nevyhode-na-smenu` | practical incident protocol → `/guide/shtrafy/` |
| 96 | 2027-02-09 | new | **ДТП, травма или повреждение заказа: последовательность действий курьера** — `dtp-travma-povrezhdenie-zakaza-kurera` | safety → `/guide/transport/` |
| 97 | 2027-02-11 | new | **Страхование курьера: какие риски покрываются, а какие нет** — `strahovanie-kurera-riski-i-isklyucheniya` | insurance/safety → `/guide/trebovaniya/` |
| 98 | 2027-02-13 | new | **Безопасный маршрут вечером и ночью: чек-лист курьера** — `bezopasnyy-marshrut-kurera-vecherom` | night safety → `/guide/grafik/` |
| 99 | 2027-02-15 | research | **Воронка трудоустройства курьера: от анкеты до первой оплаченной смены** — `voronka-trudoustroystva-kurera-issledovanie` | собственные анонимные данные; без PII |
| 100 | 2027-02-17 | research | **Рынок курьерских вакансий 2026: роли, города и работодатели в собственной базе** — `rynok-kurerskih-vakansiy-2026` | годовой цитируемый data asset |

### 6.1 Source-gated темы и резервы

Материалы №66, 71, 73 и 74 нельзя выпускать только на основании спроса. За 14 дней до даты нужны одновременно: официальный источник условий, подтверждённая роль/вакансия, понятный фактический работодатель или партнёр и назначенный company owner. Если gate не пройден, календарная позиция получает один из reserve briefs на уже существующей поверхности:

| Резерв | Материал | Владелец |
|---|---|---|
| R1 | **Efin: как проверить работодателя, обязанности и маршрут представителя** — `efin-kak-proverit-usloviya-predstavitelya` | `/companies/efin/` |
| R2 | **МТС Банк: чем выездной представитель отличается от курьера** — `mts-bank-predstavitel-ili-kurer` | `/companies/mts-bank/` |
| R3 | **Первый маршрут представителя Т-Банка: что проверить до встречи** — `pervyy-marshrut-predstavitelya-t-banka` | `/companies/t-bank/` |
| R4 | **Водитель-экспедитор Ozon: груз, документы и ответственность** — `voditel-ekspeditor-ozon-obyazannosti` | `/companies/ozon/` |

Подмена наследует дату исходной позиции; два материала в один слот не публикуются.

### 6.2 Scope exclusions для близких пар

| Пара | Граница интента |
|---|---|
| №10 / №40 | Одна repeatable research series, но разные непересекающиеся квартальные datasets и даты; общий methodology hub, отдельные period pages |
| №9 / №24 | №9 — мошенничество и подмена работодателя; №24 — легальная, но невыгодная или неполная вакансия |
| №18 / №70 | №18 — выбор модели оплаты конкретным курьером; №70 — агрегированная классификация моделей работодателей |
| №30 / №54 | №30 — различия Ozon и Ozon Fresh; №54 — выбор роли внутри Ozon по требованиям и рабочему процессу |
| №39 / №95 | №39 — договорные последствия отмены; №95 — коммуникация и доказательства при уже случившемся форс-мажоре |
| №64 / №89 | №64 — проверка утверждений только о Самокате; №89 — универсальная методика анализа отзывов |

## 7. Минимальный quality gate статьи

Статья не выходит по календарю, если не выполнен хотя бы один пункт:

- один ясный informational intent, отличный от существующего pillar/company/city/vacancy URL;
- прямой ответ в первых двух экранах;
- минимум один собственный полезный элемент: расчёт, таблица, чек-лист, схема решения, выборка или интервью;
- все цифры дохода имеют методику, период, регион и источник;
- возраст, налоги, договоры, медкнижка, штрафы и страхование проверены по актуальным первичным источникам;
- видимые источники и дата проверки;
- одна ссылка на pillar, максимум одна коммерческая ссылка и 2–4 related articles;
- title/H1/description не копируют company, city или guide owner;
- нет выдуманных отзывов, зарплат, штрафов, адресов или юридических обещаний;
- mobile preview, schema validation, canonical, robots, sitemap и link checks пройдены.

Фиксированной нормы слов нет. Короткий материал допустим, если полностью решает задачу; длинный запрещено раздувать повторениями ключей.

## 8. Индексация после каждого выпуска

### Google

1. Новый URL появляется в blog listing, тематическом pillar и 2–4 соседних статьях.
2. URL и честный `lastmod` попадают в sitemap.
3. Не пересылать неизменённый sitemap много раз за день.
4. URL Inspection использовать для 2–3 приоритетных URL каждой wave, а не для всех 100.
5. Не использовать Indexing API: обычный `BlogPosting` не является поддерживаемым типом.

### Яндекс

1. После production 200/self-canonical/indexable передать новый URL через IndexNow один раз.
2. Не передавать старую очередь или неизменённые URL повторно.
3. В ручной «Переобход» отправлять первые 2–3 URL wave и страницы с подтверждённой проблемой.
4. Статус «обработано» не считать доказательством индексирования.

Никакая отправка не гарантирует попадание в индекс. Цель протокола — корректно сообщить о качественном новом URL и наблюдать решение поисковика.

## 9. Cohort gates и stop conditions

Каждая wave содержит десять материалов.

Календарь сознательно принимает ограниченный lag: 28-дневный результат wave становится известен после выхода ещё 14 материалов. Поэтому результат Wave N является обязательным gate перед материалом `10 × N + 15`. Примеры: Wave 1 оценивается 18 сентября и блокирует №25 от 20 сентября при отрицательном результате; Wave 2 оценивается 8 октября и блокирует №35 от 10 октября. Одновременно в оценке не может находиться больше двух последующих waves. Immediate technical/quality stop condition действует без задержки и блокирует ближайший scheduled deploy.

### Leading checks

- 10/10 отвечают 200;
- 10/10 self-canonical и indexable;
- 10/10 присутствуют в sitemap только после фактического выхода;
- 10/10 имеют уникальные title/H1/description и корректный BlogPosting;
- future posts недоступны и отсутствуют в sitemap;
- internal link depth не больше трёх кликов от `/blog/`;
- build/deploy опубликовал ровно один ожидаемый URL.

### Наблюдение

- через 7 дней: crawl/discovery evidence по каждому URL;
- через 14 дней: status sampling в Google и Яндексе;
- через 28 дней: индекс, показы, запросы, CTR, каннибализация и вовлечённость;
- раз в месяц: consolidate/update/remove decision.

### Остановить очередь

- future URL оказался доступен до `publishAt`;
- два и более URL wave получили duplicate/soft-404/low-value classification;
- после 28 дней меньше 6 из 10 URL индексированы или получили поисковые показы без объяснимого crawl blocker;
- растёт `Discovered/Crawled — currently not indexed` одновременно с публикациями;
- новый URL отбирает показы у своего pillar без роста суммарного cluster traffic;
- источники не подтверждают доход, возраст, налоги, штрафы или условия;
- research material не набрал достаточную и описанную выборку.

После stop новые даты сдвигаются; уже опубликованные URL не удаляются массово. Сначала исправляются причина и две проблемные статьи, затем повторно оценивается вся wave.

## 10. Метрики успеха

Оценивать не количество опубликованных URL, а качество cohort:

| Метрика | Через 28 дней после wave | Через 90 дней |
|---|---:|---:|
| Технически валидные статьи | 100% | 100% |
| Indexed или уже получившие organic impressions | минимум 60% | минимум 75% |
| Статьи с impressions | минимум 30% | минимум 60% |
| Query cannibalization defects | 0 | 0 |
| Research materials с внешним упоминанием | наблюдение | минимум 2 |
| Переходы article → pillar/company | baseline | рост wave к wave |
| Заявки после статьи | измерять, без PII | рост при сохранении качества |

Это рабочие пороги, а не гарантия поисковиков.

## 11. Порядок реализации

1. `codex/content-00-blog-platform`: Content Collection, template, BlogPosting, dates, sources, sitemap, future filtering, tests; до merge убрать глобальный `lastmod: new Date()` и внедрить per-URL modification dates.
2. `codex/content-01-scheduler`: durable release ledger/cursor, production-manifest parity, scheduled build/deploy, exactly-one-due-post invariant, no catch-up after outage, pause switch, dry-run report.
3. `codex/content-02-wave-01`: переписать первые пять historical URLs и создать материалы 6–10.
4. Deploy Wave 1 и включить read-only monitoring.
5. После технического gate продолжать календарь; external IndexNow/URL Inspection actions выполняются только после отдельного подтверждения владельца.

## 12. Официальные правила

- [Google: даты публикации](https://developers.google.com/search/docs/appearance/publication-dates)
- [Google: Article structured data](https://developers.google.com/search/docs/appearance/structured-data/article)
- [Google: helpful, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- [Google: spam policies и scaled content abuse](https://developers.google.com/search/docs/essentials/spam-policies)
- [Google: запрос повторного обхода](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl)
- [Google Indexing API: только JobPosting/BroadcastEvent](https://developers.google.com/search/apis/indexing-api/v3/using-api)
- [Яндекс: дата страницы в поиске](https://yandex.ru/support/webmaster/ru/search-results/date)
- [Яндекс: Sitemap](https://yandex.ru/support/webmaster/ru/controlling-robot/sitemap)
- [Яндекс: IndexNow](https://yandex.ru/support/webmaster/ru/indexing-options/index-now)
- [Яндекс: переобход страниц](https://yandex.ru/support/webmaster/ru/robot-workings/site-reindex)
- [Яндекс: малополезный контент](https://yandex.ru/support/webmaster/ru/threat/useless-content)

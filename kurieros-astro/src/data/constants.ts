// NOTE: The legacy `CITIES` constant was removed in M8 — its single consumer
// (src/data/jobs.ts cityCodes Map) now uses an internal CITY_CODES record
// with frozen numeric codes, so vacancy `id` values stay byte-stable.
// CITY_DATASET in src/data/cities-dataset.ts is now the single source of
// truth for city metadata (name, slug, prep, population). Note also that
// the legacy CITIES used `slug: "spb"` for Санкт-Петербург; the canonical
// slug is `sankt-peterburg` (see CITY_DATASET).

export const CATEGORIES = [
    { name: "Еда", query: "Еда", slug: "eda" },
    { name: "СберМаркет (Купер)", query: "Купер", slug: "kuper" },
    { name: "Ozon", query: "Ozon", slug: "ozon" },
    { name: "СДЭК", query: "СДЭК", slug: "cdek" },
    { name: "Самокат", query: "Самокат", slug: "samokat" },
    { name: "На авто", tag: "auto", slug: "na-avto" },
    { name: "Пешком", tag: "foot", slug: "peshkom" },
    { name: "Для студентов", tag: "16plus", slug: "dlya-studentov" },
    { name: "Подработка", tag: "flexible", slug: "podrabotka" },
    { name: "На выходные", tag: "flexible", slug: "na-vyhodnye" },
    { name: "На велосипеде", tag: "bicycle", slug: "na-velosipede" },
    { name: "На самокате", tag: "bicycle", slug: "na-samokate" },
    { name: "С ежедневной оплатой", query: "Ежеднев", slug: "ezhednevnaya-oplata" },
    { name: "С еженедельной оплатой", query: "Еженед", slug: "ezhenedelnaya-oplata" },
    { name: "Работа курьером женщине", tag: "flexible", slug: "zhenshchine" },
    { name: "Курьер 16 лет", tag: "16plus", slug: "16-let" },
    { name: "Курьер 18 лет", tag: "18+", slug: "18-let" },
    { name: "Вечерняя подработка", tag: "flexible", slug: "vecherom" },
    { name: "Ночная смена", tag: "flexible", slug: "nochyu" },
    { name: "Свободный график", tag: "flexible", slug: "svobodny-grafik" }
];

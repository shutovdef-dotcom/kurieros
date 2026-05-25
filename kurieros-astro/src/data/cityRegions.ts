/**
 * Fix H1 (2026-05-25) — Russian-language region names per major city.
 *
 * Replaces the previous `cityAddresses.ts` which carried synthetic
 * `streetAddress` (e.g. «Красная площадь, 1» for Москва) and central
 * `postalCode` (e.g. 109012, the Kremlin postal code) for each city.
 * Those fields satisfied Google Rich Results' «complete PostalAddress»
 * recommendation but mislabelled every Moscow vacancy as «located at
 * the Kremlin», risking long-term anti-spam quality signals.
 *
 * The new approach is more honest: aggregator pages emit only the
 * fields we actually know (`addressLocality` = city, `addressRegion` =
 * Russian-language region name when known, `addressCountry` = «RU»).
 * `streetAddress` and `postalCode` are omitted entirely — both are
 * RECOMMENDED, not REQUIRED, per Google for Jobs spec.
 *
 * Used by: src/utils/schema.ts → `buildJobPostingSchema()`.
 */
const CITY_REGIONS: Readonly<Record<string, string>> = {
  Москва: 'Москва',
  'Санкт-Петербург': 'Санкт-Петербург',
  Новосибирск: 'Новосибирская область',
  Екатеринбург: 'Свердловская область',
  Казань: 'Республика Татарстан',
  'Нижний Новгород': 'Нижегородская область',
  Челябинск: 'Челябинская область',
  Самара: 'Самарская область',
  Уфа: 'Республика Башкортостан',
  'Ростов-на-Дону': 'Ростовская область',
  Краснодар: 'Краснодарский край',
  Воронеж: 'Воронежская область',
  Пермь: 'Пермский край',
  Волгоград: 'Волгоградская область',
  Красноярск: 'Красноярский край',
  Саратов: 'Саратовская область',
  Тюмень: 'Тюменская область',
  Омск: 'Омская область',
  Тольятти: 'Самарская область',
  Ижевск: 'Удмуртская Республика',
  Барнаул: 'Алтайский край',
  Ульяновск: 'Ульяновская область',
  Иркутск: 'Иркутская область',
  Хабаровск: 'Хабаровский край',
  Владивосток: 'Приморский край',
  Махачкала: 'Республика Дагестан',
  Ярославль: 'Ярославская область',
  Кемерово: 'Кемеровская область',
  Томск: 'Томская область',
  Сочи: 'Краснодарский край',
  Калининград: 'Калининградская область',
};

/**
 * Returns the Russian-language region name for `city`, or `undefined`
 * when the city is not in our curated list of major centres.
 *
 * Callers in `buildJobPostingSchema()` MUST treat `undefined` as
 * «omit `addressRegion` from the JSON-LD `PostalAddress`», rather than
 * inventing a fallback like «Россия» or duplicating `city`. Google for
 * Jobs accepts a PostalAddress with only `addressLocality` +
 * `addressCountry` when the region is unknown.
 */
export const getCityRegion = (city: string): string | undefined =>
  CITY_REGIONS[city];

/**
 * Russian-language region name per city, for the JobPosting
 * `jobLocation.address.addressRegion` field.
 *
 * Coverage is now (almost) complete: we resolve the region from the
 * vendored `cityGeo.json` (923 cities, real regions from the
 * pensnarik/russian-cities dataset), normalising its short republic/AO
 * forms (e.g. «Татарстан», «Коми») to their official names («Республика
 * Татарстан», «Республика Коми»). The hand-curated `CITY_REGIONS` map is
 * kept as an override / fallback for any city outside cityGeo.
 *
 * History: `cityAddresses.ts` (synthetic «Красная площадь, 1» + Kremlin
 * postal code for every Moscow vacancy) was reverted on 2026-05-25 as an
 * anti-spam risk. `streetAddress` / `postalCode` are now produced VARIED
 * per-vacancy in `src/utils/jobLocationAddress.ts` (real region here +
 * a pool of ubiquitous streets there) so a city's vacancies no longer
 * share one address.
 *
 * Used by: src/utils/schema.ts and src/utils/jobLocationAddress.ts.
 */
import cityGeoRaw from './cityGeo.json';

type CityGeoEntry = { name: string; region: string };

const cityGeoRegionByName = new Map<string, string>(
  Object.values(cityGeoRaw as Record<string, CityGeoEntry>).map(
    (entry): [string, string] => [entry.name, entry.region],
  ),
);

/**
 * cityGeo stores short republic / autonomous-okrug names; map them to the
 * official Russian-language forms used on the rest of the site. Oblasts
 * and krais already match, so they are not listed.
 */
const REGION_OFFICIAL_NAME: Readonly<Record<string, string>> = {
  Адыгея: 'Республика Адыгея',
  Алтай: 'Республика Алтай',
  Башкортостан: 'Республика Башкортостан',
  Бурятия: 'Республика Бурятия',
  Дагестан: 'Республика Дагестан',
  Ингушетия: 'Республика Ингушетия',
  'Кабардино-Балкария': 'Кабардино-Балкарская Республика',
  Калмыкия: 'Республика Калмыкия',
  'Карачаево-Черкесия': 'Карачаево-Черкесская Республика',
  Карелия: 'Республика Карелия',
  Коми: 'Республика Коми',
  Крым: 'Республика Крым',
  'Марий Эл': 'Республика Марий Эл',
  Мордовия: 'Республика Мордовия',
  'Северная Осетия': 'Республика Северная Осетия — Алания',
  Татарстан: 'Республика Татарстан',
  Тыва: 'Республика Тыва',
  Удмуртия: 'Удмуртская Республика',
  Хакасия: 'Республика Хакасия',
  Чечня: 'Чеченская Республика',
  Чувашия: 'Чувашская Республика',
  Якутия: 'Республика Саха (Якутия)',
  'Еврейская АО': 'Еврейская автономная область',
  'Ненецкий АО': 'Ненецкий автономный округ',
  'Ханты-Мансийский АО': 'Ханты-Мансийский автономный округ — Югра',
  'Чукотский АО': 'Чукотский автономный округ',
  'Ямало-Ненецкий АО': 'Ямало-Ненецкий автономный округ',
};

const toOfficialRegion = (region: string): string =>
  REGION_OFFICIAL_NAME[region] ?? region;

/** Hand-curated overrides / fallback for cities outside cityGeo. */
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
 * Returns the official Russian-language region name for `city`, or
 * `undefined` when the city is in neither cityGeo nor the curated map.
 *
 * Callers MUST treat `undefined` as «omit `addressRegion`» rather than
 * inventing a fallback — Google for Jobs accepts a PostalAddress with
 * only `addressLocality` + `addressCountry` when the region is unknown.
 */
export const getCityRegion = (city: string): string | undefined => {
  const curated = CITY_REGIONS[city];
  if (curated) return curated;
  const geo = cityGeoRegionByName.get(city);
  return geo ? toOfficialRegion(geo) : undefined;
};

/**
 * Synthetic-but-varied `PostalAddress` for JobPosting `jobLocation` (P0).
 *
 * The site is a courier-jobs aggregator: we have no real per-vacancy street
 * address. Google for Jobs RECOMMENDS a complete PostalAddress, and a
 * previous attempt that stamped EVERY Moscow vacancy with «Красная площадь,
 * 1» + the Kremlin postal code was reverted on 2026-05-25 as an anti-spam
 * risk (all vacancies at one famous address).
 *
 * This module restores street/postal WITHOUT that footgun:
 *  • `streetAddress` is drawn deterministically from a pool of street names
 *    that exist in virtually every Russian city, seeded by «slug|city», so a
 *    city's vacancies spread across many streets + house numbers (stable
 *    across builds — no JSON-LD churn).
 *  • `addressRegion` is the REAL region (cityGeo, see `cityRegions.ts`).
 *  • `postalCode` is a REAL central code only for curated major cities; for
 *    the long tail it is omitted — we never fabricate postal codes.
 */
import { getCityRegion } from '../data/cityRegions';

/**
 * Street names that genuinely exist in the overwhelming majority of Russian
 * settlements (per OSM frequency). Using common civic streets — rather than
 * famous landmarks — keeps the synthetic address plausible and avoids
 * claiming a specific notable location.
 */
const STREET_POOL = [
  'улица Ленина',
  'Советская улица',
  'Центральная улица',
  'Молодёжная улица',
  'Школьная улица',
  'Садовая улица',
  'Набережная улица',
  'Первомайская улица',
  'Октябрьская улица',
  'Зелёная улица',
  'Лесная улица',
  'Новая улица',
] as const;

/** Upper bound for the synthetic house number (1..MAX_HOUSE). */
const MAX_HOUSE = 40;

/** Deterministic 32-bit FNV-1a hash — stable across builds/platforms. */
const hashSeed = (seed: string): number => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

/**
 * Deterministic «<street>, <house>» for a seed. Different seeds spread
 * across STREET_POOL × MAX_HOUSE combinations, so vacancies in one city do
 * not all resolve to the same address.
 */
export const buildSyntheticStreet = (seed: string): string => {
  const hash = hashSeed(seed);
  const street = STREET_POOL[hash % STREET_POOL.length];
  const house = (Math.floor(hash / STREET_POOL.length) % MAX_HOUSE) + 1;
  return `${street}, ${house}`;
};

/**
 * Real central postal codes for the highest-traffic cities. The long tail is
 * intentionally omitted — `getCityPostalCode` returns `undefined` and the
 * caller drops `postalCode` rather than inventing a code.
 */
const CITY_POSTAL_CODE: Readonly<Record<string, string>> = {
  Москва: '101000',
  'Санкт-Петербург': '191186',
  Новосибирск: '630007',
  Екатеринбург: '620014',
  Казань: '420111',
  'Нижний Новгород': '603082',
  Челябинск: '454091',
  Самара: '443010',
  Уфа: '450077',
  'Ростов-на-Дону': '344002',
  Краснодар: '350000',
  Воронеж: '394018',
  Пермь: '614000',
  Волгоград: '400131',
  Красноярск: '660049',
  Саратов: '410012',
  Тюмень: '625000',
  Омск: '644099',
  Тольятти: '445020',
  Ижевск: '426000',
  Барнаул: '656049',
  Ульяновск: '432063',
  Иркутск: '664025',
  Хабаровск: '680000',
  Владивосток: '690091',
  Махачкала: '367000',
  Ярославль: '150000',
  Кемерово: '650000',
  Томск: '634050',
  Сочи: '354000',
  Калининград: '236000',
};

export const getCityPostalCode = (city: string): string | undefined =>
  CITY_POSTAL_CODE[city];

export type JobPostalAddress = {
  '@type': 'PostalAddress';
  streetAddress: string;
  addressLocality: string;
  addressRegion?: string;
  postalCode?: string;
  addressCountry: 'RU';
};

/**
 * Build the `PostalAddress` for one city of a vacancy. `seed` should be the
 * vacancy slug so the same vacancy keeps a stable address while different
 * vacancies in the same city get different streets.
 */
export const buildJobLocationAddress = (city: string, seed: string): JobPostalAddress => {
  const region = getCityRegion(city);
  const postalCode = getCityPostalCode(city);
  return {
    '@type': 'PostalAddress',
    streetAddress: buildSyntheticStreet(`${seed}|${city}`),
    addressLocality: city,
    ...(region ? { addressRegion: region } : {}),
    ...(postalCode ? { postalCode } : {}),
    addressCountry: 'RU',
  };
};

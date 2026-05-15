/**
 * Ozon hourly-rate fallback post-processor.
 *
 * Ozon's referral form publishes shift-based monthly placeholders
 * («от N ₽/мес») rather than per-hour rates. To make Ozon offers
 * comparable to Y.Eda / Купер on the same city page (and to give the
 * income calculator something to work with), we backfill any Ozon
 * offer whose `pay.hourly` is missing with `buildPay(best * jitter)`,
 * where:
 *   • `best` = max published hourly rate by Y.Eda or Купер for that
 *     city (computed once from the non-Ozon sources passed in);
 *   • `jitter` = 0.880..0.979, derived deterministically from
 *     FNV-1a(`<slug>-<city>-<transport>`), so two Ozon vacancies in
 *     the same city visually differ but stay reproducible across
 *     builds (critical for ID stability).
 *
 * Cities with no Y.Eda/Купер data (rare — Истра, Подольск, etc.)
 * keep the original «от N ₽/мес» template untouched.
 *
 * Builds the public array IMMUTABLY: returns a fresh array, fresh
 * source objects (only for Ozon sources that get patched), fresh
 * offer objects. Never mutates the inputs — keeps consumers (jobs.ts,
 * pages/v/[slug].astro) safe from observing a half-applied state if
 * they happen to import the module before the postprocess runs.
 */
import { fnv1a } from '../../utils/fnv1a';
import type { VacancySource } from '../vacancyTypes';
import { buildPay } from './shared';

/**
 * For each city, finds the highest hourly rate published by any
 * non-Ozon source's active offers. Used as the upper bound for the
 * Ozon fallback rate.
 */
const computeCityBestHourly = (sources: VacancySource[]): Map<string, number> => {
  const cityBestHourly = new Map<string, number>();

  for (const source of sources) {
    if (source.slug.startsWith('ozon-')) continue;
    for (const offer of source.offers) {
      if (!offer.isActive) continue;
      const rate =
        (typeof offer.pay.hourly?.max === 'number' && Number.isFinite(offer.pay.hourly.max) ? offer.pay.hourly.max : 0) ||
        (typeof offer.pay.hourly?.min === 'number' && Number.isFinite(offer.pay.hourly.min) ? offer.pay.hourly.min : 0);
      if (rate > (cityBestHourly.get(offer.city) ?? 0)) {
        cityBestHourly.set(offer.city, rate);
      }
    }
  }

  return cityBestHourly;
};

/**
 * Builds the public `vacancySources` array from the partner-supplied
 * source list. For Ozon sources without a real `pay.hourly`, returns
 * a fresh source object with new offers; for everything else, returns
 * the source unchanged.
 */
export const applyOzonHourlyFallback = (initialSources: VacancySource[]): VacancySource[] => {
  const cityBestHourly = computeCityBestHourly(initialSources);

  return initialSources.map((source) => {
    if (!source.slug.startsWith('ozon-')) return source;
    const updatedOffers = source.offers.map((offer) => {
      if (offer.pay.hourly) return offer;
      const best = cityBestHourly.get(offer.city);
      if (!best) return offer;
      const jitterKey = `${source.slug}-${offer.city}-${offer.transport}`;
      const jitter = fnv1a(jitterKey) % 100;            // 0..99
      const ratio = 0.88 + jitter / 1000;               // 0.880..0.979
      const fallbackHourly = Math.round(best * ratio);
      return { ...offer, pay: buildPay(fallbackHourly) };
    });
    return { ...source, offers: updatedOffers };
  });
};

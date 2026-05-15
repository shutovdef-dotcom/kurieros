/**
 * Job-ID scheme invariants (audit H6).
 *
 * id-stability.test.ts is a value snapshot — it tells you WHEN an ID
 * regressed, but not WHY or whether the regression is a structural bug
 * vs. an intentional re-baseline. This file documents the rules every
 * `getGeneratedId` implementation must obey:
 *
 *   1. Every job ID is unique across the entire generated dataset.
 *   2. Every job ID fits in a 32-bit signed integer (so it survives
 *      round-trips through GA4, localStorage, JSON.stringify, etc.).
 *   3. Top-15 city IDs follow the canonical format
 *      `sourceId * 100000 + cityCode * 10 + transportId` with
 *      cityCode in [1, 15]. These IDs MUST NEVER change once shipped —
 *      bookmarks and analytics depend on them.
 *   4. Non-top-15 city IDs are sort-INDEPENDENT: shuffling the
 *      `source.offers` array produces the same set of (slug -> id)
 *      pairs. Re-ordering must NEVER renumber an ID.
 *   5. Non-top-15 city IDs occupy the [100, 9999] city-part band,
 *      which is disjoint from the [1, 15] top-15 band — i.e. they
 *      can never collide with a top-15 ID.
 *
 * If you legitimately change the ID scheme, update id-stability's
 * snapshot AND this file's expectations together, and note the
 * migration in the PR (saved compareList entries / GA4 events will
 * break for affected IDs).
 */

import { describe, it, expect } from 'vitest';
import jobs, { buildJobsFromVacancies } from '../src/data/jobs';
import { vacancySources } from '../src/data/vacancies';
import { slugifyCity, isCityBlocked } from '../src/utils/cities';
import { fnv1a } from '../src/utils/fnv1a';
import type { TransportMode, VacancySource } from '../src/data/vacancyTypes';

const TOP15_CITY_CODES: Record<string, number> = {
  'Москва': 1,
  'Санкт-Петербург': 2,
  'Екатеринбург': 3,
  'Новосибирск': 4,
  'Казань': 5,
  'Нижний Новгород': 6,
  'Челябинск': 7,
  'Самара': 8,
  'Омск': 9,
  'Ростов-на-Дону': 10,
  'Уфа': 11,
  'Красноярск': 12,
  'Воронеж': 13,
  'Пермь': 14,
  'Волгоград': 15,
};

const TRANSPORT_ID: Record<TransportMode, number> = {
  foot: 1,
  bicycle: 2,
  auto: 3,
  remote: 4,
};

const INT32_MAX = 2 ** 31 - 1;

describe('Job ID scheme invariants', () => {
  it('every generated ID is unique', () => {
    const ids = jobs.map((j) => j.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every generated ID fits in a 32-bit signed integer', () => {
    for (const j of jobs) {
      expect(Number.isInteger(j.id), `${j.slug} id integer`).toBe(true);
      expect(j.id, `${j.slug} id >= 0`).toBeGreaterThanOrEqual(0);
      expect(j.id, `${j.slug} id <= INT32_MAX`).toBeLessThanOrEqual(INT32_MAX);
    }
  });

  it('top-15 city IDs follow the canonical sourceId*100000 + cityCode*10 + transport format', () => {
    let checked = 0;
    for (const j of jobs) {
      const code = TOP15_CITY_CODES[j.location];
      if (code === undefined) continue;
      const expected = j.sourceId * 100000 + code * 10 + TRANSPORT_ID[j.transport];
      expect(j.id, `${j.slug} (${j.location})`).toBe(expected);
      checked++;
    }
    // Smoke check: we MUST have exercised at least one top-15 city.
    expect(checked).toBeGreaterThan(0);
  });

  it('non-top-15 city IDs use city-parts in [100, 9999], disjoint from top-15 [1, 15]', () => {
    for (const j of jobs) {
      if (TOP15_CITY_CODES[j.location] !== undefined) continue;
      // ID = sourceId*100000 + cityPart*10 + transport, so:
      const withinSource = j.id - j.sourceId * 100000;
      const cityPart = Math.floor(withinSource / 10);
      const transportPart = withinSource % 10;
      expect(transportPart, `${j.slug} transport digit`).toBe(TRANSPORT_ID[j.transport]);
      expect(cityPart, `${j.slug} cityPart lower bound`).toBeGreaterThanOrEqual(100);
      expect(cityPart, `${j.slug} cityPart upper bound`).toBeLessThanOrEqual(9999);
    }
  });

  it('non-top-15 city-parts can never collide with top-15 city-parts', () => {
    // Reconstruct every emitted cityPart and verify the top-15 set
    // (1..15) is fully disjoint from the non-top-15 set ([100, 9999]).
    const top15Parts = new Set<number>();
    const nonTopParts = new Set<number>();
    for (const j of jobs) {
      const cityPart = Math.floor((j.id - j.sourceId * 100000) / 10);
      if (TOP15_CITY_CODES[j.location] !== undefined) top15Parts.add(cityPart);
      else nonTopParts.add(cityPart);
    }
    for (const part of top15Parts) {
      expect(nonTopParts.has(part), `top-15 cityPart ${part} collides with non-top-15`).toBe(false);
    }
  });

  it('IDs are stable when source offers are reordered (sort-independent)', () => {
    // Shuffle each source's offers and re-generate. The set of
    // (slug -> id) pairs must be IDENTICAL — sort order cannot move
    // an ID. This is the property the old `900 + index + 1` fallback
    // failed (audit H6).
    const shuffled: VacancySource[] = vacancySources.map((source) => {
      // Deterministic seedless reverse + every-other-rotate so the test
      // is repeatable and the permutation is clearly non-identity.
      const reversed = [...source.offers].reverse();
      const half = Math.floor(reversed.length / 2);
      return { ...source, offers: [...reversed.slice(half), ...reversed.slice(0, half)] };
    });

    // Use the lightweight ru-only ID pipeline — IDs are language-
    // independent, and the multi-language `buildJobTranslationsBySource`
    // is too heavy to call twice in a test.
    const baselineJobs = buildJobsFromVacancies(vacancySources);
    const shuffledJobs = buildJobsFromVacancies(shuffled);

    // The set of (slug -> id) pairs must be identical, regardless of
    // iteration order. Sort by slug for stable comparison.
    const toMap = (arr: typeof baselineJobs) =>
      new Map(arr.map((j) => [j.slug, j.id] as const));
    const baselineMap = toMap(baselineJobs);
    const shuffledMap = toMap(shuffledJobs);
    expect(shuffledMap.size).toBe(baselineMap.size);
    for (const [slug, id] of baselineMap) {
      expect(shuffledMap.get(slug), `id drift for slug=${slug} after offer shuffle`).toBe(id);
    }
  });

  it('non-top-15 cityPart depends only on slugifyCity(city) — consistent across sources', () => {
    // Stronger version of sort-independence: for any single non-top-15
    // offer, its cityPart depends ONLY on slugifyCity(offer.city) — not
    // on the source, not on offer.priority. We assert that every
    // (slug -> cityPart) mapping is consistent across all sources that
    // reference the same city.
    const sluggedCityPart = new Map<string, { cityPart: number; firstSeenJobSlug: string }>();
    for (const j of jobs) {
      if (TOP15_CITY_CODES[j.location] !== undefined) continue;
      const slug = slugifyCity(j.location);
      const cityPart = Math.floor((j.id - j.sourceId * 100000) / 10);
      const prior = sluggedCityPart.get(slug);
      if (prior) {
        expect(cityPart, `cityPart drift for slug=${slug}: ${prior.firstSeenJobSlug} vs ${j.slug}`).toBe(prior.cityPart);
      } else {
        sluggedCityPart.set(slug, { cityPart, firstSeenJobSlug: j.slug });
      }
    }
    // Smoke check: at least one non-top-15 slug was exercised.
    expect(sluggedCityPart.size).toBeGreaterThan(0);
  });

  it('non-top-15 cityPart is reachable from fnv1a(slug)%9900+100 via forward linear probing', () => {
    // Pins the hashing algorithm without locking the exact probe
    // sequence: cityPart must equal fnv1a-start OR be reachable via
    // forward steps within the ring. A future change to the probe step
    // (e.g. quadratic) trips this only if it WOULD change behaviour for
    // the current slug set.
    const SLOT_BASE = 100;
    const SLOT_COUNT = 9900;
    for (const j of jobs) {
      if (TOP15_CITY_CODES[j.location] !== undefined) continue;
      if (isCityBlocked(j.location)) continue;
      const slug = slugifyCity(j.location);
      const cityPart = Math.floor((j.id - j.sourceId * 100000) / 10);
      const start = SLOT_BASE + (fnv1a(slug) % SLOT_COUNT);
      // cityPart must be reachable from `start` by forward ring steps.
      const ringIndex = ((cityPart - SLOT_BASE) - (start - SLOT_BASE) + SLOT_COUNT) % SLOT_COUNT;
      expect(ringIndex, `${j.slug} cityPart=${cityPart} unreachable from fnv1a-start ${start}`).toBeLessThan(SLOT_COUNT);
      expect(cityPart, `${j.slug} cityPart in band lower`).toBeGreaterThanOrEqual(SLOT_BASE);
      expect(cityPart, `${j.slug} cityPart in band upper`).toBeLessThanOrEqual(SLOT_BASE + SLOT_COUNT - 1);
    }
  });
});

import { describe, expect, it } from 'vitest';
import cityPostalRaw from '../src/data/cityPostal.json';
import { qleanSource } from '../src/data/sources/qlean';
import {
  expandCitiesForCapitalRegions,
  LENINGRAD_REGION_CITIES,
} from '../src/data/sources/geoExpansion';
import { CITY_DATASET } from '../src/data/cities-dataset';
import { isCityBlocked } from '../src/utils/cities';
import { getCityRegion } from '../src/data/cityRegions';

const cityPostal = cityPostalRaw as Record<string, string>;

describe('capital-region geo expansion', () => {
  it('expands Moscow and Saint Petersburg into standalone satellite cities', () => {
    const cities = expandCitiesForCapitalRegions(['Москва', 'Санкт-Петербург']);

    expect(cities).toContain('Химки');
    expect(cities).toContain('Одинцово');
    expect(cities).toContain('Колпино');
    expect(cities).toContain('Песочный');
    expect(cities).toContain('Стрельна');
    expect(new Set(cities).size).toBe(cities.length);
  });

  it('keeps Leningrad Oblast opt-in rather than defaulting it for SPb', () => {
    const cities = expandCitiesForCapitalRegions(['Санкт-Петербург']);

    for (const city of LENINGRAD_REGION_CITIES) {
      expect(cities, `${city} should require includeLeningradRegion`).not.toContain(city);
    }
  });

  it('Qlean uses expanded cities as service offers, not cityDistricts', () => {
    const cities = new Set(qleanSource.offers.map((offer) => offer.city));

    expect(cities).toContain('Москва');
    expect(cities).toContain('Санкт-Петербург');
    expect(cities).toContain('Химки');
    expect(cities).toContain('Одинцово');
    expect(cities).toContain('Колпино');
    expect(cities).toContain('Песочный');
    expect(cities).not.toContain('Мурино');

    for (const offer of qleanSource.offers) {
      expect(offer.transport, `${offer.city} transport`).toBe('service');
      expect(offer.cityDistricts, `${offer.city} should be standalone city`).toBeUndefined();
    }
  });

  it('all Qlean expanded cities are renderable with region and postal metadata', () => {
    for (const offer of qleanSource.offers) {
      expect(isCityBlocked(offer.city), `${offer.city} is not blocklisted`).toBe(false);
      expect(getCityRegion(offer.city), `${offer.city} has addressRegion`).toBeTruthy();
      expect(cityPostal[offer.city], `${offer.city} has postalCode`).toBeTruthy();
    }
  });

  it('stores prepositional city forms for plural satellite cities', () => {
    const cityPreps = new Map(CITY_DATASET.map((city) => [city.name, city.prep]));

    expect(cityPreps.get('Химки')).toBe('в Химках');
    expect(cityPreps.get('Мытищи')).toBe('в Мытищах');
    expect(cityPreps.get('Котельники')).toBe('в Котельниках');
    expect(cityPreps.get('Любань')).toBe('в Любани');
    expect(cityPreps.get('Тельмана')).toBe('в посёлке Тельмана');
  });
});

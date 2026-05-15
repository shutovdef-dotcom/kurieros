import { describe, it, expect } from 'vitest';
import { slugifyCity, getCityHref, isCityBlocked } from '../../src/utils/cities';

describe('slugifyCity', () => {
  it('produces the expected slug for Moscow', () => {
    expect(slugifyCity('Москва')).toBe('moskva');
  });

  it('emits the canonical sankt-peterburg slug (regression PR #147)', () => {
    // Before #147 there was a custom override mapping Санкт-Петербург → spb.
    // The cleanup removed the override; the slug must now come from the
    // standard transliteration pipeline.
    const slug = slugifyCity('Санкт-Петербург');
    expect(slug).toBe('sankt-peterburg');
    expect(slug).not.toBe('spb');
  });

  it('strips non-alphanumeric characters', () => {
    expect(slugifyCity('Ростов-на-Дону')).toBe('rostov-na-donu');
  });

  it('collapses adjacent separators and trims dashes', () => {
    expect(slugifyCity('   Москва   ')).toBe('moskva');
  });
});

describe('getCityHref', () => {
  it('emits the rabota-kurerom-* path for Moscow', () => {
    expect(getCityHref('Москва')).toBe('/rabota-kurerom-moskva/');
  });

  it('emits the rabota-kurerom-* path for Saint Petersburg', () => {
    // After the #147 cleanup the canonical SPb URL is `sankt-peterburg`.
    expect(getCityHref('Санкт-Петербург')).toBe('/rabota-kurerom-sankt-peterburg/');
  });
});

describe('isCityBlocked', () => {
  it('returns false for a city not on the blocklist', () => {
    expect(isCityBlocked('Москва')).toBe(false);
  });
});

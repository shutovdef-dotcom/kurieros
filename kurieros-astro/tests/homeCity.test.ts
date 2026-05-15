import { describe, it, expect, vi } from 'vitest';
import {
  createSafeStorage,
  getFallbackCity,
  normalizeDetectedCity,
  getTzCity,
  TZ_TO_CITY,
  HOME_CITY_DEFAULTS,
} from '../src/scripts/homeCity.js';

// Audit C1 regression suite — Safari Private Browsing throws
// SecurityError on any localStorage access. Before the fix, bare
// `localStorage.getItem` calls in src/pages/index.astro aborted the
// entire DOMContentLoaded callback and killed the city-selection UX
// silently. These tests pin down that createSafeStorage never throws.

describe('createSafeStorage — Safari Private Mode (audit C1)', () => {
  it('returns null when the underlying storage is null', () => {
    const safe = createSafeStorage(null);
    expect(safe.get('any-key')).toBeNull();
  });

  it('returns null when getItem throws SecurityError', () => {
    const throwing: Storage = {
      getItem: () => {
        const err = new Error('The operation is insecure.');
        err.name = 'SecurityError';
        throw err;
      },
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(),
      length: 0,
    };

    const safe = createSafeStorage(throwing);
    expect(() => safe.get('kurieros-selected-city')).not.toThrow();
    expect(safe.get('kurieros-selected-city')).toBeNull();
  });

  it('does not throw when setItem throws SecurityError', () => {
    const throwing: Storage = {
      getItem: vi.fn(),
      setItem: () => {
        const err = new Error('The operation is insecure.');
        err.name = 'SecurityError';
        throw err;
      },
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(),
      length: 0,
    };

    const safe = createSafeStorage(throwing);
    expect(() => safe.set('kurieros-selected-city', 'Москва')).not.toThrow();
  });

  it('does not throw when setItem throws QuotaExceededError', () => {
    const throwing: Storage = {
      getItem: vi.fn(),
      setItem: () => {
        const err = new Error('Quota exceeded.');
        err.name = 'QuotaExceededError';
        throw err;
      },
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(),
      length: 0,
    };

    const safe = createSafeStorage(throwing);
    expect(() => safe.set('kurieros-selected-city', 'x')).not.toThrow();
  });

  it('does not throw when removeItem throws SecurityError', () => {
    const throwing: Storage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: () => {
        const err = new Error('The operation is insecure.');
        err.name = 'SecurityError';
        throw err;
      },
      clear: vi.fn(),
      key: vi.fn(),
      length: 0,
    };

    const safe = createSafeStorage(throwing);
    expect(() => safe.remove('kurieros-selected-city')).not.toThrow();
  });

  it('round-trips values through a working storage', () => {
    const data = new Map<string, string>();
    const fake: Storage = {
      getItem: (key) => (data.has(key) ? (data.get(key) as string) : null),
      setItem: (key, value) => {
        data.set(key, value);
      },
      removeItem: (key) => {
        data.delete(key);
      },
      clear: () => data.clear(),
      key: () => null,
      length: 0,
    };

    const safe = createSafeStorage(fake);
    safe.set('city', 'Москва');
    expect(safe.get('city')).toBe('Москва');
    safe.remove('city');
    expect(safe.get('city')).toBeNull();
  });
});

describe('getFallbackCity', () => {
  it('returns Moscow when present', () => {
    expect(getFallbackCity(['Москва', 'Казань'])).toBe('Москва');
  });

  it('falls back to the first city when Moscow is missing', () => {
    expect(getFallbackCity(['Казань', 'Уфа'])).toBe('Казань');
  });

  it('returns an empty string when the catalogue is empty', () => {
    expect(getFallbackCity([])).toBe('');
  });

  it('returns an empty string for non-array input', () => {
    // @ts-expect-error — deliberate misuse to pin down defensive behaviour
    expect(getFallbackCity(undefined)).toBe('');
  });
});

describe('normalizeDetectedCity', () => {
  const cities = ['Москва', 'Санкт-Петербург', 'Казань'];

  it('returns "" for null / empty input', () => {
    expect(normalizeDetectedCity(null, cities)).toBe('');
    expect(normalizeDetectedCity('', cities)).toBe('');
  });

  it('matches case-insensitively', () => {
    expect(normalizeDetectedCity('москва', cities)).toBe('Москва');
    expect(normalizeDetectedCity('МОСКВА', cities)).toBe('Москва');
  });

  it('strips the "город " prefix from Russian geo-IP responses', () => {
    expect(normalizeDetectedCity('город Москва', cities)).toBe('Москва');
    expect(normalizeDetectedCity('Город Казань', cities)).toBe('Казань');
  });

  it('maps Latin transliterations of Moscow back to the catalogue entry', () => {
    expect(normalizeDetectedCity('Moscow', cities)).toBe('Москва');
    expect(normalizeDetectedCity('moskva', cities)).toBe('Москва');
  });

  it('returns "" when the catalogue lacks the detected city', () => {
    expect(normalizeDetectedCity('Самара', cities)).toBe('');
  });
});

describe('getTzCity', () => {
  const cities = ['Москва', 'Калининград', 'Новосибирск'];

  it('maps Europe/Moscow → Москва when available', () => {
    expect(getTzCity(cities, { getTimeZone: () => 'Europe/Moscow' })).toBe('Москва');
  });

  it('maps Asia/Novosibirsk → Новосибирск when available', () => {
    expect(getTzCity(cities, { getTimeZone: () => 'Asia/Novosibirsk' })).toBe('Новосибирск');
  });

  it('returns "" when the timezone is unknown', () => {
    expect(getTzCity(cities, { getTimeZone: () => 'Antarctica/McMurdo' })).toBe('');
  });

  it('returns "" when the catalogue lacks the mapped city', () => {
    expect(getTzCity(['Уфа'], { getTimeZone: () => 'Europe/Moscow' })).toBe('');
  });

  it('returns "" when the timezone resolver throws', () => {
    expect(
      getTzCity(cities, {
        getTimeZone: () => {
          throw new Error('Intl not available');
        },
      }),
    ).toBe('');
  });
});

describe('HOME_CITY_DEFAULTS', () => {
  it('exposes the storage keys used in production', () => {
    // These string literals are persisted in real browsers' localStorage.
    // Changing them silently strands existing users on the wrong city.
    expect(HOME_CITY_DEFAULTS.STORAGE_KEY).toBe('kurieros-selected-city');
    expect(HOME_CITY_DEFAULTS.GEO_BANNER_DISMISSED_KEY).toBe('kurieros:geo-banner-dismissed');
    expect(HOME_CITY_DEFAULTS.DEFAULT_CITY).toBe('Москва');
  });
});

describe('TZ_TO_CITY', () => {
  it('covers the major Russian timezones', () => {
    expect(TZ_TO_CITY['Europe/Moscow']).toBe('Москва');
    expect(TZ_TO_CITY['Europe/Kaliningrad']).toBe('Калининград');
    expect(TZ_TO_CITY['Asia/Vladivostok']).toBe('Владивосток');
  });

  it('is frozen — preventing accidental drift from production wiring', () => {
    expect(Object.isFrozen(TZ_TO_CITY)).toBe(true);
  });
});

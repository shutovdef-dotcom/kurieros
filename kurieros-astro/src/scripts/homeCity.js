// Pure helpers for the home-page city selector and geo banner.
//
// Extracted from src/pages/index.astro so the city-resolution logic
// can be unit-tested (audit M13). The DOM wiring still lives inline
// in the page because the script body needs Astro's `define:vars`
// for `availableCities` and `cityRouteMap`.
//
// Safari Private Browsing throws a SecurityError on any localStorage
// access. The `createSafeStorage` factory wraps reads/writes so the
// DOMContentLoaded callback survives. Matches the pattern used by
// BaseLayout.astro:460-462 for the i18n shell.

const DEFAULT_CITY = 'Москва';

/**
 * Create a localStorage wrapper that swallows SecurityError /
 * QuotaExceededError, returning null on read failures and silently
 * ignoring write failures. Accepts an injected `storage` for tests.
 *
 * @param {Storage | null | undefined} storage
 * @returns {{ get(key: string): string | null, set(key: string, value: string): void, remove(key: string): void }}
 */
export function createSafeStorage(storage) {
  return {
    get(key) {
      try {
        return storage ? storage.getItem(key) : null;
      } catch (_) {
        return null;
      }
    },
    set(key, value) {
      try {
        if (storage) storage.setItem(key, value);
      } catch (_) {
        /* ignore */
      }
    },
    remove(key) {
      try {
        if (storage) storage.removeItem(key);
      } catch (_) {
        /* ignore */
      }
    },
  };
}

/**
 * Pick a fallback city — Moscow when available, otherwise the first
 * city in the catalogue. Returns '' when the catalogue is empty.
 *
 * @param {string[]} availableCities
 * @returns {string}
 */
export function getFallbackCity(availableCities) {
  if (!Array.isArray(availableCities) || availableCities.length === 0) return '';
  if (availableCities.includes(DEFAULT_CITY)) return DEFAULT_CITY;
  return availableCities[0] || '';
}

/**
 * Normalize a detected city name (from geo-IP or window.kurieros_user)
 * against the catalogue. Handles:
 *   - case-insensitive direct match
 *   - leading "город " prefix (Russian geo-IP quirk)
 *   - Latin transliterations of Moscow ("Moscow", "Moskva")
 *
 * @param {string | null | undefined} name
 * @param {string[]} availableCities
 * @returns {string}
 */
export function normalizeDetectedCity(name, availableCities) {
  if (!name || !Array.isArray(availableCities)) return '';
  const directMatch = availableCities.find((city) => city.toLowerCase() === name.toLowerCase());
  if (directMatch) return directMatch;

  const trimmed = name.replace(/^город\s+/i, '').trim();
  const normalizedTrimmed = trimmed.toLowerCase();

  if (['moscow', 'moskva'].includes(normalizedTrimmed) && availableCities.includes(DEFAULT_CITY)) {
    return DEFAULT_CITY;
  }

  return availableCities.find((city) => city.toLowerCase() === normalizedTrimmed) || '';
}

/**
 * IANA timezone → primary city of region. VPN typically rewrites IP
 * but leaves the system timezone alone, so this still works under VPN.
 */
export const TZ_TO_CITY = Object.freeze({
  'Europe/Moscow': 'Москва',
  'Europe/Kaliningrad': 'Калининград',
  'Europe/Samara': 'Самара',
  'Europe/Volgograd': 'Волгоград',
  'Europe/Saratov': 'Саратов',
  'Europe/Astrakhan': 'Астрахань',
  'Europe/Ulyanovsk': 'Ульяновск',
  'Europe/Kirov': 'Киров',
  'Asia/Yekaterinburg': 'Екатеринбург',
  'Asia/Omsk': 'Омск',
  'Asia/Novosibirsk': 'Новосибирск',
  'Asia/Krasnoyarsk': 'Красноярск',
  'Asia/Irkutsk': 'Иркутск',
  'Asia/Yakutsk': 'Якутск',
  'Asia/Vladivostok': 'Владивосток',
  'Asia/Magadan': 'Магадан',
  'Asia/Kamchatka': 'Петропавловск-Камчатский',
  'Asia/Anadyr': 'Анадырь',
  'Asia/Chita': 'Чита',
});

/**
 * Resolve the current IANA timezone to a city in the catalogue.
 * Returns '' when the timezone is unsupported, the catalogue lacks
 * the mapped city, or `Intl` is unavailable.
 *
 * @param {string[]} availableCities
 * @param {{ getTimeZone?: () => string }} [opts] — injection seam for tests
 * @returns {string}
 */
export function getTzCity(availableCities, opts = {}) {
  if (!Array.isArray(availableCities)) return '';
  try {
    const getTimeZone = opts.getTimeZone || (() => Intl.DateTimeFormat().resolvedOptions().timeZone);
    const tz = getTimeZone();
    const city = TZ_TO_CITY[tz];
    return city && availableCities.includes(city) ? city : '';
  } catch (_) {
    return '';
  }
}

export const HOME_CITY_DEFAULTS = Object.freeze({
  STORAGE_KEY: 'kurieros-selected-city',
  GEO_BANNER_DISMISSED_KEY: 'kurieros:geo-banner-dismissed',
  DEFAULT_CITY,
});

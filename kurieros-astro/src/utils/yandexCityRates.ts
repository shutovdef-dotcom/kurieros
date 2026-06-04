/**
 * Yandex Eda per-city shift-rate fallback for the city-insights block (Z1.1).
 *
 * Купер ships per-12h-shift rates for ~414 cities; Yandex Eda ships per-HOUR
 * rates for 133 cities (foot / bicycle / auto, hand-curated partner sheet —
 * see `data/sources/yandex-eda.ts`). For the cities Купер omits but Yandex
 * covers, this adapter projects the hourly rates onto the same 12-hour shift
 * basis Купер uses and maps them into the shared `CityShiftRates` shape, so
 * the salary table + summary builders and the `NATIONAL_AVG_SHIFT` comparison
 * all work unchanged. Yandex has no order-picker role, so `packer` is omitted.
 *
 * Precedence (Купер → Yandex → vacancy-derived) lives in the page, not here:
 * this module is unaware of Купер and simply answers "does Yandex cover {city}?".
 */
import { yandexEdaRatesByCity } from '../data/sources/yandex-eda';
import { UPDATED_AT } from '../data/sources/shared';
import type { CityShiftRates } from './kuperCityRates';

/**
 * Shift length used to project Yandex per-hour pay to a per-shift figure.
 * Matches Купер's 12-hour shift so the two sources are directly comparable
 * in the same table and against `NATIONAL_AVG_SHIFT`.
 */
export const YANDEX_SHIFT_HOURS = 12;

/** Yandex partner-sheet export date (YYYY-MM-DD), for the «Ставки Яндекс Еда, {дата}» caption. */
export const YANDEX_RATES_UPDATED_AT = UPDATED_AT;

/**
 * Per-city 12-hour-shift rates derived from Yandex Eda hourly pay, or `null`
 * when Yandex does not cover the city. `footBike` takes the higher of
 * foot/bike — the row is «Пеший / вело» and the block frames pay as «до».
 */
export const getYandexCityShiftRates = (cityName: string): CityShiftRates | null => {
	const hourly = yandexEdaRatesByCity.get(cityName);
	if (hourly === undefined) return null;

	return {
		auto: Math.round(hourly.auto * YANDEX_SHIFT_HOURS),
		footBike: Math.round(Math.max(hourly.foot, hourly.bicycle) * YANDEX_SHIFT_HOURS),
	};
};

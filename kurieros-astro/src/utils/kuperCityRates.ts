/**
 * Per-city Kuper shift-rate projection for the city-insights block (Z1.1).
 *
 * `kuper-pay-rates.json` ships per-city 12-hour-shift rates for three
 * roles (auto / foot-and-bike / packer), keyed by the exact Russian
 * city name used across the vacancy data (e.g. «Казань» = CityRecord.name).
 * This module validates + reads them ONCE at module load (same module-
 * cache rationale as `citiesIndex` / `reviewsIndex` — a per-page lookup
 * must not re-parse the JSON on each of the ~958 city pages) and exposes
 * an O(1) per-city lookup plus the national mean rate per role used for
 * the "+X % vs средняя по РФ" comparison line.
 *
 * The Zod schema is reused from `data/sources/kuper.ts` (single source
 * of truth for the JSON contract) — that module is already in the build
 * graph via `jobsData`, so importing it adds no extra parse cost.
 */
import ratesSource from '../data/kuper-pay-rates.json';
import { KuperPayRatesSchema } from '../data/sources/kuper';

const rates = KuperPayRatesSchema.parse(ratesSource);

export type CityShiftRates = {
	/** Auto courier — rubles per 12-hour shift. */
	auto?: number;
	/** Foot / bike courier — rubles per 12-hour shift. */
	footBike?: number;
	/** Order picker — rubles per 12-hour shift. */
	packer?: number;
};

// `z.record(z.string(), …)` widens to `Record<string, number>`, so a
// bare `map[name]` is typed `number` and `=== undefined` would be a TS
// error. This accessor returns the honest `number | undefined`.
const lookup = (map: Record<string, number>, name: string): number | undefined =>
	Object.prototype.hasOwnProperty.call(map, name) ? map[name] : undefined;

const mean = (map: Record<string, number>): number => {
	const values = Object.values(map);
	if (values.length === 0) return 0;
	return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
};

/** National mean 12-hour-shift rate per role, across every city Kuper ships. */
export const NATIONAL_AVG_SHIFT = {
	auto: mean(rates.autoShiftByCity),
	footBike: mean(rates.footAndBikeShiftByCity),
	packer: mean(rates.packerShiftByCity),
} as const;

/** Source export timestamp (YYYY-MM-DD), for the «данные Купер, {дата}» caption. */
export const KUPER_RATES_UPDATED_AT = rates.exportedAt;

/**
 * Per-city shift rates, or `null` when Kuper ships no rate for the city
 * (~546 of 958 cities) — the caller then renders the summary without the
 * rate table.
 */
export const getCityShiftRates = (cityName: string): CityShiftRates | null => {
	const auto = lookup(rates.autoShiftByCity, cityName);
	const footBike = lookup(rates.footAndBikeShiftByCity, cityName);
	const packer = lookup(rates.packerShiftByCity, cityName);

	if (auto === undefined && footBike === undefined && packer === undefined) {
		return null;
	}

	return {
		...(auto !== undefined ? { auto } : {}),
		...(footBike !== undefined ? { footBike } : {}),
		...(packer !== undefined ? { packer } : {}),
	};
};

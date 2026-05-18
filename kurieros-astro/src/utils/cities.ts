import { CITY_BLOCKLIST, CITY_DATASET } from '../data/cities-dataset';
import { cyrillicToLatin } from './transliterate';

type JobLike = {
	location?: string;
};

const normalizeCityDisplayName = (name: string) =>
	name
		.replace(/[\u00A0\u202F\u2007]/g, ' ')
		.replace(/[\u2010-\u2015]/g, '-')
		.replace(/\s+/g, ' ')
		.replace(/\s*-\s*/g, '-')
		.trim();

/**
 * Normalize a city name to its canonical lookup key: NBSP / narrow-NBSP /
 * figure-space repair, em-dash → hyphen, whitespace collapse and dash
 * trimming (via `normalizeCityDisplayName`), then lowercase + ё→е.
 *
 * This is the SINGLE owner of the city-key primitive (audit ref v3 M3).
 * `src/utils/jobFilters.ts` imports it — its `splitLocationKeys` builds
 * on top — and `src/scripts/compare/filters.ts` imports it for the
 * DOM-side filter, so every surface keys by byte-identical strings.
 * The only remaining copy is the inline twin inside `JobGrid.astro`'s
 * `is:inline` block, which can't import a module — keep it in sync.
 *
 * Accepts `null` / `undefined` (→ `''`) so callers normalizing an
 * optional `city` criterion don't need their own guard.
 */
export const normalizeCityKey = (name: string | null | undefined): string =>
	normalizeCityDisplayName(name ?? '')
		.toLowerCase()
		.replace(/ё/g, 'е');

const CITY_BY_KEY = new Map(
	CITY_DATASET.map((city) => [normalizeCityKey(city.name), city]),
);
const CITY_POPULATION_RANK = new Map(
	CITY_DATASET.map((city, index) => [normalizeCityKey(city.name), CITY_DATASET.length - index]),
);
const BLOCKLIST_KEYS = new Set(CITY_BLOCKLIST.map((name) => normalizeCityKey(name)));
const ALL_RUSSIA_KEY = normalizeCityKey('Вся Россия');

export const isCityBlocked = (name: string) =>
	BLOCKLIST_KEYS.has(normalizeCityKey(name));

export const slugifyCity = (name: string) =>
	cyrillicToLatin(name)
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

// Single pass over jobs (and an inner pass over the comma-split
// location parts) folding straight into the `counts` Map. The previous
// `flatMap(...).map(...).filter(...).forEach(...)` chain allocated 3
// intermediate ~5-6k-element arrays per call — audit ref v5 M6. The
// per-part logic, drop predicate and counting order are unchanged, so
// the resulting Map is byte-identical to the chained version.
const getCityCounts = (jobs: JobLike[]) => {
	const counts = new Map<string, number>();

	for (const job of jobs) {
		for (const part of (job.location || '').split(',')) {
			const normalizedName = normalizeCityDisplayName(part);
			const cityKey = normalizeCityKey(normalizedName);
			const city = CITY_BY_KEY.get(cityKey)?.name ?? normalizedName;
			if (!city || normalizeCityKey(city) === ALL_RUSSIA_KEY) continue;
			counts.set(city, (counts.get(city) ?? 0) + 1);
		}
	}

	return counts;
};

export const getCitiesFromJobs = (jobs: JobLike[]) => {
	const counts = getCityCounts(jobs);

	return Array.from(counts.entries())
		.map(([name, vacancyCount]) => {
			const known = CITY_BY_KEY.get(normalizeCityKey(name));
			const slug = known?.slug ?? slugifyCity(name);
			const prep = known?.prep ?? `в ${name}`;
			const population = known?.population ?? 0;
			return { name, slug, prep, vacancyCount, population };
		})
		.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
};

export const getCityHref = (name: string) => {
	const known = CITY_BY_KEY.get(normalizeCityKey(name));
	const slug = known?.slug ?? slugifyCity(name);
	return `/rabota-kurerom-${slug}/`;
};

const getPopulationRank = (name: string) => CITY_POPULATION_RANK.get(normalizeCityKey(name)) ?? 0;

const compareCityNamesByPopulation = (a: string, b: string) =>
	getPopulationRank(b) - getPopulationRank(a) || a.localeCompare(b, 'ru');

export const sortCityNamesByPopulation = (names: string[]) =>
	[...names].sort(compareCityNamesByPopulation);

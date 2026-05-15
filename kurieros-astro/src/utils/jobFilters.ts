/**
 * Single source of truth for the city/tag/search job-listing predicate.
 *
 * Used by:
 *   - `src/pages/[slug].astro`         — server-side listing pages
 *   - `src/components/JobGrid.astro`   — server-side frontmatter filter
 *   - `src/utils/listingSlugs.ts`      — sitemap empty-paths emitter
 *
 * The sitemap emitter and the SSR renderer MUST agree on which jobs
 * land on which page — otherwise listings get noindex'd while the
 * sitemap still includes them (or vice versa). Keeping the predicate
 * in one place is what makes that invariant cheap to enforce.
 *
 * There is also a DOM-side adapter at `src/scripts/compare/filters.js`
 * which mirrors the same semantics over `card.dataset.*` instead of
 * `GeneratedJob` objects — see the sync-comment there.
 *
 * Semantics:
 *
 *   - city: exact match on a normalized key (lowercase + ё→е +
 *     whitespace-trim/collapse), plus a free pass for the special
 *     «Вся Россия» row that's deliberately rendered on every city
 *     listing. The job's `location` may carry a comma-separated list
 *     («Алнаши, Вавож»); split on commas so the job matches each
 *     listed city. H12 replaced the legacy `.toLowerCase().includes()`
 *     substring match — that let «Дно» pull in every Видное/
 *     Медногорск/Отрадное row, and similar latent bugs across 63
 *     cities whose names are a substring of another (audit ref v2 H12).
 *   - tag: pure `job.tags.includes(tag)`. The `Ежеднев`/`Еженед` flow
 *     does NOT pass through `tag` — it passes through `search` against
 *     `job.details.payment_freq` (see below).
 *   - search: case-insensitive substring across title / company /
 *     location / salary / `details.payment_freq`. The payment_freq
 *     lookup is what makes the category pages with `query: 'Ежеднев'`
 *     or `query: 'Еженед'` populate from `details.payment_freq` —
 *     the «Ежедневно» / «Еженедельно» words live nowhere else on
 *     `GeneratedJob`.
 *
 * Absent criteria (empty/null/undefined) PASS the corresponding
 * check. All three checks are AND-combined.
 */

import type { GeneratedJob } from '../data/vacancyTypes';

export interface JobFilterCriteria {
	/**
	 * City name to match against `job.location`. Comparison is normalized
	 * (lowercase + ё→е + whitespace-trim) and **exact** — the job's
	 * `location` is split on commas first so a single «Алнаши, Вавож»
	 * row registers under both cities. «Вся Россия» rows pass for any
	 * city query.
	 */
	city?: string | null;
	/**
	 * Tag/category to match against `job.tags`. Use the literal sentinel
	 * `'all'` (or null/undefined/empty) to disable tag filtering.
	 */
	tag?: string | null;
	/**
	 * Free-text substring search (case-insensitive) across title,
	 * company, location, salary, and `details.payment_freq`.
	 */
	search?: string | null;
}

const ALL_TAGS_SENTINEL = 'all';
const NATIONWIDE_LOCATION = 'Вся Россия';

const normalize = (value: string | null | undefined): string =>
	(value ?? '').toLowerCase();

/**
 * Normalize a city name to its lookup key. Mirrors the normalization
 * `src/utils/cities.ts` uses internally (lowercase + ё→е + whitespace
 * collapse / non-breaking-space repair / em-dash → hyphen) so the keys
 * the `getCitiesFromJobs()` consumer emits match the keys we index by
 * here. EXPORTED so callers in `[slug].astro` and `listingSlugs.ts`
 * can normalize a `city.name` to the same key the Map was built with.
 */
export const normalizeCityKey = (value: string | null | undefined): string =>
	(value ?? '')
		.replace(/[   ]/g, ' ')
		.replace(/[‐-―]/g, '-')
		.replace(/\s+/g, ' ')
		.replace(/\s*-\s*/g, '-')
		.trim()
		.toLowerCase()
		.replace(/ё/g, 'е');

/**
 * Split a raw `job.location` string into the normalized city keys it
 * covers. The dataset contains a small number of multi-city rows
 * («Алнаши, Вавож»); comma-splitting here mirrors `getCitiesFromJobs`
 * (`src/utils/cities.ts`) so every listing the city emitter produces
 * has a matching set of jobs in `buildJobsByCityMap`.
 *
 * The result is memoized per raw location string. The dataset has
 * ~970 unique location values; without the cache the JobGrid
 * frontmatter (which still goes through `filterJobsByCriteria` with
 * a `city` criterion) would normalize each job's location once per
 * city page — slow enough to eat the gains H12 buys elsewhere.
 */
const splitLocationKeysCache = new Map<string, readonly string[]>();
const splitLocationKeys = (location: string): readonly string[] => {
	const cached = splitLocationKeysCache.get(location);
	if (cached) return cached;
	const keys = location
		.split(',')
		.map((part) => normalizeCityKey(part))
		.filter((key) => key.length > 0);
	splitLocationKeysCache.set(location, keys);
	return keys;
};

const NATIONWIDE_KEY = normalizeCityKey(NATIONWIDE_LOCATION);
const isNationwide = (location: string): boolean => {
	const keys = splitLocationKeys(location);
	return keys.length === 1 && keys[0] === NATIONWIDE_KEY;
};

/**
 * Predicate for a single job. Useful when the caller wants to filter
 * outside `Array.prototype.filter` (e.g. inside a reducer, or when
 * pairing with a count).
 */
export function jobMatches(
	job: GeneratedJob,
	criteria: JobFilterCriteria,
): boolean {
	const cityKey = normalizeCityKey(criteria.city);
	const tag = criteria.tag ?? '';
	const searchTerm = normalize(criteria.search);

	const matchesCity =
		!cityKey ||
		isNationwide(job.location) ||
		splitLocationKeys(job.location).includes(cityKey);

	const matchesTag =
		!tag || tag === ALL_TAGS_SENTINEL || job.tags.includes(tag);

	const matchesSearch =
		!searchTerm ||
		job.title.toLowerCase().includes(searchTerm) ||
		job.company.toLowerCase().includes(searchTerm) ||
		job.location.toLowerCase().includes(searchTerm) ||
		job.salary.toLowerCase().includes(searchTerm) ||
		// `payment_freq` is where «Ежедневно» / «Еженедельно» live; a
		// category page with `query: 'Ежеднев'` / 'Еженед' relies on
		// this branch to populate. See JSDoc above for the full story.
		job.details.payment_freq.toLowerCase().includes(searchTerm);

	return matchesCity && matchesTag && matchesSearch;
}

/**
 * Filter a list of jobs by the same predicate the SSR pages and the
 * sitemap emitter use. Caller-friendly — accepts a readonly array and
 * returns a fresh array (never mutates the input).
 */
export function filterJobsByCriteria(
	jobs: readonly GeneratedJob[],
	criteria: JobFilterCriteria,
): GeneratedJob[] {
	return jobs.filter((job) => jobMatches(job, criteria));
}

/**
 * Pre-compute a `Map<normalizedCityKey, GeneratedJob[]>` so SSG-time
 * consumers (`src/pages/[slug].astro`, `src/utils/listingSlugs.ts`)
 * can answer "which jobs match this city?" in O(1) instead of
 * re-scanning the full ~4.8k-row job list once per city. Without the
 * Map the two surfaces combined ran ~9.4M filter ops per build
 * (audit ref v2 H12).
 *
 * Behavior matches the city criterion of `jobMatches` exactly:
 *   - The job's `location` is split on commas (rare «Алнаши, Вавож»
 *     style multi-city rows) and each part is normalized via
 *     `normalizeCityKey`. The job lands in the bucket of EVERY city
 *     it lists.
 *   - «Вся Россия» rows are kept in a separate "nationwide" bucket
 *     (keyed by the normalized "Вся Россия" key) and merged at lookup
 *     time, so they show on every city listing without inflating the
 *     Map by 970+ entries.
 *
 * Use `getCityJobsFromMap` to look up — it handles the nationwide
 * merge for you. Doing the merge by hand is also fine; the Map is
 * just a `Map<string, GeneratedJob[]>`.
 */
export function buildJobsByCityMap(
	jobs: readonly GeneratedJob[],
): Map<string, GeneratedJob[]> {
	const map = new Map<string, GeneratedJob[]>();
	const nationwide: GeneratedJob[] = [];
	for (const job of jobs) {
		if (isNationwide(job.location)) {
			nationwide.push(job);
			continue;
		}
		for (const key of splitLocationKeys(job.location)) {
			const bucket = map.get(key);
			if (bucket) {
				bucket.push(job);
			} else {
				map.set(key, [job]);
			}
		}
	}
	// Stash the nationwide bucket under the canonical NATIONWIDE key.
	// `getCityJobsFromMap` merges it into every city lookup. We don't
	// expose it as a separate parameter so callers can pass the Map
	// around without an awkward "and also this array" pairing.
	if (nationwide.length > 0) {
		map.set(normalizeCityKey(NATIONWIDE_LOCATION), nationwide);
	}
	return map;
}

/**
 * Look up the list of jobs for a city, merging in any «Вся Россия»
 * rows. Returns a FRESH array; never mutates the Map buckets.
 *
 * `cityName` accepts the same un-normalized name that comes off
 * `getCitiesFromJobs(...).name` — normalization happens internally.
 */
export function getCityJobsFromMap(
	map: Map<string, GeneratedJob[]>,
	cityName: string,
): GeneratedJob[] {
	const cityJobs = map.get(normalizeCityKey(cityName)) ?? [];
	const nationwide = map.get(normalizeCityKey(NATIONWIDE_LOCATION)) ?? [];
	if (nationwide.length === 0) return [...cityJobs];
	return [...cityJobs, ...nationwide];
}

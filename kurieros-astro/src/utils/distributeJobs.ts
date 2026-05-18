// Home-grid company-balancing selection algorithm.
//
// Extracted verbatim from JobGrid.astro frontmatter (Wave 21d, audit v5
// M8 / TODO H14, audit ref PH2-3). `JobGrid.astro` imports both exports;
// the algorithm logic is unchanged.
//
// When `limit` is used (home page), distribute selection across companies
// AND priority cities so each brand gets fair representation in top-24.
// Old city-only round-robin let Yandex Eda (priority 2000+, alphabetic
// first city) take the leading slot of every priority-city bucket — Ozon
// (last in vacancySources, priority ≤1700) was pushed past the cut-off,
// and many of the 24 grid slots ended up with two consecutive Y.Eda
// cards. New algorithm rotates the COMPANY pointer first and dedupes by
// city per pass — no two jobs of the same company appear in a row, and
// every represented company surfaces before any second pick.

/**
 * The minimal job shape `distributeAcrossCities` reads. The home grid
 * passes `GeneratedJob[]` (a structural superset); the algorithm only
 * ever touches `company` and `location`, so it is generic over any
 * record carrying those two string fields and returns the SAME concrete
 * type the caller passed in.
 */
export interface DistributableJob {
	company: string;
	location: string;
}

const CITY_PRIORITY = [
	'Москва', 'Санкт-Петербург', 'Екатеринбург', 'Новосибирск', 'Казань',
	'Нижний Новгород', 'Краснодар', 'Самара', 'Уфа', 'Челябинск',
	'Ростов-на-Дону', 'Воронеж',
];

/**
 * Rank a `job.location` against `CITY_PRIORITY` — lower is higher
 * priority. Returns `CITY_PRIORITY.length` (i.e. last) when the location
 * matches no priority city.
 */
export const cityRank = (loc: string): number => {
	const lower = loc.toLowerCase();
	for (let i = 0; i < CITY_PRIORITY.length; i++) {
		if (lower.includes(CITY_PRIORITY[i].toLowerCase())) return i;
	}
	return CITY_PRIORITY.length;
};

/**
 * Pick up to `max` jobs, distributed across companies and priority
 * cities. Pure — never mutates the input `jobs` array.
 */
export const distributeAcrossCities = <T extends DistributableJob>(
	jobs: T[],
	max: number,
): T[] => {
	// Bucket jobs by company; sort each bucket so priority-cities come
	// first within the company (so Yandex Eda's first contribution is
	// «Москва», not «Альметьевск»).
	const byCompany = new Map<string, T[]>();
	for (const job of jobs) {
		if (!byCompany.has(job.company)) byCompany.set(job.company, []);
		byCompany.get(job.company)!.push(job);
	}
	for (const list of byCompany.values()) {
		list.sort((a, b) => cityRank(a.location) - cityRank(b.location));
	}

	const out: T[] = [];
	const usedCities = new Set<string>();

	// Pass 1: round-robin one job per company, picking each company's
	// HIGHEST-priority-city job that we haven't already shown. Strict
	// no-consecutive-same-company guarantee follows from one-per-company
	// per loop iteration. Map iteration order is insertion order, which
	// matches `vacancySources` order and gives a stable mix.
	let added = true;
	while (out.length < max && added) {
		added = false;
		for (const list of byCompany.values()) {
			if (out.length >= max) break;
			const idx = list.findIndex((j) => !usedCities.has(j.location));
			if (idx >= 0) {
				const job = list.splice(idx, 1)[0];
				out.push(job);
				usedCities.add(job.location);
				added = true;
			}
		}
	}

	// Pass 2 (rare fallback): if we still have fewer than `max` rows
	// because some company ran out of unique-city jobs, fill the
	// remainder with another non-deduped company round-robin so the
	// grid never short-renders. The no-consecutive-same-company rule
	// holds because we still rotate company per iteration.
	let fallbackAdded = true;
	while (out.length < max && fallbackAdded) {
		fallbackAdded = false;
		for (const list of byCompany.values()) {
			if (out.length >= max) break;
			const job = list.shift();
			if (job) {
				out.push(job);
				fallbackAdded = true;
			}
		}
	}

	return out;
};

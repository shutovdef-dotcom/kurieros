import jobsData from '../data/jobs';
import { CATEGORIES } from '../data/constants';
import type { GeneratedJob } from '../data/vacancyTypes';
import { citiesFromJobs } from './citiesIndex';
import { filterJobsByCriteria, getCityJobsFromMap } from './jobFilters';
import { jobsByCity } from './jobsByCityIndex';
import { HUB_CONFIGS } from './transportHubs';

export const LISTING_BATCH_SIZE = 24;

const CITY_LISTING_PREFIX = 'rabota-kurerom-';

const LISTING_BATCH_ALIASES = new Map<string, string>([
	['rabota-kurerom-podrabotka', 'podrabotka-kurerom'],
	['rabota-kurerom-na-vyhodnye', 'podrabotka-kurerom'],
	['rabota-kurerom-zhenshchine', 'podrabotka-kurerom'],
	['rabota-kurerom-vecherom', 'podrabotka-kurerom'],
	['rabota-kurerom-nochyu', 'podrabotka-kurerom'],
	['rabota-kurerom-svobodny-grafik', 'podrabotka-kurerom'],
	['rabota-kurerom-na-avto', 'rabota-avtokurerom'],
	['rabota-kurerom-na-velosipede', 'rabota-velokurerom'],
	['rabota-kurerom-na-samokate', 'rabota-velokurerom'],
	['rabota-kurerom-peshkom', 'rabota-peshim-kurerom'],
	['rabota-kurerom-16-let', 'rabota-kurerom-dlya-studentov'],
]);

const categoryByListingSlug = new Map<string, (typeof CATEGORIES)[number]>(
	CATEGORIES.map((category) => [`${CITY_LISTING_PREFIX}${category.slug}`, category] as const),
);
const cityByListingSlug = new Map<string, (typeof citiesFromJobs)[number]>(
	citiesFromJobs.map((city) => [`${CITY_LISTING_PREFIX}${city.slug}`, city] as const),
);
const hubByListingSlug = new Map<string, (typeof HUB_CONFIGS)[keyof typeof HUB_CONFIGS]>(
	Object.values(HUB_CONFIGS).map((cfg) => [cfg.slug, cfg] as const),
);
export function getListingBatchKey(listingSlug: string): string {
	return LISTING_BATCH_ALIASES.get(listingSlug) || listingSlug;
}

export function getListingBatchUrl(listingSlug: string, page: number): string {
	return `/api/grid-batch/${getListingBatchKey(listingSlug)}/${page}/`;
}

export function getJobsForListingSlug(listingSlug: string): GeneratedJob[] {
	const city = cityByListingSlug.get(listingSlug);
	if (city) {
		return getCityJobsFromMap(jobsByCity, city.name);
	}

	const category = categoryByListingSlug.get(listingSlug);
	if (category) {
		return filterJobsByCriteria(jobsData, {
			tag: category.tag || 'all',
			search: category.query || '',
		});
	}

	const hub = hubByListingSlug.get(listingSlug);
	if (hub) {
		return filterJobsByCriteria(jobsData, hub.filter);
	}

	return [];
}

export function getListingBatchStaticPaths(batchSize = LISTING_BATCH_SIZE) {
	const paths: Array<{ params: { listingSlug: string; page: string } }> = [];
	const listingSlugs = new Set([
		...citiesFromJobs.map((city) => `${CITY_LISTING_PREFIX}${city.slug}`),
		...CATEGORIES.map((category) => `${CITY_LISTING_PREFIX}${category.slug}`),
		...Object.values(HUB_CONFIGS).map((cfg) => cfg.slug),
	].map(getListingBatchKey));

	for (const listingSlug of listingSlugs) {
		const matchedJobs = getJobsForListingSlug(listingSlug);
		const pageCount = Math.ceil(matchedJobs.length / batchSize);
		for (let page = 2; page <= pageCount; page += 1) {
			paths.push({
				params: {
					listingSlug,
					page: String(page),
				},
			});
		}
	}

	return paths;
}

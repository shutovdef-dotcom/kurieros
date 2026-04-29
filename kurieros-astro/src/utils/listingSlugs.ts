/**
 * Compute the set of `rabota-kurerom-{slug}/` listing URLs that match
 * ZERO active vacancies. Such pages cause Google/Yandex to flag the
 * site for thin content; we noindex them at the page level (see
 * src/pages/[slug].astro) and exclude them from the sitemap (see
 * astro.config.mjs).
 *
 * The selection logic mirrors the filter inside [slug].astro:
 *   - `city` listings: vacancies whose `location` includes the city
 *     name OR equals «Вся Россия»
 *   - `category` listings: vacancies that match the category's optional
 *     tag and/or its full-text query
 *
 * Returned Set entries are paths (no trailing slash, no host) like
 *   `/rabota-kurerom-ezhednevnaya-oplata`.
 */

import jobsData from '../data/jobs';
import { CATEGORIES } from '../data/constants';
import { getCitiesFromJobs } from './cities';

// Slugs with bespoke content overrides inside src/pages/[slug].astro
// that always render a non-empty fallback list (e.g. ezhednevnaya-oplata
// substitutes weekly-payout vacancies because daily-payout doesn't
// exist in our catalogue). Excluded from the empty-paths set so they
// stay in the sitemap with `index, follow`.
const CONTENT_OVERRIDE_CATEGORY_SLUGS = new Set<string>([
	'ezhednevnaya-oplata',
]);

export function getEmptyListingPaths(): Set<string> {
	const empty = new Set<string>();

	for (const city of getCitiesFromJobs(jobsData)) {
		const matched = jobsData.filter(
			(job) =>
				job.location.toLowerCase().includes(city.name.toLowerCase()) ||
				job.location === 'Вся Россия',
		);
		if (matched.length === 0) {
			empty.add(`/rabota-kurerom-${city.slug}`);
		}
	}

	for (const category of CATEGORIES) {
		if (CONTENT_OVERRIDE_CATEGORY_SLUGS.has(category.slug)) {
			continue;
		}
		const searchTerm = (category.query || '').toLowerCase();
		const tagFilter = category.tag || 'all';
		const matched = jobsData.filter((job) => {
			const matchesTag = tagFilter === 'all' || job.tags.includes(tagFilter);
			const matchesSearch =
				!searchTerm ||
				job.title.toLowerCase().includes(searchTerm) ||
				job.company.toLowerCase().includes(searchTerm) ||
				job.location.toLowerCase().includes(searchTerm) ||
				job.salary.toLowerCase().includes(searchTerm) ||
				// Mirror [slug].astro filter: payment_freq match so a
				// category with `query: 'Еженед'` populates from
				// details.payment_freq (the «Еженедельно» word lives
				// nowhere else in GeneratedJob).
				job.details.payment_freq.toLowerCase().includes(searchTerm);
			return matchesTag && matchesSearch;
		});
		if (matched.length === 0) {
			empty.add(`/rabota-kurerom-${category.slug}`);
		}
	}

	return empty;
}

/**
 * Sitemap-friendly variant — returns full URLs (with site origin and
 * trailing slash) so the @astrojs/sitemap `filter` callback can do a
 * direct `.has()` check against the URL it's about to emit.
 */
export function getEmptyListingUrls(siteUrl: string): Set<string> {
	const base = siteUrl.replace(/\/$/, '');
	const out = new Set<string>();
	for (const path of getEmptyListingPaths()) {
		out.add(`${base}${path}/`);
	}
	return out;
}

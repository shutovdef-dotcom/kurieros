/**
 * Compute the set of `rabota-kurerom-{slug}/` listing URLs that match
 * 0 or 1 active vacancies. Such pages cause Google/Yandex to flag the
 * site for thin content; we noindex them at the page level (see
 * src/pages/[slug].astro) and exclude them from the sitemap (see
 * astro.config.mjs).
 *
 * The selection logic mirrors the filter inside [slug].astro:
 *   - `city` listings: vacancies whose `location` (comma-split into
 *     individual cities) exact-matches the listing's city on a
 *     normalized key (lowercase + ё→е + whitespace-collapsed), OR
 *     equals «Вся Россия». NOT a substring match — H12 killed that
 *     because «Дно» over-matched «Видное» (audit ref v2 H12).
 *   - `category` listings: vacancies that match the category's optional
 *     tag and/or its full-text query
 *
 * Returned Set entries are paths (no trailing slash, no host) like
 *   `/rabota-kurerom-ezhednevnaya-oplata`.
 */

import jobsData from '../data/jobs';
import { CATEGORIES } from '../data/constants';
import { citiesFromJobs } from './citiesIndex';
import { filterJobsByCriteria, getCityJobsFromMap } from './jobFilters';
// Shared per-city job buckets, built ONCE at module load (audit ref
// v3 H3) — see jobsByCityIndex.ts. Reused here instead of rebuilding
// the Map locally (audit ref v4 L11).
import { jobsByCity } from './jobsByCityIndex';
import { HUB_CONFIGS, isHubEmpty } from './transportHubs';

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

	// City-listing emptiness uses the same city predicate as the SSR
	// page in `[slug].astro`. Sitemap and SSR must agree — see
	// jobFilters.ts JSDoc for the full rationale. The Map precompute
	// turns this from O(cities × jobs) (~4.6M ops) into O(jobs +
	// cities) (audit ref v2 H12). Both `jobsByCity` and `citiesFromJobs`
	// are shared module-cached bindings (audit ref v3 H3 / v4 L11).
	for (const city of citiesFromJobs) {
		const matched = getCityJobsFromMap(jobsByCity, city.name);
		if (matched.length <= 1) {
			empty.add(`/rabota-kurerom-${city.slug}`);
		}
	}

	// Category-listing emptiness uses the same tag+search predicate as
	// the SSR page. The `Ежеднев` / `Еженед` payment_freq lookup flows
	// naturally through `search` (see jobFilters.ts).
	for (const category of CATEGORIES) {
		if (CONTENT_OVERRIDE_CATEGORY_SLUGS.has(category.slug)) {
			continue;
		}
		const matched = filterJobsByCriteria(jobsData, {
			tag: category.tag || 'all',
			search: category.query || '',
		});
		if (matched.length <= 1) {
			empty.add(`/rabota-kurerom-${category.slug}`);
		}
	}

	// Decision A: hub pages that have zero matching jobs must also be excluded
	// from the sitemap and marked noindex (same thin-content rationale as
	// category/city listings). Bare paths — no trailing slash — matching the
	// convention of city/category entries above (getEmptyListingUrls appends
	// the trailing slash before comparing against sitemap URLs).
	for (const cfg of Object.values(HUB_CONFIGS)) {
		if (isHubEmpty(jobsData, cfg)) {
			empty.add(`/${cfg.slug}`);
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

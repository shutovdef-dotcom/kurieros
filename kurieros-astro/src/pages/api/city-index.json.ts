import type { APIRoute } from 'astro';
import { sortCityNamesByPopulation } from '../../utils/cities';
// City catalogue + names are module-cached in `citiesIndex.ts` (H3
// rationale) instead of re-derived on endpoint render (audit ref v4
// MEDIUM-1).
import { citiesFromJobs, cityNamesFromJobs } from '../../utils/citiesIndex';

// Lazy-load endpoint for the homepage city-selector / geo-banner script.
//
// Replaces an inline `define:vars={{ availableCities, cityRouteMap }}` literal
// in `src/pages/index.astro` that shipped ~49 KB of city data (38 KB
// `cityRouteMap`, 11 KB `availableCities`) into every render of `dist/index.html`.
// Both fields are derived purely from `jobsData` + `getCitiesFromJobs` so we
// can mint them once at SSG time and serve them as a static JSON file under
// `dist/api/city-index.json`.
//
// Consumer: the homepage inline script kicks off `fetch('/api/city-index.json',
// { cache: 'force-cache' })` immediately on parse and awaits the result inside
// DOMContentLoaded before running the geo-banner / saved-city / auto-apply
// flow (each of these paths needs `availableCities` for membership checks
// and `cityRouteMap` for the city-page-link href).
//
// Audit ref: v2 H13 (HIGH, NEW from Phase 2 perf).

export const prerender = true;

export const GET: APIRoute = () => {
	const cities = citiesFromJobs;
	const availableCities = sortCityNamesByPopulation(cityNamesFromJobs);
	const cityRouteMap = Object.fromEntries(
		cities.map((city) => [city.name, `/rabota-kurerom-${city.slug}/`]),
	);

	return new Response(JSON.stringify({ cityRouteMap, availableCities }), {
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			// Long-lived caching: the file is regenerated on every deploy
			// (jobsData changes ⇒ payload changes). `force-cache` on the
			// fetcher side makes it near-instant on repeat visits; same-origin
			// and ~50 KB uncompressed (~6 KB gzipped) means first-load cost
			// is negligible compared with the inline-script blast radius it
			// replaces.
			'Cache-Control': 'public, max-age=600, s-maxage=3600',
			'X-Robots-Tag': 'noindex',
		},
	});
};

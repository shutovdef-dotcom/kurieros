import type { APIRoute } from 'astro';
import { sortCityNamesByPopulation } from '../../../utils/cities';
// City catalogue + names are module-cached in `citiesIndex.ts` (H3
// rationale) instead of re-derived on endpoint render.
import { citiesFromJobs, cityNamesFromJobs } from '../../../utils/citiesIndex';

// Versioned lazy-load endpoint for the homepage city-selector / geo-banner
// script. Keeps ~49 KB of city data out of `dist/index.html` and gives future
// API-shape changes an explicit `/api/v1/` boundary.

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
      'Cache-Control': 'public, max-age=600, s-maxage=3600',
      'X-Robots-Tag': 'noindex',
      'X-Kurerok-API-Version': '1',
    },
  });
};

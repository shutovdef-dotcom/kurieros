import type { APIRoute } from 'astro';
import jobsData from '../../data/jobs';
import { mapCompareJob } from '../../utils/compareJob';

// Slim JSON endpoint for /compare/ page client-side lookups.
// Replaces inline `define:vars={{ allCompareJobs }}` (~3.9 MB HTML)
// with a separately-cached fetch (~147 KB gzipped (3.7 MB uncompressed),
// fetched only when user interacts with city/transport filter on the
// compare page).
//
// The job → `CompareJob` projection (`mapCompareJob`) lives in
// `src/utils/compareJob.ts` — the SAME module `compare.astro` uses for
// its 4 preselected jobs, so the full catalogue served here and the
// inline preselected jobs always emit an identical shape (audit v3 M19).

export const GET: APIRoute = () => {
	const slim = jobsData.map(mapCompareJob);

	return new Response(JSON.stringify(slim), {
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Cache-Control': 'public, max-age=600, s-maxage=3600',
			'X-Robots-Tag': 'noindex',
		},
	});
};

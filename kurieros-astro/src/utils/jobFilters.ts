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
 * Semantics (preserve EXACTLY — the audit notes some of these are
 * latent bugs but they are addressed in their own fixes):
 *
 *   - city: `job.location.toLowerCase().includes(city.toLowerCase())`
 *     plus a free pass for the special-case «Вся Россия» row. The
 *     `.includes()` substring behavior is intentional here (matches
 *     "Москва" inside "Москва (метро)" etc.); the audit (H12) flags
 *     this as latent — DO NOT FIX in this refactor.
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
	/** City name to match against `job.location` (case-insensitive substring). */
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
 * Predicate for a single job. Useful when the caller wants to filter
 * outside `Array.prototype.filter` (e.g. inside a reducer, or when
 * pairing with a count).
 */
export function jobMatches(
	job: GeneratedJob,
	criteria: JobFilterCriteria,
): boolean {
	const cityTerm = normalize(criteria.city);
	const tag = criteria.tag ?? '';
	const searchTerm = normalize(criteria.search);

	const matchesCity =
		!cityTerm ||
		job.location.toLowerCase().includes(cityTerm) ||
		job.location === NATIONWIDE_LOCATION;

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

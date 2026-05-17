/**
 * City catalogue — derived ONCE at module load.
 *
 * `getCitiesFromJobs` re-derives the full ~958-city catalogue by
 * scanning the entire ~4.8k-job dataset (counts, dedup, dataset
 * join, locale sort). Astro compiles every non-`import` frontmatter
 * statement into the per-page render function, so a `const cities =
 * getCitiesFromJobs(jobsData)` written inside a `.astro` frontmatter
 * re-runs once per generated city/category listing page. Only
 * `import` statements are genuinely module-scoped.
 *
 * This module performs the projection at module scope; the result is
 * module-cached and shared across every page that imports it. It
 * mirrors `./jobsByCityIndex` (audit ref v3 H3) for the city-catalogue
 * projection instead of the per-city job buckets.
 *
 * See `getCitiesFromJobs` / `getCityNames` in `./cities` for the
 * underlying projection semantics.
 *
 * Audit ref v4: HIGH-1 / MEDIUM-1.
 */

import jobsData from '../data/jobs';
import { getCitiesFromJobs } from './cities';

/** Full city catalogue, derived once at module load and shared across
 *  every page that imports this binding. */
export const citiesFromJobs = getCitiesFromJobs(jobsData);

/** City names, projected from the same module-cached catalogue. */
export const cityNamesFromJobs = citiesFromJobs.map((c) => c.name);

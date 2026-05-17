/**
 * Per-city job buckets — built ONCE at module load.
 *
 * `buildJobsByCityMap` is expensive (~2 ms over the full ~4.8k-job
 * dataset). Astro compiles every non-`import` frontmatter statement
 * into the per-page render function, so `const jobsByCity =
 * buildJobsByCityMap(jobsData)` written inside a `.astro` frontmatter
 * re-runs once per generated city/category listing page across the
 * build (audit ref v3 NEW-2). Only `import` statements are genuinely
 * module-scoped.
 *
 * This module performs the build at module scope; the result is
 * module-cached and shared across every page that imports it
 * (`src/pages/[slug].astro`, `src/pages/api/grid/[citySlug].astro`).
 *
 * See `buildJobsByCityMap` / `getCityJobsFromMap` in `./jobFilters`
 * for the bucket semantics and the «Вся Россия» merge.
 */

import jobsData from '../data/jobs';
import { buildJobsByCityMap } from './jobFilters';

/** Per-city job buckets, built once at module load and shared across
 *  every page that imports this binding. */
export const jobsByCity = buildJobsByCityMap(jobsData);

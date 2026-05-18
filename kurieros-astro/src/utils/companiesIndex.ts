/**
 * Company catalogue — derived ONCE at module load.
 *
 * `getCompaniesFromJobs` is expensive: it scans the entire ~4.8k-job
 * dataset AND all 19,144 reviews (group-by company, dedup, salary
 * aggregation, review attribution). Astro compiles every non-`import`
 * frontmatter statement into the per-page render function, so a
 * `const companies = getCompaniesFromJobs(jobsData, reviewsData)`
 * written inside a `.astro` frontmatter re-runs once per generated
 * company page. `companies/[slug].astro` called it twice (once in
 * `getStaticPaths`, once again in the per-page body for
 * `relatedCompanies`) and `companies/index.astro` called it once
 * more. Only `import` statements are genuinely module-scoped.
 *
 * This module performs the projection at module scope; the result is
 * module-cached and shared across every page that imports it. It
 * mirrors `./citiesIndex` for the company-catalogue projection.
 *
 * See `getCompaniesFromJobs` in `./companies` for the underlying
 * projection semantics.
 *
 * Audit ref v5: M4.
 */

import jobsData from '../data/jobs';
import { getCompaniesFromJobs } from './companies';
import { reviewsData } from './reviewsIndex';

/** Full company catalogue, derived once at module load and shared
 *  across every page that imports this binding. */
export const companiesFromJobs = getCompaniesFromJobs(jobsData, reviewsData);

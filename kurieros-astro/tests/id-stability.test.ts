/**
 * Snapshot-locks the generated `job.id` for every (source × city × transport)
 * triple so anything that rewrites IDs (city-code reorder, transport-id-part
 * reshuffle, source-id collision) trips the test instead of silently
 * breaking external bookmarks/analytics that reference the old IDs.
 *
 * If you legitimately need to change IDs:
 *   1. Re-run the one-shot dump that seeded `tests/fixtures/job-ids-snapshot.json`.
 *   2. Note the rationale in the PR description so reviewers know.
 */

import { describe, it, expect } from 'vitest';
import jobs from '../src/data/jobs';
import expectedIds from './fixtures/job-ids-snapshot.json';
import { retiredVacancyRoutes } from '../src/data/retiredVacancyRoutes';

describe('Job ID stability', () => {
  it('matches snapshot — IDs must not change unexpectedly', () => {
    const currentIds = jobs
      .map((job) => ({ id: job.id, slug: job.slug }))
      .sort((a, b) => a.id - b.id);
    const retiredSlugs = new Set(retiredVacancyRoutes.map((route) => route.slug));
    const activeSnapshotIds = expectedIds.filter((job) => !retiredSlugs.has(job.slug));

    expect(currentIds).toEqual(activeSnapshotIds);
  });

  it('keeps retired route IDs and slugs pinned in the historical snapshot', () => {
    const historicalSnapshotSlugs = new Set(expectedIds.map((job) => job.slug));
    const expectedRetired = expectedIds
      .filter((job) => retiredVacancyRoutes.some((route) => route.slug === job.slug))
      .sort((a, b) => a.id - b.id);
    const configuredRetired = retiredVacancyRoutes
      .filter((route) => historicalSnapshotSlugs.has(route.slug))
      .map(({ id, slug }) => ({ id, slug }))
      .sort((a, b) => a.id - b.id);

    expect(configuredRetired).toEqual(expectedRetired);
  });

  it('every job ID is unique (no collisions)', () => {
    const ids = jobs.map((job) => job.id);
    const idSet = new Set(ids);
    expect(idSet.size).toBe(ids.length);
  });

  it('every job slug is unique (no collisions)', () => {
    const slugs = jobs.map((job) => job.slug);
    const slugSet = new Set(slugs);
    expect(slugSet.size).toBe(slugs.length);
  });
});

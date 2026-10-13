import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { detailJobs } from '../src/data/jobs';
import vacancyIndexabilityManifest from '../src/generated/vacancy-indexability.json';
import { getVacancyIndexability } from '../src/utils/vacancyIndexability';
import { getVacancyCanonicalPath } from '../src/utils/vacancyUrl';
import { retiredVacancyRoutes } from '../src/data/retiredVacancyRoutes';

const distDir = resolve(process.cwd(), 'dist');
const distExists = existsSync(distDir);

const readPath = (path: string): string =>
  readFileSync(join(distDir, path.replace(/^\//, ''), 'index.html'), 'utf8');

const readSchemas = (html: string): Record<string, unknown>[] =>
  [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .flatMap((match) => {
      const parsed = JSON.parse(match[1]!) as Record<string, unknown>;
      const graph = parsed['@graph'];
      return Array.isArray(graph) ? graph as Record<string, unknown>[] : [parsed];
    });

describe.skipIf(!distExists)('JobPosting rollout build policy', () => {
  it('emits JobPosting for every indexable active vacancy page', () => {
    const eligibleJobs = detailJobs.filter((job) => getVacancyIndexability(job).indexable);
    const eligiblePaths = eligibleJobs.map((job) => getVacancyCanonicalPath(job)).sort();

    expect(eligiblePaths).toHaveLength(new Set(eligiblePaths).size);
    expect(readSchemas(readPath(`/v/${eligibleJobs[0]!.slug}/`)).some((item) => item['@type'] === 'JobPosting')).toBe(true);
  });

  it('keeps the Google Indexing API manifest aligned with emitted JobPosting pages', () => {
    const currentIndexablePaths = detailJobs
      .filter((job) => getVacancyIndexability(job).indexable)
      .map((job) => getVacancyCanonicalPath(job))
      .sort();
    const gscEligiblePaths = [...vacancyIndexabilityManifest.googleIndexingApiEligiblePaths].sort();
    const jobPostingPaths = [...vacancyIndexabilityManifest.jobPostingPaths].sort();
    const retiredX5Paths = retiredVacancyRoutes
      .filter((route) => route.reason === 'x5_partner_link_disabled')
      .map((route) => `/v/${route.slug}/`);

    expect(gscEligiblePaths).toEqual(currentIndexablePaths);
    expect(jobPostingPaths).toEqual(currentIndexablePaths);
    for (const path of retiredX5Paths) {
      expect(vacancyIndexabilityManifest.noindexPaths, path).toContain(path);
      expect(gscEligiblePaths, path).not.toContain(path);
      expect(jobPostingPaths, path).not.toContain(path);
    }
  });
});

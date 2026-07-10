import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { detailJobs } from '../src/data/jobs';
import { LEGACY_GSC_VALID_JOB_PATHS } from '../src/data/jobPostingEligibilityPolicy';
import { getVacancyIndexability } from '../src/utils/vacancyIndexability';

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
  it('does not preserve JobPosting solely because 29 pages were historically valid in GSC', () => {
    for (const path of LEGACY_GSC_VALID_JOB_PATHS) {
      expect(readPath(path), path).not.toContain('"@type":"JobPosting"');
    }
  });

  it('defaults to no JobPosting on an indexable page outside the evidence cohort', () => {
    const legacyPaths = new Set<string>(LEGACY_GSC_VALID_JOB_PATHS);
    const blockedJob = detailJobs.find(
      (job) =>
        getVacancyIndexability(job).indexable &&
        !legacyPaths.has(`/v/${job.slug}/`),
    );
    expect(blockedJob).toBeDefined();

    expect(readPath(`/v/${blockedJob!.slug}/`)).not.toContain('"@type":"JobPosting"');
  });

  it('contains no JobPosting items until a current source-qualified cohort exists', () => {
    const emitted = LEGACY_GSC_VALID_JOB_PATHS.flatMap((path) =>
      readSchemas(readPath(path)).filter((item) => item['@type'] === 'JobPosting'),
    );

    expect(emitted).toEqual([]);
  });
});

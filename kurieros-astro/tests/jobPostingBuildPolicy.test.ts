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
  it('keeps JobPosting on the 29 current GSC-valid pages', () => {
    for (const path of LEGACY_GSC_VALID_JOB_PATHS) {
      expect(readPath(path), path).toContain('"@type":"JobPosting"');
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

  it('emits a role-only title, canonical URL and no invented expiry', () => {
    const path = LEGACY_GSC_VALID_JOB_PATHS[0]!;
    const job = detailJobs.find((item) => `/v/${item.slug}/` === path);
    const schema = readSchemas(readPath(path)).find(
      (item) => item['@type'] === 'JobPosting',
    );

    expect(job).toBeDefined();
    expect(schema).toBeDefined();
    expect(schema?.title).toBe(job?.roleTitle);
    expect(schema?.url).toBe(`https://kurerok.ru${path}`);
    expect(schema?.directApply).toBe(false);
    expect(schema).not.toHaveProperty('validThrough');
  });
});

import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { detailJobs } from '../src/data/jobs';
import { resolveJobPostingRollout } from '../src/data/jobPostingEligibilityPolicy';
import { resolveVerifiedJobPostingEvidence } from '../src/data/jobPostingVerifiedCohort';
import vacancyIndexabilityManifest from '../src/generated/vacancy-indexability.json';
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

const hasCurrentJobPostingEvidence = (job: (typeof detailJobs)[number]) => {
  const verifiedEvidence = resolveVerifiedJobPostingEvidence({
    isActive: true,
    roleTitle: job.roleTitle,
    sourceSlug: job.sourceSlug,
    sourceUrl: job.sourceUrl,
    postedAt: job.postedAt,
    validThrough: job.validThrough,
    sourceCheckedAt: job.sourceCheckedAt,
    updatedAt: job.updatedAt,
    applyLink: job.applyLink,
    applyVerifiedAt: job.applyVerifiedAt,
    applyFlowVerified: job.applyFlowVerified,
    salaryConfidence: job.salaryConfidence,
  });
  return resolveJobPostingRollout({
    path: `/v/${job.slug}/`,
    evidence: verifiedEvidence.evidence,
    now: new Date('2026-07-24T07:00:00.000Z'),
  }).emit;
};

describe.skipIf(!distExists)('JobPosting rollout build policy', () => {
  it('emits JobPosting for every indexable active vacancy page', () => {
    const eligibleJobs = detailJobs.filter(
      (job) => getVacancyIndexability(job).indexable && hasCurrentJobPostingEvidence(job),
    );
    const blockedJob = detailJobs.find(
      (job) => getVacancyIndexability(job).indexable && !hasCurrentJobPostingEvidence(job),
    );

    expect(eligibleJobs).toHaveLength(6_685);
    expect(blockedJob).toBeUndefined();
    expect(readSchemas(readPath(`/v/${eligibleJobs[0]!.slug}/`)).some((item) => item['@type'] === 'JobPosting')).toBe(true);
  });

  it('keeps the Google Indexing API manifest aligned with emitted JobPosting pages', () => {
    expect(vacancyIndexabilityManifest.googleIndexingApiEligiblePaths).toHaveLength(6_685);
    expect(vacancyIndexabilityManifest.jobPostingPaths).toEqual(
      vacancyIndexabilityManifest.googleIndexingApiEligiblePaths,
    );
  });
});

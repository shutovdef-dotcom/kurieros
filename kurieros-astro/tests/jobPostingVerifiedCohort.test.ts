import { describe, expect, it } from 'vitest';
import { detailJobs } from '../src/data/jobs';
import { resolveJobPostingRollout } from '../src/data/jobPostingEligibilityPolicy';
import { resolveVerifiedJobPostingEvidence } from '../src/data/jobPostingVerifiedCohort';

const asRollout = (job: (typeof detailJobs)[number]) => {
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
  const rollout = resolveJobPostingRollout({
    path: `/v/${job.slug}/`,
    evidence: verifiedEvidence.evidence,
    now: new Date('2026-07-24T07:00:00.000Z'),
  });
  return { verifiedEvidence, rollout };
};

describe('all-active JobPosting vacancy policy', () => {
  it('opens every active vacancy for JobPosting and Google Indexing API rotation', () => {
    const eligibleJobs = detailJobs.filter((job) => asRollout(job).rollout.emit);

    expect(eligibleJobs).toHaveLength(6_685);
    expect(new Set(eligibleJobs.map((job) => job.slug)).size).toBe(6_685);
  });

  it('hydrates datePosted from updatedAt when the source row has no original postedAt', () => {
    const x5Job = detailJobs.find((job) => job.sourceSlug === 'x5-delivery-auto-courier');
    expect(x5Job).toBeDefined();

    const { verifiedEvidence, rollout } = asRollout(x5Job!);

    expect(verifiedEvidence.mode).toBe('all_active_vacancies');
    expect(verifiedEvidence.evidence.postedAt).toBe('2026-06-30T00:00:00.000Z');
    expect(rollout.emit).toBe(true);
  });

  it('keeps estimated salary and Ozon lead-form rows eligible without forcing optional rich fields', () => {
    const mtsJob = detailJobs.find((job) => job.sourceSlug === 'mts-bank-operator');
    const ozonJob = detailJobs.find((job) => job.sourceSlug === 'ozon-courier');
    expect(mtsJob).toBeDefined();
    expect(ozonJob).toBeDefined();

    expect(asRollout(mtsJob!).verifiedEvidence).toMatchObject({
      eligible: true,
      mode: 'all_active_vacancies',
      reasons: [],
    });
    expect(asRollout(ozonJob!).verifiedEvidence).toMatchObject({
      eligible: true,
      mode: 'all_active_vacancies',
      reasons: [],
    });
    expect(mtsJob!.salaryConfidence).toBe('estimated');
    expect(ozonJob!.applyLink).toBe('lead-form:ozon');
  });
});

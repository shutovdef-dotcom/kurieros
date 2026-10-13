import { describe, expect, it } from 'vitest';
import { detailJobs } from '../src/data/jobs';
import { resolveJobPostingRollout } from '../src/data/jobPostingEligibilityPolicy';
import { resolveVerifiedJobPostingEvidence } from '../src/data/jobPostingVerifiedCohort';
import { getVacancyIndexability } from '../src/utils/vacancyIndexability';
import { retiredVacancyRoutes } from '../src/data/retiredVacancyRoutes';

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
    const indexableSlugs = detailJobs
      .filter((job) => getVacancyIndexability(job).indexable)
      .map((job) => job.slug)
      .sort();

    expect(eligibleJobs.map((job) => job.slug).sort()).toEqual(indexableSlugs);
    expect(new Set(eligibleJobs.map((job) => job.slug)).size).toBe(eligibleJobs.length);
  });

  it('hydrates datePosted from updatedAt when the source row has no original postedAt', () => {
    const job = detailJobs.find((item) => !item.postedAt && item.updatedAt && item.sourceUrl && item.roleTitle);
    expect(job).toBeDefined();

    const { verifiedEvidence, rollout } = asRollout(job!);

    expect(verifiedEvidence.mode).toBe('all_active_vacancies');
    expect(verifiedEvidence.evidence.postedAt).toBe(new Date(job!.updatedAt!).toISOString());
    expect(rollout.emit).toBe(true);
  });

  it('blocks disabled X5 routes from JobPosting even though their IDs remain retired', () => {
    const x5Routes = retiredVacancyRoutes.filter((route) => route.reason === 'x5_partner_link_disabled');
    expect(x5Routes.length).toBeGreaterThan(0);

    for (const route of x5Routes) {
      const decision = resolveJobPostingRollout({
        path: `/v/${route.slug}/`,
        evidence: {
          isActive: false,
          roleTitle: 'Курьер X5',
          sourceUrl: 'https://partner.example/vacancies/x5',
          postedAt: '2026-06-30T00:00:00.000Z',
          sourceCheckedAt: '2026-06-30',
          applyVerifiedAt: '2026-06-30',
          applyFlowVerified: true,
          salaryConfidence: 'partner',
        },
        now: new Date('2026-07-24T07:00:00.000Z'),
      });

      expect(decision, route.slug).toMatchObject({
        emit: false,
        mode: 'blocked',
        reasons: ['inactive'],
      });
    }
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
    expect(ozonJob!.salaryConfidence).toBe('estimated');
  });
});

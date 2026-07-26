import { describe, expect, it } from 'vitest';
import { detailJobs } from '../src/data/jobs';
import { getVacancyIndexability } from '../src/utils/vacancyIndexability';
import {
  LEGACY_GSC_VALID_JOB_PATHS,
  LEGACY_JOBPOSTING_REVIEW_BY,
  resolveJobPostingRollout,
} from '../src/data/jobPostingEligibilityPolicy';
import { resolveVerifiedJobPostingEvidence } from '../src/data/jobPostingVerifiedCohort';

const verifiedEvidence = {
  isActive: true,
  roleTitle: 'Курьер',
  sourceUrl: 'https://employer.example/jobs/123',
  postedAt: '2026-07-01T00:00:00.000Z',
  sourceCheckedAt: '2026-07-09T00:00:00.000Z',
  applyVerifiedAt: '2026-07-09T00:00:00.000Z',
  applyFlowVerified: true,
  salaryConfidence: 'partner' as const,
};

describe('JobPosting rollout policy', () => {
  it('pins the 29 URLs Google reported valid on 2026-07-09 as a temporary bridge', () => {
    expect(LEGACY_GSC_VALID_JOB_PATHS).toHaveLength(29);
    expect(new Set(LEGACY_GSC_VALID_JOB_PATHS).size).toBe(29);

    for (const path of LEGACY_GSC_VALID_JOB_PATHS) {
      const slug = path.replace(/^\/v\//, '').replace(/\/$/, '');
      const job = detailJobs.find((item) => item.slug === slug);
      expect(job, path).toBeDefined();
      expect(getVacancyIndexability(job!).indexable, path).toBe(true);
    }
  });

  it('emits JobPosting for eligible core vacancy evidence without relying on the legacy bridge', () => {
    expect(
      resolveJobPostingRollout({
        path: LEGACY_GSC_VALID_JOB_PATHS[0]!,
        evidence: verifiedEvidence,
        now: new Date('2026-07-10T00:00:00.000Z'),
      }),
    ).toEqual({ emit: true, mode: 'jobposting_markup', reasons: [] });
  });

  it('does not let a historical GSC-valid status override missing core date evidence', () => {
    expect(
      resolveJobPostingRollout({
        path: LEGACY_GSC_VALID_JOB_PATHS[0]!,
        evidence: {
          ...verifiedEvidence,
          postedAt: undefined,
        },
        now: new Date('2026-07-10T00:00:00.000Z'),
      }),
    ).toMatchObject({
      emit: false,
      mode: 'blocked',
      reasons: expect.arrayContaining(['missing_posted_at']),
    });
  });

  it('treats legacy paths like every other active vacancy under the all-active policy', () => {
    const eligibleLegacyPaths = LEGACY_GSC_VALID_JOB_PATHS.filter((path) => {
      const slug = path.replace(/^\/v\//, '').replace(/\/$/, '');
      const job = detailJobs.find((item) => item.slug === slug)!;
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
        path,
        evidence: verifiedEvidence.evidence,
        now: new Date('2026-07-10T12:00:00.000Z'),
      }).emit;
    });

    expect(eligibleLegacyPaths).toEqual([...LEGACY_GSC_VALID_JOB_PATHS]);
  });

  it('defaults to deny for every other URL without complete source evidence', () => {
    expect(
      resolveJobPostingRollout({
        path: '/v/not-in-gsc-valid-cohort/',
        evidence: {
          ...verifiedEvidence,
          postedAt: undefined,
        },
        now: new Date('2026-07-10T00:00:00.000Z'),
      }),
    ).toMatchObject({
      emit: false,
      mode: 'blocked',
      reasons: expect.arrayContaining(['missing_posted_at']),
    });
  });

  it('fails closed after the bridge review deadline', () => {
    const afterDeadline = new Date(`${LEGACY_JOBPOSTING_REVIEW_BY}T23:59:59.999Z`);
    afterDeadline.setUTCDate(afterDeadline.getUTCDate() + 1);

    expect(
      resolveJobPostingRollout({
        path: LEGACY_GSC_VALID_JOB_PATHS[0]!,
        evidence: {
          ...verifiedEvidence,
          postedAt: undefined,
        },
        now: afterDeadline,
      }),
    ).toMatchObject({
      emit: false,
      mode: 'blocked',
      reasons: expect.arrayContaining(['legacy_bridge_expired']),
    });
  });
});

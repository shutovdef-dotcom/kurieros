import { describe, expect, it } from 'vitest';
import { detailJobs } from '../src/data/jobs';
import { getVacancyIndexability } from '../src/utils/vacancyIndexability';
import {
  LEGACY_GSC_VALID_JOB_PATHS,
  LEGACY_JOBPOSTING_REVIEW_BY,
  resolveJobPostingRollout,
} from '../src/data/jobPostingEligibilityPolicy';

const verifiedEvidence = {
  isActive: true,
  roleTitle: 'Курьер',
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

  it('prefers strict source evidence over the legacy bridge', () => {
    expect(
      resolveJobPostingRollout({
        path: LEGACY_GSC_VALID_JOB_PATHS[0]!,
        evidence: verifiedEvidence,
        now: new Date('2026-07-10T00:00:00.000Z'),
      }),
    ).toEqual({ emit: true, mode: 'source_verified', reasons: [] });
  });

  it('temporarily preserves a GSC-valid URL when strict source evidence is incomplete', () => {
    expect(
      resolveJobPostingRollout({
        path: LEGACY_GSC_VALID_JOB_PATHS[0]!,
        evidence: {
          ...verifiedEvidence,
          postedAt: undefined,
        },
        now: new Date('2026-07-10T00:00:00.000Z'),
      }),
    ).toMatchObject({ emit: true, mode: 'legacy_gsc_valid' });
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

import { describe, expect, it } from 'vitest';
import { getJobPostingEligibility } from '../src/utils/jobPostingEligibility';

const now = new Date('2026-07-10T12:00:00.000Z');
const eligibleJob = {
  isActive: true,
  roleTitle: 'Курьер',
  sourceUrl: 'https://employer.example/jobs/123',
  postedAt: '2026-06-20T09:00:00.000Z',
  sourceCheckedAt: '2026-07-08T09:00:00.000Z',
  applyVerifiedAt: '2026-07-08T09:00:00.000Z',
  applyFlowVerified: true,
  salaryConfidence: 'partner' as const,
};

describe('getJobPostingEligibility', () => {
  it('allows an active source-backed vacancy even when optional verification fields are absent', () => {
    const { sourceCheckedAt: _sourceCheckedAt, applyVerifiedAt: _applyVerifiedAt, ...job } =
      eligibleJob;

    expect(getJobPostingEligibility(job, { now })).toEqual({
      eligible: true,
      reasons: [],
    });
  });

  it('allows the fully verified happy path', () => {
    expect(getJobPostingEligibility(eligibleJob, { now })).toEqual({
      eligible: true,
      reasons: [],
    });
  });

  it('defaults to deny when original publication or role evidence is missing', () => {
    const { roleTitle: _roleTitle, postedAt: _postedAt, ...missingEvidence } = eligibleJob;

    expect(getJobPostingEligibility(missingEvidence, { now })).toEqual({
      eligible: false,
      reasons: ['missing_role_title', 'missing_posted_at'],
    });
  });

  it('requires an identifiable upstream vacancy source', () => {
    expect(
      getJobPostingEligibility({ ...eligibleJob, sourceUrl: undefined }, { now }),
    ).toEqual({
      eligible: false,
      reasons: ['missing_source_url'],
    });
  });

  it('does not treat stale optional checks as a JobPosting blocker', () => {
    const result = getJobPostingEligibility(
      {
        ...eligibleJob,
        sourceCheckedAt: '2026-05-01T00:00:00.000Z',
        applyVerifiedAt: '2026-05-02T00:00:00.000Z',
      },
      { now, maxVerificationAgeDays: 30 },
    );

    expect(result).toEqual({
      eligible: true,
      reasons: [],
    });
  });

  it('rejects inactive and expired rows, but not estimated-pay or unverified application rows', () => {
    const result = getJobPostingEligibility(
      {
        ...eligibleJob,
        isActive: false,
        validThrough: '2026-07-09T23:59:59.000Z',
        salaryConfidence: 'estimated' as const,
        applyFlowVerified: false,
      },
      { now },
    );

    expect(result).toEqual({
      eligible: false,
      reasons: ['inactive', 'expired'],
    });
  });

  it('rejects invalid evidence dates rather than treating them as recent', () => {
    const result = getJobPostingEligibility(
      {
        ...eligibleJob,
        postedAt: 'bad-date',
        sourceCheckedAt: 'bad-date',
        applyVerifiedAt: 'bad-date',
      },
      { now },
    );

    expect(result).toEqual({
      eligible: false,
      reasons: ['invalid_posted_at', 'invalid_source_check', 'invalid_apply_check'],
    });
  });
});

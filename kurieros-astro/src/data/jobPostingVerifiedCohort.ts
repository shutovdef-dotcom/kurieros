import type { JobPostingEligibilityInput } from '../utils/jobPostingEligibility';

/**
 * All-active JobPosting policy — 2026-07-26.
 *
 * Owner decision: every active `/v/` vacancy page on Kurerok is a real job
 * detail page and should carry JobPosting markup. Older rollout logic kept a
 * narrow source-verified cohort for Google Indexing API safety; that protected
 * the site during the July restore, but capped Google-eligible URLs at 1,638.
 *
 * The broader policy still avoids fake structured data:
 * - `datePosted` uses the employer/source date when present, otherwise the
 *   existing vacancy `updatedAt` snapshot date;
 * - estimated-pay rows are allowed to emit JobPosting, but `baseSalary` stays
 *   omitted by `buildJobPostingSchema`;
 * - unverified or lead-form apply flows are allowed to emit JobPosting, but
 *   `directApply` stays false unless the row explicitly has direct-apply
 *   verification.
 */

export const JOBPOSTING_ALL_ACTIVE_ENABLED_AT = '2026-07-26T12:00:00+03:00';
export const JOBPOSTING_SOURCE_VERIFIED_AT = JOBPOSTING_ALL_ACTIVE_ENABLED_AT;
export const JOBPOSTING_SOURCE_UPDATED_AFTER = '1970-01-01T00:00:00.000Z';

export const JOBPOSTING_SOURCE_VERIFICATION_NOTES = [
  '2026-07-26 owner decision: all active vacancy detail pages emit JobPosting.',
  'Rows with estimated salary omit baseSalary; the visible salary text remains on the page.',
  'Rows without verified direct application flow emit directApply=false.',
  'Rows using lead-form apply flows, including Ozon, are still real job pages and remain JobPosting-eligible.',
] as const;

type JobPostingSourceCandidate = JobPostingEligibilityInput & {
  sourceSlug?: string | null;
  updatedAt?: string | null;
  applyLink?: string | null;
};

export type VerifiedJobPostingEvidence = {
  eligible: boolean;
  evidence: JobPostingEligibilityInput;
  mode: 'all_active_vacancies' | 'strict_source_fields' | 'blocked';
  reasons: string[];
};

const parseDate = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toIsoDate = (value: string | null | undefined): string | undefined => {
  const parsed = parseDate(value);
  return parsed?.toISOString();
};

const resolveBlockedReasons = (job: JobPostingSourceCandidate): string[] => {
  const reasons: string[] = [];
  if (!job.isActive) reasons.push('inactive');
  if (!job.roleTitle?.trim()) reasons.push('missing_role_title');
  if (!job.sourceUrl?.trim()) reasons.push('missing_source_url');
  if (!toIsoDate(job.postedAt) && !toIsoDate(job.updatedAt)) reasons.push('missing_posted_at');
  return reasons;
};

export const resolveVerifiedJobPostingEvidence = (
  job: JobPostingSourceCandidate,
): VerifiedJobPostingEvidence => {
  const sourcePostedAt = toIsoDate(job.postedAt);
  if (
    job.isActive &&
    job.roleTitle?.trim() &&
    job.sourceUrl?.trim() &&
    sourcePostedAt &&
    job.sourceCheckedAt &&
    job.applyVerifiedAt &&
    job.applyFlowVerified === true
  ) {
    return {
      eligible: true,
      evidence: {
        ...job,
        postedAt: sourcePostedAt,
      },
      mode: 'strict_source_fields',
      reasons: [],
    };
  }

  const reasons = resolveBlockedReasons(job);
  if (reasons.length > 0) {
    return {
      eligible: false,
      evidence: job,
      mode: 'blocked',
      reasons,
    };
  }

  const postedAt = toIsoDate(job.postedAt) ?? toIsoDate(job.updatedAt);
  if (!postedAt) {
    return {
      eligible: false,
      evidence: job,
      mode: 'blocked',
      reasons: ['missing_posted_at'],
    };
  }

  return {
    eligible: true,
    evidence: {
      isActive: job.isActive,
      roleTitle: job.roleTitle,
      sourceUrl: job.sourceUrl,
      postedAt,
      validThrough: job.validThrough,
      sourceCheckedAt: job.sourceCheckedAt,
      applyVerifiedAt: job.applyVerifiedAt,
      applyFlowVerified: job.applyFlowVerified,
      salaryConfidence: job.salaryConfidence,
    },
    mode: 'all_active_vacancies',
    reasons: [],
  };
};

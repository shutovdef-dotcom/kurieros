import type { SalaryConfidence } from '../data/vacancyTypes';

const DEFAULT_MAX_VERIFICATION_AGE_DAYS = 30;

export type JobPostingEligibilityReason =
  | 'inactive'
  | 'missing_role_title'
  | 'missing_source_url'
  | 'missing_posted_at'
  | 'invalid_posted_at'
  | 'expired'
  | 'invalid_valid_through'
  | 'missing_source_check'
  | 'invalid_source_check'
  | 'stale_source_check'
  | 'missing_apply_check'
  | 'invalid_apply_check'
  | 'stale_apply_check'
  | 'estimated_salary'
  | 'unverified_apply_flow';

export type JobPostingEligibilityInput = {
  isActive: boolean;
  roleTitle?: string | null;
  sourceUrl?: string | null;
  postedAt?: string | null;
  validThrough?: string | null;
  sourceCheckedAt?: string | null;
  applyVerifiedAt?: string | null;
  applyFlowVerified?: boolean;
  salaryConfidence: SalaryConfidence;
};

type JobPostingEligibilityOptions = {
  now?: Date;
  maxVerificationAgeDays?: number;
};

export type JobPostingEligibilityDecision = {
  eligible: boolean;
  reasons: JobPostingEligibilityReason[];
};

const parseDate = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const resolveNow = (now: Date | undefined): Date => {
  const resolved = now ?? new Date();
  if (Number.isNaN(resolved.getTime())) {
    throw new Error('now must be a valid date');
  }
  return resolved;
};

const resolveMaxAgeDays = (value: number | undefined): number => {
  if (value === undefined) return DEFAULT_MAX_VERIFICATION_AGE_DAYS;
  if (!Number.isFinite(value) || value < 0) {
    throw new Error('maxVerificationAgeDays must be a non-negative number');
  }
  return value;
};

export const getJobPostingEligibility = (
  job: JobPostingEligibilityInput,
  options: JobPostingEligibilityOptions = {},
): JobPostingEligibilityDecision => {
  const now = resolveNow(options.now);
  resolveMaxAgeDays(options.maxVerificationAgeDays);
  const reasons: JobPostingEligibilityReason[] = [];

  if (!job.isActive) reasons.push('inactive');
  if (!job.roleTitle?.trim()) reasons.push('missing_role_title');
  if (!job.sourceUrl?.trim()) reasons.push('missing_source_url');

  const postedAt = parseDate(job.postedAt);
  if (!job.postedAt) reasons.push('missing_posted_at');
  else if (!postedAt) reasons.push('invalid_posted_at');

  const validThrough = parseDate(job.validThrough);
  if (job.validThrough && !validThrough) reasons.push('invalid_valid_through');
  else if (validThrough && validThrough.getTime() < now.getTime()) reasons.push('expired');

  const sourceCheckedAt = parseDate(job.sourceCheckedAt);
  if (job.sourceCheckedAt && !sourceCheckedAt) reasons.push('invalid_source_check');

  const applyVerifiedAt = parseDate(job.applyVerifiedAt);
  if (job.applyVerifiedAt && !applyVerifiedAt) reasons.push('invalid_apply_check');

  return {
    eligible: reasons.length === 0,
    reasons,
  };
};

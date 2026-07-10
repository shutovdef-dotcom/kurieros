const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_MAX_VERIFICATION_AGE_DAYS = 30;
const DEFAULT_FUTURE_CLOCK_SKEW_MS = 5 * 60 * 1000;

export type LeadFormEligibilityReason =
  | 'not_supported_lead_form'
  | 'missing_source_check'
  | 'invalid_source_check'
  | 'future_source_check'
  | 'stale_source_check'
  | 'missing_apply_check'
  | 'invalid_apply_check'
  | 'future_apply_check'
  | 'stale_apply_check'
  | 'unverified_apply_flow'
  | 'missing_provider_metadata';

export type LeadFormEligibilityInput = {
  applyLink?: string | null;
  sourceCheckedAt?: string | null;
  applyVerifiedAt?: string | null;
  applyFlowVerified?: boolean;
  ozonLeadForm?: {
    vacancy?: string | null;
    cityID?: string | null;
    hireObjectUUID?: string | null;
  } | null;
};

export type LeadFormEligibilityDecision = {
  eligible: boolean;
  reasons: LeadFormEligibilityReason[];
};

type LeadFormEligibilityOptions = {
  now?: Date;
  maxVerificationAgeDays?: number;
};

const parseDate = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const resolveNow = (now: Date | undefined): Date => {
  const resolved = now ?? new Date();
  if (Number.isNaN(resolved.getTime())) throw new Error('now must be a valid date');
  return resolved;
};

const resolveMaxAgeDays = (value: number | undefined): number => {
  if (value === undefined) return DEFAULT_MAX_VERIFICATION_AGE_DAYS;
  if (!Number.isFinite(value) || value < 0) {
    throw new Error('maxVerificationAgeDays must be a non-negative number');
  }
  return value;
};

const appendDateReasons = (
  reasons: LeadFormEligibilityReason[],
  value: string | null | undefined,
  kind: 'source' | 'apply',
  now: Date,
  maxAgeDays: number,
): void => {
  if (!value) {
    reasons.push(kind === 'source' ? 'missing_source_check' : 'missing_apply_check');
    return;
  }

  const parsed = parseDate(value);
  if (!parsed) {
    reasons.push(kind === 'source' ? 'invalid_source_check' : 'invalid_apply_check');
    return;
  }

  if (parsed.getTime() > now.getTime() + DEFAULT_FUTURE_CLOCK_SKEW_MS) {
    reasons.push(kind === 'source' ? 'future_source_check' : 'future_apply_check');
  } else if (now.getTime() - parsed.getTime() > maxAgeDays * DAY_MS) {
    reasons.push(kind === 'source' ? 'stale_source_check' : 'stale_apply_check');
  }
};

const hasCompleteOzonMetadata = (input: LeadFormEligibilityInput): boolean =>
  Boolean(
    input.ozonLeadForm?.vacancy?.trim()
    && input.ozonLeadForm.cityID?.trim()
    && input.ozonLeadForm.hireObjectUUID?.trim(),
  );

export const getLeadFormEligibility = (
  input: LeadFormEligibilityInput,
  options: LeadFormEligibilityOptions = {},
): LeadFormEligibilityDecision => {
  const now = resolveNow(options.now);
  const maxAgeDays = resolveMaxAgeDays(options.maxVerificationAgeDays);
  const reasons: LeadFormEligibilityReason[] = [];

  if (input.applyLink !== 'lead-form:ozon') reasons.push('not_supported_lead_form');
  appendDateReasons(reasons, input.sourceCheckedAt, 'source', now, maxAgeDays);
  appendDateReasons(reasons, input.applyVerifiedAt, 'apply', now, maxAgeDays);
  if (input.applyFlowVerified !== true) reasons.push('unverified_apply_flow');
  if (!hasCompleteOzonMetadata(input)) reasons.push('missing_provider_metadata');

  return { eligible: reasons.length === 0, reasons };
};

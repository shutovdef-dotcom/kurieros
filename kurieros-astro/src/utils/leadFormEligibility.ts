export type LeadFormEligibilityReason =
  | 'not_supported_lead_form'
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

const hasCompleteOzonMetadata = (input: LeadFormEligibilityInput): boolean =>
  Boolean(
    input.ozonLeadForm?.vacancy?.trim()
    && input.ozonLeadForm.cityID?.trim()
    && input.ozonLeadForm.hireObjectUUID?.trim(),
  );

export const getLeadFormEligibility = (
  input: LeadFormEligibilityInput,
): LeadFormEligibilityDecision => {
  const reasons: LeadFormEligibilityReason[] = [];

  if (input.applyLink !== 'lead-form:ozon') reasons.push('not_supported_lead_form');
  if (!hasCompleteOzonMetadata(input)) reasons.push('missing_provider_metadata');

  return { eligible: reasons.length === 0, reasons };
};

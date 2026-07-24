import { describe, expect, it } from 'vitest';

import jobs from '../src/data/jobs';
import { getLeadFormEligibility } from '../src/utils/leadFormEligibility';

const verifiedLead = {
  applyLink: 'lead-form:ozon',
  sourceCheckedAt: '2026-07-08T09:00:00.000Z',
  applyVerifiedAt: '2026-07-09T09:00:00.000Z',
  applyFlowVerified: true,
  ozonLeadForm: {
    vacancy: 'rocket:courier',
    cityID: '73d71199-1e3c-11e9-90e9-9418826ee072',
    hireObjectUUID: '8bc59f96-1fb5-11ed-861d-0242ac120002',
  },
};

describe('lead-form eligibility', () => {
  it('allows an Ozon lead with complete provider metadata', () => {
    expect(getLeadFormEligibility(verifiedLead)).toEqual({ eligible: true, reasons: [] });
  });

  it('does not disable Ozon leads because old verification timestamps are stale or missing', () => {
    expect(getLeadFormEligibility({
      ...verifiedLead,
      sourceCheckedAt: '2026-05-01T00:00:00.000Z',
      applyVerifiedAt: undefined,
      applyFlowVerified: false,
    })).toEqual({ eligible: true, reasons: [] });
  });

  it('fails closed on unsupported markers or missing provider metadata', () => {
    expect(getLeadFormEligibility({
      ...verifiedLead,
      applyLink: 'https://example.com/apply',
      ozonLeadForm: undefined,
    })).toEqual({
      eligible: false,
      reasons: ['not_supported_lead_form', 'missing_provider_metadata'],
    });

    expect(getLeadFormEligibility({
      ...verifiedLead,
      ozonLeadForm: {
        ...verifiedLead.ozonLeadForm,
        hireObjectUUID: '',
      },
    })).toEqual({
      eligible: false,
      reasons: ['missing_provider_metadata'],
    });
  });

  it('enables the current 185 Ozon lead vacancies', () => {
    const leadJobs = jobs.filter((job) => job.applyLink === 'lead-form:ozon');
    const decisions = leadJobs.map((job) => getLeadFormEligibility(job));

    expect(leadJobs).toHaveLength(185);
    expect(decisions.every((decision) => decision.eligible === true)).toBe(true);
    expect(decisions.every((decision) => decision.reasons.length === 0)).toBe(true);
  });
});

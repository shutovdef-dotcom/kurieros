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
  it('allows only a recently source-checked and apply-verified lead flow', () => {
    expect(getLeadFormEligibility(verifiedLead, {
      now: new Date('2026-07-10T09:00:00.000Z'),
    })).toEqual({ eligible: true, reasons: [] });
  });

  it('fails closed when source or apply verification is stale', () => {
    expect(getLeadFormEligibility({
      ...verifiedLead,
      sourceCheckedAt: '2026-05-01T00:00:00.000Z',
      applyVerifiedAt: '2026-05-02T00:00:00.000Z',
    }, {
      now: new Date('2026-07-10T09:00:00.000Z'),
    })).toEqual({
      eligible: false,
      reasons: ['stale_source_check', 'stale_apply_check'],
    });
  });

  it('fails closed on missing, invalid, or unconfirmed apply metadata', () => {
    expect(getLeadFormEligibility({
      ...verifiedLead,
      applyVerifiedAt: undefined,
      applyFlowVerified: false,
      ozonLeadForm: undefined,
    }, {
      now: new Date('2026-07-10T09:00:00.000Z'),
    })).toEqual({
      eligible: false,
      reasons: ['missing_apply_check', 'unverified_apply_flow', 'missing_provider_metadata'],
    });

    expect(getLeadFormEligibility({
      ...verifiedLead,
      sourceCheckedAt: 'not-a-date',
      applyVerifiedAt: 'also-not-a-date',
    }, {
      now: new Date('2026-07-10T09:00:00.000Z'),
    }).reasons).toEqual(['invalid_source_check', 'invalid_apply_check']);
  });

  it('keeps the current 185 stale Ozon lead vacancies disabled', () => {
    const leadJobs = jobs.filter((job) => job.applyLink === 'lead-form:ozon');
    const decisions = leadJobs.map((job) => getLeadFormEligibility(job, {
      now: new Date('2026-07-10T09:00:00.000Z'),
    }));

    expect(leadJobs).toHaveLength(185);
    expect(decisions.every((decision) => decision.eligible === false)).toBe(true);
    expect(decisions.every((decision) =>
      decision.reasons.includes('stale_source_check')
      && decision.reasons.includes('missing_apply_check'),
    )).toBe(true);
  });
});

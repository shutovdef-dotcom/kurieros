import { describe, expect, it } from 'vitest';
import {
  getApplyHref,
  getApplyPagePath,
  getApplyPartnerDomain,
  isExternalApplyLink,
  isLeadFormApplyLink,
} from '../src/utils/applyRoute';

describe('apply route helpers', () => {
  it('routes external apply links through the single /apply/ page', () => {
    expect(getApplyPagePath({ slug: 'yandex-eda-courier-moskva-auto' })).toBe(
      '/apply/?job=yandex-eda-courier-moskva-auto',
    );
    expect(
      getApplyHref({
        slug: 'yandex-eda-courier-moskva-auto',
        applyLink: 'https://trk.example/click?utm_content=moskva-auto',
      }),
    ).toBe('/apply/?job=yandex-eda-courier-moskva-auto');
  });

  it('keeps lead-form vacancies out of the generic apply redirect flow', () => {
    expect(isLeadFormApplyLink('lead-form:ozon')).toBe(true);
    expect(isExternalApplyLink('lead-form:ozon')).toBe(false);
    expect(getApplyHref({ slug: 'ozon-courier-moskva-auto', applyLink: 'lead-form:ozon' })).toBe('#');
  });

  it('does not treat user-controlled or unsupported URLs as external apply links', () => {
    expect(isExternalApplyLink('javascript:alert(1)')).toBe(false);
    expect(isExternalApplyLink('//evil.example/path')).toBe(false);
    expect(isExternalApplyLink('http://partner.example/apply')).toBe(false);
    expect(isExternalApplyLink('#')).toBe(false);
  });

  it('exposes the real partner domain for analytics after href becomes same-origin', () => {
    expect(
      getApplyPartnerDomain({
        applyLink: 'https://pxl.leads.su/click/abc?erid=123',
      }),
    ).toBe('pxl.leads.su');
  });
});

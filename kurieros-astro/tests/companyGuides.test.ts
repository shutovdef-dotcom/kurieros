import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  COMPANY_GUIDE_CITY_LIMIT,
  COMPANY_GUIDE_VACANCY_LIMIT,
  getCompanyGuide,
} from '../src/data/companyGuides';
import { companiesFromJobs } from '../src/utils/companiesIndex';

describe('company guide overrides', () => {
  it('ships a compact Купер guide with one primary commercial hub', () => {
    const guide = getCompanyGuide('kuper-ex-sbermarket');

    expect(guide).toBeDefined();
    expect(guide?.primaryHubHref).toBe('/rabota-kurerom-kuper/');
    expect(guide?.vacancyPreviewLimit).toBe(COMPANY_GUIDE_VACANCY_LIMIT);
    expect(guide?.cityPreviewLimit).toBe(COMPANY_GUIDE_CITY_LIMIT);
    expect(guide?.vacancyPreviewLimit).toBeLessThanOrEqual(8);
    expect(guide?.cityPreviewLimit).toBeLessThanOrEqual(20);
  });

  it('uses major cities before alphabetical city examples for Купер', () => {
    const guide = getCompanyGuide('kuper-ex-sbermarket');

    expect(guide?.featuredCities.slice(0, 6)).toEqual([
      'Москва',
      'Санкт-Петербург',
      'Екатеринбург',
      'Новосибирск',
      'Казань',
      'Нижний Новгород',
    ]);
  });

  it('covers real Купер applicant questions without turning the page into a long FAQ dump', () => {
    const guide = getCompanyGuide('kuper-ex-sbermarket');
    const faqText = guide?.faqItems
      .map((item) => `${item.question} ${item.answer}`)
      .join(' ')
      .toLowerCase();

    expect(guide?.faqItems.length).toBeGreaterThanOrEqual(6);
    expect(guide?.faqItems.length).toBeLessThanOrEqual(8);
    expect(faqText).toContain('самозан');
    expect(faqText).toContain('медкниж');
    expect(faqText).toContain('выплат');
    expect(faqText).toContain('штраф');
    expect(faqText).toContain('сборщик');
  });

  it('builds an editorial guide for every company in the catalog', () => {
    expect(companiesFromJobs.length).toBeGreaterThan(10);

    for (const company of companiesFromJobs) {
      const guide = getCompanyGuide(company.slug, company);

      expect(guide.slug).toBe(company.slug);
      expect(guide.title).toContain(company.name);
      expect(guide.faqItems.length).toBeGreaterThanOrEqual(5);
      expect(guide.vacancyPreviewLimit).toBeLessThanOrEqual(COMPANY_GUIDE_VACANCY_LIMIT);
      expect(guide.cityPreviewLimit).toBeLessThanOrEqual(COMPANY_GUIDE_CITY_LIMIT);
      expect(guide.featuredCities[0]).toBe('Москва');
    }
  });

  it('routes guided companies through a standalone editorial page template', () => {
    const pageSource = readFileSync(
      new URL('../src/pages/companies/[slug].astro', import.meta.url),
      'utf8',
    );

    expect(pageSource).toContain('CompanyEditorialGuidePage');
    expect(pageSource).toContain('<CompanyEditorialGuidePage');
    expect(pageSource).toContain('getCompanyGuide(company.slug, company)');
    expect(pageSource).not.toContain('CompanyGuideContent');
  });
});

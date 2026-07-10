import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CATEGORIES } from '../src/data/constants';
import { COMPANY_HOMEPAGES } from '../src/data/companyHomepages';
import { COMPANY_INDUSTRY } from '../src/data/companyIndustry';
import { getCompanyGuide } from '../src/data/companyGuides';
import { companiesFromJobs } from '../src/utils/companiesIndex';
import { POPULAR_COMPANY_SLUGS } from '../src/utils/companyPopularity';
import {
  BRAND_CATEGORY_COMPANY_LINKS,
  COMPANY_COMMERCIAL_HUBS,
  getBrandCategoryCompanyCanonical,
  getCompanyAlternateNames,
} from '../src/utils/companySeo';
import { resolveCompanyLinks } from '../src/utils/knowledge';

const pageSource = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('company SEO architecture', () => {
  it('keeps every catalog company wired into the basic SEO integration contract', () => {
    const popularitySlugs = new Set<string>(POPULAR_COMPANY_SLUGS);

    expect(companiesFromJobs.length).toBeGreaterThan(10);

    for (const company of companiesFromJobs) {
      const guide = getCompanyGuide(company.slug, company);

      expect(company.href, company.name).toBe(`/companies/${company.slug}/`);
      expect(guide.slug, company.name).toBe(company.slug);
      expect(guide.title, company.name).toContain(company.name);
      expect(COMPANY_HOMEPAGES[company.name], company.name).toMatch(/^https:\/\//);
      expect(COMPANY_INDUSTRY[company.name], company.name).toBeTruthy();
      expect(popularitySlugs.has(company.slug), company.name).toBe(true);
      expect(guide.primaryHubHref, company.name).toMatch(
        /^(#company-vacancies|\/rabota-kurerom-[a-z0-9-]+\/)$/,
      );
    }
  });

  it('cross-canonicals brand category facets to their primary company pages', () => {
    const categorySlugs = new Set(CATEGORIES.map((category) => category.slug));
    const companySlugs = new Set(companiesFromJobs.map((company) => company.slug));

    for (const [categorySlug, link] of Object.entries(BRAND_CATEGORY_COMPANY_LINKS)) {
      const commercialHub = COMPANY_COMMERCIAL_HUBS[link.companySlug];

      expect(categorySlugs.has(categorySlug), categorySlug).toBe(true);
      expect(companySlugs.has(link.companySlug), link.companySlug).toBe(true);
      expect(getBrandCategoryCompanyCanonical(categorySlug)).toBe(link.companyHref);
      expect(commercialHub?.href, link.companySlug).toBe(`/rabota-kurerom-${categorySlug}/`);
      expect(commercialHub?.intent, link.companySlug).toBe('commercial-listing');
    }
  });

  it('renders company links from vacancies and brand listings through the SEO helpers', () => {
    const listingSource = pageSource('src/pages/[slug].astro');
    const vacancySource = pageSource('src/pages/v/[slug].astro');
    const guideSource = pageSource('src/data/companyGuides.ts');

    expect(listingSource).toContain('getBrandCategoryCompanyCanonical');
    expect(listingSource).toContain('getBrandCategoryCompanyLink');
    expect(listingSource).toContain('brandCategoryCompanyCanonical ??');
    expect(vacancySource).toContain('const companyUrl = `/companies/${slugifyCompany(job.company)}/`;');
    expect(guideSource).toContain('getCompanyCommercialHub(company.slug)');
  });

  it('adds both verified Купер brand names only to the canonical company entity', () => {
    expect(getCompanyAlternateNames('kuper-ex-sbermarket')).toEqual([
      'Купер',
      'СберМаркет',
    ]);
    expect(getCompanyAlternateNames('ozon')).toBeUndefined();

    const companyPage = pageSource('src/pages/companies/[slug].astro');
    expect(companyPage).toContain('getCompanyAlternateNames(company.slug)');
    expect(companyPage).toContain('alternateName: companyAlternateNames');
  });

  it('keeps relevant guide and compare surfaces linked to the canonical Купер page', () => {
    expect(resolveCompanyLinks(['kuper'])).toContainEqual({
      id: 'kuper',
      name: 'Купер',
      href: '/companies/kuper-ex-sbermarket/',
    });

    const compareHelp = pageSource('src/components/compare/CompareHelpGrid.astro');
    expect(compareHelp).toContain('href="/companies/kuper-ex-sbermarket/"');
    expect(compareHelp).toContain('Условия работы в Купере');
  });
});

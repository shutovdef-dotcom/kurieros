import { describe, expect, it } from 'vitest';
import {
  POPULAR_COMPANY_SLUGS,
  sortCompaniesByPopularity,
} from '../src/utils/companyPopularity';
import { companiesFromJobs } from '../src/utils/companiesIndex';
import { vacancySources } from '../src/data/vacancies';
import { slugifyCompany } from '../src/utils/companies';

describe('company popularity sorting', () => {
  it('shows recognizable delivery employers before high-volume generated brands', () => {
    const sortedSlugs = sortCompaniesByPopularity(companiesFromJobs).map((company) => company.slug);

    expect(sortedSlugs.slice(0, 5)).toEqual([
      'kuper-ex-sbermarket',
      'yandex-eda',
      'samokat',
      'ozon',
      'ozon-fresh',
    ]);
    expect(sortedSlugs.indexOf('tetrika')).toBeGreaterThan(
      sortedSlugs.indexOf('ozon-fresh'),
    );
  });

  it('keeps curated popularity slugs aligned with the full source catalogue', () => {
    const catalogueSlugs = new Set(vacancySources.map((source) => slugifyCompany(source.company.name)));

    expect(POPULAR_COMPANY_SLUGS.every((slug) => catalogueSlugs.has(slug))).toBe(true);
  });

  it('does not expose companies whose offers are all inactive', () => {
    const activeSourceSlugs = new Set(
      vacancySources
        .filter((source) => source.offers.some((offer) => offer.isActive))
        .map((source) => slugifyCompany(source.company.name)),
    );
    const outputSlugs = new Set(companiesFromJobs.map((company) => company.slug));

    expect(outputSlugs).toEqual(activeSourceSlugs);
    expect(outputSlugs.has('x5-dostavka')).toBe(false);
  });
});

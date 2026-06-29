import { describe, expect, it } from 'vitest';
import {
  POPULAR_COMPANY_SLUGS,
  sortCompaniesByPopularity,
} from '../src/utils/companyPopularity';
import { companiesFromJobs } from '../src/utils/companiesIndex';

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

  it('keeps the curated popularity list aligned with real company slugs', () => {
    const realSlugs = new Set(companiesFromJobs.map((company) => company.slug));

    expect(POPULAR_COMPANY_SLUGS.every((slug) => realSlugs.has(slug))).toBe(true);
  });
});

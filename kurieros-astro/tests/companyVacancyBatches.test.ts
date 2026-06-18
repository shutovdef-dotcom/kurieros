import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { companiesFromJobs } from '../src/utils/companiesIndex';
import {
  COMPANY_VACANCIES_BATCH_SIZE,
  getCompanyVacancyBatch,
  getCompanyVacancyBatchStaticPaths,
  getCompanyVacancyBatchUrl,
} from '../src/utils/companyVacancyBatches';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const readProjectFile = (path: string): string =>
  readFileSync(join(ROOT, path), 'utf8');

describe('company vacancy batches', () => {
  it('keeps the first company page batch crawler-sized', () => {
    expect(COMPANY_VACANCIES_BATCH_SIZE).toBe(24);
  });

  it('creates static paths only for overflow pages', () => {
    const paths = getCompanyVacancyBatchStaticPaths();
    const expectedOverflowPages = companiesFromJobs.reduce((sum, company) => {
      const pageCount = Math.ceil(company.jobs.length / COMPANY_VACANCIES_BATCH_SIZE);
      return sum + Math.max(0, pageCount - 1);
    }, 0);

    expect(paths).toHaveLength(expectedOverflowPages);
    expect(paths.every((path) => Number(path.params.page) >= 2)).toBe(true);
  });

  it('returns deterministic second-page batches for the largest company', () => {
    const largestCompany = [...companiesFromJobs]
      .sort((a, b) => b.jobs.length - a.jobs.length)[0];
    const batch = getCompanyVacancyBatch(largestCompany.slug, 2);

    expect(batch.company?.slug).toBe(largestCompany.slug);
    expect(batch.batchJobs).toEqual(
      largestCompany.jobs.slice(
        COMPANY_VACANCIES_BATCH_SIZE,
        COMPANY_VACANCIES_BATCH_SIZE * 2,
      ),
    );
    expect(batch.remainingCount).toBe(
      largestCompany.jobs.length - COMPANY_VACANCIES_BATCH_SIZE * 2,
    );
    expect(batch.nextBatchUrl).toBe(getCompanyVacancyBatchUrl(largestCompany.slug, 3));
  });

  it('keeps company pages wired to the batch controller', () => {
    const page = readProjectFile('src/pages/companies/[slug].astro');

    expect(page).toContain('visibleCompanyJobs.map');
    expect(page).not.toContain('company.jobs.map((job)');
    expect(page).toContain('data-company-vacancies-grid');
    expect(page).toContain("import '../../scripts/companyVacanciesController.js'");
  });

  it('keeps company vacancy fragment routes out of the sitemap', () => {
    const config = readProjectFile('astro.config.mjs');

    expect(config).toContain("!page.includes('/api/company-vacancies/')");
  });
});

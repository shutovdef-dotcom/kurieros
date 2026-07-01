#!/usr/bin/env tsx
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MIN_INDEXABLE_COMPANY_VACANCIES,
  isCompanyIndexableByVacancyCount,
} from '../src/data/companyIndexabilityPolicy';
import { companiesFromJobs } from '../src/utils/companiesIndex';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const publicOutputPath = resolve(rootDir, 'public/company-indexability.json');
const site = (process.env.SITE_URL || 'https://kurerok.ru').replace(/\/$/, '');

const noindexCompanies = companiesFromJobs
  .filter((company) => !isCompanyIndexableByVacancyCount(company.vacancyCount))
  .map((company) => ({
    slug: company.slug,
    name: company.name,
    vacancyCount: company.vacancyCount,
    url: `${site}${company.href}`,
    reason: 'too_few_vacancies',
  }))
  .sort((companyA, companyB) => companyA.slug.localeCompare(companyB.slug));

const payload = {
  generatedFrom: {
    source: 'companiesFromJobs',
  },
  policy: {
    minIndexableCompanyVacancies: MIN_INDEXABLE_COMPANY_VACANCIES,
  },
  noindexCompanies,
  noindexUrls: noindexCompanies.map((company) => company.url),
  summary: {
    totalCompanyPages: companiesFromJobs.length,
    indexableCompanyPages: companiesFromJobs.length - noindexCompanies.length,
    noindexCompanyPages: noindexCompanies.length,
  },
};

await mkdir(dirname(publicOutputPath), { recursive: true });
await writeFile(publicOutputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

console.log(
  `✓ Wrote company indexability: ${payload.summary.indexableCompanyPages} indexable, ` +
    `${payload.summary.noindexCompanyPages} noindex`,
);

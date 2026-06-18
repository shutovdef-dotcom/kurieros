import { companiesFromJobs } from './companiesIndex';

export const COMPANY_VACANCIES_BATCH_SIZE = 24;

export const getCompanyVacancyBatchUrl = (companySlug: string, pageNumber: number): string =>
  `/api/company-vacancies/${companySlug}/${pageNumber}/`;

export const getCompanyBySlug = (companySlug: string) =>
  companiesFromJobs.find((company) => company.slug === companySlug);

export const getCompanyVacancyBatch = (
  companySlug: string,
  pageNumber: number,
) => {
  const company = getCompanyBySlug(companySlug);
  const safePageNumber = Number.isFinite(pageNumber) && pageNumber > 1
    ? Math.floor(pageNumber)
    : 2;
  const start = (safePageNumber - 1) * COMPANY_VACANCIES_BATCH_SIZE;
  const jobs = company?.jobs ?? [];
  const batchJobs = jobs.slice(start, start + COMPANY_VACANCIES_BATCH_SIZE);
  const remainingCount = Math.max(
    0,
    jobs.length - (start + COMPANY_VACANCIES_BATCH_SIZE),
  );
  const nextBatchUrl = company && remainingCount > 0
    ? getCompanyVacancyBatchUrl(company.slug, safePageNumber + 1)
    : undefined;

  return {
    company,
    pageNumber: safePageNumber,
    batchJobs,
    remainingCount,
    nextBatchUrl,
  };
};

export const getCompanyVacancyBatchStaticPaths = () =>
  companiesFromJobs.flatMap((company) => {
    const pageCount = Math.ceil(company.jobs.length / COMPANY_VACANCIES_BATCH_SIZE);
    const paths: Array<{
      params: {
        companySlug: string;
        page: string;
      };
    }> = [];

    for (let pageNumber = 2; pageNumber <= pageCount; pageNumber += 1) {
      paths.push({
        params: {
          companySlug: company.slug,
          page: String(pageNumber),
        },
      });
    }

    return paths;
  });

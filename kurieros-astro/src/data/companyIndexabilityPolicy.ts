export const MIN_INDEXABLE_COMPANY_VACANCIES = 3;

export const isCompanyIndexableByVacancyCount = (vacancyCount: number): boolean =>
  vacancyCount >= MIN_INDEXABLE_COMPANY_VACANCIES;

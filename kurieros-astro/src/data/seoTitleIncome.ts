import type { GeneratedJob } from './vacancyTypes';
import { getFreshTitleTest } from './seoExperimentCohorts';

// Owner-supplied ceiling, 2026-10-13. Not an employer-verified tariff:
// never convert it to monthly pay or schema baseSalary.
export const FRESH_TITLE_TEST_INCOME = 'до 8 000 ₽/день';
export const FRESH_TITLE_TEST_INCOME_NOTE =
  'Возможный доход — до 8 000 ₽/день. Это ориентир, а не гарантированная выплата: сумма зависит от города, длительности смены и заказов. Тариф и условия уточняйте при оформлении.';

/** Keep the landing-page income identical in every title-test arm. */
export const applyTitleTestIncome = (job: GeneratedJob): GeneratedJob => {
  if (!getFreshTitleTest(job.slug)) return job;
  return {
    ...job,
    salary: FRESH_TITLE_TEST_INCOME,
    salaryConfidence: 'estimated',
    contentUpdatedAt: '2026-10-13',
    description: `${job.description} ${FRESH_TITLE_TEST_INCOME_NOTE}`,
    benefits: [
      FRESH_TITLE_TEST_INCOME_NOTE,
      // The first Fresh benefit is the old monthly-income template in
      // every translation. Remove it by its source position, not by
      // Russian words that would miss translated salary promises.
      ...job.benefits.slice(1),
    ],
    details: {
      ...job.details,
      rate: FRESH_TITLE_TEST_INCOME_NOTE,
      // The Fresh source says weekly. Generic hourly fallback had
      // replaced this with another provider's daily payment cadence.
      payment_freq: 'Еженедельно',
    },
  };
};

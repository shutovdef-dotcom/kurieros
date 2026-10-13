import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  buildJobTranslationsBySource,
  detailJobs,
} from '../src/data/jobs';
import { vacancySources } from '../src/data/vacancies';
import { ozonVacancySources } from '../src/data/ozonOffers';
import baseline from '../src/data/seoTitleTestBaseline.json';
import { FRESH_TITLE_TEST_INCOME, applyTitleTestIncome } from '../src/data/seoTitleIncome';
import {
  getFreshTitleTest,
  getVacancyTitleOverride,
} from '../src/data/seoExperimentCohorts';
import expectedIds from './fixtures/job-ids-snapshot.json';
import { SUPPORTED_LANGUAGES } from '../src/data/translations';
import { buildJobPostingSchema } from '../src/utils/schema';

describe('search CTR experiment cohorts', () => {
  it('uses current source facts for the Horugvino treatment title and address', () => {
    const job = detailJobs.find(
      (item) => item.slug === 'ozon-goods-handler-horugvino-foot',
    );

    expect(job).toBeDefined();
    expect(job?.salary).toBe('от 65 000 ₽/мес');
    expect(job?.details.schedule).toContain('2/2');
    expect(job?.ozonLeadForm?.hireObjectLabel).toBe('д. Хоругвино, 32/2');
    expect(getVacancyTitleOverride(job!.slug)).toBe(
      'Специалист по обработке товаров Ozon в Хоругвино',
    );
  });

  it('does not alter the Kemerovo guardrail cohort', () => {
    expect(
      getVacancyTitleOverride('ozon-goods-handler-kemerovo-foot'),
    ).toBeUndefined();
  });

  it('keeps the frozen 27-page assignment, equal impression totals, exact titles and stable IDs', () => {
    expect(baseline.cohorts).toHaveLength(27);
    expect(new Set(baseline.cohorts.map((row) => row.slug)).size).toBe(27);
    expect(baseline.cohorts.reduce((sum, row) => sum + row.baseline.impressions, 0)).toBe(774);
    expect(baseline.cohorts.reduce((sum, row) => sum + row.baseline.clicks, 0)).toBe(9);

    const expectedImpressions: Record<string, number> = {
      role: 258,
      income: 258,
      income_emoji: 258,
    };
    const expectedCounts: Record<string, number> = {
      role: 5,
      income: 5,
      income_emoji: 17,
    };
    for (const arm of ['role', 'income', 'income_emoji'] as const) {
      const rows = baseline.cohorts.filter((row) => row.arm === arm);
      expect(rows).toHaveLength(expectedCounts[arm]);
      expect(rows.reduce((sum, row) => sum + row.baseline.impressions, 0)).toBe(expectedImpressions[arm]);
    }

    const idsBySlug = new Map(expectedIds.map((row) => [row.slug, row.id]));
    for (const row of baseline.cohorts) {
      const job = detailJobs.find((item) => item.slug === row.slug);
      const treatment = getFreshTitleTest(row.slug);
      expect(job, `${row.slug} is still an active detail job`).toBeDefined();
      expect(treatment).toBeDefined();
      expect(job?.id).toBe(idsBySlug.get(row.slug));
      expect(treatment?.id).toBe(`${baseline.id}-${row.arm}`);
      expect(getVacancyTitleOverride(row.slug)).toBe(treatment?.titleOverride);
      expect(treatment?.titleOverride.length).toBeLessThanOrEqual(70);
      expect(treatment?.titleOverride).toContain(treatment?.city);
      if (row.arm === 'role') {
        expect(treatment?.titleOverride).toBe(`Пеший курьер Ozon fresh · ${treatment?.city}`);
      } else {
        const title = `Пеший курьер Ozon fresh · ${treatment?.city} — до 8 000 ₽/день`;
        expect(treatment?.titleOverride).toBe(row.arm === 'income' ? title : `⚡ ${title}`);
        expect([...treatment!.titleOverride].filter((char) => char === '⚡')).toHaveLength(row.arm === 'income_emoji' ? 1 : 0);
      }
    }
  });

  it('shows the same estimated daily income on cohort jobs without converting raw monthly source pay into schema salary', () => {
    const source = vacancySources.find((item) => item.slug === 'ozon-fresh-courier');
    const rawSource = ozonVacancySources.find((item) => item.slug === 'ozon-fresh-courier');
    expect(source).toBeDefined();
    expect(rawSource).toBeDefined();

    for (const row of baseline.cohorts) {
      const job = detailJobs.find((item) => item.slug === row.slug)!;
      const offer = source!.offers.find((item) => item.city === job.location && item.transport === job.transport);
      const rawOffer = rawSource!.offers.find((item) => item.city === job.location && item.transport === job.transport);
      expect(offer, `${row.slug} has an original source offer`).toBeDefined();
      expect(rawOffer?.pay.monthly?.min).toBe(80_000);
      expect(job.salary).toBe(FRESH_TITLE_TEST_INCOME);
      expect(job.salaryConfidence).toBe('estimated');
      expect(job.details.payment_freq).toBe('Еженедельно');
      expect(job.details.rate).toContain('до 8 000 ₽/день');

      const userVisibleRussianText = [
        job.salary,
        job.description,
        job.shortDescription,
        job.details.rate,
        ...job.benefits,
      ].join(' ');
      expect(userVisibleRussianText).not.toMatch(/80\s?000\s?₽|в месяц|ежемесячно/i);
      expect(userVisibleRussianText).toContain('до 8 000 ₽/день');

      const schema = buildJobPostingSchema({
        title: job.roleTitle ?? job.title,
        description: job.description,
        slug: job.slug,
        company: job.company,
        companyUrl: 'https://kurerok.ru/companies/ozon/',
        jobUrl: `https://kurerok.ru${job.detailSlug ?? `/v/${job.slug}/`}`,
        cities: [job.location],
        hasApplyLink: true,
        applyLink: job.applyLink,
        baseSalaryMonthlyMin: offer?.pay.monthly?.min,
        baseSalaryMonthlyMax: offer?.pay.monthly?.max,
        salaryConfidence: job.salaryConfidence,
        currency: job.currency,
        datePosted: job.updatedAt,
      });
      expect(schema).not.toHaveProperty('baseSalary');
    }
  });

  it('carries the estimated daily income into each generated locale fragment and leaves non-cohort jobs alone', () => {
    const source = vacancySources.find((item) => item.slug === 'ozon-fresh-courier')!;
    const rawSource = ozonVacancySources.find((item) => item.slug === 'ozon-fresh-courier')!;
    const translations = buildJobTranslationsBySource([source]);
    const sampleJob = detailJobs.find((item) => item.slug === 'ozon-fresh-courier-chelyabinsk-foot')!;
    expect(rawSource.content.benefits[0]).toMatch(/80\s?000 ₽ в месяц/u);
    const firstBenefitMonthlyPattern: Record<string, RegExp> = {
      uz: /oyiga/u,
      tg: /дар як моҳ/u,
      ky: /айына/u,
      hy: /ամսական/u,
      kk: /айына/u,
      az: /ayda/u,
      uk: /на місяць/u,
      be: /у месяц/u,
      hi: /प्रति माह/u,
      vi: /mỗi tháng/u,
      zh: /月收入/u,
    };
    for (const language of SUPPORTED_LANGUAGES) {
      if (language !== 'ru') {
        const override = JSON.parse(readFileSync(
          new URL(`../src/data/vacancy-translations-source/${language}.json`, import.meta.url),
          'utf8',
        )) as Record<string, { benefits?: string[] }>;
        const sourceFirstBenefit = override[source.slug]?.benefits?.[0];
        expect(sourceFirstBenefit).toContain('80 000 ₽');
        expect(sourceFirstBenefit).toMatch(firstBenefitMonthlyPattern[language]);
      }
      const entry = translations[language][source.slug][String(sampleJob.id)];
      const benefits = Object.entries(entry)
        .filter(([key]) => /^ben_\d+$/u.test(key))
        .map(([, value]) => value);
      expect(entry.salary).toBe(FRESH_TITLE_TEST_INCOME);
      expect([entry.description, ...benefits].join(' ')).not.toMatch(/80\s?000\s?₽|в месяц|ежемесячно/i);
      expect([entry.description, ...benefits].join(' ')).toContain('до 8 000 ₽/день');
    }

    const nonCohortJob = detailJobs.find((item) => item.slug.startsWith('ozon-fresh-order-picker-'))!;
    expect(getFreshTitleTest(nonCohortJob.slug)).toBeUndefined();
    expect(applyTitleTestIncome(nonCohortJob)).toBe(nonCohortJob);
    expect(nonCohortJob.salary).not.toBe(FRESH_TITLE_TEST_INCOME);
  });
});

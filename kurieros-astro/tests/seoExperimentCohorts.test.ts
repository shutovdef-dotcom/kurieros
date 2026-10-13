import { describe, expect, it } from 'vitest';
import {
  buildJobTranslationsBySource,
  detailJobs,
} from '../src/data/jobs';
import { vacancySources } from '../src/data/vacancies';
import { ozonVacancySources } from '../src/data/ozonOffers';
import archivedFreshBaseline from '../src/data/seoTitleTestBaseline.json';
import expandedBaseline from '../src/data/seoExpandedTitleBaseline.json';
import {
  FRESH_TITLE_TEST_INCOME,
  FRESH_TITLE_TEST_INCOME_NOTE,
  FRESH_TITLE_TEST_INCOME_NOTES,
  applyTitleTestIncome,
} from '../src/data/seoTitleIncome';
import {
  getFreshTitleTest,
  getVacancyTitleExperiment,
  getVacancyTitleOverride,
} from '../src/data/seoExperimentCohorts';
import expectedIds from './fixtures/job-ids-snapshot.json';
import { SUPPORTED_LANGUAGES } from '../src/data/translations';
import { buildJobPostingSchema } from '../src/utils/schema';

const jobsBySlug = new Map(detailJobs.map((job) => [job.slug, job]));
const expectedIdsBySlug = new Map(expectedIds.map((row) => [row.slug, row.id]));
const incomeArms = new Set([
  'income',
  'income_first',
  'money_bag',
  'banknotes',
  'flying_money',
  'lightning',
]);
const emojiByArm: Record<string, string> = {
  money_bag: '💰',
  banknotes: '💵',
  flying_money: '💸',
  lightning: '⚡',
};
const emojiTokens = Object.values(emojiByArm);

const localizedMonthlyPattern: Record<string, RegExp> = {
  ru: /в месяц|ежемесячно/iu,
  uz: /oyiga/iu,
  tg: /дар як моҳ/iu,
  ky: /айына/iu,
  hy: /ամսական/iu,
  kk: /айына/iu,
  az: /ayda/iu,
  uk: /на місяць/iu,
  be: /у месяц/iu,
  hi: /प्रति माह/iu,
  vi: /mỗi tháng/iu,
  zh: /月收入/iu,
};

const sourceClaimText = (job: (typeof detailJobs)[number]) => [
  job.shortDescription,
  job.description,
  job.details.schedule,
  job.details.payment_freq,
  ...job.requirements,
  ...job.benefits,
  ...job.labels,
].join(' ').toLocaleLowerCase('ru');

const isBenefitClaimSupported = (claim: string, sourceText: string) => {
  if (claim === 'Условия и отклик') return true;
  if (claim === 'Выплаты еженедельно') return /еженед/u.test(sourceText);
  if (claim === 'Выплаты ежедневно') return /ежеднев/u.test(sourceText);
  if (claim === 'Гибкий график') return /гибк|свободн/u.test(sourceText);
  if (claim === 'Без опыта') return /без опыта|опыт не (обязателен|требуется)/u.test(sourceText);
  if (claim === 'Удалённо') return /удал[её]н|дистанц/u.test(sourceText);
  return false;
};

describe('search title experiments', () => {
  it('keeps the original 27-page Fresh allocation accessible for historical reports', () => {
    expect(archivedFreshBaseline.cohorts).toHaveLength(27);
    expect(new Set(archivedFreshBaseline.cohorts.map((row) => row.slug)).size).toBe(27);
    expect(archivedFreshBaseline.cohorts.reduce((sum, row) => sum + row.baseline.impressions, 0)).toBe(774);
    expect(archivedFreshBaseline.cohorts.reduce((sum, row) => sum + row.baseline.clicks, 0)).toBe(9);

    for (const row of archivedFreshBaseline.cohorts) {
      const historical = getFreshTitleTest(row.slug);
      expect(jobsBySlug.has(row.slug), `${row.slug} remains an active URL`).toBe(true);
      expect(historical).toBeDefined();
      expect(historical?.arm).toBe(row.arm);
      expect(historical?.id).toBe(`${archivedFreshBaseline.id}-${row.arm}`);
      // Rendering has moved to the expanded frozen assignment. The archive
      // accessor must not shadow the newer title.
      expect(getVacancyTitleExperiment(row.slug)).toBeDefined();
      expect(getVacancyTitleOverride(row.slug)).toBe(getVacancyTitleExperiment(row.slug)?.titleOverride);
    }
  });

  it('freezes all 691 positive-impression URLs in eight exactly accounted arms', () => {
    expect(expandedBaseline.cohorts).toHaveLength(691);
    expect(new Set(expandedBaseline.cohorts.map((row) => row.slug)).size).toBe(691);
    expect(new Set(expandedBaseline.cohorts.map((row) => row.path)).size).toBe(691);
    expect(expandedBaseline.cohorts.every((row) => row.baseline.impressions > 0)).toBe(true);
    expect(expandedBaseline.cohorts.reduce((sum, row) => sum + row.baseline.impressions, 0)).toBe(7_614);
    expect(expandedBaseline.cohorts.reduce((sum, row) => sum + row.baseline.clicks, 0)).toBe(75);
    expect(expandedBaseline.arms).toHaveLength(8);
    expect(new Set(expandedBaseline.arms.map((arm) => arm.arm))).toEqual(new Set([
      'role', 'income', 'money_bag', 'banknotes', 'flying_money', 'income_first', 'benefit', 'lightning',
    ]));

    for (const arm of expandedBaseline.arms) {
      const rows = expandedBaseline.cohorts.filter((row) => row.arm === arm.arm);
      expect(rows).toHaveLength(arm.pages);
      expect(rows.reduce((sum, row) => sum + row.baseline.impressions, 0)).toBe(arm.impressions);
      expect(rows.reduce((sum, row) => sum + row.baseline.clicks, 0)).toBe(arm.clicks);
    }

    const cohortIds = new Set<number>();
    for (const row of expandedBaseline.cohorts) {
      const job = jobsBySlug.get(row.slug);
      const experiment = getVacancyTitleExperiment(row.slug);
      const armEmoji = emojiByArm[row.arm];
      const titleIncome = incomeArms.has(row.arm);
      const title = row.title;

      expect(job, `${row.slug} resolves to an active detail job`).toBeDefined();
      expect(job?.id).toBeGreaterThan(0);
      expect(cohortIds.has(job!.id), `${row.slug} has a unique active ID`).toBe(false);
      cohortIds.add(job!.id);
      const frozenId = expectedIdsBySlug.get(row.slug);
      if (frozenId !== undefined) expect(job?.id).toBe(frozenId);
      expect(job?.sourceSlug).toBe(row.sourceSlug);
      expect(job?.location).toBe(row.city);
      expect(job?.transport).toBe(row.transport);
      expect(job?.company).toBe(row.company);
      expect(row.path).toBe(`/v/${job?.detailSlug ?? job?.slug}/`);
      expect([...title].length, `${row.slug} title remains in the 90-codepoint builder budget`).toBeLessThanOrEqual(90);
      expect(title).toContain(row.city);

      expect(experiment).toBeDefined();
      expect(experiment?.id).toBe(`${expandedBaseline.id}-${row.arm}`);
      expect(experiment?.arm).toBe(row.arm);
      expect(experiment?.city).toBe(row.city);
      expect(experiment?.titleOverride).toBe(title);
      expect(experiment?.controlSourceSlug).toBe(row.sourceSlug);
      expect(experiment?.successThreshold).toContain('actual Google title uptake');
      expect(experiment?.successThreshold).toContain('query, device and position');
      expect(getVacancyTitleOverride(row.slug)).toBe(title);

      const foundEmoji = emojiTokens.filter((emoji) => title.includes(emoji));
      if (armEmoji) {
        expect(title.startsWith(armEmoji), `${row.slug} uses its frozen emoji`).toBe(true);
        expect(foundEmoji).toEqual([armEmoji]);
      } else {
        expect(foundEmoji, `${row.slug} has no emoji treatment`).toEqual([]);
      }

      if (titleIncome) {
        expect(title).toContain(row.income);
        expect(job?.salary).toBe(row.income);
        if (row.incomeBasis === 'owner_supplied_estimate') {
          expect(['ozon-fresh-courier', 'ozon-courier']).toContain(row.sourceSlug);
          expect(job?.salary).toBe(FRESH_TITLE_TEST_INCOME);
          expect(job?.salaryConfidence).toBe('estimated');
        } else {
          expect(job?.salaryConfidence).toBe(row.incomeBasis);
        }
      } else {
        expect(title).not.toContain(row.income);
      }

      if (row.arm === 'benefit') {
        const claim = title.slice(title.lastIndexOf(' — ') + 3);
        expect(isBenefitClaimSupported(claim, sourceClaimText(job!)), `${row.slug}: ${claim}`).toBe(true);
      }
    }
    expect(cohortIds.size).toBe(691);
  });

  it('uses current partner facts for the Horugvino source and does not add an unassigned Kemerovo title', () => {
    const job = jobsBySlug.get('ozon-goods-handler-horugvino-foot');
    const row = expandedBaseline.cohorts.find((entry) => entry.slug === job?.slug);

    expect(job).toBeDefined();
    expect(job?.salary).toBe('от 65 000 ₽/мес');
    expect(job?.details.schedule).toContain('2/2');
    expect(job?.ozonLeadForm?.hireObjectLabel).toBe('д. Хоругвино, 32/2');
    expect(row).toBeDefined();
    expect(getVacancyTitleOverride(job!.slug)).toBe(row?.title);
    expect(getVacancyTitleOverride('ozon-goods-handler-kemerovo-foot')).toBeUndefined();
    expect(getVacancyTitleExperiment('ozon-goods-handler-kemerovo-foot')).toBeUndefined();
  });

  it('keeps owner-supplied courier income estimated while preserving raw monthly terms and excluding schema salary', () => {
    const courierSources = ['ozon-fresh-courier', 'ozon-courier'];
    let checkedJobs = 0;

    for (const sourceSlug of courierSources) {
      const source = vacancySources.find((item) => item.slug === sourceSlug);
      const rawSource = ozonVacancySources.find((item) => item.slug === sourceSlug);
      const jobs = detailJobs.filter((item) => item.sourceSlug === sourceSlug);
      expect(source).toBeDefined();
      expect(rawSource).toBeDefined();
      expect(rawSource?.incomeCalculator?.mode).toBe('hidden');
      expect(source?.offers.length).toBe(jobs.length);

      for (const job of jobs) {
        const rawOffer = rawSource!.offers.find((offer) => offer.city === job.location && offer.transport === job.transport);
        const publicOffer = source!.offers.find((offer) => offer.city === job.location && offer.transport === job.transport);
        expect(rawOffer, `${job.slug} retains its raw monthly source record`).toBeDefined();
        expect(publicOffer?.pay.monthly?.min).toBe(rawOffer?.pay.monthly?.min);
        expect(rawOffer?.pay.monthly?.min).toBeGreaterThan(0);
        expect(job.salary).toBe(FRESH_TITLE_TEST_INCOME);
        expect(job.salaryConfidence).toBe('estimated');
        expect(job.details.payment_freq).toBe('Еженедельно');
        expect(job.details.rate).toContain('до 8 000 ₽/день');

        const russianText = [job.salary, job.description, job.shortDescription, job.details.rate, ...job.benefits].join(' ');
        expect(russianText).toContain('до 8 000 ₽/день');
        expect(russianText).not.toMatch(/\b(?:80\s?000|100\s?000)\s?₽|в месяц|ежемесячно/iu);

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
          baseSalaryMonthlyMin: rawOffer?.pay.monthly?.min,
          baseSalaryMonthlyMax: rawOffer?.pay.monthly?.max,
          salaryConfidence: job.salaryConfidence,
          currency: job.currency,
          datePosted: job.updatedAt,
        });
        expect(schema).not.toHaveProperty('baseSalary');
        checkedJobs += 1;
      }

      const translations = buildJobTranslationsBySource([source!]);
      const sampleJob = jobs[0];
      expect(sampleJob).toBeDefined();
      const originalMonthlyMin = rawSource!.offers[0].pay.monthly?.min;
      for (const language of SUPPORTED_LANGUAGES) {
        const entry = translations[language][sourceSlug][String(sampleJob.id)];
        const benefitTexts = Object.entries(entry)
          .filter(([key]) => /^ben_\d+$/u.test(key))
          .map(([, value]) => value);
        const translationText = [entry.description, ...benefitTexts].join(' ');
        expect(entry.salary).toBe(FRESH_TITLE_TEST_INCOME);
        expect(entry.description).toContain(FRESH_TITLE_TEST_INCOME_NOTES[language]);
        expect(benefitTexts[0]).toBe(FRESH_TITLE_TEST_INCOME_NOTES[language]);
        expect(entry.details_rate).toBe(FRESH_TITLE_TEST_INCOME_NOTE);
        expect(translationText).toContain(FRESH_TITLE_TEST_INCOME_NOTES[language]);
        const normalizedTranslationText = translationText.replace(/[\s\u00a0\u202f]/gu, '');
        expect(normalizedTranslationText).not.toContain(`${originalMonthlyMin}₽`);
        if (language !== 'ru') {
          expect(translationText).not.toContain(FRESH_TITLE_TEST_INCOME_NOTE);
          expect(translationText).not.toMatch(localizedMonthlyPattern[language]);
        }
      }
    }

    expect(checkedJobs).toBe(50);
    const nonOzonJob = detailJobs.find((item) => item.sourceSlug === 'samokat-courier')!;
    expect(applyTitleTestIncome(nonOzonJob)).toBe(nonOzonJob);
  });
});

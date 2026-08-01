import { describe, expect, it } from 'vitest';
import {
  buildComparisonCandidateCities,
  buildComparisonJobIndex,
  COMPARISON_MINIMUM,
  getCourierSalaryComparisonPath,
  getComparisonMonthlyEstimate,
  selectComparisonJobs,
  shouldShowComparisonCompany,
  type ComparisonCityRef,
  type ComparisonJobInput,
} from '../src/utils/courierSalaryComparison';

const city = (name: string, slug = name.toLowerCase()): ComparisonCityRef => ({
  name,
  slug,
});

const job = (
  id: number,
  company: string,
  location: string,
  transport: ComparisonJobInput['transport'] = 'bicycle',
  applyLink = 'https://employer.example/apply',
): ComparisonJobInput => ({
  id,
  company,
  location,
  transport,
  applyLink,
  salary: 'до 100 000 ₽/мес',
  currency: 'RUB',
  details: { rate: 'до 100 000 ₽/мес' },
});

describe('courier salary comparison selection', () => {
  it('keeps every local vacancy and uses neighbours only to reach four employers', () => {
    const jobs = [
      job(1, 'Купер', 'Казань'),
      job(2, 'Купер', 'Казань'),
      job(3, 'Самокат', 'Казань'),
      job(4, 'Яндекс Еда', 'Екатеринбург'),
      job(5, 'Ozon', 'Екатеринбург'),
    ];
    const index = buildComparisonJobIndex(jobs);

    const selected = selectComparisonJobs(
      index,
      city('Казань', 'kazan'),
      [city('Екатеринбург', 'ekaterinburg')],
      'bicycle',
    );

    expect(selected).toHaveLength(5);
    expect(selected.map((entry) => entry.job.id)).toEqual([1, 2, 3, 4, 5]);
    expect(selected.slice(0, 3).every((entry) => entry.isLocal)).toBe(true);
    expect(selected.slice(3).every((entry) => !entry.isLocal)).toBe(true);
    expect(new Set(selected.map((entry) => entry.job.company))).toHaveLength(COMPARISON_MINIMUM);
    expect(selected[3]?.sourceCity).toBe('Екатеринбург');
  });

  it('keeps all local candidates when the city already has more than four employers', () => {
    const jobs = [
      job(1, 'Работодатель 1', 'Казань'),
      job(2, 'Работодатель 2', 'Казань'),
      job(3, 'Работодатель 3', 'Казань'),
      job(4, 'Работодатель 4', 'Казань'),
      job(5, 'Работодатель 5', 'Казань'),
      job(6, 'Соседний работодатель', 'Екатеринбург'),
    ];
    const index = buildComparisonJobIndex(jobs);

    const selected = selectComparisonJobs(
      index,
      city('Казань', 'kazan'),
      [city('Екатеринбург', 'ekaterinburg')],
      'bicycle',
    );

    expect(selected).toHaveLength(5);
    expect(selected.every((entry) => entry.isLocal)).toBe(true);
    expect(selected.map((entry) => entry.job.id)).toEqual([1, 2, 3, 4, 5]);
  });

  it('matches a multi-city vacancy exactly and never treats nationwide rows as local', () => {
    const jobs = [
      job(1, 'Мульти', 'Алнаши, Вавож'),
      job(2, 'Россия', 'Вся Россия'),
      job(3, 'Локальный', 'Вавож'),
      job(4, 'Соседний 1', 'Ижевск'),
      job(5, 'Соседний 2', 'Ижевск'),
      job(6, 'Соседний 3', 'Ижевск'),
    ];
    const index = buildComparisonJobIndex(jobs);

    const selected = selectComparisonJobs(
      index,
      city('Вавож', 'vavozh'),
      [city('Ижевск', 'izhevsk')],
      'bicycle',
    );

    expect(selected.map((entry) => entry.job.company)).toEqual([
      'Мульти',
      'Локальный',
      'Соседний 1',
      'Соседний 2',
    ]);
    expect(selected.some((entry) => entry.job.company === 'Россия')).toBe(false);
    expect(selected[0]).toMatchObject({ sourceCity: 'Вавож', isLocal: true });
  });

  it('filters by transport before selecting employers', () => {
    const jobs = [
      job(1, 'Авто 1', 'Казань', 'auto'),
      job(2, 'Авто 2', 'Казань', 'auto'),
      job(3, 'Авто 3', 'Екатеринбург', 'auto'),
      job(4, 'Авто 4', 'Екатеринбург', 'auto'),
      job(5, 'Пеший 1', 'Казань', 'foot'),
    ];
    const index = buildComparisonJobIndex(jobs);

    const selected = selectComparisonJobs(
      index,
      city('Казань', 'kazan'),
      [city('Екатеринбург', 'ekaterinburg')],
      'auto',
    );

    expect(selected).toHaveLength(COMPARISON_MINIMUM);
    expect(selected.every((entry) => entry.job.transport === 'auto')).toBe(true);
  });

  it('excludes non-courier roles when the generated job has role signals', () => {
    const jobs = [
      {
        ...job(1, 'Купер', 'Казань', 'foot'),
        title: 'Пеший курьер в Купер',
        tags: ['foot', 'courier'],
        search_tags: ['пеший курьер'],
      },
      {
        ...job(2, 'Склад', 'Казань'),
        title: 'Оператор склада',
        tags: ['foot', 'warehouse'],
        search_tags: ['комплектовщик'],
      },
    ];
    const index = buildComparisonJobIndex(jobs);

    expect(index.get('bicycle')?.get('казань')).toBeUndefined();
    expect(index.get('foot')?.get('казань')?.map((item) => item.company)).toEqual(['Купер']);
  });

  it('keeps fallback vacancies in the origin city country', () => {
    const jobs = [
      job(1, 'Российский работодатель', 'Москва'),
      {
        ...job(2, 'Казахстанский работодатель', 'Актау'),
        currency: 'KZT' as const,
      },
      job(3, 'Российский соседний работодатель', 'Казань'),
      {
        ...job(4, 'Казахстанский соседний работодатель', 'Алматы'),
        currency: 'KZT' as const,
      },
    ];
    const index = buildComparisonJobIndex(jobs);

    const russianSelection = selectComparisonJobs(
      index,
      city('Москва', 'moskva'),
      [city('Актау', 'aktau'), city('Казань', 'kazan')],
      'bicycle',
      2,
    );
    expect(russianSelection.map((entry) => entry.job.company)).toEqual([
      'Российский работодатель',
      'Российский соседний работодатель',
    ]);

    const kazakhSelection = selectComparisonJobs(
      index,
      city('Актау', 'aktau'),
      [city('Москва', 'moskva'), city('Алматы', 'almaty')],
      'bicycle',
      2,
    );
    expect(kazakhSelection.map((entry) => entry.job.company)).toEqual([
      'Казахстанский работодатель',
      'Казахстанский соседний работодатель',
    ]);
  });

  it('deduplicates the origin and neighbour list without losing order', () => {
    const origin = city('Казань', 'kazan');
    const candidates = buildComparisonCandidateCities(
      origin,
      [city('Екатеринбург', 'ekaterinburg'), city('Казань', 'kazan')],
      [city('Самара', 'samara'), city('Екатеринбург', 'ekaterinburg')],
    );

    expect(candidates.map((candidate) => candidate.slug)).toEqual([
      'kazan',
      'ekaterinburg',
      'samara',
    ]);
  });

  it('uses a stable city-specific URL', () => {
    expect(getCourierSalaryComparisonPath('nizhniy-novgorod')).toBe(
      '/sravnenie-zarplat-kurerov-nizhniy-novgorod/',
    );
  });

  it('keeps a monthly source amount comparable without inventing a new value', () => {
    expect(
      getComparisonMonthlyEstimate({
        salary: 'до 100 000 ₽/мес',
        currency: 'RUB',
        details: { rate: 'до 100 000 ₽/мес' },
      }),
    ).toEqual({ value: 100_000, text: 'до 100 000 ₽/мес', basis: 'monthly' });
  });

  it('projects an explicit hourly rate to 22 stated 12-hour shifts', () => {
    expect(
      getComparisonMonthlyEstimate({
        salary: 'от 500 ₽/час',
        currency: 'RUB',
        details: { rate: '500 ₽/час, 6 000 ₽ за 12 часов' },
      }),
    ).toEqual({ value: 132_000, text: '≈ 132 000 ₽/мес', basis: 'hourly' });
  });

  it('does not convert a piece-rate description when no monthly basis is stated', () => {
    expect(
      getComparisonMonthlyEstimate({
        salary: 'до 120 000 ₽/мес',
        currency: 'RUB',
        details: { rate: 'Оплата за каждую доставку' },
      }),
    ).toEqual({ value: 120_000, text: 'до 120 000 ₽/мес', basis: 'monthly' });
  });

  it('does not repeat an employer already present in the vacancy title', () => {
    expect(shouldShowComparisonCompany('Велокурьер в Яндекс Еда в Москве', 'Яндекс Еда')).toBe(false);
    expect(shouldShowComparisonCompany('Курьер в Купер в Москве', 'Купер (ex. СберМаркет)')).toBe(false);
    expect(shouldShowComparisonCompany('Курьер в Москве', 'Яндекс Еда')).toBe(true);
  });
});

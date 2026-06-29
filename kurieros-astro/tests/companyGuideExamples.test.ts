import { describe, expect, it } from 'vitest';
import {
  orderGuideCities,
  pickGuideVacancyExamples,
} from '../src/utils/companyGuideExamples';
import type { JobLike } from '../src/utils/companies';

const makeJob = (
  city: string,
  title: string,
  tag: string,
): JobLike => ({
  slug: `${city}-${tag}`,
  title,
  company: 'Купер (ex. СберМаркет)',
  companyLogo: '/logos/kuper.png',
  location: city,
  salary: 'до 100 000 ₽/мес',
  tags: [tag],
  details: {
    payment_freq: 'Ежедневно',
    age: '18+',
    employment_type: 'Самозанятость',
  },
});

describe('company guide examples', () => {
  it('orders guide cities by editorial priority before source alphabetical order', () => {
    expect(
      orderGuideCities(
        ['Абакан', 'Азов', 'Москва', 'Казань', 'Санкт-Петербург'],
        ['Москва', 'Санкт-Петербург', 'Казань'],
        4,
      ),
    ).toEqual(['Москва', 'Санкт-Петербург', 'Казань', 'Абакан']);
  });

  it('picks vacancy examples from popular cities and rotates roles', () => {
    const jobs = [
      makeJob('Абакан', 'Пеший курьер в Купер в Абакане', 'foot'),
      makeJob('Москва', 'Пеший курьер в Купер в Москве', 'foot'),
      makeJob('Москва', 'Велокурьер в Купер в Москве', 'bicycle'),
      makeJob('Санкт-Петербург', 'Пеший курьер в Купер в Санкт-Петербурге', 'foot'),
      makeJob('Санкт-Петербург', 'Велокурьер в Купер в Санкт-Петербурге', 'bicycle'),
      makeJob('Екатеринбург', 'Автокурьер в Купер в Екатеринбурге', 'auto'),
      makeJob('Новосибирск', 'Сборщик заказов в Купер в Новосибирске', 'foot'),
    ];

    expect(
      pickGuideVacancyExamples(
        jobs,
        ['Москва', 'Санкт-Петербург', 'Екатеринбург', 'Новосибирск'],
        4,
      ).map((job) => `${job.location}: ${job.title}`),
    ).toEqual([
      'Москва: Пеший курьер в Купер в Москве',
      'Санкт-Петербург: Велокурьер в Купер в Санкт-Петербурге',
      'Екатеринбург: Автокурьер в Купер в Екатеринбурге',
      'Новосибирск: Сборщик заказов в Купер в Новосибирске',
    ]);
  });
});

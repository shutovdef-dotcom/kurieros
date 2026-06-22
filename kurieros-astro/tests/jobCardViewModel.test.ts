import { describe, expect, it } from 'vitest';
import type { GeneratedJob } from '../src/data/vacancyTypes';
import {
  toCompanyVacancyCardViewModel,
  toJobCardViewModel,
} from '../src/utils/jobCardViewModel';

const fullJob: GeneratedJob = {
  id: 1,
  sourceId: 2,
  sourceSlug: 'sample-source',
  slug: 'sample-job',
  title: 'Курьер',
  company: 'Компания',
  companyLogo: '/logos/sample.png',
  salary: 'до 100 000 ₽/мес',
  location: 'Москва',
  tags: ['foot'],
  labels: ['Пеший', '18+'],
  applyLink: 'https://example.com',
  description: 'Long detail description',
  requirements: ['Requirement'],
  benefits: ['Benefit'],
  requiredDocuments: ['Document'],
  details: {
    rate: 'до 5000 ₽/день',
    schedule: 'Свободный график',
    education: 'Без опыта',
    age: '18+',
    payment_freq: 'Еженедельно',
    citizenship: 'РФ',
    medical_book: 'Не нужна',
    self_employed: 'Да',
    employment_type: 'Самозанятость',
    transport_provision: 'Транспорт не требуется',
    uniform: 'Не нужна',
    os: 'Android или iOS',
  },
  search_tags: ['курьер'],
  shortDescription: 'Короткое описание',
  transport: 'foot',
  transportProvision: 'not_required',
  salaryConfidence: 'official',
  currency: 'RUB',
  updatedAt: '2026-04-24',
};

describe('job card view models', () => {
  it('projects full jobs to the fields the rich JobCard renders', () => {
    const model = toJobCardViewModel(fullJob);

    expect(model).toMatchObject({
      id: fullJob.id,
      sourceSlug: fullJob.sourceSlug,
      title: fullJob.title,
      salary: fullJob.salary,
      details: {
        schedule: fullJob.details.schedule,
        education: fullJob.details.education,
        payment_freq: fullJob.details.payment_freq,
        employment_type: fullJob.details.employment_type,
      },
    });
    expect(JSON.stringify(model)).not.toContain('Long detail description');
    expect(JSON.stringify(model)).not.toContain('Requirement');
    expect(JSON.stringify(model)).not.toContain('transport_provision');
  });

  it('projects company vacancy cards to their compact display contract', () => {
    const model = toCompanyVacancyCardViewModel(fullJob);

    expect(model).toEqual({
      slug: fullJob.slug,
      detailSlug: undefined,
      detailAnchor: undefined,
      title: fullJob.title,
      salary: fullJob.salary,
      location: fullJob.location,
      shortDescription: fullJob.shortDescription,
      labels: fullJob.labels,
    });
  });
});

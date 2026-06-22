import { describe, expect, it } from 'vitest';
import { buildApplyManifest } from '../src/utils/applyManifest';
import type { GeneratedJob } from '../src/data/vacancyTypes';

const baseJob = {
  id: 1,
  sourceId: 1,
  sourceSlug: 'sample-source',
  slug: 'sample-job-moskva-foot',
  title: 'Пеший курьер в Москве',
  company: 'Sample',
  companyLogo: '/logos/sample.svg',
  salary: 'до 120 000 ₽/мес',
  location: 'Москва',
  tags: ['foot'],
  labels: [],
  applyLink: 'https://partner.example/apply?utm_content=moskva-foot',
  description: '',
  requirements: [],
  benefits: [],
  requiredDocuments: [],
  details: {
    rate: '',
    schedule: 'Гибкий график',
    education: 'Не требуется',
    age: 'от 18 лет',
    payment_freq: 'ежедневно',
    citizenship: 'любое',
    medical_book: 'не требуется',
    self_employed: 'да',
    employment_type: 'Самозанятость',
    transport_provision: 'Свой транспорт',
    uniform: 'Уточняется',
    os: 'Android или iOS',
  },
  search_tags: [],
  shortDescription: '',
  transport: 'foot',
  transportProvision: 'own',
  salaryConfidence: 'partner',
  currency: 'RUB',
  updatedAt: '2026-06-22',
} satisfies GeneratedJob;

describe('buildApplyManifest', () => {
  it('keeps only trusted https apply targets and excludes lead-form jobs', () => {
    const manifest = buildApplyManifest([
      baseJob,
      { ...baseJob, id: 2, slug: 'ozon-courier-moskva-auto', applyLink: 'lead-form:ozon' },
      { ...baseJob, id: 3, slug: 'broken-job', applyLink: 'javascript:alert(1)' },
    ]);

    expect(manifest.targets).toEqual({
      'sample-job-moskva-foot': 'https://partner.example/apply?utm_content=moskva-foot',
    });
  });

  it('adds subject variants as independent apply choices without changing the canonical job slug', () => {
    const manifest = buildApplyManifest([
      {
        ...baseJob,
        subjectVariants: [
          {
            id: 'math',
            title: 'Репетитор по математике',
            label: 'Математика',
            applyLink: 'https://partner.example/apply?utm_campaign=math',
          },
        ],
      },
    ]);

    expect(manifest.targets).toEqual({
      'sample-job-moskva-foot': 'https://partner.example/apply?utm_content=moskva-foot',
      'sample-job-moskva-foot--math': 'https://partner.example/apply?utm_campaign=math',
    });
  });
});

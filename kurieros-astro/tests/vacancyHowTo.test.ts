import { describe, expect, it } from 'vitest';
import {
  buildVacancyHowToSteps,
  resolveVacancyHowToTemplate,
} from '../src/utils/vacancyHowTo';

type TestHowToJob = Parameters<typeof buildVacancyHowToSteps>[0]['job'];
type TestHowToJobOverrides = Partial<Omit<TestHowToJob, 'details'>> & {
  details?: Partial<TestHowToJob['details']>;
};

const buildJob = (overrides: TestHowToJobOverrides = {}): TestHowToJob => ({
  company: 'Voxys',
  salary: '50 000 ₽/мес',
  transport: 'office',
  ...overrides,
  details: {
    employment_type: 'Официальное трудоустройство',
    payment_freq: '2 раза в месяц',
    ...overrides.details,
  },
});

const stepsText = (steps: ReturnType<typeof buildVacancyHowToSteps>) =>
  steps.flatMap((step) => [step.name, step.text]).join('\n');

describe('resolveVacancyHowToTemplate', () => {
  it('uses the configured template before any fallback', () => {
    expect(
      resolveVacancyHowToTemplate({
        configuredTemplate: 'call_center',
        sourceSlug: 'some-courier',
        transport: 'foot',
      }),
    ).toBe('call_center');
  });

  it('falls back by source slug and transport', () => {
    expect(
      resolveVacancyHowToTemplate({
        sourceSlug: 'alfa-bank-representative',
        transport: 'auto',
      }),
    ).toBe('bank_representative');
    expect(resolveVacancyHowToTemplate({ transport: 'remote' })).toBe('remote_operator');
    expect(resolveVacancyHowToTemplate({ transport: 'office' })).toBe('office_employee');
    expect(resolveVacancyHowToTemplate({ transport: 'service' })).toBe('service_worker');
    expect(resolveVacancyHowToTemplate({ transport: 'foot' })).toBe('courier');
  });
});

describe('buildVacancyHowToSteps', () => {
  it('renders a call-center flow without courier instructions', () => {
    const text = stepsText(
      buildVacancyHowToSteps({
        job: buildJob(),
        jobCities: ['Барнаул'],
        template: 'call_center',
      }),
    );

    expect(text).toContain('контакт-центре');
    expect(text).toContain('голосовой поддержки');
    expect(text).not.toContain('приложению курьера');
    expect(text).not.toContain('принимайте заказы');
  });

  it('keeps courier-specific steps for courier templates', () => {
    const courierJob = buildJob({
      company: 'Яндекс Еда',
      salary: 'до 140 000 ₽/мес',
      transport: 'foot',
      details: {
        employment_type: 'Самозанятость',
        payment_freq: 'Еженедельно',
      },
    });
    const text = stepsText(
      buildVacancyHowToSteps({
        job: courierJob,
        jobCities: ['Москва'],
        template: 'courier',
      }),
    );

    expect(text).toContain('Мой налог');
    expect(text).toContain('медицинскую книжку');
    expect(text).toContain('приложению курьера');
  });

  it('renders a service-worker flow without delivery-specific instructions', () => {
    const serviceJob = buildJob({
      company: 'Qlean',
      salary: '30 000–120 000 ₽/мес',
      transport: 'service',
      details: {
        employment_type: 'Самозанятость',
        payment_freq: 'Каждый понедельник или наличными сразу',
      },
    });
    const text = stepsText(
      buildVacancyHowToSteps({
        job: serviceJob,
        jobCities: ['Москва'],
        template: 'service_worker',
      }),
    );

    expect(text).toContain('стандарты выполнения заказов');
    expect(text).toContain('Берите первые заказы');
    expect(text).not.toContain('приложению курьера');
    expect(text).not.toContain('медицинскую книжку');
  });
});

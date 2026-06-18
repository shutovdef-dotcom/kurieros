import { describe, expect, it } from 'vitest';
import jobs from '../src/data/jobs';
import { mapCompareJob } from '../src/utils/compareJob';

const getCompareTransportProvision = (slug: string) => {
  const job = jobs.find((item) => item.slug === slug);
  expect(job, `fixture job ${slug}`).toBeTruthy();

  return mapCompareJob(job!).transport_provision;
};

describe('compare transport provision labels for bicycle vacancies', () => {
  it('shows partner rental for bike delivery brands that support it', () => {
    for (const slug of [
      'yandex-eda-courier-moskva-bicycle',
      'kuper-bike-courier-moskva-bicycle',
      'samokat-courier-moskva-bicycle',
    ]) {
      expect(getCompareTransportProvision(slug)).toBe('Свой транспорт или аренда у партнёра');
    }
  });

  it('keeps Alfa-Bank bike representative as own transport', () => {
    expect(getCompareTransportProvision('alfa-bank-representative-moskva-bicycle')).toBe(
      'Нужно своё транспортное средство',
    );
  });
});

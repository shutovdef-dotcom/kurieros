import { describe, expect, it } from 'vitest';
import type { JobTranslationEntry } from '../src/data/jobs';
import {
  buildRuntimeTranslationFragment,
  compactFragment,
  encodeRepeatedFragmentValues,
  isRuntimeTranslatedVacancyField,
  pickRuntimeTranslationDelta,
} from '../src/utils/vacancyTranslationFragments';

const entry = (overrides: Record<string, string>): JobTranslationEntry => ({
  page_title: 'RU meta title',
  page_description: 'RU meta description',
  updated_date: '24 апреля 2026 г.',
  title: 'RU title',
  company: 'RU company',
  salary: 'до 100 000 ₽/мес',
  location: 'Москва',
  shortDescription: 'RU short',
  description: 'RU description',
  label_0: 'Пеший',
  req_0: 'RU requirement',
  ben_0: 'RU benefit',
  doc_0: 'RU document',
  details_schedule: 'График 2/2',
  details_education: 'Без опыта',
  details_payment_freq: 'Еженедельно',
  details_age: '18+',
  details_citizenship: 'РФ',
  details_rate: '1000 ₽/день',
  details_employment_type: 'Самозанятость',
  details_transport_provision: 'Транспорт не требуется',
  ...overrides,
} as JobTranslationEntry);

describe('vacancy translation fragments', () => {
  it('keeps only runtime-translated content fields in public deltas', () => {
    const ru = entry({});
    const translated = entry({
      page_title: 'Translated meta title',
      title: 'Translated visible title',
      salary: 'Translated salary',
      shortDescription: 'Translated short',
      description: 'Translated description',
      req_0: 'Translated requirement',
      ben_0: 'RU benefit',
      doc_0: 'Translated document',
    });

    expect(pickRuntimeTranslationDelta(translated, ru)).toEqual({
      shortDescription: 'Translated short',
      description: 'Translated description',
      req_0: 'Translated requirement',
      doc_0: 'Translated document',
    });

    for (const key of ['page_title', 'page_description', 'title', 'salary', 'location']) {
      expect(isRuntimeTranslatedVacancyField(key)).toBe(false);
    }
  });

  it('compacts repeated translated fields with defaults and dictionaries', () => {
    const variantA = 'Variant A repeated long translated requirement text';
    const variantB = 'Variant B repeated long translated requirement text';
    const compact = compactFragment({
      '1': { description: 'Same translated body', req_0: variantA },
      '2': { description: 'Same translated body', req_0: variantA },
      '3': { description: 'Same translated body', req_0: variantB },
      '4': { description: 'Same translated body', req_0: variantB },
      '5': { description: 'Same translated body', req_0: variantB },
    });
    const encoded = encodeRepeatedFragmentValues(compact, 0);

    expect(encoded.defaults).toEqual({ description: 'Same translated body' });
    expect(encoded.dict?.req_0).toEqual([variantA, variantB]);
    expect(encoded.entries['1']).toEqual({ req_0: 0 });
    expect(encoded.entries['3']).toEqual({ req_0: 1 });
  });

  it('omits jobs whose translated content equals the Russian fallback', () => {
    const ru = {
      '1': entry({}),
      '2': entry({}),
    };
    const translated = {
      '1': entry({}),
      '2': entry({ description: 'Translated description' }),
    };

    const fragment = buildRuntimeTranslationFragment(translated, ru);

    expect(fragment.entries).toHaveProperty('2');
    expect(fragment.entries).not.toHaveProperty('1');
    expect(JSON.stringify(fragment)).not.toContain('RU meta title');
    expect(JSON.stringify(fragment)).not.toContain('RU title');
  });
});

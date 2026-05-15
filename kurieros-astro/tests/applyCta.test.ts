import { describe, it, expect } from 'vitest';
import { getApplyCta } from '../src/utils/applyCta';

describe('getApplyCta — salaryMaxNumeric extraction', () => {
  it('returns the single number from a flat salary string', () => {
    expect(getApplyCta({ salary: '80000 руб' }).salaryMaxNumeric).toBe(80000);
  });

  it('returns the max from a range salary string (em dash)', () => {
    expect(getApplyCta({ salary: '60000–90000 руб' }).salaryMaxNumeric).toBe(90000);
  });

  it('returns the max from a range salary string (hyphen-minus)', () => {
    expect(getApplyCta({ salary: '60000-90000 руб' }).salaryMaxNumeric).toBe(90000);
  });

  it('handles grouped digits with regular spaces ("298 800")', () => {
    expect(getApplyCta({ salary: 'до 298 800 ₽/мес' }).salaryMaxNumeric).toBe(298800);
  });

  it('handles grouped digits with NBSP (U+00A0)', () => {
    expect(getApplyCta({ salary: 'до 298 800 ₽/мес' }).salaryMaxNumeric).toBe(298800);
  });

  it('handles grouped digits with Narrow No-Break Space (U+202F)', () => {
    expect(getApplyCta({ salary: 'до 298 800 ₽/мес' }).salaryMaxNumeric).toBe(298800);
  });

  it('returns 0 when the salary string has no digits', () => {
    expect(getApplyCta({ salary: 'по договорённости' }).salaryMaxNumeric).toBe(0);
  });

  it('returns 0 for an empty salary string', () => {
    expect(getApplyCta({ salary: '' }).salaryMaxNumeric).toBe(0);
  });

  it('treats an undefined-like salary safely (returns 0)', () => {
    // The Pick<GeneratedJob, 'salary'> type requires a string, but the
    // production IIFE used `(job.salary ?? '')` — exercise the nullish
    // branch behaviourally via a deliberate widening cast.
    const job = { salary: undefined as unknown as string };
    expect(getApplyCta(job).salaryMaxNumeric).toBe(0);
  });

  it('extracts the max across multiple numeric tokens (rate + monthly)', () => {
    // Mirrors the `shared.ts` "rate" field: "180 ₽/час, 2 160 ₽ за
    // 12 часов, до 64 800 ₽ за 30 смен". The monthly ceiling (64800)
    // is the only one we want surfaced.
    expect(
      getApplyCta({ salary: '180 ₽/час, 2 160 ₽ за 12 часов, до 64 800 ₽ за 30 смен' }).salaryMaxNumeric,
    ).toBe(64800);
  });
});

describe('getApplyCta — applyLabel formatting', () => {
  it('emits the plain CTA when salaryMaxNumeric < 10000', () => {
    expect(getApplyCta({ salary: '500 ₽/час' }).applyLabel).toBe('Откликнуться');
  });

  it('emits the plain CTA when the salary string is empty', () => {
    expect(getApplyCta({ salary: '' }).applyLabel).toBe('Откликнуться');
  });

  it('emits the plain CTA when there are no digits', () => {
    expect(getApplyCta({ salary: 'по договорённости' }).applyLabel).toBe('Откликнуться');
  });

  it('emits the ceiling-anchored CTA when salaryMaxNumeric >= 10000', () => {
    expect(getApplyCta({ salary: '80000 руб' }).applyLabel).toBe('Откликнуться, зп до 80к. руб');
  });

  it('treats exactly 10000 as ≥ threshold (boundary)', () => {
    expect(getApplyCta({ salary: '10000 руб' }).applyLabel).toBe('Откликнуться, зп до 10к. руб');
  });

  it('treats 9999 as below threshold (boundary minus 1)', () => {
    expect(getApplyCta({ salary: '9999 руб' }).applyLabel).toBe('Откликнуться');
  });

  it('floors to thousands (75800 → 75к, not 76к)', () => {
    expect(getApplyCta({ salary: '75800 руб' }).applyLabel).toBe('Откликнуться, зп до 75к. руб');
  });

  it('floors to thousands (298800 → 298к, not 299к) — regression for spec example', () => {
    expect(getApplyCta({ salary: 'до 298 800 ₽/мес' }).applyLabel).toBe('Откликнуться, зп до 298к. руб');
  });

  it('uses the range max for the label (60000–90000 → 90к)', () => {
    expect(getApplyCta({ salary: '60000–90000 руб' }).applyLabel).toBe('Откликнуться, зп до 90к. руб');
  });
});

describe('getApplyCta — behavioural parity with the pre-extraction IIFE', () => {
  // Mirror of the original IIFE (JobCard.astro variant, with the
  // NBSP+NNBSP regex class). The shared helper MUST agree with this on
  // every input or the CTA drifts between JobCard and the detail page —
  // the audit H4 issue.
  const legacyCompute = (salary: string) => {
    const raw = (salary ?? '').replace(/[  ]/g, ' ');
    const matches = raw.match(/(\d[\d\s]*)/g);
    let salaryMaxNumeric = 0;
    if (matches) {
      const numbers = matches
        .map((m: string) => Number.parseInt(m.replace(/\s+/g, ''), 10))
        .filter((n: number) => Number.isFinite(n) && n > 0);
      if (numbers.length) salaryMaxNumeric = Math.max(...numbers);
    }
    const applyLabel = salaryMaxNumeric >= 10000
      ? `Откликнуться, зп до ${Math.floor(salaryMaxNumeric / 1000)}к. руб`
      : 'Откликнуться';
    return { salaryMaxNumeric, applyLabel };
  };

  const fixtures = [
    '80000 руб',
    '60000–90000 руб',
    'до 298 800 ₽/мес',
    'до 298 800 ₽/мес',
    'до 298 800 ₽/мес',
    '180 ₽/час, 2 160 ₽ за 12 часов, до 64 800 ₽ за 30 смен',
    '180 ₽/час',
    '540 ₽/день',
    '9999 руб',
    '10000 руб',
    'по договорённости',
    '',
    'от 70 000 до 150 000 ₽',
    '120 000–180 000 ₽/мес',
  ];

  for (const salary of fixtures) {
    it(`matches legacy IIFE for ${JSON.stringify(salary)}`, () => {
      expect(getApplyCta({ salary })).toEqual(legacyCompute(salary));
    });
  }
});

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

  it('emits a fixed-salary CTA when a one-number salary has no limit marker', () => {
    expect(getApplyCta({ salary: '80000 руб' }).applyLabel).toBe('Откликнуться, зп 80к. руб');
  });

  it('treats exactly 10000 as ≥ threshold (boundary)', () => {
    expect(getApplyCta({ salary: '10000 руб' }).applyLabel).toBe('Откликнуться, зп 10к. руб');
  });

  it('treats 9999 as below threshold (boundary minus 1)', () => {
    expect(getApplyCta({ salary: '9999 руб' }).applyLabel).toBe('Откликнуться');
  });

  it('keeps one decimal for fixed salaries that are not round thousands', () => {
    expect(getApplyCta({ salary: '43 500 ₽/мес' }).applyLabel).toBe('Откликнуться, зп 43,5к. руб');
  });

  it('uses the ceiling wording when the salary has a limit marker', () => {
    expect(getApplyCta({ salary: 'до 75 800 руб' }).applyLabel).toBe('Откликнуться, зп до 75к. руб');
  });

  it('floors to thousands (298800 → 298к, not 299к) — regression for spec example', () => {
    expect(getApplyCta({ salary: 'до 298 800 ₽/мес' }).applyLabel).toBe('Откликнуться, зп до 298к. руб');
  });

  it('uses the range max for the label (60000–90000 → 90к)', () => {
    expect(getApplyCta({ salary: '60000–90000 руб' }).applyLabel).toBe('Откликнуться, зп до 90к. руб');
  });

  it('uses the offer currency label for Kazakhstan salaries', () => {
    expect(getApplyCta({ salary: 'до 595 000 ₸/мес', currency: 'KZT' }).applyLabel).toBe(
      'Откликнуться, зп до 595к. ₸',
    );
  });

  it('formats Uzbekistan salaries in millions for the CTA', () => {
    expect(getApplyCta({ salary: 'до 6 800 000 сум/мес', currency: 'UZS' }).applyLabel).toBe(
      'Откликнуться, зп до 6,8 млн. сум',
    );
  });

  it('keeps small Belarus salaries visible instead of applying the RUB threshold', () => {
    expect(getApplyCta({ salary: 'до 1 700 BYN/мес', currency: 'BYN' }).applyLabel).toBe(
      'Откликнуться, зп до 1,7к. BYN',
    );
  });
});

describe('getApplyCta — formatting matrix', () => {
  const expectedCompute = (salary: string) => {
    const raw = (salary ?? '').replace(/[  ]/g, ' ');
    const matches = raw.match(/(\d[\d\s]*)/g);
    const numbers = matches
      ? matches
          .map((m: string) => Number.parseInt(m.replace(/\s+/g, ''), 10))
          .filter((n: number) => Number.isFinite(n) && n > 0)
      : [];
    const salaryMaxNumeric = numbers.length ? Math.max(...numbers) : 0;
    const compact = (amount: number, allowDecimal = false) => {
      if (!allowDecimal) return `${Math.floor(amount / 1000)}к`;
      const thousands = amount / 1000;
      if (Number.isInteger(thousands)) return `${thousands}к`;
      return `${Math.floor(thousands * 10) / 10}`.replace('.', ',') + 'к';
    };
    const isFixedSalary = numbers.length === 1 && !/(?:^|\s)(?:до|от)(?=\s|$)/i.test(raw);
    const applyLabel = salaryMaxNumeric >= 10000
      ? `Откликнуться, зп ${isFixedSalary ? '' : 'до '}${compact(salaryMaxNumeric, isFixedSalary)}. руб`
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
    '43 500 ₽/мес',
    'по договорённости',
    '',
    'от 70 000 до 150 000 ₽',
    '120 000–180 000 ₽/мес',
  ];

  for (const salary of fixtures) {
    it(`formats ${JSON.stringify(salary)}`, () => {
      expect(getApplyCta({ salary })).toEqual(expectedCompute(salary));
    });
  }
});

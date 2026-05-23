/**
 * Unit tests for src/utils/flexibleSchedule.ts
 * AAA pattern throughout. All inputs are synthetic schedule strings
 * (the distinct shapes observed in the vacancy dataset).
 */

import { describe, it, expect } from 'vitest';
import { isFlexibleSchedule } from '../src/utils/flexibleSchedule';

describe('isFlexibleSchedule — flexible / part-time schedules', () => {
  const flexible = [
    'Свободный график от 2 часов',
    'Смена до 12 часов, гибкий график от 3 часов в день',
    'От 2 дней в неделю, время выбирается из доступных интервалов',
    'Гибкий график: подработка или полная смена',
    'Гибкий график, полностью удалённый формат',
    'только сб и вс; с 09:00 до 21:00',
    'Свободный график, слоты от 4 часов',
    'любой; от 4х часов в день',
    '2-3 дня в неделю минимум',
    'от 3х дней в неделю',
    'любой график, с 9 до 18, неполный рабочий день (от 6 часов)',
    'Гибкий',
  ];

  for (const schedule of flexible) {
    it(`flags "${schedule}"`, () => {
      expect(isFlexibleSchedule(schedule)).toBe(true);
    });
  }
});

describe('isFlexibleSchedule — fixed-shift schedules', () => {
  const fixed = [
    '5/2',
    '2/2',
    'Смена до 12 часов',
    '5/2 плав вых | 2/2; с 09:00 до 21:00',
    'График работы 5/2',
    'График работы 5/2, 2/2',
    '2/2; 3/3; 5/2; 4/3; 6/1; 7/0',
    '2024-02-05 00:00:00',
  ];

  for (const schedule of fixed) {
    it(`does not flag "${schedule}"`, () => {
      expect(isFlexibleSchedule(schedule)).toBe(false);
    });
  }
});

describe('isFlexibleSchedule — empty / missing input', () => {
  it('returns false for an empty string', () => {
    expect(isFlexibleSchedule('')).toBe(false);
  });

  it('returns false for a blank string', () => {
    expect(isFlexibleSchedule('   ')).toBe(false);
  });

  it('returns false for null', () => {
    expect(isFlexibleSchedule(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isFlexibleSchedule(undefined)).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isFlexibleSchedule('ПОДРАБОТКА')).toBe(true);
  });
});

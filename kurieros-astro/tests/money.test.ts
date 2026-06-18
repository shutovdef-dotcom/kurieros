import { describe, expect, it } from 'vitest';
import {
  formatMoneyPerHour,
  formatMoneyWithCurrency,
  formatMonthlyMaxText,
  getCurrencyLabel,
} from '../src/utils/money';

describe('money formatters', () => {
  it('keeps RUB formatting compact and readable', () => {
    expect(formatMoneyWithCurrency(298_800, 'RUB')).toBe('298 800 ₽');
  });

  it('formats Kazakhstan rates in tenge', () => {
    expect(getCurrencyLabel('KZT')).toBe('₸');
    expect(formatMoneyWithCurrency(595_000, 'KZT')).toBe('595 000 ₸');
    expect(formatMoneyPerHour(1_985, 'KZT')).toBe('1 985 ₸/час');
  });

  it('formats Kyrgyzstan and Uzbekistan values with local labels', () => {
    expect(formatMoneyPerHour(215, 'KGS')).toBe('215 сом/час');
    expect(formatMonthlyMaxText(6_800_000, 'UZS')).toBe('до 6 800 000 сум/мес');
  });
});

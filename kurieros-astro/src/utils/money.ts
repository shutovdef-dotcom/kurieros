import type { CurrencyCode } from '../data/vacancyTypes';

export const CURRENCY_LABELS = {
  RUB: '₽',
  BYN: 'BYN',
  KZT: '₸',
  KGS: 'сом',
  UZS: 'сум',
} as const satisfies Record<CurrencyCode, string>;

export const SUPPORTED_CURRENCIES = Object.keys(CURRENCY_LABELS) as CurrencyCode[];

const NBSP_RE = /[  ]/g;

export const normalizeMoneySpaces = (value: string): string => value.replace(NBSP_RE, ' ');

export const formatMoneyAmount = (value: number): string =>
  normalizeMoneySpaces(new Intl.NumberFormat('ru-RU').format(Math.round(value)));

export const getCurrencyLabel = (currency: CurrencyCode): string => CURRENCY_LABELS[currency];

export const formatMoneyWithCurrency = (value: number, currency: CurrencyCode): string =>
  `${formatMoneyAmount(value)} ${getCurrencyLabel(currency)}`;

export const formatMoneyPerMonth = (value: number, currency: CurrencyCode): string =>
  `${formatMoneyWithCurrency(value, currency)}/мес`;

export const formatMoneyPerHour = (value: number, currency: CurrencyCode): string =>
  `${formatMoneyWithCurrency(value, currency)}/час`;

export const formatMoneyPerDay = (value: number, currency: CurrencyCode): string =>
  `${formatMoneyWithCurrency(value, currency)}/день`;

export const formatMonthlyMaxText = (value: number, currency: CurrencyCode): string =>
  `до ${formatMoneyPerMonth(value, currency)}`;

export const formatCourierRateText = (
  hourly: number,
  daily: number,
  monthly: number,
  currency: CurrencyCode,
): string =>
  `${formatMoneyPerHour(hourly, currency)}, ${formatMoneyWithCurrency(daily, currency)} за 12 часов, до ${formatMoneyWithCurrency(monthly, currency)} за 30 смен`;

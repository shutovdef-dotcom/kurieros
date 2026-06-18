import type { CurrencyCode, GeneratedJob } from '../data/vacancyTypes';

/**
 * Apply CTA computation — single source of truth.
 *
 * Used by:
 *   - src/components/JobCard.astro (card surface)
 *   - src/pages/v/[slug].astro (detail page hero/sidebar via props)
 *
 * Marketing-facing copy lives here. The 10000-RUB threshold and compact
 * thousand formatting are intentional — see `getApplyCta` for the
 * rationale. Audit ref: v2 H4.
 *
 * Behavioural contract (must match the pre-extraction IIFE byte-for-byte):
 *   1. Extract a numeric ceiling from the human salary string (e.g.
 *      «до 298 800 ₽/мес» → 298800). Used for the GA4 `apply_click`
 *      event payload so we can analyse click-through value distribution.
 *      Best-effort: returns 0 on parse miss.
 *   2. Salary-anchored CTA: when the parsed monthly amount is meaningful
 *      (≥10k) the button advertises it in compact form. Ranges and salary
 *      ceilings keep «зп до Nк. руб»; fixed one-number salaries render as
 *      «зп Nк. руб» so an okład/fixed salary is not presented as a maximum.
 *      Hourly/per-shift values fall below the threshold and quietly fall
 *      back to the plain CTA so the button never reads «до 0к. руб».
 */
export interface ApplyCta {
  salaryMaxNumeric: number;
  applyLabel: string;
}

/** Minimum monthly-salary ceiling (RUB) before the CTA advertises the number. */
const SALARY_THRESHOLD_RUB = 10_000;
const SALARY_THRESHOLDS_BY_CURRENCY: Record<CurrencyCode, number> = {
  RUB: SALARY_THRESHOLD_RUB,
  BYN: 100,
  KZT: 10_000,
  KGS: 10_000,
  UZS: 1_000_000,
};

const CTA_CURRENCY_LABELS: Record<CurrencyCode, string> = {
  RUB: 'руб',
  BYN: 'BYN',
  KZT: '₸',
  KGS: 'сом',
  UZS: 'сум',
};

/** Default CTA copy when no meaningful monthly ceiling is parsed. */
const DEFAULT_APPLY_LABEL = 'Откликнуться';

const LIMIT_MARKER_RE = /(?:^|\s)(?:до|от)(?=\s|$)/i;

const formatCompactThousands = (amount: number, allowDecimal = false) => {
  if (!allowDecimal) return `${Math.floor(amount / 1000)}к`;

  const thousands = amount / 1000;
  if (Number.isInteger(thousands)) return `${thousands}к`;

  return `${Math.floor(thousands * 10) / 10}`.replace('.', ',') + 'к';
};

const formatCompactMillions = (amount: number) => {
  const millions = amount / 1_000_000;
  if (Number.isInteger(millions)) return `${millions} млн`;

  return `${Math.floor(millions * 10) / 10}`.replace('.', ',') + ' млн';
};

const formatCompactSalary = (amount: number, currency: CurrencyCode, allowDecimal: boolean) =>
  currency === 'UZS'
    ? formatCompactMillions(amount)
    : formatCompactThousands(amount, allowDecimal);

export function getApplyCta(job: Pick<GeneratedJob, 'salary'> & Partial<Pick<GeneratedJob, 'currency'>>): ApplyCta {
  // Normalise NBSP (U+00A0) and Narrow No-Break Space (U+202F) to plain
  // ASCII space so the regex below treats grouped digits ("298 800")
  // uniformly. JS `\s` already matches both, so the captured group is
  // safe either way — this replace is defensive and keeps the matcher
  // input clean.
  const raw = (job.salary ?? '').replace(/[  ]/g, ' ');
  const matches = raw.match(/(\d[\d\s]*)/g);
  const numbers = matches
    ? matches
        .map((m: string) => Number.parseInt(m.replace(/\s+/g, ''), 10))
        .filter((n: number) => Number.isFinite(n) && n > 0)
    : [];
  const salaryMaxNumeric = numbers.length ? Math.max(...numbers) : 0;
  const isFixedSalary = numbers.length === 1 && !LIMIT_MARKER_RE.test(raw);
  const currency = job.currency ?? 'RUB';
  const salaryThreshold = SALARY_THRESHOLDS_BY_CURRENCY[currency];
  const currencyLabel = CTA_CURRENCY_LABELS[currency];
  const allowDecimal = isFixedSalary || currency !== 'RUB';

  const applyLabel = salaryMaxNumeric >= salaryThreshold
    ? `${DEFAULT_APPLY_LABEL}, зп ${isFixedSalary ? '' : 'до '}${formatCompactSalary(
        salaryMaxNumeric,
        currency,
        allowDecimal,
      )}. ${currencyLabel}`
    : DEFAULT_APPLY_LABEL;

  return { salaryMaxNumeric, applyLabel };
}

import type { GeneratedJob } from '../data/vacancyTypes';

/**
 * Apply CTA computation — single source of truth.
 *
 * Used by:
 *   - src/components/JobCard.astro (card surface)
 *   - src/pages/v/[slug].astro (detail page hero/sidebar via props)
 *
 * Marketing-facing copy lives here. The 10000-RUB threshold and the
 * floor-to-thousand decision are intentional — see the inline comment
 * inside `getApplyCta` for the rationale. Audit ref: v2 H4.
 *
 * Behavioural contract (must match the pre-extraction IIFE byte-for-byte):
 *   1. Extract a numeric ceiling from the human salary string (e.g.
 *      «до 298 800 ₽/мес» → 298800). Used for the GA4 `apply_click`
 *      event payload so we can analyse click-through value distribution.
 *      Best-effort: returns 0 on parse miss.
 *   2. Ceiling-anchored CTA: when the parsed monthly max is meaningful
 *      (≥10k) the button advertises it as «зп до Nк. руб», giving the
 *      user a concrete payoff in the click decision. Floor to a thousand
 *      keeps the number from over-promising (298800 → 298к, not 299к).
 *      Hourly/per-shift values fall below the threshold and quietly fall
 *      back to the plain CTA so the button never reads «до 0к. руб».
 */
export interface ApplyCta {
  salaryMaxNumeric: number;
  applyLabel: string;
}

/** Minimum monthly-salary ceiling (RUB) before the CTA advertises the number. */
const SALARY_THRESHOLD_RUB = 10_000;

/** Default CTA copy when no meaningful monthly ceiling is parsed. */
const DEFAULT_APPLY_LABEL = 'Откликнуться';

export function getApplyCta(job: Pick<GeneratedJob, 'salary'>): ApplyCta {
  // Normalise NBSP (U+00A0) and Narrow No-Break Space (U+202F) to plain
  // ASCII space so the regex below treats grouped digits ("298 800")
  // uniformly. JS `\s` already matches both, so the captured group is
  // safe either way — this replace is defensive and keeps the matcher
  // input clean.
  const raw = (job.salary ?? '').replace(/[  ]/g, ' ');
  const matches = raw.match(/(\d[\d\s]*)/g);
  const salaryMaxNumeric = matches
    ? (() => {
        const numbers = matches
          .map((m: string) => Number.parseInt(m.replace(/\s+/g, ''), 10))
          .filter((n: number) => Number.isFinite(n) && n > 0);
        return numbers.length ? Math.max(...numbers) : 0;
      })()
    : 0;

  const applyLabel = salaryMaxNumeric >= SALARY_THRESHOLD_RUB
    ? `${DEFAULT_APPLY_LABEL}, зп до ${Math.floor(salaryMaxNumeric / 1000)}к. руб`
    : DEFAULT_APPLY_LABEL;

  return { salaryMaxNumeric, applyLabel };
}

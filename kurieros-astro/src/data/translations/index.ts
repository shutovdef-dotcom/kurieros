// Translation dictionary assembler.
//
// Shell UI strings are Russian-only (per PR #131 policy). Per-vacancy
// content translations live in /vacancy-translations/<lang>/<slug>.json
// and merge into `translations[lang].vacancies` at runtime via the
// inline manager in BaseLayout.astro.
//
// This module builds a single Russian shell dict from the per-feature
// files, then projects it into every `SupportedLanguage` slot of the
// exported `translations` map. Each slot is an independent deep clone
// so the runtime vacancy-merge step (BaseLayout) can mutate one
// language's `.vacancies` without leaking into another.

import { base } from './base';
import { navMainTranslations } from './nav-main';
import { vacancyCommonTranslations } from './vacancy';
import { reviewFormFooterTranslations } from './review-form-footer';
import { russianReviewUi } from './russian-review-ui';
import { vpnCloseTranslations } from './vpn-close';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from './types';

// Compose the assembled shell dict immutably. Spreads keep `base` and
// each per-feature module untouched, and the inferred `composedBase`
// type carries every key (including the non-base `vacancy` and `form`
// branches) so callers stay strongly typed without casts.
//
// `form` is supplied by `russianReviewUi` (review modal labels stay
// Russian per PR #131 policy). `review-form-footer.ts` historically
// also exposed a `.form` block whose 5 *_placeholder keys were silently
// overwritten by this assignment and never read by any template — they
// have been dropped from `review-form-footer.ts` accordingly.
const composedBase = {
  ...base,
  nav: { ...base.nav, main: navMainTranslations },
  vacancy: vacancyCommonTranslations,
  reviews: {
    ...base.reviews,
    ...reviewFormFooterTranslations.reviews,
    ...russianReviewUi.reviews,
  },
  form: russianReviewUi.form,
  footer: { ...base.footer, ...reviewFormFooterTranslations.footer },
  vpn: { ...base.vpn, btn_close: vpnCloseTranslations },
};

type ShellDict = typeof composedBase;

// Project the single shell dict into every language slot. Deep clone
// per language so runtime per-language vacancy merges (BaseLayout) stay
// isolated. The data is ~3 KB, paid once at boot.
export const translations: Record<SupportedLanguage, ShellDict> = Object.fromEntries(
  SUPPORTED_LANGUAGES.map((language) => [
    language,
    JSON.parse(JSON.stringify(composedBase)) as ShellDict,
  ]),
) as Record<SupportedLanguage, ShellDict>;

export { SUPPORTED_LANGUAGES } from './types';
export type { SupportedLanguage } from './types';

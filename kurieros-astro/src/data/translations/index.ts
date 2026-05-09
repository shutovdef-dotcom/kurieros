// Translation dictionary assembler.
//
// Was a single 1664-line `src/data/translations.ts` (D6 in the audit
// batch). Split into per-purpose slices so each is editable on its
// own without dragging a megabyte of context. Runtime semantics are
// preserved EXACTLY: same merge order, same Russian-only `.form`
// scope, same final shape.
//
// Consumer imports (`import { translations, SUPPORTED_LANGUAGES, ... }
// from '../data/translations'`) automatically resolve to this file via
// directory-index resolution — the standalone `translations.ts` was
// removed in the same commit.

import { base } from './base';
import { navMainTranslations } from './nav-main';
import { vacancyCommonTranslations } from './vacancy';
import { reviewFormFooterTranslations } from './review-form-footer';
import { russianReviewUi } from './russian-review-ui';
import { vpnCloseTranslations } from './vpn-close';
import { SUPPORTED_LANGUAGES } from './types';

// One-time post-load mutation — the original file did the same, and
// `base` is freshly created on every module load so no other consumer
// observes the unmerged version. Keeping mutation here (vs. an
// immutable spread reduce) preserves byte-for-byte runtime equivalence
// with the pre-split file.
SUPPORTED_LANGUAGES.forEach((language) => {
  (base[language].nav as Record<string, string>).main = navMainTranslations[language];
  (base[language] as Record<string, unknown>).vacancy = vacancyCommonTranslations[language];
});

SUPPORTED_LANGUAGES.forEach((language) => {
  Object.assign(base[language].reviews, reviewFormFooterTranslations[language].reviews);
  (base[language] as Record<string, unknown>).form = reviewFormFooterTranslations[language].form;
  Object.assign(base[language].footer, reviewFormFooterTranslations[language].footer);
});

// `russianReviewUi.form` is a Russian-only fallback. The localized form
// templates (with placeholders) are already populated for every language
// by the previous SUPPORTED_LANGUAGES.forEach above using
// `reviewFormFooterTranslations`. Earlier this loop unconditionally
// overwrote `.form` with Russian for EVERY language, breaking i18n for
// uz, tg, ky, hy, kk, az, uk, be, hi, vi, zh — review-modal labels
// rendered in Cyrillic instead of the user's locale. Now scoped to `ru`.
SUPPORTED_LANGUAGES.forEach((language) => {
  Object.assign(base[language].reviews, russianReviewUi.reviews);
  if (language === 'ru') {
    (base[language] as Record<string, unknown>).form = russianReviewUi.form;
  }
});

SUPPORTED_LANGUAGES.forEach((language) => {
  base[language].vpn.btn_close = vpnCloseTranslations[language];
});

export const translations = base;
export { SUPPORTED_LANGUAGES } from './types';
export type { SupportedLanguage } from './types';

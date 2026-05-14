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

// Compose the shell dict by layering the per-feature modules onto base.
// Each `Object.assign` mutates `base` in place — `base` is module-scoped
// so no other consumer sees the unmerged form.
(base.nav as Record<string, string>).main = navMainTranslations;
(base as Record<string, unknown>).vacancy = vacancyCommonTranslations;
Object.assign(base.reviews, reviewFormFooterTranslations.reviews);
(base as Record<string, unknown>).form = reviewFormFooterTranslations.form;
Object.assign(base.footer, reviewFormFooterTranslations.footer);
Object.assign(base.reviews, russianReviewUi.reviews);
(base as Record<string, unknown>).form = russianReviewUi.form;
base.vpn.btn_close = vpnCloseTranslations;

// Project the single shell dict into every language slot. Deep clone
// per language so runtime per-language vacancy merges (BaseLayout) stay
// isolated. The data is ~3 KB, paid once at boot.
type ShellDict = typeof base;
export const translations: Record<SupportedLanguage, ShellDict> = Object.fromEntries(
  SUPPORTED_LANGUAGES.map((language) => [
    language,
    JSON.parse(JSON.stringify(base)) as ShellDict,
  ]),
) as Record<SupportedLanguage, ShellDict>;

export { SUPPORTED_LANGUAGES } from './types';
export type { SupportedLanguage } from './types';

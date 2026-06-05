/**
 * Fix D (2026-05-25) — per-company `industry` text for JobPosting
 * JSON-LD.
 *
 * Before this map every vacancy emitted `industry: "Курьерская доставка"`,
 * which is wrong for the non-courier roles we list (Burger King cook,
 * T-Bank operator B2B, Alfa-Bank field representative). Google for Jobs
 * uses `industry` for relevance matching; a wrong industry tag drops
 * matches for «работа в общепите» / «работа в банке» queries.
 *
 * Values are free-form `Text` per schema.org JobPosting spec — picked
 * to match the dominant Russian-language industry term for each
 * employer's category.
 *
 * Unknown companies fall back to the existing default «Курьерская доставка»
 * (still the majority case on the site), preserving backward compatibility
 * for any partner added later without an explicit mapping.
 */
export const COMPANY_INDUSTRY: Readonly<Record<string, string>> = {
  'Яндекс Еда': 'Курьерская доставка',
  'Купер (ex. СберМаркет)': 'Курьерская доставка',
  'Т-Банк': 'Финансовые услуги',
  'Альфа-Банк': 'Финансовые услуги',
  'Бургер Кинг': 'Общественное питание',
  Ozon: 'Логистика и электронная коммерция',
  'Ozon fresh': 'Курьерская доставка',
  Efin: 'Финансовые услуги',
  Самокат: 'Курьерская доставка',
};

/**
 * Returns the Russian-language industry term for `companyName`, or
 * `undefined` when no mapping exists. `buildJobPostingSchema` falls
 * back to its own default («Курьерская доставка») in the latter case.
 */
export const getCompanyIndustry = (companyName: string): string | undefined =>
  COMPANY_INDUSTRY[companyName];

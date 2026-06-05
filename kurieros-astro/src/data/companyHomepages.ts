/**
 * Fix G (2026-05-25) — official homepage URLs per company, used as
 * `hiringOrganization.url` in JobPosting JSON-LD.
 *
 * Why this exists separately from `VacancySource.company`:
 *   • `VacancySource.company` carries `{ name, logo }` only — no URL.
 *   • The previous JSON-LD emitted `sameAs: <our company page>` —
 *     valid Schema.org but a self-referencing back-link rather than a
 *     pointer to the authoritative employer site. Google Rich Results
 *     accepts both, but `url` (the employer's actual homepage) gives
 *     the better signal for Knowledge Graph linkage.
 *
 * Lookup key is the exact `company.name` string used in source files
 * (see `src/data/sources/*.ts:*_COMPANY_NAME` and `ozonOffers.ts`).
 *
 * Maintenance: when a new partner is added (`src/data/sources/<new>.ts`
 * with its own `*_COMPANY_NAME` constant), add an entry here. The
 * lookup returns `undefined` for unknown names, which causes the
 * JSON-LD to simply omit `hiringOrganization.url` — no crash.
 */
export const COMPANY_HOMEPAGES: Readonly<Record<string, string>> = {
  'Яндекс Еда': 'https://eda.yandex.ru/',
  'Купер (ex. СберМаркет)': 'https://kuper.ru/',
  'Т-Банк': 'https://www.tbank.ru/',
  'Альфа-Банк': 'https://alfabank.ru/',
  'Бургер Кинг': 'https://burgerking.ru/',
  Ozon: 'https://www.ozon.ru/',
  'Ozon fresh': 'https://www.ozon.ru/',
  Efin: 'https://efin.online/',
  Самокат: 'https://samokat.ru/',
};

/**
 * Returns the official employer homepage for `companyName`, or
 * `undefined` when no mapping exists. Callers should treat
 * `undefined` as «omit `hiringOrganization.url` from JSON-LD»
 * rather than substitute a fallback — emitting a guess would
 * mislead consumers (Google, downstream scrapers) more than
 * absence.
 */
export const getCompanyHomepage = (companyName: string): string | undefined =>
  COMPANY_HOMEPAGES[companyName];

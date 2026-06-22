import type { SupportedLanguage } from './translations';

export type TransportMode = 'foot' | 'auto' | 'bicycle' | 'remote' | 'office' | 'service';
export type TransportProvision =
  | 'own'
  | 'company'
  | 'not_required'
  | 'own_or_partner_rental';

export type EmploymentFormat =
  | 'gph'
  | 'self_employed'
  | 'individual_entrepreneur'
  | 'official';

export type MedicalBookRequirement =
  | 'required'
  | 'not_required'
  | 'compensated'
  | 'unknown';

export type SalaryConfidence = 'official' | 'partner' | 'estimated';

export type CurrencyCode = 'RUB' | 'BYN' | 'KZT' | 'KGS' | 'UZS';

export type IncomeCalculatorMode =
  | 'hourly'
  | 'estimated_hourly'
  | 'monthly_derived_hourly'
  | 'meeting'
  | 'monthly'
  | 'hidden';

export type IncomeCalculatorConfig = {
  mode: IncomeCalculatorMode;
  /**
   * Used by `monthly_derived_hourly`: monthly pay / monthlyHours.
   * Default in page helpers is 176 hours (22 days × 8 hours).
   */
  monthlyHours?: number;
};

export type VacancyHowToTemplate =
  | 'courier'
  | 'bank_representative'
  | 'call_center'
  | 'office_employee'
  | 'remote_operator'
  | 'service_worker';

export type VacancySurface = 'all' | 'listing' | 'detail';

export type VacancyDetailRoute = {
  sourceSlug: string;
  anchor?: string;
};

export type VacancySubjectVariant = {
  id: string;
  title: string;
  label?: string;
  requirement?: string;
  applyLink?: string;
};

export type MoneyRange = {
  min?: number;
  max?: number;
  text: string;
};

export type LocalizedStringList = Partial<Record<SupportedLanguage, string[]>>;

export type PayModel = {
  currency: CurrencyCode;
  monthly?: MoneyRange;
  hourly?: MoneyRange;
  perOrder?: MoneyRange;
  perShift?: MoneyRange;
  guaranteed?: MoneyRange;
  bonusText?: string;
  rate?: string;
  paymentFrequency: string;
};

/**
 * Identifies a specific (vacancy, city, hire-object) triple on the
 * Ozon referral forms. Forwarded to the lead-form Worker so it can
 * submit on the user's behalf to the right Ozon pipeline.
 *
 * Two upstream forms are supported:
 *   • ref-courier-sklad  → vacancy = `combineCustomerVacancy` slug
 *     (e.g. `rocket:courier`, `ff:operator`). `customer` is undefined.
 *   • fresh-referral-office → `customer = 'express'` plus a short
 *     `vacancy` slug (e.g. `courier`, `adminPersonal`). The Worker
 *     branches on `customer === 'express'` to pick the matching
 *     upstream payload shape.
 *
 * See `src/data/ozon-vacancies.json` (sklad) and
 * `src/data/ozon-fresh-vacancies.json` (fresh) for the live catalogues
 * and `workers/ozon-lead/src/whitelist.js` for the matching server-
 * side whitelist (regenerate via `node tools/build-worker-whitelist.mjs`).
 */
export type OzonLeadFormMeta = {
  /**
   * For sklad: full `combineCustomerVacancy` slug (e.g. `rocket:courier`).
   * For Fresh: short slug (`courier`, `adminPersonal`, …) — must be
   * paired with `customer: 'express'`.
   */
  vacancy: string;
  /**
   * Ozon Fresh discriminator. Set to `'express'` for fresh-referral-office
   * vacancies; left undefined for ref-courier-sklad legacy flow.
   */
  customer?: string;
  /** UUID of the operational city (Ozon's cityID). */
  cityID: string;
  /** UUID of the hire location (Ozon's hireObjectUUID). */
  hireObjectUUID: string;
  /** Human-readable address — used only for display, not submission. */
  hireObjectLabel: string;
};

export type VacancyOffer = {
  city: string;
  transport: TransportMode;
  transportProvision?: TransportProvision;
  pay: PayModel;
  isActive: boolean;
  updatedAt: string;
  sourceUrl?: string;
  salaryConfidence: SalaryConfidence;
  ageFrom?: number;
  citizenship?: string;
  medicalBook?: MedicalBookRequirement;
  employmentFormats?: EmploymentFormat[];
  schedule?: string;
  applyLink?: string;
  cityDistricts?: string[];
  priority?: number;
  subjectVariants?: VacancySubjectVariant[];
  requirementsOverride?: string[] | LocalizedStringList;
  benefitsOverride?: string[] | LocalizedStringList;
  requiredDocumentsOverride?: string[] | LocalizedStringList;
  /** Ozon-specific lead-form metadata (only set for Ozon offers). */
  ozonLeadForm?: OzonLeadFormMeta;
};

export type VacancyContent = {
  title: string;
  shortDescription: string;
  description: string;
  requirements: string[];
  benefits: string[];
  requiredDocuments: string[];
  labels?: string[];
  searchTags?: string[];
};

export type VacancySource = {
  id: number;
  slug: string;
  company: {
    name: string;
    logo: string;
  };
  /**
   * Russian-source content. Per-language overrides live in
   * `src/data/vacancy-translations-source/<lang>.json` and are merged on
   * top of this by `resolveLocalizedContent()` in `jobs.ts`. The fields
   * that ACTUALLY get translated are `shortDescription`, `description`,
   * `requirements`, `benefits`, `requiredDocuments`. `title`, `labels`,
   * `searchTags` stay RU on all language pages (by policy — see
   * `docs/add-vacancies-dialog.md`).
   */
  content: VacancyContent;
  defaults: {
    ageFrom: number;
    medicalBook?: MedicalBookRequirement;
    employmentFormats: EmploymentFormat[];
    schedule: string;
    education?: string;
    citizenship?: string;
    uniform?: string;
    os?: string;
  };
  /**
   * Controls where generated jobs from this source appear. Default `all`
   * means the same source produces both listing cards and detail pages.
   * `listing` is useful for card variants that point at a shared detail
   * page; `detail` is useful for that shared canonical page itself.
   */
  visibility?: VacancySurface;
  /**
   * Optional route override for listing cards that should keep their own
   * title/analytics/apply link but open a shared canonical detail page.
   */
  detailRoute?: VacancyDetailRoute;
  offers: VacancyOffer[];
  incomeCalculator?: IncomeCalculatorConfig;
  /**
   * Selects the HowTo scenario rendered on vacancy pages. Leave empty for
   * regular courier vacancies; set explicitly for call-center, office,
   * remote operator, service worker, or bank representative roles.
   */
  howToTemplate?: VacancyHowToTemplate;
  extraTags?: string[];
  isHot?: boolean;
};

export type GeneratedJob = {
  id: number;
  sourceId: number;
  /**
   * URL-friendly slug of the parent VacancySource (e.g. `burger-king-cook-cashier`).
   * Used by the client i18n loader (TRANS-1) to know which translation
   * fragment to fetch (`/vacancy-translations/<lang>/<sourceSlug>.json`).
   * Emitted as `data-vacancy-source-slug` on JobCard and detail-page hero.
   */
  sourceSlug: string;
  slug: string;
  detailSlug?: string;
  detailAnchor?: string;
  title: string;
  company: string;
  companyLogo: string;
  salary: string;
  location: string;
  tags: string[];
  labels: string[];
  applyLink: string;
  description: string;
  requirements: string[];
  benefits: string[];
  requiredDocuments: string[];
  details: {
    rate: string;
    schedule: string;
    education: string;
    age: string;
    payment_freq: string;
    citizenship: string;
    medical_book: string;
    self_employed: string;
    employment_type: string;
    transport_provision: string;
    uniform: string;
    os: string;
  };
  search_tags: string[];
  shortDescription: string;
  transport: TransportMode;
  transportProvision: TransportProvision;
  salaryConfidence: SalaryConfidence;
  currency: CurrencyCode;
  sourceUrl?: string;
  updatedAt: string;
  cityDistricts?: string[];
  subjectVariants?: VacancySubjectVariant[];
  priority?: number;
  isHot?: boolean;
  /** Ozon lead-form metadata (only set for Ozon offers via lead-form:ozon). */
  ozonLeadForm?: OzonLeadFormMeta;
};

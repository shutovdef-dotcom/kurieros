import type { SupportedLanguage } from './translations';

export type TransportMode = 'foot' | 'auto' | 'bicycle' | 'remote';
export type TransportProvision = 'own' | 'company' | 'not_required';

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

export type CurrencyCode = 'RUB';

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
 * Identifies a specific (vacancy, city, hire-object) triple on
 * recruitment.ozon.ru/ref-courier-sklad. Forwarded to the lead-form
 * Worker so it can submit on the user's behalf to the right Ozon
 * pipeline. See `src/data/ozon-vacancies.json` for the live catalogue
 * and `workers/ozon-lead/src/whitelist.js` for the matching server-
 * side whitelist (regenerate via `node tools/build-worker-whitelist.mjs`).
 */
export type OzonLeadFormMeta = {
  /** combineCustomerVacancy slug, e.g. "rocket:courier", "ff:operator". */
  vacancy: string;
  /** UUID of the operational city (Ozon's cityID). */
  cityID: string;
  /** UUID of the hire location (Ozon's hireObjectUUID). */
  hireObjectUUID: string;
  /** Human-readable address — used only for display, not submission. */
  hireObjectLabel?: string;
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

export type LocalizedVacancyContent = Record<SupportedLanguage, VacancyContent>;

export type VacancySource = {
  id: number;
  slug: string;
  company: {
    name: string;
    logo: string;
  };
  content: LocalizedVacancyContent;
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
  offers: VacancyOffer[];
  extraTags?: string[];
  isHot?: boolean;
};

export type GeneratedJob = {
  id: number;
  sourceId: number;
  slug: string;
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
  priority?: number;
  isHot?: boolean;
  /** Ozon lead-form metadata (only set for Ozon offers via lead-form:ozon). */
  ozonLeadForm?: OzonLeadFormMeta;
};

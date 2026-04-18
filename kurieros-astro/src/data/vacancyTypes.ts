import type { SupportedLanguage } from './translations';

export type TransportMode = 'foot' | 'auto' | 'bicycle';

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

export type VacancyOffer = {
  city: string;
  transport: TransportMode;
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
    uniform: string;
    os: string;
  };
  search_tags: string[];
  shortDescription: string;
  transport: TransportMode;
  salaryConfidence: SalaryConfidence;
  currency: CurrencyCode;
  sourceUrl?: string;
  updatedAt: string;
  cityDistricts?: string[];
  priority?: number;
  isHot?: boolean;
};

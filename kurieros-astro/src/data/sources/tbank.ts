/**
 * Т-Банк — 2 sources: outbound B2B operator (remote) and field
 * representative (foot/auto, decided per-city via `workMode` text).
 *
 * Both vacancies use the same JSON source (`tbank-vacancies.json`)
 * shipped via the recruitment ops sheet. The operator role is fully
 * remote; the representative role is field sales — transport mode is
 * inferred from a free-text `workMode` field with a deterministic
 * fallback to `foot` if the text is missing or ambiguous.
 *
 * Both pay models use "от X ₽/мес" (no upper cap) because real income
 * varies a lot between top performers and median; capping with
 * "до Y ₽/мес" would set false expectations.
 */
import { z } from 'zod';
import tBankVacanciesSource from '../tbank-vacancies.json';
import { slugifyCity } from '../../utils/cities';
import type {
  EmploymentFormat,
  TransportMode,
  VacancyContent,
  VacancyOffer,
  VacancySource,
} from '../vacancyTypes';
import { T_BANK_LOGO, T_BANK_APPLY } from '../partnerLinks';
import { TRANSPORT_PRIORITY, formatRub } from './shared';

// === Constants =======================================================

const T_BANK_COMPANY_NAME = 'Т-Банк';
const T_BANK_COMPANY_LOGO = T_BANK_LOGO;
const T_BANK_APPLY_LINK = T_BANK_APPLY;
const T_BANK_CITIZENSHIP = 'РФ / ЕАЭС';
const T_BANK_EMPLOYMENT_FORMATS = ['gph', 'self_employed'] satisfies EmploymentFormat[];

// === Schema ==========================================================

/**
 * Per-city offer rows. Income fields are kept optional/nullable on the
 * schema even though production data currently always populates them —
 * `resolveTBankIncomeRange` below already falls back to a 70 000 ₽
 * default when every income field is missing or non-positive, so
 * accepting the looser shape matches the defensive coding downstream.
 */
const tBankOfferSchema = z.object({
  city: z.string().min(1),
  workMode: z.string().nullish(),
  // Zod v4 `z.number()` already rejects NaN/Infinity — `.finite()` dropped.
  avgIncomeRub: z.number().nullish(),
  incomeMinRub: z.number().nullish(),
  incomeMaxRub: z.number().nullish(),
  hiringActive: z.boolean().optional(),
});

const tBankVacancySchema = z.object({
  title: z.string(),
  titleTemplate: z.string(),
  shortDescription: z.string(),
  description: z.string(),
  requirements: z.array(z.string()),
  benefits: z.array(z.string()),
  requiredDocuments: z.array(z.string()),
  offers: z.array(tBankOfferSchema),
});

export const TBankVacanciesSchema = z.object({
  sourceUrl: z.url(),
  updatedAt: z.string().min(1),
  operatorB2B: tBankVacancySchema,
  representative: tBankVacancySchema,
});

export type TBankVacanciesData = z.infer<typeof TBankVacanciesSchema>;
type TBankOfferSource = z.infer<typeof tBankOfferSchema>;

const tBankVacancies: TBankVacanciesData = TBankVacanciesSchema.parse(tBankVacanciesSource);

// === Helpers =========================================================

const buildTBankPay = (minMonthly: number, maxMonthly: number): VacancyOffer['pay'] => {
  const min = Math.min(minMonthly, maxMonthly);
  // T-Bank publishes income as "from X" (no upper cap) — operators &
  // representatives are paid per result so real income usually exceeds
  // the displayed minimum. Display "от X ₽/мес" instead of misleading
  // "до Y ₽/мес".
  const monthlyText = `от ${formatRub(min)} ₽/мес`;

  return {
    currency: 'RUB',
    monthly: {
      min,
      // Intentionally no `max` — getSalaryText falls back to monthly.text
      // ("от X ₽/мес") instead of the "до X ₽/мес" branch.
      text: monthlyText,
    },
    rate: monthlyText,
    // T-Bank operator/representative offers go through ГПХ/самозанятость —
    // standard for partner-recruited operators is weekly pay-out.
    paymentFrequency: 'Еженедельно',
  };
};

const resolveTBankIncomeRange = (offer: TBankOfferSource) => {
  const numericCandidates = [offer.incomeMinRub, offer.avgIncomeRub, offer.incomeMaxRub]
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0);

  if (!numericCandidates.length) {
    return { min: 70_000, max: 70_000 };
  }

  return {
    min: Math.min(...numericCandidates),
    max: Math.max(...numericCandidates),
  };
};

const buildTBankApplyLink = (city: string, role: 'operator-b2b' | 'representative') => {
  const url = new URL(T_BANK_APPLY_LINK);
  const citySlug = slugifyCity(city);

  url.searchParams.set('utm_source', 'kurerok');
  url.searchParams.set('utm_medium', 'vacancy');
  url.searchParams.set('utm_campaign', `tbank-${role}`);
  url.searchParams.set('utm_content', `${citySlug}-${role}`);

  return url.toString();
};

const getRepresentativeTransport = (workMode?: string | null): TransportMode => {
  const normalized = (workMode ?? '').toLowerCase();

  if (normalized.includes('авто') && !normalized.includes('пеш')) {
    return 'auto';
  }

  return 'foot';
};

// === Content =========================================================

const tBankOperatorContent: VacancyContent = {
  title: tBankVacancies.operatorB2B.title,
  shortDescription: tBankVacancies.operatorB2B.shortDescription,
  description: tBankVacancies.operatorB2B.description,
  requirements: [...tBankVacancies.operatorB2B.requirements],
  benefits: [...tBankVacancies.operatorB2B.benefits],
  requiredDocuments: [...tBankVacancies.operatorB2B.requiredDocuments],
  labels: ['Удалённо', 'B2B-продажи'],
  searchTags: ['Т-Банк', 'оператор', 'B2B-продажи', 'удалённая работа'],
};

const representativeTitleTemplate = tBankVacancies.representative.titleTemplate.includes('в %city-name%')
  ? tBankVacancies.representative.titleTemplate.replace('в %city-name%', '{cityPrep}')
  : tBankVacancies.representative.titleTemplate.includes('%city-name%')
    ? tBankVacancies.representative.titleTemplate.replace('%city-name%', '{cityPrep}')
    : tBankVacancies.representative.title;

const tBankRepresentativeContent: VacancyContent = {
  title: representativeTitleTemplate,
  shortDescription: tBankVacancies.representative.shortDescription,
  description: tBankVacancies.representative.description,
  requirements: [...tBankVacancies.representative.requirements],
  benefits: [...tBankVacancies.representative.benefits],
  requiredDocuments: [...tBankVacancies.representative.requiredDocuments],
  labels: ['Разъездная работа', 'Гибкий график'],
  searchTags: ['Т-Банк', 'представитель', 'разъездная работа', 'работа с клиентами'],
};

// === Offer construction ==============================================

const tBankOperatorOffers = tBankVacancies.operatorB2B.offers.map((offer, cityIndex) => {
  const incomeRange = resolveTBankIncomeRange(offer);

  return {
    city: offer.city,
    // B2B operator is a fully-remote call-center role — no field work, no vehicle.
    transport: 'remote',
    transportProvision: 'not_required',
    pay: buildTBankPay(incomeRange.min, incomeRange.max),
    // Always-active per CPA-aggregator policy. The `hiringActive`
    // field on the JSON source is now ignored.
    isActive: true,
    updatedAt: tBankVacancies.updatedAt,
    sourceUrl: tBankVacancies.sourceUrl,
    salaryConfidence: 'partner',
    ageFrom: 18,
    citizenship: T_BANK_CITIZENSHIP,
    medicalBook: 'not_required',
    employmentFormats: [...T_BANK_EMPLOYMENT_FORMATS],
    schedule: 'Гибкий график, полностью удалённый формат',
    applyLink: buildTBankApplyLink(offer.city, 'operator-b2b'),
    priority: 1750 - cityIndex * 2,
  } satisfies VacancyOffer;
});

const tBankRepresentativeOffers = tBankVacancies.representative.offers.map((offer, cityIndex) => {
  const incomeRange = resolveTBankIncomeRange(offer);
  const transport = getRepresentativeTransport(offer.workMode);
  const normalizedMode = (offer.workMode ?? '').toLowerCase();
  const hasMixedMode = normalizedMode.includes('авто') && normalizedMode.includes('пеш');

  return {
    city: offer.city,
    transport,
    pay: buildTBankPay(incomeRange.min, incomeRange.max),
    // Always-active per CPA-aggregator policy.
    isActive: true,
    updatedAt: tBankVacancies.updatedAt,
    sourceUrl: tBankVacancies.sourceUrl,
    salaryConfidence: 'partner',
    ageFrom: 18,
    citizenship: T_BANK_CITIZENSHIP,
    medicalBook: 'unknown',
    employmentFormats: [...T_BANK_EMPLOYMENT_FORMATS],
    schedule: 'От 2 дней в неделю, время выбирается из доступных интервалов',
    applyLink: buildTBankApplyLink(offer.city, 'representative'),
    priority: 1700 - cityIndex * 2 + TRANSPORT_PRIORITY[transport],
    ...(hasMixedMode
      ? {
          benefitsOverride: ['В этом городе можно работать как на авто, так и пешком (по условиям вакансии).'],
        }
      : {}),
  } satisfies VacancyOffer;
});

// === Sources =========================================================

export const tBankOperatorSource: VacancySource = {
  id: 6,
  slug: 'tbank-outbound-b2b-operator',
  company: { name: T_BANK_COMPANY_NAME, logo: T_BANK_COMPANY_LOGO },
  content: tBankOperatorContent,
  defaults: {
    ageFrom: 18,
    medicalBook: 'unknown',
    employmentFormats: [...T_BANK_EMPLOYMENT_FORMATS],
    schedule: 'Гибкий график, полностью удалённый формат',
    education: 'От 9 классов',
    citizenship: T_BANK_CITIZENSHIP,
    uniform: 'Не требуется',
    os: 'iOS / Android',
  },
  offers: tBankOperatorOffers,
  extraTags: ['tbank', 'operator', 'b2b', 'remote', 'source:google-sheet'],
  isHot: true,
};

export const tBankRepresentativeSource: VacancySource = {
  id: 7,
  slug: 'tbank-representative',
  company: { name: T_BANK_COMPANY_NAME, logo: T_BANK_COMPANY_LOGO },
  content: tBankRepresentativeContent,
  defaults: {
    ageFrom: 18,
    medicalBook: 'unknown',
    employmentFormats: [...T_BANK_EMPLOYMENT_FORMATS],
    schedule: 'От 2 дней в неделю, время выбирается из доступных интервалов',
    education: 'От 9 классов',
    citizenship: T_BANK_CITIZENSHIP,
    uniform: 'Не требуется',
    os: 'iOS / Android',
  },
  offers: tBankRepresentativeOffers,
  extraTags: ['tbank', 'representative', 'field-sales', 'source:google-sheet'],
  isHot: true,
};

/** Both Т-Банк sources, in the same order they originally appeared in `vacancies.ts`. */
export const tBankSources: VacancySource[] = [
  tBankOperatorSource,
  tBankRepresentativeSource,
];

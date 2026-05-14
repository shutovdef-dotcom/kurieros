import { CITIES } from './constants';
import { CITY_DATASET } from './cities-dataset';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from './translations';
import { vacancySources } from './vacancies';
import type {
  EmploymentFormat,
  GeneratedJob,
  MedicalBookRequirement,
  PayModel,
  TransportProvision,
  TransportMode,
  VacancyContent,
  VacancyOffer,
  VacancySource,
} from './vacancyTypes';
import { isCityBlocked, slugifyCity } from '../utils/cities';

// === Per-language translation overrides =============================
// Loaded from src/data/vacancy-translations-source/<lang>.json.
// Each file maps source.slug → partial VacancyContent overrides for
// fields we DO translate (shortDescription, description, requirements,
// benefits, requiredDocuments). The fields we DON'T translate (title,
// labels, searchTags, city, salary) are NEVER read from these files
// even if present.
import uzOverrides from './vacancy-translations-source/uz.json';
import tgOverrides from './vacancy-translations-source/tg.json';
import kyOverrides from './vacancy-translations-source/ky.json';
import hyOverrides from './vacancy-translations-source/hy.json';
import kkOverrides from './vacancy-translations-source/kk.json';
import azOverrides from './vacancy-translations-source/az.json';
import ukOverrides from './vacancy-translations-source/uk.json';
import beOverrides from './vacancy-translations-source/be.json';
import hiOverrides from './vacancy-translations-source/hi.json';
import viOverrides from './vacancy-translations-source/vi.json';
import zhOverrides from './vacancy-translations-source/zh.json';

type TranslatableField =
  | 'shortDescription'
  | 'description'
  | 'requirements'
  | 'benefits'
  | 'requiredDocuments';

type LangOverrides = Record<string, Partial<Pick<VacancyContent, TranslatableField>>>;

const TRANSLATION_OVERRIDES: Partial<Record<SupportedLanguage, LangOverrides>> = {
  uz: uzOverrides as LangOverrides,
  tg: tgOverrides as LangOverrides,
  ky: kyOverrides as LangOverrides,
  hy: hyOverrides as LangOverrides,
  kk: kkOverrides as LangOverrides,
  az: azOverrides as LangOverrides,
  uk: ukOverrides as LangOverrides,
  be: beOverrides as LangOverrides,
  hi: hiOverrides as LangOverrides,
  vi: viOverrides as LangOverrides,
  zh: zhOverrides as LangOverrides,
};

const TRANSPORT_TAGS: Record<TransportMode, string> = {
  foot: 'foot',
  auto: 'auto',
  bicycle: 'bicycle',
  remote: 'remote',
};

// Internal data-tags tokens used by the home filter dropdowns.
// `emp:` prefix avoids collisions with transport/age tokens like
// `foot` or `16plus` that share the same flat tag list.
const EMPLOYMENT_TAGS: Record<EmploymentFormat, string> = {
  gph: 'emp:gph',
  self_employed: 'emp:self_employed',
  individual_entrepreneur: 'emp:individual_entrepreneur',
  official: 'emp:official',
};

// Citizenship tag derived from the free-form `citizenship` field.
// Source values include `РФ / ЕАЭС`, `РФ / ЕАЭС / СНГ`, or
// per-country listings like `РФ / Беларусь / Казахстан` (Alfa-Bank).
// Map to two coarse categories the user filters by:
//   `cit:rf`  — RF citizens accepted (currently every job)
//   `cit:cis` — CIS-area citizens accepted (jobs that include ЕАЭС,
//                СНГ, or any named CIS country)
// A single job may carry both tags when it accepts both groups.
const CIS_COUNTRY_TOKENS = [
  'ЕАЭС', 'СНГ',
  'Беларусь', 'Казахстан', 'Армения', 'Кыргызстан', 'Киргизия',
  'Узбекистан', 'Таджикистан', 'Молдова', 'Азербайджан', 'Грузия',
];
const getCitizenshipTags = (citizenship: string): string[] => {
  const tags: string[] = [];
  if (citizenship.includes('РФ')) tags.push('cit:rf');
  if (CIS_COUNTRY_TOKENS.some((token) => citizenship.includes(token))) {
    tags.push('cit:cis');
  }
  return tags;
};

// Shell labels and meta formatters — Russian-only by policy (PR #131).
// Vacancy titles, transport modes, employment formats, schedule, citizenship,
// salary text and page meta render in Russian on EVERY language page; only the
// 5 content fields (shortDescription/description/requirements/benefits/
// requiredDocuments) translate via TRANSLATION_OVERRIDES + the runtime
// fragment loader in BaseLayout.astro.

const TRANSPORT_LABELS: Record<TransportMode, string> = {
  foot: 'Пеший',
  auto: 'На авто',
  bicycle: 'На велосипеде',
  remote: 'Удалённо / офис',
};

const TRANSPORT_TITLES: Record<TransportMode, string> = {
  foot: 'Пеший курьер',
  auto: 'Автокурьер',
  bicycle: 'Велокурьер',
  remote: 'Сотрудник удалённого формата',
};

const TRANSPORT_TITLE_SUFFIXES: Record<TransportMode, string> = {
  foot: 'пеший',
  auto: 'на авто',
  bicycle: 'на велосипеде',
  remote: 'удалённо',
};

const TRANSPORT_BANK_ROLE_TITLES: Record<TransportMode, string> = {
  foot: 'Пеший представитель',
  auto: 'Авто-представитель',
  bicycle: 'Велопредставитель',
  remote: 'Удалённый сотрудник',
};

const TRANSPORT_PROVISION_LABELS: Record<TransportProvision, string> = {
  own: 'Нужно своё транспортное средство',
  company: 'Компания выдает транспортное средство',
  not_required: 'Транспорт не требуется',
};

const TRANSPORT_ID_PARTS: Record<TransportMode, number> = {
  foot: 1,
  bicycle: 2,
  auto: 3,
  remote: 4,
};

const EMPLOYMENT_LABELS: Record<EmploymentFormat, string> = {
  gph: 'ГПХ',
  self_employed: 'Самозанятость',
  individual_entrepreneur: 'ИП',
  official: 'Официальное трудоустройство',
};

const MEDICAL_BOOK_LABELS: Record<MedicalBookRequirement, string> = {
  required: 'Требуется',
  not_required: 'Не требуется',
  compensated: 'Требуется, возможна компенсация',
  unknown: 'Уточняется',
};

// `as const satisfies Record<string, string>` keeps each property's
// literal type while statically verifying the dictionary still
// matches the wider string-map contract — `COMMON_LABELS.typo`
// becomes a compile error instead of `string | undefined` at runtime.
const COMMON_LABELS = {
  noExperience: 'Без опыта',
  flexible: 'Свободный график',
  medicalBook: 'Нужна медкнижка',
  noEducation: 'Не требуется',
  weekly: 'Еженедельно',
  yes: 'Да',
  notRequired: 'Не требуется',
} as const satisfies Record<string, string>;

const SCHEDULE_LABEL = 'Свободный график от 2 часов';

const CITIZENSHIP_LABELS: Record<'all' | 'rfEaes' | 'rf' | 'default', string> = {
  all: 'РФ / ЕАЭС / страны вне ЕАЭС при наличии ВНЖ и патента',
  rfEaes: 'РФ / ЕАЭС',
  rf: 'РФ',
  default: 'РФ / ЕАЭС / страны вне ЕАЭС при наличии документов',
};

const monthlySalaryText = (amount: string) => `до ${amount} ₽/мес`;

const rateText = (hourly: string, daily: string, monthly: string) =>
  `${hourly} ₽/час, ${daily} ₽ за 12 часов, до ${monthly} ₽ за 30 смен`;

const pageTitleText = (title: string) =>
  `${title} — зарплата, условия и отклик | КурьерОк`;

const pageDescriptionText = (job: GeneratedJob) =>
  `Вакансия "${job.title}" в ${job.company}: ${job.salary}, ${job.details.schedule.toLowerCase()}, ${job.details.payment_freq.toLowerCase()}. Сравните условия и переходите к отклику.`;

const DATE_LOCALE = 'ru-RU';

// Russian-locale date formatting on every page (e.g. "18 апреля 2026 г.")
// per #130 follow-up policy revert. `_language` retained in signature to
// avoid touching call sites.
const formatUpdatedDate = (date: string, _language: SupportedLanguage) =>
  new Intl.DateTimeFormat(DATE_LOCALE, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date));

const cityCodes = new Map(CITIES.map((city, index) => [city.name, index + 1]));
const cityPrepositions = new Map(CITY_DATASET.map((city) => [city.name, city.prep]));

const unique = <T>(items: T[]) => Array.from(new Set(items.filter(Boolean)));

const formatAmount = (value: number) => new Intl.NumberFormat('ru-RU').format(value);

const getCompanyName = (name: string, _language: SupportedLanguage) => name;

// `{cityPrep}` always interpolates to Russian prepositional case ("в Москве",
// "в Санкт-Петербурге"). Since title/labels/searchTags stay in Russian on
// all language pages (policy: only descriptions/requirements/benefits/docs
// get translated), and since untranslated content falls back to Russian,
// the prepositional placeholder should always produce Russian grammar —
// regardless of the page's display language. Translators writing target-
// language descriptions should use the bare `{city}` placeholder instead.
const getCityPrep = (city: string, _language: SupportedLanguage) =>
  cityPrepositions.get(city) ?? `в ${city}`;

const interpolate = (value: string, offer: VacancyOffer, language: SupportedLanguage) =>
  value
    .replaceAll('{city}', offer.city)
    .replaceAll('{cityPrep}', getCityPrep(offer.city, language))
    .replaceAll('{transportTitle}', TRANSPORT_TITLES[offer.transport])
    .replaceAll('{transportSuffix}', TRANSPORT_TITLE_SUFFIXES[offer.transport])
    .replaceAll('{transportBankRoleTitle}', TRANSPORT_BANK_ROLE_TITLES[offer.transport]);

const resolveList = (
  value: VacancyOffer['requirementsOverride'],
  language: SupportedLanguage,
) => {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : value[language] ?? value.ru ?? [];
};

// Resolve VacancyContent for a given source × language. RU is the source
// of truth (from VacancySource.content). For non-RU languages, only the
// 5 translatable fields are read from the per-language JSON overrides
// — everything else (title, labels, searchTags) stays RU by policy.
// If override is missing for a slug or field, fall back to RU.
const resolveLocalizedContent = (
  source: VacancySource,
  language: SupportedLanguage,
): VacancyContent => {
  if (language === 'ru') return source.content;

  const langOverrides = TRANSLATION_OVERRIDES[language];
  const slugOverrides = langOverrides?.[source.slug];
  if (!slugOverrides) return source.content;

  return {
    title: source.content.title,
    shortDescription: slugOverrides.shortDescription ?? source.content.shortDescription,
    description: slugOverrides.description ?? source.content.description,
    requirements: slugOverrides.requirements ?? source.content.requirements,
    benefits: slugOverrides.benefits ?? source.content.benefits,
    requiredDocuments: slugOverrides.requiredDocuments ?? source.content.requiredDocuments,
    labels: source.content.labels,
    searchTags: source.content.searchTags,
  };
};

const getAgeFrom = (source: VacancySource, offer: VacancyOffer) =>
  offer.ageFrom ?? source.defaults.ageFrom;

const getMedicalBook = (source: VacancySource, offer: VacancyOffer) =>
  offer.medicalBook ?? source.defaults.medicalBook ?? 'unknown';

const getCitizenship = (source: VacancySource, offer: VacancyOffer) =>
  offer.citizenship ?? source.defaults.citizenship ?? 'Уточняется';

const getEmploymentFormats = (source: VacancySource, offer: VacancyOffer) =>
  offer.employmentFormats?.length ? offer.employmentFormats : source.defaults.employmentFormats;

const getTransportProvision = (offer: VacancyOffer): TransportProvision => {
  if (offer.transportProvision) return offer.transportProvision;
  // Foot couriers and remote workers don't need a vehicle by default;
  // bicycle/auto vacancies default to "own".
  if (offer.transport === 'foot' || offer.transport === 'remote') return 'not_required';
  return 'own';
};

const getSchedule = (source: VacancySource, offer: VacancyOffer, language: SupportedLanguage) => {
  const schedule = offer.schedule ?? source.defaults.schedule;

  return schedule === SCHEDULE_LABEL ? SCHEDULE_LABEL : schedule;
};

const getEducation = (source: VacancySource, language: SupportedLanguage) =>
  source.defaults.education === COMMON_LABELS.noEducation || !source.defaults.education
    ? COMMON_LABELS.noEducation
    : source.defaults.education;

const getPaymentFrequency = (value: string, language: SupportedLanguage) =>
  value === COMMON_LABELS.weekly ? COMMON_LABELS.weekly : value;

const getCitizenshipLabel = (value: string, language: SupportedLanguage) => {
  if (value.includes('вне ЕАЭС')) return CITIZENSHIP_LABELS.all;
  if (value.includes('ЕАЭС')) return CITIZENSHIP_LABELS.rfEaes;
  if (value === 'РФ') return CITIZENSHIP_LABELS.rf;
  if (value.includes('при наличии документов')) return CITIZENSHIP_LABELS.default;

  return value;
};

const getGeneratedId = (source: VacancySource, offer: VacancyOffer, index: number) =>
  source.id * 100000 +
  ((cityCodes.get(offer.city) ?? 900 + index + 1) * 10) +
  TRANSPORT_ID_PARTS[offer.transport];

const getSalaryText = (pay: PayModel, language: SupportedLanguage) =>
  pay.monthly?.max
    ? monthlySalaryText(formatAmount(pay.monthly.max))
    : pay.monthly?.text ??
      pay.guaranteed?.text ??
      pay.perShift?.text ??
      pay.hourly?.text ??
      pay.perOrder?.text ??
      'Доход уточняется';

const getRateText = (pay: PayModel, language: SupportedLanguage) => {
  if (pay.hourly?.max && pay.perShift?.max && pay.monthly?.max) {
    return rateText(
      formatAmount(pay.hourly.max),
      formatAmount(pay.perShift.max),
      formatAmount(pay.monthly.max),
    );
  }

  const rateFallback = [
    pay.hourly?.text,
    pay.perOrder?.text,
    pay.perShift?.text,
    pay.guaranteed?.text,
  ].filter(Boolean).join(' + ');

  return pay.rate ?? (rateFallback || getSalaryText(pay, language));
};

const getOfferRequirements = (
  contentRequirements: string[],
  offer: VacancyOffer,
  language: SupportedLanguage,
) => [...contentRequirements, ...resolveList(offer.requirementsOverride, language)];

const getOfferBenefits = (
  contentBenefits: string[],
  offer: VacancyOffer,
  language: SupportedLanguage,
) => [...contentBenefits, ...resolveList(offer.benefitsOverride, language)];

const getOfferRequiredDocuments = (
  contentRequiredDocuments: string[],
  offer: VacancyOffer,
  language: SupportedLanguage,
) => [...contentRequiredDocuments, ...resolveList(offer.requiredDocumentsOverride, language)];

const getAgeTag = (ageFrom: number) => (ageFrom <= 16 ? '16plus' : '18+');

const getSelfEmployedLabel = (formats: EmploymentFormat[]) =>
  formats.includes('self_employed') ? 'Да' : 'Не требуется';

const buildLabels = (
  labels: string[] | undefined,
  transport: TransportMode[],
  ageFrom: number,
  formats: EmploymentFormat[],
  medicalBook: MedicalBookRequirement,
  language: SupportedLanguage,
) =>
  labels?.length
    ? labels
    : unique([
      ...transport.map((mode) => TRANSPORT_LABELS[mode]),
      ageFrom <= 16 ? 'С 16 лет' : '18+',
      formats[0] ? EMPLOYMENT_LABELS[formats[0]] : '',
      medicalBook === 'required' ? COMMON_LABELS.medicalBook : '',
    ]);

const buildJobsFromVacancies = (
  sources: VacancySource[],
  language: SupportedLanguage = 'ru',
): GeneratedJob[] =>
  sources.flatMap((source) =>
    source.offers
      .filter((offer) => offer.isActive && !isCityBlocked(offer.city))
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
      .map((offer, index) => {
      const content = resolveLocalizedContent(source, language);
      const ageFrom = getAgeFrom(source, offer);
      const transport = offer.transport;
      const formats = getEmploymentFormats(source, offer);
      const transportProvision = getTransportProvision(offer);
      const medicalBook = getMedicalBook(source, offer);
      const salary = getSalaryText(offer.pay, language);
      const applyLink = offer.applyLink ?? '#';
      const citySlug = slugifyCity(offer.city);
      const requirements = getOfferRequirements(content.requirements, offer, language);
      const benefits = getOfferBenefits(content.benefits, offer, language);
      const requiredDocuments = getOfferRequiredDocuments(content.requiredDocuments ?? [], offer, language);

      return {
        id: getGeneratedId(source, offer, index),
        sourceId: source.id,
        sourceSlug: source.slug,
        slug: `${source.slug}-${citySlug}-${transport}`,
        title: interpolate(content.title, offer, language),
        company: getCompanyName(source.company.name, language),
        companyLogo: source.company.logo,
        salary,
        location: offer.city,
        tags: unique([
          TRANSPORT_TAGS[transport],
          getAgeTag(ageFrom),
          ...formats.map((format) => EMPLOYMENT_TAGS[format]),
          ...getCitizenshipTags(getCitizenship(source, offer)),
          ...(source.extraTags ?? []),
        ]),
        labels: buildLabels(content.labels, [transport], ageFrom, formats, medicalBook, language),
        applyLink,
        description: interpolate(content.description, offer, language),
        requirements: requirements.map((item) => interpolate(item, offer, language)),
        benefits: benefits.map((item) => interpolate(item, offer, language)),
        requiredDocuments: requiredDocuments.map((item) => interpolate(item, offer, language)),
        details: {
          rate: getRateText(offer.pay, language),
          schedule: getSchedule(source, offer, language),
          education: getEducation(source, language),
          age: `от ${ageFrom} лет`,
          payment_freq: getPaymentFrequency(offer.pay.paymentFrequency, language),
          citizenship: getCitizenshipLabel(getCitizenship(source, offer), language),
          medical_book: MEDICAL_BOOK_LABELS[medicalBook],
          self_employed: formats.includes('self_employed') ? COMMON_LABELS.yes : COMMON_LABELS.notRequired,
          employment_type: formats.map((format) => EMPLOYMENT_LABELS[format]).join(' / '),
          transport_provision: TRANSPORT_PROVISION_LABELS[transportProvision],
          uniform: source.defaults.uniform ?? 'Уточняется',
          os: source.defaults.os ?? 'Android или iOS',
        },
        search_tags: content.searchTags ?? [],
        shortDescription: interpolate(content.shortDescription, offer, language),
        transport,
        transportProvision,
        salaryConfidence: offer.salaryConfidence,
        currency: offer.pay.currency,
        ...(offer.sourceUrl ? { sourceUrl: offer.sourceUrl } : {}),
        updatedAt: offer.updatedAt,
        ...(offer.cityDistricts?.length ? { cityDistricts: offer.cityDistricts } : {}),
        ...(typeof offer.priority === 'number' ? { priority: offer.priority } : {}),
        ...(source.isHot ? { isHot: true } : {}),
        // Pass Ozon lead-form metadata through so JobCard / vacancy
        // page can emit data-ozon-* attributes consumed by
        // OzonLeadModal → Cloudflare Worker.
        ...(offer.ozonLeadForm ? { ozonLeadForm: offer.ozonLeadForm } : {}),
      };
    }),
  );

// Build flat translation object for one job (used by both per-source
// fragment emission and any future consumer).
const buildJobTranslationEntry = (job: GeneratedJob, language: SupportedLanguage) => ({
  page_title: pageTitleText(job.title),
  page_description: pageDescriptionText(job).slice(0, 170),
  updated_date: formatUpdatedDate(job.updatedAt, language),
  title: job.title,
  company: job.company,
  salary: job.salary,
  location: job.location,
  shortDescription: job.shortDescription,
  description: job.description,
  ...Object.fromEntries(job.labels.map((label, index) => [`label_${index}`, label])),
  ...Object.fromEntries(job.requirements.map((requirement, index) => [`req_${index}`, requirement])),
  ...Object.fromEntries(job.benefits.map((benefit, index) => [`ben_${index}`, benefit])),
  ...Object.fromEntries(job.requiredDocuments.map((document, index) => [`doc_${index}`, document])),
  details_schedule: job.details.schedule,
  details_education: job.details.education,
  details_payment_freq: job.details.payment_freq,
  details_age: job.details.age,
  details_citizenship: job.details.citizenship,
  details_rate: job.details.rate,
  details_employment_type: job.details.employment_type,
  details_transport_provision: job.details.transport_provision,
});

// Documented public contract for the TRANS-1 fragment shape.
// Outer key = language; middle key = vacancy source.slug; inner key =
// stringified job.id; value = a flat translation entry produced by
// `buildJobTranslationEntry`.
export type JobTranslationEntry = ReturnType<typeof buildJobTranslationEntry>;
export type TranslationsBySource = Record<
  SupportedLanguage,
  Record<string, Record<string, JobTranslationEntry>>
>;

/**
 * TRANS-1: build translations grouped by (language × source.slug × jobId).
 * Emitter (scripts/generate-vacancy-translations.ts) writes one file
 * per (language, source.slug) pair instead of one giant 20 MB file per
 * language. Client loads only fragments for vacancies currently
 * visible on the page — typical detail-page download drops from 20 MB
 * to ~80 KB.
 */
export const buildJobTranslationsBySource = (
  sources: VacancySource[],
): TranslationsBySource => {
  const idToSlug = new Map(sources.map((source) => [source.id, source.slug]));
  return Object.fromEntries(
    SUPPORTED_LANGUAGES.map((language) => {
      const bySlug: Record<string, Record<string, JobTranslationEntry>> = {};
      for (const slug of idToSlug.values()) {
        bySlug[slug] = {};
      }
      for (const job of buildJobsFromVacancies(sources, language)) {
        const slug = idToSlug.get(job.sourceId);
        if (!slug) continue;
        bySlug[slug][String(job.id)] = buildJobTranslationEntry(job, language);
      }
      return [language, bySlug];
    }),
    // `Object.fromEntries` always widens to `Record<string, V>`; cast
    // back to the documented `Record<SupportedLanguage, ...>` contract.
  ) as TranslationsBySource;
};

const jobsData = buildJobsFromVacancies(vacancySources);

export { vacancySources };
export default jobsData;

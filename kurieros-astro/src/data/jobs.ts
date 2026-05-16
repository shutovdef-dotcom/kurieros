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
import { fnv1a } from '../utils/fnv1a';
import { z } from 'zod';

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

// Runtime schema for a per-language override file. Each file maps a
// source slug → an object carrying only the 5 translatable fields (all
// optional — a file may translate just a subset). Mirrors `LangOverrides`
// exactly. Per the v2 H5 boundary, the 11 override JSON imports below are
// validated through `loadOverrides()` rather than `as`-cast: a malformed
// file (wrong nesting, a number where a string list is expected) now
// fails the build with a field-level path instead of feeding bad data
// straight into rendered vacancy content via `resolveLocalizedContent`.
const langOverridesSchema: z.ZodType<LangOverrides> = z.record(
  z.string(),
  z.object({
    shortDescription: z.string().optional(),
    description: z.string().optional(),
    requirements: z.array(z.string()).optional(),
    benefits: z.array(z.string()).optional(),
    requiredDocuments: z.array(z.string()).optional(),
  }),
);

/** Parse one raw translation-override JSON import into a validated `LangOverrides`. */
const loadOverrides = (raw: unknown): LangOverrides => langOverridesSchema.parse(raw);

const TRANSLATION_OVERRIDES: Partial<Record<SupportedLanguage, LangOverrides>> = {
  uz: loadOverrides(uzOverrides),
  tg: loadOverrides(tgOverrides),
  ky: loadOverrides(kyOverrides),
  hy: loadOverrides(hyOverrides),
  kk: loadOverrides(kkOverrides),
  az: loadOverrides(azOverrides),
  uk: loadOverrides(ukOverrides),
  be: loadOverrides(beOverrides),
  hi: loadOverrides(hiOverrides),
  vi: loadOverrides(viOverrides),
  zh: loadOverrides(zhOverrides),
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

// CITY_CODES — fixed (frozen) numeric codes used to build vacancy `id` values
// via getGeneratedId(). MUST NOT be reordered or extended: any change to a
// city's code rewrites every job ID for that city, breaking external
// bookmarks and analytics. Cities not listed here are assigned a stable
// city-part via fnv1a(slug) hashing + deterministic linear probing
// (NON_TOP15_CITY_PART below). The list captures the original order/length
// of the legacy CITIES array (15 cities) at the moment of its removal —
// keep it that way.
const CITY_CODES: Record<string, number> = {
  'Москва': 1,
  'Санкт-Петербург': 2,
  'Екатеринбург': 3,
  'Новосибирск': 4,
  'Казань': 5,
  'Нижний Новгород': 6,
  'Челябинск': 7,
  'Самара': 8,
  'Омск': 9,
  'Ростов-на-Дону': 10,
  'Уфа': 11,
  'Красноярск': 12,
  'Воронеж': 13,
  'Пермь': 14,
  'Волгоград': 15,
};
const cityCodes = new Map<string, number>(Object.entries(CITY_CODES));

// === Non-top-15 city-part assignment ================================
// Historically, cities outside CITY_CODES received `900 + offer-index + 1`
// in getGeneratedId() — a value that DEPENDED ON THE POST-SORT OFFER INDEX.
// Adding a priority bump, changing isCityBlocked, or any permutation of
// `source.offers` rewrote every non-top-15 ID, breaking saved
// `compareList` localStorage entries and GA4 event continuity (audit H6).
//
// We replace it with a deterministic per-city integer in [100, 9999]
// derived from `fnv1a(citySlug)`. Hash collisions are resolved with
// linear probing in slug-alphabetical order, which is sort-INDEPENDENT
// (cities, not offers, are the input domain). With 942 unique non-top-15
// slugs and 9900 slots, the load factor is ~0.1 and max probe length
// is small.
//
// Stability guarantees:
//   • Reordering `offers` within a source does NOT change any ID.
//   • Changing offer `priority` does NOT change any ID.
//   • Adding or removing offers from EXISTING cities does NOT change IDs.
//   • Adding a NEW non-top-15 city can shift IDs ONLY for cities whose
//     fnv1a probe sequence passes through the new city's claimed slot.
//   • Top-15 city IDs (codes 1..15) are NEVER affected.
//
// Resolution-failure policy: if linear probing exhausts the [100, 9999]
// range without finding a free slot (impossible with current
// city counts — would require ~10× growth), the build throws at module
// load. Bookmarks for a non-existent city are not worth a silent collision.
const NON_TOP15_SLOT_BASE = 100;
const NON_TOP15_SLOT_COUNT = 9900; // slots 100..9999, distinct from top-15 codes 1..15.

const buildNonTop15CityParts = (sources: readonly VacancySource[]): ReadonlyMap<string, number> => {
  // Collect every UNIQUE non-top-15 city slug referenced by active,
  // non-blocked offers across all sources. `isActive`/`isCityBlocked` is
  // the same filter `buildJobsFromVacancies` applies — slug assignment
  // tracks the same domain.
  const slugSet = new Set<string>();
  for (const source of sources) {
    for (const offer of source.offers) {
      if (!offer.isActive || isCityBlocked(offer.city)) continue;
      if (cityCodes.has(offer.city)) continue;
      slugSet.add(slugifyCity(offer.city));
    }
  }

  // Sort alphabetically so collision resolution is deterministic.
  const orderedSlugs = [...slugSet].sort((a, b) => a.localeCompare(b));

  const assignment = new Map<string, number>();
  const used = new Set<number>();
  for (const slug of orderedSlugs) {
    const start = fnv1a(slug) % NON_TOP15_SLOT_COUNT;
    let probe = 0;
    let resolved = false;
    while (probe < NON_TOP15_SLOT_COUNT) {
      const slot = NON_TOP15_SLOT_BASE + ((start + probe) % NON_TOP15_SLOT_COUNT);
      if (!used.has(slot)) {
        used.add(slot);
        assignment.set(slug, slot);
        resolved = true;
        break;
      }
      probe++;
    }
    if (!resolved) {
      // Should be unreachable given current city volume vs slot count.
      throw new Error(`getGeneratedId: could not assign cityPart for slug="${slug}" — slot table exhausted (${used.size}/${NON_TOP15_SLOT_COUNT}).`);
    }
  }

  return assignment;
};

const NON_TOP15_CITY_PART = buildNonTop15CityParts(vacancySources);
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

/**
 * Derives a stable numeric Job ID from `(source, offer)`.
 *
 * Formula: `source.id × 100000 + cityPart × 10 + transport`
 *
 * Expected component ranges:
 *   - `source.id`              — hardcoded primary key (1..19 currently),
 *                                contributing strides of 100000.
 *   - `cityPart` (top-15)      — 1..15 (CITY_CODES table above),
 *                                producing the 10..150 band when × 10.
 *   - `cityPart` (non-top-15)  — 100..9999 (fnv1a-derived slot, see
 *                                NON_TOP15_CITY_PART above), producing
 *                                the 1000..99990 band when × 10.
 *   - `transport`              — 1..4 (TRANSPORT_ID_PARTS: foot=1,
 *                                bicycle=2, auto=3, remote=4).
 *
 * All resulting IDs fit comfortably in INT32. Uniqueness, range, and
 * sort-independence invariants are pinned by `tests/jobIds.test.ts`.
 *
 * Stability contract: NEVER change `source.id`, the CITY_CODES table,
 * or `TRANSPORT_ID_PARTS` once shipped — bookmarks, GA4 events, and
 * the `compareList` localStorage all reference these IDs forever.
 */
const getGeneratedId = (source: VacancySource, offer: VacancyOffer) => {
  const topCode = cityCodes.get(offer.city);
  const cityPart = topCode ?? NON_TOP15_CITY_PART.get(slugifyCity(offer.city));
  if (cityPart === undefined) {
    // NON_TOP15_CITY_PART is built from the same (active + non-blocked)
    // domain that `buildJobsFromVacancies` iterates, so this should be
    // unreachable. Fail loud rather than emit a phantom ID.
    throw new Error(`getGeneratedId: no cityPart for source="${source.slug}" city="${offer.city}".`);
  }
  return source.id * 100000 + cityPart * 10 + TRANSPORT_ID_PARTS[offer.transport];
};

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

// Exported for tests: lets `tests/jobIds.test.ts` exercise the full
// job-build pipeline (which is what produces job.id values) without
// going through the multi-language `buildJobTranslationsBySource`
// path. Internal callers still treat this as a private helper.
export const buildJobsFromVacancies = (
  sources: VacancySource[],
  language: SupportedLanguage = 'ru',
): GeneratedJob[] =>
  sources.flatMap((source) =>
    source.offers
      .filter((offer) => offer.isActive && !isCityBlocked(offer.city))
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
      .map((offer) => {
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
        id: getGeneratedId(source, offer),
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

export default jobsData;

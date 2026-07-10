import { buildJobLocationAddress } from './jobLocationAddress';
import type { SalaryConfidence } from '../data/vacancyTypes';

type BreadcrumbItem = {
  name: string;
  url: string;
};

// Schema.org MonetaryAmount with embedded QuantitativeValue — narrow
// shape constructed inside `buildJobPostingSchema`. The monthly branch
// supplies maxValue + minValue (range bracket); the hourly branch
// emits just the rate (no range), hence the optional fields.
type MonetaryAmountSchema = {
  '@type': 'MonetaryAmount';
  currency: string;
  value: {
    '@type': 'QuantitativeValue';
    value: number;
    unitText: string;
    maxValue?: number;
    minValue?: number;
  };
};

// `Astro.site` is typed as `URL | undefined` because consumers may
// not configure the global `site` in astro.config — but ours always
// is (`astro.config.mjs` falls back to `'https://kurerok.ru'`).
// Accepting undefined here keeps the type system honest at every
// call site without forcing each caller to assert non-null.
export const buildBreadcrumbSchema = (
  items: BreadcrumbItem[],
  site: URL | string | undefined,
) => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: new URL(item.url, site).toString(),
  })),
});

const EMPLOYMENT_KEYWORDS: ReadonlyArray<readonly [RegExp, string]> = [
  [/самозан|\bип\b|гпх|гражданско.правов|подряд|contractor/i, 'CONTRACTOR'],
  // Fix F regression-guard (2026-05-25) — exclude «полностью» (means
  // «entirely» / «fully», as in «полностью удалённый формат»). Without
  // the negative lookahead, T-Bank operator B2B's «Гибкий график,
  // полностью удалённый формат» incorrectly tagged the role as
  // FULL_TIME. The other targeted stems («полная смена», «полная
  // занятость», «полный рабочий день», «полная ставка») still match.
  [/полн(?!остью)|официал|штат|трудов\w* догов|full[\s-]?time/i, 'FULL_TIME'],
  [/частичн|подработк|неполн|part[\s-]?time/i, 'PART_TIME'],
  [/времен|temporary/i, 'TEMPORARY'],
  [/стажировк|intern/i, 'INTERN'],
];

export const mapEmploymentTypeToSchema = (label: string | undefined): string[] => {
  if (!label) return ['OTHER'];
  const found = new Set<string>();
  for (const [pattern, value] of EMPLOYMENT_KEYWORDS) {
    if (pattern.test(label)) {
      found.add(value);
    }
  }
  return found.size > 0 ? Array.from(found) : ['OTHER'];
};

const CITY_TO_REGION: Readonly<Record<string, string>> = {
  Москва: 'RU-MOW',
  'Санкт-Петербург': 'RU-SPE',
  Новосибирск: 'RU-NVS',
  Екатеринбург: 'RU-SVE',
  Казань: 'RU-TA',
  'Нижний Новгород': 'RU-NIZ',
  Челябинск: 'RU-CHE',
  Красноярск: 'RU-KYA',
  Самара: 'RU-SAM',
  Уфа: 'RU-BA',
  'Ростов-на-Дону': 'RU-ROS',
  Омск: 'RU-OMS',
  Краснодар: 'RU-KDA',
  Воронеж: 'RU-VOR',
  Пермь: 'RU-PER',
  Волгоград: 'RU-VGG',
  Саратов: 'RU-SAR',
  Тюмень: 'RU-TYU',
  Тольятти: 'RU-SAM',
  Барнаул: 'RU-ALT',
  Ижевск: 'RU-UD',
  Махачкала: 'RU-DA',
  Хабаровск: 'RU-KHA',
  Ульяновск: 'RU-ULY',
  Иркутск: 'RU-IRK',
  Владивосток: 'RU-PRI',
  Ярославль: 'RU-YAR',
  Кемерово: 'RU-KEM',
  Томск: 'RU-TOM',
  Севастополь: 'RU-SEV',
  Ставрополь: 'RU-STA',
  Оренбург: 'RU-ORE',
  Рязань: 'RU-RYA',
  Балашиха: 'RU-MOS',
  Подольск: 'RU-MOS',
  Химки: 'RU-MOS',
  Мытищи: 'RU-MOS',
  Королёв: 'RU-MOS',
  Люберцы: 'RU-MOS',
  Красногорск: 'RU-MOS',
  Сочи: 'RU-KDA',
  Калининград: 'RU-KGD',
  Тула: 'RU-TUL',
  Липецк: 'RU-LIP',
  Киров: 'RU-KIR',
  Чебоксары: 'RU-CU',
  Пенза: 'RU-PNZ',
  Астрахань: 'RU-AST',
  Брянск: 'RU-BRY',
  Тверь: 'RU-TVE',
  Иваново: 'RU-IVA',
  Магнитогорск: 'RU-CHE',
  Курск: 'RU-KRS',
  Архангельск: 'RU-ARK',
  Сургут: 'RU-KHM',
  Владимир: 'RU-VLA',
  Чита: 'RU-ZAB',
  Белгород: 'RU-BEL',
  Калуга: 'RU-KLU',
  Череповец: 'RU-VLG',
  Вологда: 'RU-VLG',
  Смоленск: 'RU-SMO',
  Курган: 'RU-KGN',
  Орёл: 'RU-ORL',
  Саранск: 'RU-MO',
  Якутск: 'RU-SA',
  'Улан-Удэ': 'RU-BU',
  Грозный: 'RU-CE',
  Кострома: 'RU-KOS',
  Тамбов: 'RU-TAM',
  'Великий Новгород': 'RU-NGR',
  Псков: 'RU-PSK',
  'Йошкар-Ола': 'RU-ME',
  Сыктывкар: 'RU-KO',
  Майкоп: 'RU-AD',
  'Нижний Тагил': 'RU-SVE',
  'Старый Оскол': 'RU-BEL',
  Энгельс: 'RU-SAR',
  'Каменск-Уральский': 'RU-SVE',
  Армавир: 'RU-KDA',
  Дзержинск: 'RU-NIZ',
  Орск: 'RU-ORE',
  Прокопьевск: 'RU-KEM',
  Бийск: 'RU-ALT',
  Шахты: 'RU-ROS',
  'Сергиев Посад': 'RU-MOS',
  Жуковский: 'RU-MOS',
  Реутов: 'RU-MOS',
  Долгопрудный: 'RU-MOS',
  Одинцово: 'RU-MOS',
  Щёлково: 'RU-MOS',
  Раменское: 'RU-MOS',
  Зеленоград: 'RU-MOW',
  Электросталь: 'RU-MOS',
  Ногинск: 'RU-MOS',
  Пушкино: 'RU-MOS',
  Видное: 'RU-MOS',
  Лобня: 'RU-MOS',
  Дмитров: 'RU-MOS',
  Чехов: 'RU-MOS',
  Серпухов: 'RU-MOS',
  Дубна: 'RU-MOS',
  Истра: 'RU-MOS',
  Клин: 'RU-MOS',
  Ступино: 'RU-MOS',
  Коломна: 'RU-MOS',
  Кашира: 'RU-MOS',
  Воскресенск: 'RU-MOS',
  Шатура: 'RU-MOS',
  'Орехово-Зуево': 'RU-MOS',
  Бронницы: 'RU-MOS',
  Можайск: 'RU-MOS',
  'Наро-Фоминск': 'RU-MOS',
  Кубинка: 'RU-MOS',
  Звенигород: 'RU-MOS',
  Котельники: 'RU-MOS',
  Лыткарино: 'RU-MOS',
  Дзержинский: 'RU-MOS',
  Фрязино: 'RU-MOS',
  Ивантеевка: 'RU-MOS',
  Колпино: 'RU-SPE',
  Пушкин: 'RU-SPE',
  Петергоф: 'RU-SPE',
  Сестрорецк: 'RU-SPE',
  Кронштадт: 'RU-SPE',
  Гатчина: 'RU-LEN',
  Выборг: 'RU-LEN',
  Кириши: 'RU-LEN',
  Тихвин: 'RU-LEN',
  'Сосновый Бор': 'RU-LEN',
  Всеволожск: 'RU-LEN',
  Кудрово: 'RU-LEN',
  Мурино: 'RU-LEN',
  Балашов: 'RU-SAR',
  Набережные: 'RU-TA',
  'Набережные Челны': 'RU-TA',
  Новокузнецк: 'RU-KEM',
  Сыктывкар_KO: 'RU-KO',
};

export const getAddressRegion = (city: string): string | undefined =>
  CITY_TO_REGION[city];

const STATION_ONLY_PATTERN =
  /^(?:м\.?|метро|станц(?:ия|ии)|ж\/д\s*станц(?:ия|ии))(?:\s|$)/i;
const STATION_HINT_PATTERN = /(метро|станц(?:ия|ии)|ж\/д\s*станц(?:ия|ии))/i;

const normalizeJobLocationCity = (city: string): string | null => {
  const trimmed = city.trim();
  if (!trimmed || trimmed === 'Вся Россия') return null;
  if (trimmed === 'Россия') return 'Россия';
  if (STATION_ONLY_PATTERN.test(trimmed)) return null;

  const withoutStationHint = trimmed
    .replace(/\s*\([^)]*\)\s*/g, (match) =>
      STATION_HINT_PATTERN.test(match) ? ' ' : match,
    )
    .replace(/\s+/g, ' ')
    .trim();

  if (!withoutStationHint || withoutStationHint === 'Вся Россия') return null;
  if (STATION_ONLY_PATTERN.test(withoutStationHint)) return null;
  return withoutStationHint;
};

const getJobLocationCities = (cities: readonly string[]): string[] => {
  const normalized = cities
    .map(normalizeJobLocationCity)
    .filter((city): city is string => Boolean(city));
  const unique = Array.from(new Set(normalized));
  return unique;
};

const JOB_COUNTRY_BY_CURRENCY = {
  RUB: { code: 'RU', name: 'Russia', localName: 'Россия' },
  BYN: { code: 'BY', name: 'Belarus', localName: 'Беларусь' },
  KZT: { code: 'KZ', name: 'Kazakhstan', localName: 'Казахстан' },
  KGS: { code: 'KG', name: 'Kyrgyzstan', localName: 'Кыргызстан' },
  UZS: { code: 'UZ', name: 'Uzbekistan', localName: 'Узбекистан' },
} as const;

const resolveJobCountry = (currency: string | undefined) =>
  JOB_COUNTRY_BY_CURRENCY[
    currency && currency in JOB_COUNTRY_BY_CURRENCY
      ? currency as keyof typeof JOB_COUNTRY_BY_CURRENCY
      : 'RUB'
  ];

export type JobPostingInput = {
  title: string;
  description: string;
  slug: string;
  company: string;
  companyUrl: string;
  /** Canonical URL of this single-job detail page. */
  jobUrl: string;
  companyLogo?: string;
  cities: string[];
  /** Exact source-backed workplace address; never synthesized locally. */
  workplaceAddress?: string;
  employmentTypeLabel?: string;
  /**
   * Fix I (2026-05-25) — qualifications as an array of atomic items
   * (one per requirement line). Previously joined into a single
   * semicolon-separated string by the caller, which lost the structure
   * for downstream consumers (LLMs, AI parsers, JSON-LD aggregators).
   * Schema.org allows either form; the array variant preserves
   * semantics. Empty / undefined → field omitted from JSON-LD.
   */
  qualifications?: string[];
  /**
   * Fix I (2026-05-25) — same array treatment as `qualifications`.
   * Emitted as `jobBenefits` in the JSON-LD output.
   */
  benefits?: string[];
  hasApplyLink: boolean;
  applyLink?: string;
  /** True only after the user-visible apply flow passed a manual check. */
  directApplyVerified?: boolean;
  /**
   * Fix C (2026-05-25) — replace the previous flat `baseSalaryMonthly`
   * (a single number, with `minValue` synthesised as 60% of max — a
   * heuristic that discarded the actual `pay.monthly.min` already
   * present in the structured data). Now the caller passes both bounds
   * directly. If only one is known, the other is used as fallback to
   * emit a single-point salary (no fake range).
   */
  baseSalaryMonthlyMin?: number;
  baseSalaryMonthlyMax?: number;
  /**
   * Fix C — same split for hourly: pass min and max when both are
   * known; fall back to a single point otherwise. Currency defaults
   * to RUB.
   */
  hourlyRateMin?: number | null;
  hourlyRateMax?: number | null;
  /** Salary must be backed by a supported source confidence. */
  salaryConfidence?: SalaryConfidence;
  currency?: string;
  datePosted: string;
  validThrough?: string;
  industry?: string;
  /**
   * Fix B (2026-05-25) — flag a fully-remote role. When set:
   *   • `jobLocationType: 'TELECOMMUTE'` is emitted (Google for Jobs
   *     requirement so the role surfaces for «удалённая работа» queries).
   *   • `jobLocation` is collapsed to a country-only Place (no synthetic
   *     street address), since the role has no physical workplace.
   *
   * Source: `GeneratedJob.transport === 'remote'` (see vacancyTypes.ts).
   */
  isRemote?: boolean;
  /**
   * Fix G (2026-05-25) — official employer homepage. Emitted as
   * `hiringOrganization.url` (distinct from `sameAs`, which still
   * points to our internal company page). Resolved via
   * `getCompanyHomepage()` in `src/data/companyHomepages.ts`.
   * Omitted from JSON-LD when undefined.
   */
  hiringOrganizationUrl?: string;
  /**
   * Fix F (2026-05-25) — free-text schedule blob (e.g. «гибкий
   * график: подработка или полная смена»). Combined with
   * `employmentTypeLabel` for `mapEmploymentTypeToSchema`, so mixed
   * graphics surface both `FULL_TIME` and `PART_TIME`. Without this,
   * Burger King-style «подработка или полная» roles only emitted
   * `[FULL_TIME]`, missing matching for «подработка» queries.
   */
  scheduleText?: string;
  /**
   * Fix E (2026-05-25) — BLS SOC code per source-slug
   * (e.g. `35-3023 Fast Food and Counter Workers` for Burger King
   * cook, `41-9041 Telemarketers` for T-Bank operator B2B). Resolved
   * via `getSourceOccupation()` in `src/data/sourceOccupation.ts`.
   * Falls back to default `53-3031 Driver/Sales Workers` when
   * undefined — preserves backward behaviour for un-mapped sources.
   */
  occupationalCategory?: string;
};

export const buildJobPostingSchema = (input: JobPostingInput) => {
  const cities = getJobLocationCities(input.cities);
  const country = resolveJobCountry(input.currency);
  // Fix B (2026-05-25) — for fully-remote roles, collapse jobLocation
  // to a country-only Place. Emitting a synthetic city street address
  // for a role that has no physical workplace contradicts the
  // description and risks anti-spam penalties from Google for Jobs.
  // The matching `jobLocationType: 'TELECOMMUTE'` is added below.
  const countryOnlyLocation = {
    '@type': 'Place' as const,
    address: {
      '@type': 'PostalAddress' as const,
      addressCountry: country.code,
    },
  };
  const jobLocation = input.isRemote || cities.length === 0
    ? [
        countryOnlyLocation,
      ]
    : cities.map((city) => {
        // City-level location only: we do not know real per-vacancy streets
        // or postal codes, so JobPosting must not invent them. Metro/station
        // hints are filtered before this point and stay in page content only.
        if (city === country.localName) {
          return countryOnlyLocation;
        }
        return {
          '@type': 'Place',
          address:
            country.code === 'RU'
              ? buildJobLocationAddress(
                  city,
                  cities.length === 1 ? input.workplaceAddress : undefined,
                )
              : {
                  '@type': 'PostalAddress' as const,
                  addressLocality: city,
                  ...(cities.length === 1 && input.workplaceAddress?.trim()
                    ? { streetAddress: input.workplaceAddress.trim() }
                    : {}),
                  addressCountry: country.code,
                },
        };
      });

  // Fix F (2026-05-25) — combine `employmentTypeLabel` and `scheduleText`
  // so mixed-graphic roles (e.g. Burger King «гибкий график: подработка
  // или полная смена») surface BOTH `FULL_TIME` and `PART_TIME`. The
  // employment_type field alone is usually just «Официальное
  // трудоустройство» / «Самозанятость» — the «подработка» marker lives
  // in the schedule blob.
  const combinedEmploymentLabel = [
    input.employmentTypeLabel,
    input.scheduleText,
  ]
    .filter(Boolean)
    .join(' ');
  const employmentType = mapEmploymentTypeToSchema(
    combinedEmploymentLabel || undefined,
  );

  // Fix C (2026-05-25) — emit baseSalary range from REAL min/max in
  // structured `pay.monthly` / `pay.hourly` data, instead of the prior
  // `minValue = max × 0.6` heuristic that under-reported real income on
  // every vacancy page. Single-point fallback when only one bound is
  // known (no synthetic range).
  const baseSalary: MonetaryAmountSchema | undefined = (() => {
    if (
      input.salaryConfidence !== 'official' &&
      input.salaryConfidence !== 'partner'
    ) {
      return undefined;
    }
    const monthlyMax =
      input.baseSalaryMonthlyMax && input.baseSalaryMonthlyMax > 0
        ? input.baseSalaryMonthlyMax
        : null;
    const monthlyMin =
      input.baseSalaryMonthlyMin && input.baseSalaryMonthlyMin > 0
        ? input.baseSalaryMonthlyMin
        : null;
    if (monthlyMax || monthlyMin) {
      const max = monthlyMax ?? monthlyMin!;
      const min = monthlyMin ?? max;
      return {
        '@type': 'MonetaryAmount',
        currency: input.currency || 'RUB',
        value: {
          '@type': 'QuantitativeValue',
          value: max,
          maxValue: max,
          minValue: min,
          unitText: 'MONTH',
        },
      };
    }
    const hourlyMax =
      input.hourlyRateMax && input.hourlyRateMax > 0 ? input.hourlyRateMax : null;
    const hourlyMin =
      input.hourlyRateMin && input.hourlyRateMin > 0 ? input.hourlyRateMin : null;
    if (hourlyMax || hourlyMin) {
      const max = hourlyMax ?? hourlyMin!;
      const min = hourlyMin ?? max;
      // Hourly: only emit `min/max` keys when the bracket is non-degenerate
      // (Google rejects redundant single-point ranges with a warning).
      const value =
        min === max
          ? { '@type': 'QuantitativeValue' as const, value: max, unitText: 'HOUR' }
          : {
              '@type': 'QuantitativeValue' as const,
              value: max,
              maxValue: max,
              minValue: min,
              unitText: 'HOUR',
            };
      return {
        '@type': 'MonetaryAmount',
        currency: input.currency || 'RUB',
        value,
      };
    }
    return undefined;
  })();

  return {
    '@type': 'JobPosting',
    inLanguage: 'ru-RU',
    title: input.title,
    description: input.description,
    identifier: {
      '@type': 'PropertyValue',
      name: 'КурьерОк',
      value: input.slug,
    },
    url: input.jobUrl,
    datePosted: input.datePosted,
    ...(input.validThrough ? { validThrough: input.validThrough } : {}),
    employmentType,
    hiringOrganization: {
      '@type': 'Organization',
      name: input.company,
      // Fix G (2026-05-25) — official employer homepage when known
      // (e.g. https://burgerking.ru/). Distinct from `sameAs`, which
      // still back-links to our internal `/companies/{slug}/` page.
      ...(input.hiringOrganizationUrl ? { url: input.hiringOrganizationUrl } : {}),
      sameAs: input.companyUrl,
      ...(input.companyLogo ? { logo: input.companyLogo } : {}),
    },
    jobLocation,
    ...(input.isRemote ? { jobLocationType: 'TELECOMMUTE' } : {}),
    applicantLocationRequirements: {
      '@type': 'Country',
      name: country.name,
    },
    directApply: Boolean(input.hasApplyLink && input.directApplyVerified),
    // Fix I (2026-05-25) — emit as array (semantic structure preserved),
    // not joined string. Omit field entirely on empty array.
    ...(input.benefits && input.benefits.length > 0
      ? { jobBenefits: input.benefits }
      : {}),
    ...(input.qualifications && input.qualifications.length > 0
      ? { qualifications: input.qualifications }
      : {}),
    industry: input.industry || 'Курьерская доставка',
    occupationalCategory:
      input.occupationalCategory || '53-3031 Driver/Sales Workers',
    // Google for Jobs requires `experienceRequirements` to be an
    // `OccupationalExperienceRequirements` object with a *positive*
    // numeric `monthsOfExperience`. For «без опыта» roles we omit the
    // field entirely — emitting `monthsOfExperience: 0` is treated as
    // a non-critical warning by the Rich Results validator.
    ...(() => {
      const req = buildExperienceRequirements(input.qualifications);
      return req ? { experienceRequirements: req } : {};
    })(),
    ...(baseSalary ? { baseSalary } : {}),
  };
};

/**
 * Map the free-text `qualifications` blob to a structured
 * `OccupationalExperienceRequirements` (Google rich result requirement).
 *
 * Returns `undefined` when no positive months-of-experience are
 * required so the caller can omit the field entirely. Google rejects
 * `monthsOfExperience: 0` with a non-critical «must be positive»
 * warning, so a missing field is preferable for «без опыта» roles.
 *
 * Match requires an explicit experience-context keyword («опыт» /
 * «стаж» / `experience`) within ~40 chars *before* a duration phrase
 * — this prevents false positives such as «Возраст от 18 лет» where
 * «лет» refers to age, not experience. Anything else returns
 * `undefined`.
 */
const buildExperienceRequirements = (qualifications: string[] | undefined) => {
  if (!qualifications || qualifications.length === 0) return undefined;
  // Fix I (2026-05-25) — `qualifications` is now `string[]`. Join with
  // a separator that preserves the boundary so cross-item regex matches
  // (e.g. «опыт» on one line + «от 2 лет» on the next) don't bleed.
  // The «; » separator matches the pre-Fix-I behaviour where the caller
  // joined the same way.
  const text = qualifications.join('; ').toLowerCase();
  if (/без\s+опыта|no\s+experience/.test(text)) return undefined;
  // Experience-context keyword + duration «от N год/лет/месяц(ев)».
  const match = text.match(
    /(?:опыт|стаж|experience)[^.;]{0,40}?от\s+(\d+)\s+(год|лет|месяц)/,
  );
  if (!match) return undefined;
  const num = Number.parseInt(match[1], 10);
  if (!Number.isFinite(num) || num <= 0) return undefined;
  const months = /месяц/.test(match[2]) ? num : num * 12;
  if (months <= 0) return undefined;
  return {
    '@type': 'OccupationalExperienceRequirements' as const,
    monthsOfExperience: months,
  };
};

export type PlaceSchemaInput = {
  city: string;
  pageUrl: string;
  description?: string;
};

export const buildPlaceSchema = ({ city, pageUrl, description }: PlaceSchemaInput) => {
  const region = getAddressRegion(city);
  return {
    '@type': 'Place',
    inLanguage: 'ru-RU',
    name: `Работа курьером в ${city}`,
    url: pageUrl,
    ...(description ? { description } : {}),
    address: {
      '@type': 'PostalAddress',
      addressLocality: city,
      ...(region ? { addressRegion: region } : {}),
      addressCountry: 'RU',
    },
  };
};

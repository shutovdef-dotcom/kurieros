import { detailJobs } from '../data/jobs';
import { getCityRegion } from '../data/cityRegions';
import type { CurrencyCode, GeneratedJob, TransportMode } from '../data/vacancyTypes';
import { getCitiesFromJobs } from './cities';
import { getNearbyCities } from './cityGeoIndex';
import { getLeadFormEligibility } from './leadFormEligibility';
import { isExternalApplyLink } from './applyRoute';
import { normalizeCityKey, splitLocationKeys } from './jobFilters';
import { formatMoneyAmount, getCurrencyLabel } from './money';

/** The city comparison shows at least four different employers when data allows. */
export const COMPARISON_MINIMUM = 4;

/** Transport modes exposed by the city comparison UI, in default-tab order. */
export const COMPARISON_TRANSPORTS = ['bicycle', 'auto', 'foot'] as const;

export type ComparisonTransport = (typeof COMPARISON_TRANSPORTS)[number];

/** Minimal job shape needed by the selection/indexing logic. */
export type ComparisonJobInput = Pick<
  GeneratedJob,
  'id' | 'company' | 'location' | 'transport' | 'applyLink' | 'salary' | 'currency'
> & {
  title?: string;
  sourceSlug?: string;
  tags?: readonly string[];
  search_tags?: readonly string[];
  details: Pick<GeneratedJob['details'], 'rate'>;
  priority?: number;
};

export type ComparisonCityRef = {
  name: string;
  slug: string;
};

export type ComparisonSelection<TJob extends ComparisonJobInput = GeneratedJob> = {
  job: TJob;
  /** City named by the vacancy bucket that supplied this row. */
  sourceCity: string;
  /** True only when the row matches the landing page's own city. */
  isLocal: boolean;
};

export type ComparisonJobIndex<TJob extends ComparisonJobInput = GeneratedJob> = ReadonlyMap<
  ComparisonTransport,
  ReadonlyMap<string, readonly TJob[]>
>;

export type ComparisonMonthlyBasis = 'monthly' | 'hourly' | 'shift' | 'day' | 'unknown';

export type ComparisonMonthlyEstimate = {
  value: number | null;
  text: string | null;
  basis: ComparisonMonthlyBasis;
};

const NATIONWIDE_CITY_KEY = normalizeCityKey('Вся Россия');
const SHIFTS_PER_MONTH = 22;
const DEFAULT_HOURS_PER_SHIFT = 8;
const EXPLICIT_SHIFT_HOURS_RE = /(?:за|\/)\s*(\d[\d\s]*)\s*час/i;
const NUMBER_RE = /\d[\d\s\u00a0\u202f]*/g;

const isComparisonTransport = (value: TransportMode): value is ComparisonTransport =>
  (COMPARISON_TRANSPORTS as readonly string[]).includes(value);

const extractNumbers = (value: string): number[] =>
  [...value.matchAll(NUMBER_RE)]
    .map((match) => Number.parseInt(match[0]!.replace(/[\s\u00a0\u202f]/g, ''), 10))
    .filter((number) => Number.isFinite(number) && number > 0);

const normalizedCompanyKey = (company: string): string => normalizeCityKey(company);

const normalizeComparisonText = (value: string): string =>
  value
    .toLocaleLowerCase('ru-RU')
    .replace(/ё/g, 'е')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

/**
 * Avoid printing a company twice when the source vacancy title already
 * contains the employer name. Parenthetical aliases such as "(ex. ...)"
 * are ignored because the short company name is the useful match.
 */
export const shouldShowComparisonCompany = (
  title: string | undefined,
  company: string,
): boolean => {
  const normalizedTitle = normalizeComparisonText(title ?? '');
  const normalizedCompany = normalizeComparisonText(company.split('(')[0] ?? '');

  return !normalizedCompany || !normalizedTitle.includes(normalizedCompany);
};

const hasAvailableApply = (job: ComparisonJobInput): boolean => {
  if (!job.applyLink || job.applyLink === '#') return false;
  if (job.applyLink.startsWith('lead-form:')) {
    return getLeadFormEligibility(job).eligible;
  }
  return isExternalApplyLink(job.applyLink);
};

const getPriority = (job: ComparisonJobInput): number =>
  typeof job.priority === 'number' && Number.isFinite(job.priority) ? job.priority : 0;

const COURIER_TERM_RE = /(?:курьер|courier)/i;

/**
 * Keep non-courier roles (pickers, warehouse operators, bank reps, etc.) out
 * of a page whose promise is specifically a courier salary comparison. The
 * optional fields keep the index helper easy to unit-test with a small job
 * fixture while GeneratedJob supplies all role signals in production.
 */
const isCourierComparisonJob = (job: ComparisonJobInput): boolean => {
  const roleSignals = [
    job.title,
    job.sourceSlug,
    ...(job.tags ?? []),
    ...(job.search_tags ?? []),
  ].filter((value): value is string => Boolean(value));

  return roleSignals.length === 0 || roleSignals.some((value) => COURIER_TERM_RE.test(value));
};

/**
 * Build a transport + exact-city index once at module load instead of
 * rescanning all vacancies for every one of the ~1,000 generated pages.
 * Nationwide offers are intentionally excluded: they are not evidence of a
 * city-specific salary and would make every page look artificially local.
 */
export const buildComparisonJobIndex = <TJob extends ComparisonJobInput>(
  jobs: readonly TJob[],
): ComparisonJobIndex<TJob> => {
  const byTransport = new Map<ComparisonTransport, Map<string, TJob[]>>(
    COMPARISON_TRANSPORTS.map((transport) => [transport, new Map<string, TJob[]>()]),
  );

  for (const job of jobs) {
    if (
      !isComparisonTransport(job.transport) ||
      !isCourierComparisonJob(job) ||
      !hasAvailableApply(job)
    ) continue;

    const cityKeys = new Set(
      splitLocationKeys(job.location).filter((cityKey) => cityKey !== NATIONWIDE_CITY_KEY),
    );
    const cityMap = byTransport.get(job.transport)!;

    for (const cityKey of cityKeys) {
      const bucket = cityMap.get(cityKey);
      if (bucket) {
        bucket.push(job);
      } else {
        cityMap.set(cityKey, [job]);
      }
    }
  }

  return byTransport;
};

/**
 * Merge geospatial neighbours and a deterministic fallback list while
 * preserving order and removing duplicate city references.
 */
export const buildComparisonCandidateCities = (
  origin: ComparisonCityRef,
  nearbyCities: readonly ComparisonCityRef[],
  fallbackCities: readonly ComparisonCityRef[] = [],
): ComparisonCityRef[] => {
  const seen = new Set<string>();
  const candidates: ComparisonCityRef[] = [];

  for (const candidate of [origin, ...nearbyCities, ...fallbackCities]) {
    const key = normalizeCityKey(candidate.name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    candidates.push(candidate);
  }

  return candidates;
};

/**
 * Return all available fallback cities in a useful order:
 * geospatial neighbours first, then same-region cities when the origin has
 * no coordinates, and finally a stable population-ordered tail. The tail is
 * only a last-resort data guard for small settlements without geo coverage.
 */
export const getComparisonNeighbourCities = (
  origin: ComparisonCityRef,
): ComparisonCityRef[] => {
  const nearby = getNearbyCities(origin.slug, Number.MAX_SAFE_INTEGER).map(({ name, slug }) => ({
    name,
    slug,
  }));
  const originRegion = getCityRegion(origin.name);
  const sameRegion = originRegion
    ? comparisonCities
        .filter((city) => city.name !== origin.name && getCityRegion(city.name) === originRegion)
        .sort((left, right) => right.population - left.population || left.name.localeCompare(right.name, 'ru'))
        .map(({ name, slug }) => ({ name, slug }))
    : [];
  const populationFallback = [...comparisonCities]
    .sort((left, right) => right.population - left.population || left.name.localeCompare(right.name, 'ru'))
    .map(({ name, slug }) => ({ name, slug }));

  return buildComparisonCandidateCities(origin, nearby, [...sameRegion, ...populationFallback]).slice(1);
};

/**
 * Keep every eligible vacancy from the landing city. If that city has fewer
 * than the minimum number of distinct employers, add one vacancy per new
 * employer from the supplied neighbour order until the minimum is reached.
 */
export const selectComparisonJobs = <TJob extends ComparisonJobInput>(
  index: ComparisonJobIndex<TJob>,
  origin: ComparisonCityRef,
  nearbyCities: readonly ComparisonCityRef[],
  transport: ComparisonTransport,
  minimum = COMPARISON_MINIMUM,
): ComparisonSelection<TJob>[] => {
  if (minimum <= 0) return [];

  const cityMap = index.get(transport);
  if (!cityMap) return [];

  const selected: ComparisonSelection<TJob>[] = [];
  const seenJobs = new Set<number>();
  const seenCompanies = new Set<string>();
  const candidates = buildComparisonCandidateCities(origin, nearbyCities);
  const originKey = normalizeCityKey(origin.name);
  const originTransportJobs = cityMap.get(originKey) ?? [];
  const originCurrencies = new Set<CurrencyCode>(originTransportJobs.map((job) => job.currency));

  // A page can exist for a city whose selected transport has no local rows,
  // while another transport still identifies the city's country. Use that
  // signal before falling back to RUB for an entirely data-sparse city.
  if (originCurrencies.size === 0) {
    for (const candidateMap of index.values()) {
      for (const job of candidateMap.get(originKey) ?? []) {
        originCurrencies.add(job.currency);
      }
    }
  }
  if (originCurrencies.size === 0) originCurrencies.add('RUB');

  const appendJobs = (
    candidate: ComparisonCityRef,
    cityIndex: number,
    onlyNewCompanies: boolean,
  ): void => {
    const bucket = (cityMap.get(normalizeCityKey(candidate.name)) ?? []).filter((job) =>
      originCurrencies.has(job.currency),
    );
    const orderedJobs = bucket
      .map((job, sourceIndex) => ({ job, sourceIndex }))
      .sort(
        (left, right) =>
          getPriority(right.job) - getPriority(left.job) || left.sourceIndex - right.sourceIndex,
      );

    for (const { job } of orderedJobs) {
      if (onlyNewCompanies && seenCompanies.size >= minimum) break;
      if (seenJobs.has(job.id)) continue;

      const companyKey = normalizedCompanyKey(job.company);
      if (!companyKey || (onlyNewCompanies && seenCompanies.has(companyKey))) continue;

      seenJobs.add(job.id);
      seenCompanies.add(companyKey);
      selected.push({
        job,
        sourceCity: candidate.name,
        isLocal: cityIndex === 0,
      });
    }
  };

  const [originCandidate, ...neighbourCandidates] = candidates;
  if (!originCandidate) return selected;

  appendJobs(originCandidate, 0, false);
  if (seenCompanies.size >= minimum) return selected;

  for (const [index, candidate] of neighbourCandidates.entries()) {
    appendJobs(candidate, index + 1, true);
    if (seenCompanies.size >= minimum) break;
  }

  return selected;
};

/** Canonical city comparison URL used by route, city pages, and tests. */
export const getCourierSalaryComparisonPath = (citySlug: string): string =>
  `/sravnenie-zarplat-kurerov-${citySlug}/`;

const formatMonthlyText = (
  source: string,
  currency: CurrencyCode,
  value: number,
): string => {
  const normalized = source.replace(/[\u00a0\u202f]/g, ' ').trim();
  const rangeMatch = normalized.match(
    /от\s+[\d\s]+\s+до\s+[\d\s]+\s*(?:₽|BYN|₸|сом|сум)?\s*\/\s*мес/i,
  );
  if (rangeMatch) return rangeMatch[0].replace(/\s+/g, ' ');

  const bound = normalized.match(/(?:^|\s)(от|до)(?=\s)/i)?.[1];
  const prefix = bound ? `${bound.toLowerCase()} ` : '';
  return `${prefix}${formatMoneyAmount(value)} ${getCurrencyLabel(currency)}/мес`;
};

const monthlyMarker = /(?:\/\s*мес(?:яц)?|за\s+месяц)/i;

const getMonthlySource = (
  salary: string,
  rate: string,
): { source: string; value: number } | null => {
  const sources = [salary, rate];
  for (const source of sources) {
    if (!monthlyMarker.test(source)) continue;
    const markerIndex = source.search(monthlyMarker);
    const beforeMarker = markerIndex >= 0 ? source.slice(0, markerIndex) : source;
    const numbers = extractNumbers(beforeMarker);
    const value = numbers.at(-1) ?? 0;
    if (value > 0) return { source, value };
  }
  return null;
};

/**
 * Produce an honest common monthly comparison basis. Monthly source values
 * are preserved; explicit hourly/shift/day values are projected to 22 shifts
 * and otherwise left unconverted when a reliable period is unavailable.
 */
export const getComparisonMonthlyEstimate = (
  job: Pick<ComparisonJobInput, 'salary' | 'currency' | 'details'>,
): ComparisonMonthlyEstimate => {
  const salary = job.salary.trim();
  const rate = job.details.rate.trim();
  const monthlySource = getMonthlySource(salary, rate);

  if (monthlySource) {
    return {
      value: monthlySource.value,
      text: formatMonthlyText(monthlySource.source, job.currency, monthlySource.value),
      basis: 'monthly',
    };
  }

  const source = `${salary}, ${rate}`;
  const currencyLabel = getCurrencyLabel(job.currency);
  const explicitHours = source.match(EXPLICIT_SHIFT_HOURS_RE)?.[1];
  const hoursPerShift = explicitHours
    ? Number.parseInt(explicitHours.replace(/\s/g, ''), 10)
    : DEFAULT_HOURS_PER_SHIFT;
  const hourlyMatch = source.match(
    new RegExp(`(\\d[\\d\\s]*)\\s*(?:${currencyLabel}|руб(?:\\.|лей)?)?\\s*/\\s*час`, 'i'),
  );
  if (hourlyMatch) {
    const hourly = Number.parseInt(hourlyMatch[1]!.replace(/\s/g, ''), 10);
    const value = hourly * hoursPerShift * SHIFTS_PER_MONTH;
    return {
      value,
      text: `≈ ${formatMoneyAmount(value)} ${currencyLabel}/мес`,
      basis: 'hourly',
    };
  }

  const dayMatch = source.match(
    new RegExp(`(\\d[\\d\\s]*)\\s*(?:${currencyLabel}|руб(?:\\.|лей)?)?\\s*(?:/\\s*(?:день|смена)|за\\s+(?:день|смену))`, 'i'),
  );
  if (dayMatch) {
    const daily = Number.parseInt(dayMatch[1]!.replace(/\s/g, ''), 10);
    const value = daily * SHIFTS_PER_MONTH;
    return {
      value,
      text: `≈ ${formatMoneyAmount(value)} ${currencyLabel}/мес`,
      basis: /смен/i.test(dayMatch[0]!) ? 'shift' : 'day',
    };
  }

  return { value: null, text: null, basis: 'unknown' };
};

/** Build the live comparison index from canonical, detail-page vacancies. */
export const comparisonJobIndex = buildComparisonJobIndex(detailJobs);

/** City surface for this feature: every city represented by a detail vacancy. */
export const comparisonCities = getCitiesFromJobs(detailJobs);

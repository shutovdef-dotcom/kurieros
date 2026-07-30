export const DEFAULT_RECRAWL_CAROUSEL_EPOCH = '2026-07-30';
export const DEFAULT_YANDEX_RECRAWL_LIMIT = 150;
export const DEFAULT_GOOGLE_INDEXING_API_LIMIT = 200;
export const DEFAULT_RECRAWL_LIMIT = DEFAULT_YANDEX_RECRAWL_LIMIT;
export const DEFAULT_HIGH_PRIORITY_SHARE = 2 / 3;

const DAY_MS = 24 * 60 * 60 * 1_000;
const HIGH_PRIORITY_RECOMMENDATIONS = new Set([
  'index_detail',
  'index_detail_watch',
]);

export type RecrawlCarouselEngine = 'yandex' | 'google-indexing-api';

export type RecrawlCarouselGscRow = {
  path: string;
  recommendation?: string;
  clicks?: number | string;
  impressions?: number | string;
  avgPosition?: number | string;
  position?: number | string;
};

export type RecrawlCarouselInput = {
  date: string;
  indexablePaths: readonly string[];
  engine?: RecrawlCarouselEngine;
  gscRows?: readonly RecrawlCarouselGscRow[];
  siteUrl?: string;
  limit?: number;
  highPriorityShare?: number;
  epochDate?: string;
};

export type RecrawlCarouselBatch = {
  schemaVersion: 1;
  engine: RecrawlCarouselEngine;
  date: string;
  epochDate: string;
  dayIndex: number;
  siteUrl: string;
  limit: number;
  highPriorityLimit: number;
  broadLimit: number;
  queueSizes: {
    totalIndexable: number;
    highPriority: number;
    broad: number;
  };
  paths: string[];
  urls: string[];
};

type GscScore = {
  clicks: number;
  impressions: number;
  avgPosition: number;
  recommendation?: string;
};

const normalizeSiteUrl = (siteUrl: string): string => siteUrl.replace(/\/+$/, '');

const parseDateOnlyUtc = (date: string): number => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Expected date in YYYY-MM-DD format, got: ${date}`);
  }
  const [year, month, day] = date.split('-').map(Number);
  const timestamp = Date.UTC(year!, month! - 1, day);
  const normalized = new Date(timestamp).toISOString().slice(0, 10);
  if (normalized !== date) throw new Error(`Invalid calendar date: ${date}`);
  return timestamp;
};

const daysSince = (date: string, epochDate: string): number =>
  Math.max(0, Math.floor((parseDateOnlyUtc(date) - parseDateOnlyUtc(epochDate)) / DAY_MS));

const toNumber = (value: number | string | undefined, fallback: number): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  if (typeof value !== 'string') return fallback;
  const parsed = Number.parseFloat(value.replace(',', '.').replace('%', ''));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeVacancyPath = (value: string, siteUrl: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const url = new URL(trimmed, `${normalizeSiteUrl(siteUrl)}/`);
  if (url.search || url.hash) return null;
  const path = url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`;
  if (!/^\/v\/[^/]+\/$/.test(path)) return null;
  return path;
};

const uniqueSortedVacancyPaths = (paths: readonly string[], siteUrl: string): string[] =>
  [...new Set(paths
    .map((path) => normalizeVacancyPath(path, siteUrl))
    .filter((path): path is string => Boolean(path)))]
    .sort((a, b) => a.localeCompare(b));

const positiveInteger = (value: number | undefined, fallback: number): number => {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.floor(value));
};

const boundedShare = (value: number | undefined): number => {
  if (value === undefined || !Number.isFinite(value)) return DEFAULT_HIGH_PRIORITY_SHARE;
  return Math.min(1, Math.max(0, value));
};

export const defaultRecrawlLimitForEngine = (engine: RecrawlCarouselEngine): number =>
  engine === 'google-indexing-api'
    ? DEFAULT_GOOGLE_INDEXING_API_LIMIT
    : DEFAULT_YANDEX_RECRAWL_LIMIT;

const mergeGscScores = (
  rows: readonly RecrawlCarouselGscRow[],
  allowedPaths: ReadonlySet<string>,
  siteUrl: string,
): Map<string, GscScore> => {
  const scores = new Map<string, GscScore>();
  for (const row of rows) {
    const path = normalizeVacancyPath(row.path, siteUrl);
    if (!path || !allowedPaths.has(path)) continue;
    const previous = scores.get(path);
    scores.set(path, {
      clicks: (previous?.clicks ?? 0) + toNumber(row.clicks, 0),
      impressions: (previous?.impressions ?? 0) + toNumber(row.impressions, 0),
      avgPosition: Math.min(
        previous?.avgPosition ?? Number.POSITIVE_INFINITY,
        toNumber(row.avgPosition ?? row.position, Number.POSITIVE_INFINITY),
      ),
      recommendation: previous?.recommendation ?? row.recommendation,
    });
  }
  return scores;
};

const isHighPriority = (score: GscScore): boolean =>
  score.clicks >= 1 ||
  score.impressions >= 5 ||
  HIGH_PRIORITY_RECOMMENDATIONS.has(score.recommendation ?? '');

const rotatingPick = (items: readonly string[], count: number, dayIndex: number): string[] => {
  if (items.length === 0 || count <= 0) return [];
  const take = Math.min(count, items.length);
  const start = (dayIndex * take) % items.length;
  return Array.from({ length: take }, (_, offset) => items[(start + offset) % items.length]!);
};

const appendUnique = (
  base: readonly string[],
  additions: readonly string[],
  limit: number,
): string[] => {
  const seen = new Set(base);
  const merged = [...base];
  for (const path of additions) {
    if (seen.has(path) || merged.length >= limit) continue;
    seen.add(path);
    merged.push(path);
  }
  return merged;
};

export const buildRecrawlCarouselBatch = ({
  date,
  indexablePaths,
  engine = 'yandex',
  gscRows = [],
  siteUrl = 'https://kurerok.ru',
  limit = defaultRecrawlLimitForEngine(engine),
  highPriorityShare = DEFAULT_HIGH_PRIORITY_SHARE,
  epochDate = DEFAULT_RECRAWL_CAROUSEL_EPOCH,
}: RecrawlCarouselInput): RecrawlCarouselBatch => {
  const normalizedSiteUrl = normalizeSiteUrl(siteUrl);
  const normalizedLimit = positiveInteger(limit, DEFAULT_RECRAWL_LIMIT);
  const dayIndex = daysSince(date, epochDate);
  const allPaths = uniqueSortedVacancyPaths(indexablePaths, normalizedSiteUrl);
  const allPathSet = new Set(allPaths);
  const gscScores = mergeGscScores(gscRows, allPathSet, normalizedSiteUrl);
  const highPriorityPaths = [...gscScores]
    .filter(([, score]) => isHighPriority(score))
    .sort(([aPath, aScore], [bPath, bScore]) =>
      bScore.clicks - aScore.clicks ||
      bScore.impressions - aScore.impressions ||
      aScore.avgPosition - bScore.avgPosition ||
      aPath.localeCompare(bPath),
    )
    .map(([path]) => path);
  const highPrioritySet = new Set(highPriorityPaths);
  const broadPaths = allPaths.filter((path) => !highPrioritySet.has(path));
  const highPriorityLimit = Math.min(
    normalizedLimit,
    Math.round(normalizedLimit * boundedShare(highPriorityShare)),
  );
  const broadLimit = normalizedLimit - highPriorityLimit;
  const highPriorityBatch = rotatingPick(highPriorityPaths, highPriorityLimit, dayIndex);
  const broadBatch = rotatingPick(
    broadPaths,
    broadLimit + Math.max(0, highPriorityLimit - highPriorityBatch.length),
    dayIndex,
  );
  const paths = appendUnique(
    appendUnique([], highPriorityBatch, normalizedLimit),
    broadBatch,
    normalizedLimit,
  );
  const filledPaths = paths.length < normalizedLimit
    ? appendUnique(paths, rotatingPick(allPaths, normalizedLimit, dayIndex), normalizedLimit)
    : paths;

  return {
    schemaVersion: 1,
    engine,
    date,
    epochDate,
    dayIndex,
    siteUrl: normalizedSiteUrl,
    limit: normalizedLimit,
    highPriorityLimit,
    broadLimit,
    queueSizes: {
      totalIndexable: allPaths.length,
      highPriority: highPriorityPaths.length,
      broad: broadPaths.length,
    },
    paths: filledPaths,
    urls: filledPaths.map((path) => new URL(path, `${normalizedSiteUrl}/`).toString()),
  };
};

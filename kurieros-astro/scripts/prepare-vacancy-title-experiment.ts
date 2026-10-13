/** Explicit, one-time preparation. Never run from a routine site build. */
import { readFileSync, writeFileSync } from 'node:fs';
import jobs, { detailJobs } from '../src/data/jobs';
import { mtsLegacyRoutes } from '../src/data/mtsLegacyRoutes';
import { retiredVacancyRoutes } from '../src/data/retiredVacancyRoutes';
import { getVacancyCanonicalPath } from '../src/utils/vacancyUrl';
import { getVacancyIndexability } from '../src/utils/vacancyIndexability';
import { fnv1a } from '../src/utils/fnv1a';
import { buildVacancyTitleVariants, getTitleIncome, TITLE_ARMS, TITLE_ARM_LABELS } from '../src/utils/vacancyTitleVariants';

type Metric = { current: number; previous: number };
type Row = { url: string; path: string; impressions: Metric; clicks: Metric; averagePosition: Metric };
const input = process.argv[2];
if (!input) throw new Error('Pass a complete GSC Pages baseline JSON path');
const raw = JSON.parse(readFileSync(input, 'utf8')) as {
  capturedAtUtc: string; period: unknown; proof: { tableRowsDisplayed: string; rowsCaptured: number; uniqueUrls: number };
  pages: Row[];
};
const tableTotal = Number(raw.proof.tableRowsDisplayed.match(/of (\d+)$/u)?.[1]);
if (raw.pages.length !== raw.proof.rowsCaptured || raw.pages.length !== tableTotal ||
  new Set(raw.pages.map((row) => row.url)).size !== raw.proof.uniqueUrls) {
  throw new Error('Incomplete GSC table capture');
}
const detailByPath = new Map(detailJobs.map((job) => [getVacancyCanonicalPath(job), job]));
const aliases = new Map(jobs.map((job) => [`/v/${job.slug}/`, getVacancyCanonicalPath(job)]));
const unavailable = new Set([...mtsLegacyRoutes, ...retiredVacancyRoutes].map((row) => `/v/${row.slug}/`));
const grouped = new Map<string, Row[]>();
for (const row of raw.pages) {
  if (!row.path.startsWith('/v/')) continue;
  const path = aliases.get(row.path) ?? row.path;
  grouped.set(path, [...(grouped.get(path) ?? []), row]);
}
const aggregates = [...grouped].map(([path, rows]) => {
  const sum = (metric: 'impressions' | 'clicks', period: 'current' | 'previous') =>
    rows.reduce((n, row) => n + row[metric][period], 0);
  const impressions = sum('impressions', 'current');
  const previousImpressions = sum('impressions', 'previous');
  return { path, rows, baseline: {
    clicks: sum('clicks', 'current'), impressions,
    position: impressions ? rows.reduce((n, row) => n + row.averagePosition.current * row.impressions.current, 0) / impressions : null,
    previousClicks: sum('clicks', 'previous'), previousImpressions,
    previousPosition: previousImpressions ? rows.reduce((n, row) => n + row.averagePosition.previous * row.impressions.previous, 0) / previousImpressions : null,
  } };
}).filter((row) => row.baseline.impressions > 0);
const excluded: Array<{ path: string; reason: string; impressions: number; observedUrls: string[] }> = [];
const candidates = aggregates.flatMap((row) => {
  const job = detailByPath.get(row.path);
  const reason = !job ? (unavailable.has(row.path) ? 'unavailable_offer_or_unverified_city' : 'unmatched_url')
    : !getVacancyIndexability(job).indexable ? 'noindex' : null;
  if (reason) {
    excluded.push({ path: row.path, reason, impressions: row.baseline.impressions, observedUrls: row.rows.map((r) => r.url) });
    return [];
  }
  return [{ ...row, job: job!, variants: buildVacancyTitleVariants(job!), stratum: `${job!.sourceSlug}:${job!.transport}` }];
}).sort((a, b) => b.baseline.impressions - a.baseline.impressions || a.path.localeCompare(b.path, 'en'));
if (excluded.some((row) => row.reason === 'unmatched_url')) throw new Error('Unexplained positive-impression URL; investigate before publication');
const armTotals = new Map(TITLE_ARMS.map((arm) => [arm, { pages: 0, impressions: 0, clicks: 0 }]));
const stratumCounts = new Map<string, Map<string, number>>();
const targetImpressions = candidates.reduce((n, row) => n + row.baseline.impressions, 0) / TITLE_ARMS.length;
const cohorts = candidates.map((row) => {
  const counts = stratumCounts.get(row.stratum) ?? new Map<string, number>();
  stratumCounts.set(row.stratum, counts);
  const arms = TITLE_ARMS.filter((arm) => row.variants[arm]);
  if (!arms.length) throw new Error(`No complete title fits ${row.path}`);
  arms.sort((a, b) => {
    // Spread each role/transport over variants first, then balance total
    // impressions. Hash is a reproducible tie-break, not visitor randomization.
    const score = (arm: typeof a) => (counts.get(arm) ?? 0) * 1000 + armTotals.get(arm)!.impressions / Math.max(1, targetImpressions);
    return score(a) - score(b) || fnv1a(`${row.job.slug}:${a}`) - fnv1a(`${row.job.slug}:${b}`);
  });
  const arm = arms[0];
  counts.set(arm, (counts.get(arm) ?? 0) + 1);
  const total = armTotals.get(arm)!;
  total.pages++; total.impressions += row.baseline.impressions; total.clicks += row.baseline.clicks;
  return {
    slug: row.job.slug, path: row.path, sourceSlug: row.job.sourceSlug, company: row.job.company,
    city: row.job.location, transport: row.job.transport, stratum: row.stratum,
    arm, title: row.variants[arm]!, income: getTitleIncome(row.job) ?? null,
    incomeBasis: row.job.salaryConfidence === 'estimated' ? 'owner_supplied_estimate' : row.job.salaryConfidence,
    baseline: row.baseline, observedUrls: row.rows.map((r) => r.url),
  };
});
const result = {
  id: 'vacancy-title-all-2026-10-13', capturedAt: raw.capturedAtUtc,
  source: 'Complete GSC Web Pages comparison; positive-impression vacancy paths; query variants aggregated by canonical path',
  sourcePeriod: raw.period, publicationVerifiedAt: null,
  supersedes: 'fresh-title-2026-10-13',
  allocation: 'Fixed URL assignment; balanced counts within source/transport and then overall impressions; descriptive comparison, not a visitor-level randomized test',
  redesignConcurrent: true,
  incomePolicy: 'Use existing source amounts with their currency and period. Ozon couriers: explicit owner-supplied possible ceiling 8000 RUB/day, estimated, not employer-confirmed. No invented amount for unknown income.',
  sourceRowCount: raw.pages.length,
  positiveVacancyUrlRows: raw.pages.filter((row) => row.path.startsWith('/v/') && row.impressions.current > 0).length,
  positiveVacancyPaths: aggregates.length,
  cohorts, excluded,
  arms: TITLE_ARMS.map((arm) => ({ arm, label: TITLE_ARM_LABELS[arm], ...armTotals.get(arm)! })),
};
writeFileSync('src/data/seoExpandedTitleBaseline.json', `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ pages: cohorts.length, excluded: excluded.length, positivePaths: aggregates.length, arms: result.arms }));

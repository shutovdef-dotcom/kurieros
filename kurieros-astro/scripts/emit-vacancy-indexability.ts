#!/usr/bin/env tsx
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { detailJobs } from '../src/data/jobs';
import {
  GOOGLE_FULL_VACANCY_RESTORE,
  HARD_NOINDEX_VACANCY_PATHS,
  INDEXABLE_GSC_RECOMMENDATIONS,
  TOP_INDEXABLE_VACANCY_CITIES,
} from '../src/data/vacancyIndexabilityPolicy';
import { LEGACY_GSC_VALID_JOB_PATHS } from '../src/data/jobPostingEligibilityPolicy';
import { getVacancyCanonicalPath } from '../src/utils/vacancyUrl';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const localScoringCsvRelative = 'output/seo-indexability/vacancy-indexability-2026-06-30.csv';
const gscCsvRelative =
  'output/seo-indexability/gsc-vacancy-demand-2026-06-30/gsc-vacancy-pages.csv';
const localScoringCsvPath = resolve(rootDir, localScoringCsvRelative);
const gscCsvPath = resolve(rootDir, gscCsvRelative);
const generatedOutputPath = resolve(rootDir, 'src/generated/vacancy-indexability.json');
const publicOutputPath = resolve(rootDir, 'public/vacancy-indexability.json');
const site = (process.env.SITE_URL || 'https://kurerok.ru').replace(/\/$/, '');
const disableLocalInputs = process.env.VACANCY_INDEXABILITY_DISABLE_LOCAL_INPUTS === '1';

type GscPriorityRow = {
  path: string;
  recommendation?: string;
  clicks?: string;
  impressions?: string;
  avgPosition?: string;
};

const parseCsvLine = (line: string): string[] => {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      cells.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  cells.push(current);
  return cells;
};

const parseCsv = (csv: string): Record<string, string>[] => {
  const [headerLine, ...lines] = csv.trim().split(/\r?\n/);
  const headers = parseCsvLine(headerLine);
  return lines
    .filter((line) => line.trim())
    .map((line) => {
      const cells = parseCsvLine(line);
      return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? '']));
    });
};

const splitJobCities = (location: string): string[] =>
  location
    .split(',')
    .map((city) => city.trim())
    .filter((city) => city && city !== 'Вся Россия');

const fileExists = async (path: string): Promise<boolean> => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

const readSnapshotPayload = async (): Promise<{
  localIndexablePaths?: string[];
  gscIndexablePaths?: string[];
  gscPriorityRows?: GscPriorityRow[];
} | null> => {
  if (!(await fileExists(generatedOutputPath))) return null;
  const snapshot = JSON.parse(await readFile(generatedOutputPath, 'utf8')) as {
    localIndexablePaths?: string[];
    gscIndexablePaths?: string[];
    gscPriorityRows?: GscPriorityRow[];
  };
  return snapshot;
};

const canReadLocalInputs =
  !disableLocalInputs && (await fileExists(localScoringCsvPath)) && (await fileExists(gscCsvPath));

const snapshotPayload = canReadLocalInputs ? null : await readSnapshotPayload();

if (!canReadLocalInputs && !snapshotPayload) {
  throw new Error(
    `Missing vacancy indexability inputs. Expected ${localScoringCsvRelative} and ${gscCsvRelative}, ` +
      `or an existing src/generated/vacancy-indexability.json snapshot.`,
  );
}

const localScoringRows = canReadLocalInputs
  ? parseCsv(await readFile(localScoringCsvPath, 'utf8'))
  : [];
const rawGscRows = canReadLocalInputs ? parseCsv(await readFile(gscCsvPath, 'utf8')) : [];
const localIndexablePaths = new Set(
  canReadLocalInputs
    ? localScoringRows
        .filter((row) => row.decision === 'index')
        .map((row) => row.path)
        .filter((path) => path.startsWith('/v/') && path.endsWith('/'))
    : (snapshotPayload?.localIndexablePaths ?? []),
);
const gscIndexablePaths = new Set(
  canReadLocalInputs
    ? rawGscRows
        .filter((row) =>
          (INDEXABLE_GSC_RECOMMENDATIONS as readonly string[]).includes(row.recommendation),
        )
        .map((row) => row.path)
        .filter((path) => path.startsWith('/v/') && path.endsWith('/'))
    : (snapshotPayload?.gscIndexablePaths ?? []),
);
const hardNoindexPaths = new Set<string>(HARD_NOINDEX_VACANCY_PATHS);
const topCitySet = new Set<string>(TOP_INDEXABLE_VACANCY_CITIES);
const gscValidJobPostingPaths = new Set<string>(LEGACY_GSC_VALID_JOB_PATHS);

const allPaths = new Set(detailJobs.map((job) => getVacancyCanonicalPath(job)));
const indexablePaths = new Set<string>();

for (const job of detailJobs) {
  const path = getVacancyCanonicalPath(job);
  if (hardNoindexPaths.has(path)) continue;
  const isTopCity = splitJobCities(job.location).some((city) => topCitySet.has(city));
  if (
    isTopCity ||
    localIndexablePaths.has(path) ||
    gscIndexablePaths.has(path) ||
    gscValidJobPostingPaths.has(path) ||
    GOOGLE_FULL_VACANCY_RESTORE
  ) {
    indexablePaths.add(path);
  }
}

const noindexPaths = Array.from(allPaths)
  .filter((path) => !indexablePaths.has(path))
  .sort();
const jobPostingPaths = detailJobs
  .map((job) => getVacancyCanonicalPath(job))
  .filter((path) => indexablePaths.has(path))
  .sort();
const metric = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number.parseFloat(value.replace(',', '.').replace('%', ''));
  return Number.isFinite(parsed) ? parsed : fallback;
};
const gscPriorityRows = canReadLocalInputs
  ? rawGscRows
      .map((row): GscPriorityRow | null => {
        const path = row.path || row.page || row.url;
        if (!path || !path.startsWith('/v/') || !path.endsWith('/')) return null;
        if (!indexablePaths.has(path)) return null;
        return {
          path,
          recommendation: row.recommendation,
          clicks: row.clicks,
          impressions: row.impressions,
          avgPosition: row.avgPosition,
        };
      })
      .filter((row): row is GscPriorityRow => Boolean(row))
      .sort((a, b) =>
        metric(b.clicks, 0) - metric(a.clicks, 0) ||
        metric(b.impressions, 0) - metric(a.impressions, 0) ||
        metric(a.avgPosition, Number.POSITIVE_INFINITY) -
          metric(b.avgPosition, Number.POSITIVE_INFINITY) ||
        a.path.localeCompare(b.path),
      )
  : (snapshotPayload?.gscPriorityRows ?? []);

const payload = {
  generatedFrom: {
    localScoringCsv: localScoringCsvRelative,
    gscCsv: gscCsvRelative,
    gscSnapshotDate: '2026-06-30',
    localScoringSnapshotDate: '2026-06-30',
    source: canReadLocalInputs ? 'csv' : 'snapshot',
  },
  policy: {
    googleFullVacancyRestore: GOOGLE_FULL_VACANCY_RESTORE,
    topIndexableCities: TOP_INDEXABLE_VACANCY_CITIES,
    gscRecommendations: INDEXABLE_GSC_RECOMMENDATIONS,
    hardNoindexPaths: HARD_NOINDEX_VACANCY_PATHS,
    gscValidJobPostingContinuityPaths: LEGACY_GSC_VALID_JOB_PATHS,
  },
  localIndexablePaths: Array.from(localIndexablePaths).sort(),
  gscIndexablePaths: Array.from(gscIndexablePaths).sort(),
  indexablePaths: Array.from(indexablePaths).sort(),
  jobPostingPaths,
  googleIndexingApiEligiblePaths: jobPostingPaths,
  gscPriorityRows,
  noindexPaths,
  summary: {
    totalVacancyPages: allPaths.size,
    indexableVacancyPages: indexablePaths.size,
    noindexVacancyPages: noindexPaths.length,
    jobPostingPages: jobPostingPaths.length,
  },
};

const publicPayload = {
  generatedFrom: payload.generatedFrom,
  policy: payload.policy,
  localIndexablePaths: payload.localIndexablePaths,
  gscIndexablePaths: payload.gscIndexablePaths,
  indexablePaths: payload.indexablePaths,
  jobPostingPaths: payload.jobPostingPaths,
  googleIndexingApiEligiblePaths: payload.googleIndexingApiEligiblePaths,
  noindexPaths: payload.noindexPaths,
  noindexUrls: noindexPaths.map((path) => `${site}${path}`),
  summary: payload.summary,
};

await mkdir(dirname(generatedOutputPath), { recursive: true });
await mkdir(dirname(publicOutputPath), { recursive: true });
await writeFile(generatedOutputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
await writeFile(publicOutputPath, `${JSON.stringify(publicPayload, null, 2)}\n`, 'utf8');

console.log(
  `✓ Wrote vacancy indexability: ${payload.summary.indexableVacancyPages} indexable, ` +
    `${payload.summary.noindexVacancyPages} noindex`,
);

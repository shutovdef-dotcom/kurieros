#!/usr/bin/env tsx
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { detailJobs } from '../src/data/jobs';
import {
  HARD_NOINDEX_VACANCY_PATHS,
  INDEXABLE_GSC_RECOMMENDATIONS,
  TOP_INDEXABLE_VACANCY_CITIES,
} from '../src/data/vacancyIndexabilityPolicy';
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

const localScoringRows = parseCsv(await readFile(localScoringCsvPath, 'utf8'));
const localIndexablePaths = new Set(
  localScoringRows
    .filter((row) => row.decision === 'index')
    .map((row) => row.path)
    .filter((path) => path.startsWith('/v/') && path.endsWith('/')),
);
const gscRows = parseCsv(await readFile(gscCsvPath, 'utf8'));
const gscIndexablePaths = new Set(
  gscRows
    .filter((row) =>
      (INDEXABLE_GSC_RECOMMENDATIONS as readonly string[]).includes(row.recommendation),
    )
    .map((row) => row.path)
    .filter((path) => path.startsWith('/v/') && path.endsWith('/')),
);
const hardNoindexPaths = new Set<string>(HARD_NOINDEX_VACANCY_PATHS);
const topCitySet = new Set<string>(TOP_INDEXABLE_VACANCY_CITIES);

const allPaths = new Set(detailJobs.map((job) => getVacancyCanonicalPath(job)));
const indexablePaths = new Set<string>();

for (const job of detailJobs) {
  const path = getVacancyCanonicalPath(job);
  if (hardNoindexPaths.has(path)) continue;
  const isTopCity = splitJobCities(job.location).some((city) => topCitySet.has(city));
  if (isTopCity || localIndexablePaths.has(path) || gscIndexablePaths.has(path)) {
    indexablePaths.add(path);
  }
}

const noindexPaths = Array.from(allPaths)
  .filter((path) => !indexablePaths.has(path))
  .sort();

const payload = {
  generatedFrom: {
    localScoringCsv: localScoringCsvRelative,
    gscCsv: gscCsvRelative,
    gscSnapshotDate: '2026-06-30',
    localScoringSnapshotDate: '2026-06-30',
  },
  policy: {
    topIndexableCities: TOP_INDEXABLE_VACANCY_CITIES,
    gscRecommendations: INDEXABLE_GSC_RECOMMENDATIONS,
    hardNoindexPaths: HARD_NOINDEX_VACANCY_PATHS,
  },
  localIndexablePaths: Array.from(localIndexablePaths).sort(),
  gscIndexablePaths: Array.from(gscIndexablePaths).sort(),
  indexablePaths: Array.from(indexablePaths).sort(),
  noindexPaths,
  summary: {
    totalVacancyPages: allPaths.size,
    indexableVacancyPages: indexablePaths.size,
    noindexVacancyPages: noindexPaths.length,
  },
};

const publicPayload = {
  ...payload,
  noindexUrls: noindexPaths.map((path) => `${site}${path}`),
};

await mkdir(dirname(generatedOutputPath), { recursive: true });
await mkdir(dirname(publicOutputPath), { recursive: true });
await writeFile(generatedOutputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
await writeFile(publicOutputPath, `${JSON.stringify(publicPayload, null, 2)}\n`, 'utf8');

console.log(
  `✓ Wrote vacancy indexability: ${payload.summary.indexableVacancyPages} indexable, ` +
    `${payload.summary.noindexVacancyPages} noindex`,
);

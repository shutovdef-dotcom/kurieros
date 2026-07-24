#!/usr/bin/env tsx
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildRecrawlCarouselBatch,
  DEFAULT_HIGH_PRIORITY_SHARE,
  defaultRecrawlLimitForEngine,
  type RecrawlCarouselEngine,
  type RecrawlCarouselGscRow,
} from '../src/utils/recrawlCarousel';

type VacancyIndexabilityManifest = {
  indexablePaths: string[];
  googleIndexingApiEligiblePaths?: string[];
  jobPostingPaths?: string[];
  summary?: {
    totalVacancyPages?: number;
    indexableVacancyPages?: number;
    noindexVacancyPages?: number;
    jobPostingPages?: number;
  };
};

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const defaultManifestPath = 'src/generated/vacancy-indexability.json';
const defaultGscCsvPath =
  'output/seo-indexability/gsc-vacancy-demand-2026-06-30/gsc-vacancy-pages.csv';

const readOption = (name: string): string | undefined => {
  const exactIndex = process.argv.indexOf(name);
  if (exactIndex >= 0) return process.argv[exactIndex + 1];
  const prefix = `${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
};

const hasFlag = (name: string): boolean => process.argv.includes(name);

const parseNumberOption = (name: string, fallback: number): number => {
  const raw = readOption(name);
  if (raw === undefined) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) throw new Error(`Expected numeric ${name}, got: ${raw}`);
  return parsed;
};

const parseEngine = (value: string | undefined): RecrawlCarouselEngine => {
  if (value === undefined || value === 'yandex') return 'yandex';
  if (value === 'google-indexing-api') return 'google-indexing-api';
  throw new Error(`Expected --engine=yandex or --engine=google-indexing-api, got: ${value}`);
};

const currentMoscowDate = (): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

const fileExists = async (path: string): Promise<boolean> => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
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
  if (!headerLine) return [];
  const headers = parseCsvLine(headerLine);
  return lines
    .filter((line) => line.trim())
    .map((line) => {
      const cells = parseCsvLine(line);
      return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? '']));
    });
};

const toGscRows = (rows: readonly Record<string, string>[]): RecrawlCarouselGscRow[] =>
  rows
    .map((row): RecrawlCarouselGscRow | null => {
      const path = row.path || row.page || row.url;
      if (!path) return null;
      return {
        path,
        recommendation: row.recommendation,
        clicks: row.clicks,
        impressions: row.impressions,
        avgPosition: row.avgPosition,
      };
    })
    .filter((row): row is RecrawlCarouselGscRow => Boolean(row));

const manifestPath = resolve(rootDir, readOption('--manifest') ?? defaultManifestPath);
const gscCsvPath = resolve(rootDir, readOption('--gsc-csv') ?? defaultGscCsvPath);
const siteUrl = readOption('--site') ?? process.env.SITE_URL ?? 'https://kurerok.ru';
const date = readOption('--date') ?? process.env.RECRAWL_DATE ?? currentMoscowDate();
const engine = parseEngine(readOption('--engine') ?? process.env.RECRAWL_ENGINE);
const limit = parseNumberOption('--limit', defaultRecrawlLimitForEngine(engine));
const highPriorityShare = parseNumberOption('--high-priority-share', DEFAULT_HIGH_PRIORITY_SHARE);
const writeDefault = hasFlag('--write-default');
const jsonOutPath = readOption('--out') ?? (
  writeDefault ? `output/recrawl-carousel/${engine}-${date}.json` : undefined
);
const txtOutPath = readOption('--txt-out') ?? (
  writeDefault ? `output/recrawl-carousel/${engine}-${date}.txt` : undefined
);

const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as VacancyIndexabilityManifest;
const warnings: string[] = [];
const gscRows = await fileExists(gscCsvPath)
  ? toGscRows(parseCsv(await readFile(gscCsvPath, 'utf8')))
  : [];

if (gscRows.length === 0) {
  warnings.push(`GSC CSV not found or empty: ${gscCsvPath}; carousel will use broad rotation only.`);
}
if (engine === 'google-indexing-api') {
  warnings.push(
    'Google Indexing API submission is allowed only for URLs with valid JobPosting/BroadcastEvent structured data and authorized credentials.',
  );
}

const recrawlPaths = engine === 'google-indexing-api'
  ? (manifest.googleIndexingApiEligiblePaths ?? manifest.jobPostingPaths ?? [])
  : manifest.indexablePaths;

if (engine === 'google-indexing-api' && recrawlPaths.length === 0) {
  warnings.push(
    'No current JobPosting-eligible URL manifest is available; Google Indexing API queue is intentionally empty.',
  );
}

const batch = buildRecrawlCarouselBatch({
  date,
  indexablePaths: recrawlPaths,
  engine,
  gscRows,
  siteUrl,
  limit,
  highPriorityShare,
});

const payload = {
  mode: 'dry_run_queue',
  intendedSubmitSurface: engine === 'google-indexing-api'
    ? 'Google Indexing API urlNotifications.publish'
    : 'Yandex Webmaster → Индексирование → Переобход страниц',
  googleUsage: engine === 'google-indexing-api'
    ? 'Submit up to 200 eligible JobPosting URLs/day/project after explicit approval and credential wiring.'
    : 'Use the top of this queue as a manual Google URL Inspection sample; GSC has no bulk recrawl textarea.',
  warnings,
  manifestSummary: manifest.summary ?? null,
  ...batch,
};

if (jsonOutPath) {
  const out = resolve(rootDir, jsonOutPath);
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

if (txtOutPath) {
  const out = resolve(rootDir, txtOutPath);
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, `${payload.urls.join('\n')}\n`, 'utf8');
}

console.log(JSON.stringify(payload, null, 2));

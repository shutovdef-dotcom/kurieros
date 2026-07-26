#!/usr/bin/env tsx
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { promisify } from 'node:util';

type RecrawlQueuePayload = {
  mode: string;
  intendedSubmitSurface: string;
  googleUsage: string;
  warnings: string[];
  manifestSummary: {
    totalVacancyPages?: number;
    indexableVacancyPages?: number;
    noindexVacancyPages?: number;
  } | null;
  engine: 'yandex' | 'google-indexing-api';
  date: string;
  siteUrl: string;
  limit: number;
  queueSizes: {
    totalIndexable: number;
    highPriority: number;
    broad: number;
  };
  urls: string[];
};

type LiveCheck = {
  url: string;
  status: number | 'error';
  ok: boolean;
  note?: string;
};

type GoogleSubmitStatus =
  | {
      requested: false;
      status: 'disabled';
      note: string;
    }
  | {
      requested: true;
      status: 'skipped_missing_credentials' | 'skipped_empty_queue' | 'submitted' | 'failed';
      outputPath: string;
      note: string;
      stdout?: string;
      stderr?: string;
    };

const LIVE_CHECK_ATTEMPTS = 2;

const execFileAsync = promisify(execFile);
const rootDir = resolve(dirname(new URL(import.meta.url).pathname), '..');
const tsxBin = resolve(rootDir, 'node_modules/.bin/tsx');

const readOption = (name: string): string | undefined => {
  const exactIndex = process.argv.indexOf(name);
  if (exactIndex >= 0) return process.argv[exactIndex + 1];
  const prefix = `${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
};

const hasFlag = (name: string): boolean => process.argv.includes(name);

const currentMoscowDate = (): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

const currentMoscowTimestamp = (): string =>
  new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date());

const normalizeSiteUrl = (siteUrl: string): string => siteUrl.replace(/\/+$/, '');

const resolvePath = (path: string): string => (path.startsWith('/') ? path : resolve(rootDir, path));

const resolveGoogleCredentialAvailable = (): boolean => {
  if (process.env.GOOGLE_INDEXING_SERVICE_ACCOUNT) return true;
  const serviceAccountPath =
    readOption('--service-account') ??
    process.env.GOOGLE_INDEXING_SERVICE_ACCOUNT_PATH ??
    process.env.GOOGLE_APPLICATION_CREDENTIALS;
  return Boolean(serviceAccountPath && existsSync(resolvePath(serviceAccountPath)));
};

const runPlan = async (
  engine: 'yandex' | 'google-indexing-api',
  date: string,
  siteUrl: string,
): Promise<RecrawlQueuePayload> => {
  const { stdout } = await execFileAsync(
    tsxBin,
    [
      'scripts/plan-recrawl-carousel.ts',
      `--engine=${engine}`,
      `--date=${date}`,
      `--site=${siteUrl}`,
      '--write-default',
    ],
    {
      cwd: rootDir,
      maxBuffer: 10 * 1024 * 1024,
    },
  );
  return JSON.parse(stdout) as RecrawlQueuePayload;
};

const checkUrl = async (url: string): Promise<LiveCheck> => {
  const notes: string[] = [];
  const methods: Array<'HEAD' | 'GET'> = ['HEAD', 'GET'];

  for (let attempt = 1; attempt <= LIVE_CHECK_ATTEMPTS; attempt += 1) {
    for (const method of methods) {
      try {
        const response = await fetch(url, {
          method,
          signal: AbortSignal.timeout(15_000),
        });
        await response.body?.cancel();

        const ok = response.status >= 200 && response.status < 400;
        if (ok || method === 'GET') {
          return {
            url,
            status: response.status,
            ok,
            note: method === 'GET' ? `HEAD fallback used on attempt ${attempt}` : undefined,
          };
        }

        notes.push(`${method} attempt ${attempt}: HTTP ${response.status}`);
      } catch (error) {
        notes.push(
          `${method} attempt ${attempt}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }

  return {
    url,
    status: 'error',
    ok: false,
    note: notes.join('; '),
  };
};

const unique = <T>(items: readonly T[]): T[] => Array.from(new Set(items));

const buildLiveChecks = async (
  siteUrl: string,
  yandexQueue: RecrawlQueuePayload,
  googleQueue: RecrawlQueuePayload,
): Promise<LiveCheck[]> => {
  const urls = unique([
    `${siteUrl}/sitemap-index.xml`,
    ...yandexQueue.urls.slice(0, 3),
    ...googleQueue.urls.slice(0, 3),
  ]);
  return Promise.all(urls.map(checkUrl));
};

const runGoogleIndexingSubmit = async ({
  date,
  siteUrl,
  googleQueue,
  requested,
}: {
  date: string;
  siteUrl: string;
  googleQueue: RecrawlQueuePayload;
  requested: boolean;
}): Promise<GoogleSubmitStatus> => {
  const outputPath = resolve(
    rootDir,
    `output/recrawl-carousel/google-indexing-api-submit-${date}.jsonl`,
  );

  if (!requested) {
    return {
      requested: false,
      status: 'disabled',
      note: 'Google Indexing API submit was not requested for this run.',
    };
  }

  if (googleQueue.urls.length === 0) {
    return {
      requested: true,
      status: 'skipped_empty_queue',
      outputPath,
      note: 'Google queue is empty; nothing to submit.',
    };
  }

  if (!resolveGoogleCredentialAvailable()) {
    return {
      requested: true,
      status: 'skipped_missing_credentials',
      outputPath,
      note:
        'Missing Google Indexing API service account. Set GOOGLE_APPLICATION_CREDENTIALS, ' +
        'GOOGLE_INDEXING_SERVICE_ACCOUNT_PATH, or GOOGLE_INDEXING_SERVICE_ACCOUNT.',
    };
  }

  const args = [
    'scripts/submit-google-indexing-api.ts',
    `--date=${date}`,
    `--site=${siteUrl}`,
    '--confirm-submit',
    '--confirm-supported-content',
  ];
  const serviceAccountOption = readOption('--service-account');
  if (serviceAccountOption) {
    args.push('--service-account', serviceAccountOption);
  }

  try {
    const { stdout, stderr } = await execFileAsync(tsxBin, args, {
      cwd: rootDir,
      maxBuffer: 20 * 1024 * 1024,
    });
    return {
      requested: true,
      status: 'submitted',
      outputPath,
      note: 'Submitted Google Indexing API queue after live JobPosting preflight.',
      stdout,
      stderr,
    };
  } catch (error) {
    const failure = error as Error & { stdout?: string; stderr?: string };
    return {
      requested: true,
      status: 'failed',
      outputPath,
      note: failure.message,
      stdout: failure.stdout,
      stderr: failure.stderr,
    };
  }
};

const bulletList = (items: readonly string[], empty = '—'): string =>
  items.length ? items.map((item) => `- ${item}`).join('\n') : empty;

const formatChecks = (checks: readonly LiveCheck[]): string =>
  checks
    .map((check) => {
      const suffix = check.note ? ` — ${check.note}` : '';
      return `- ${check.ok ? 'OK' : 'FAIL'} ${check.status}: ${check.url}${suffix}`;
    })
    .join('\n');

const formatGoogleSubmit = (status: GoogleSubmitStatus): string => {
  if (!status.requested) {
    return `- Requested: no\n- Status: ${status.status}\n- Note: ${status.note}`;
  }

  return [
    '- Requested: yes',
    `- Status: ${status.status}`,
    `- Output JSONL: \`${status.outputPath}\``,
    `- Note: ${status.note}`,
    ...(status.stdout ? [`- Stdout: ${status.stdout.trim().slice(0, 1_200)}`] : []),
    ...(status.stderr ? [`- Stderr: ${status.stderr.trim().slice(0, 1_200)}`] : []),
  ].join('\n');
};

const buildReport = ({
  date,
  siteUrl,
  generatedAt,
  yandexQueue,
  googleQueue,
  googleSubmit,
  liveChecks,
  skippedLiveChecks,
}: {
  date: string;
  siteUrl: string;
  generatedAt: string;
  yandexQueue: RecrawlQueuePayload;
  googleQueue: RecrawlQueuePayload;
  googleSubmit: GoogleSubmitStatus;
  liveChecks: LiveCheck[];
  skippedLiveChecks: boolean;
}): string => `# Recrawl automation — ${date}

- Generated at: ${generatedAt} МСК
- Site: ${siteUrl}
- Mode: ${googleSubmit.requested ? 'queue build + Google Indexing API submit attempt' : 'queue build only; no external Webmaster/GSC submit was performed.'}

## Yandex Webmaster queue

- Surface: ${yandexQueue.intendedSubmitSurface}
- Limit: ${yandexQueue.limit}
- URLs in today queue: ${yandexQueue.urls.length}
- Total indexable vacancy paths in manifest: ${yandexQueue.queueSizes.totalIndexable}
- Queue JSON: \`output/recrawl-carousel/yandex-${date}.json\`
- Queue TXT: \`output/recrawl-carousel/yandex-${date}.txt\`

First URLs:

${bulletList(yandexQueue.urls.slice(0, 10))}

## Google queue

- Surface: ${googleQueue.intendedSubmitSurface}
- Limit: ${googleQueue.limit}
- URLs in today queue: ${googleQueue.urls.length}
- Total eligible paths in manifest: ${googleQueue.queueSizes.totalIndexable}
- Queue JSON: \`output/recrawl-carousel/google-indexing-api-${date}.json\`
- Queue TXT: \`output/recrawl-carousel/google-indexing-api-${date}.txt\`

Warnings:

${bulletList(googleQueue.warnings)}

First URLs:

${bulletList(googleQueue.urls.slice(0, 10))}

## Google Indexing API submit

${formatGoogleSubmit(googleSubmit)}

## Live checks

${skippedLiveChecks ? 'Skipped by --skip-live-check.' : formatChecks(liveChecks)}

## Operator notes

- Yandex: paste the TXT queue into Webmaster → Индексирование → Переобход страниц only after production verification and explicit approval for that run.
- Google Search Console: there is no bulk recrawl textarea. Use this list for selected URL Inspection checks.
- Google Indexing API: daily submit is allowed only for the generated JobPosting queue; the submitter checks live HTML for JobPosting before calling Google.
`;

const date = readOption('--date') ?? process.env.RECRAWL_DATE ?? currentMoscowDate();
const siteUrl = normalizeSiteUrl(readOption('--site') ?? process.env.SITE_URL ?? 'https://kurerok.ru');
const outputDir = resolve(rootDir, readOption('--out-dir') ?? 'output/recrawl-carousel');
const skipLiveChecks = hasFlag('--skip-live-check');
const submitGoogle =
  hasFlag('--submit-google') || process.env.GOOGLE_INDEXING_SUBMIT_ENABLED === '1';
const requireGoogleSubmit =
  hasFlag('--require-google-submit') || process.env.GOOGLE_INDEXING_REQUIRE_SUBMIT === '1';

const yandexQueue = await runPlan('yandex', date, siteUrl);
const googleQueue = await runPlan('google-indexing-api', date, siteUrl);
const liveChecks = skipLiveChecks ? [] : await buildLiveChecks(siteUrl, yandexQueue, googleQueue);
const googleSubmit = await runGoogleIndexingSubmit({
  date,
  siteUrl,
  googleQueue,
  requested: submitGoogle,
});

const report = buildReport({
  date,
  siteUrl,
  generatedAt: currentMoscowTimestamp(),
  yandexQueue,
  googleQueue,
  googleSubmit,
  liveChecks,
  skippedLiveChecks: skipLiveChecks,
});

const reportPath = resolve(outputDir, `recrawl-automation-${date}.md`);
await mkdir(dirname(reportPath), { recursive: true });
await writeFile(reportPath, report, 'utf8');

const failedLiveChecks = liveChecks.filter((check) => !check.ok);
const googleSubmitFailed =
  googleSubmit.status === 'failed' ||
  (requireGoogleSubmit && googleSubmit.status !== 'submitted');
console.log(report);
console.log(`\n✓ Recrawl automation report written: ${reportPath}`);

if (failedLiveChecks.length > 0 || googleSubmitFailed) {
  process.exitCode = 1;
}

#!/usr/bin/env tsx
import { createSign } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

type ServiceAccountKey = {
  client_email: string;
  private_key: string;
  token_uri?: string;
};

type SubmitResult = {
  url: string;
  ok: boolean;
  status: number | 'dry-run' | 'error';
  response?: unknown;
  error?: string;
};

type SupportedContentCheck = {
  url: string;
  ok: boolean;
  status: number | 'error';
  error?: string;
};

const rootDir = resolve(dirname(new URL(import.meta.url).pathname), '..');
const DEFAULT_SCOPE = 'https://www.googleapis.com/auth/indexing';
const DEFAULT_TOKEN_URI = 'https://oauth2.googleapis.com/token';
const DEFAULT_PUBLISH_ENDPOINT = 'https://indexing.googleapis.com/v3/urlNotifications:publish';
const DEFAULT_SITE_URL = 'https://kurerok.ru';
const DEFAULT_LIMIT = 200;

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

const base64Url = (value: Buffer | string): string =>
  Buffer.from(value)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

const parsePositiveInteger = (value: string | undefined, fallback: number): number => {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Expected positive integer, got: ${value}`);
  }
  return parsed;
};

const resolvePath = (path: string): string => (path.startsWith('/') ? path : resolve(rootDir, path));

const readUrls = async (path: string, limit: number, siteUrl: string): Promise<string[]> => {
  const source = await readFile(path, 'utf8');
  const expectedOrigin = new URL(siteUrl).origin;
  const urls = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((url, index, items) => items.indexOf(url) === index);

  const invalidUrl = urls.find((url) => {
    try {
      const parsed = new URL(url);
      return parsed.origin !== expectedOrigin || parsed.search !== '' || parsed.hash !== '';
    } catch {
      return true;
    }
  });

  if (invalidUrl) {
    throw new Error(`Refusing to submit invalid or out-of-scope URL: ${invalidUrl}`);
  }

  return urls.slice(0, limit);
};

const resolveServiceAccountPath = (): string | undefined =>
  readOption('--service-account') ??
  process.env.GOOGLE_INDEXING_SERVICE_ACCOUNT_PATH ??
  process.env.GOOGLE_APPLICATION_CREDENTIALS;

const readServiceAccount = async (path: string): Promise<ServiceAccountKey> => {
  const payload = JSON.parse(await readFile(path, 'utf8')) as Partial<ServiceAccountKey>;
  if (!payload.client_email || !payload.private_key) {
    throw new Error('Service account JSON must contain client_email and private_key');
  }
  return {
    client_email: payload.client_email,
    private_key: payload.private_key,
    token_uri: payload.token_uri,
  };
};

const readServiceAccountFromEnv = (): ServiceAccountKey | null => {
  const raw = process.env.GOOGLE_INDEXING_SERVICE_ACCOUNT;
  if (!raw) return null;
  const payload = JSON.parse(raw) as Partial<ServiceAccountKey>;
  if (!payload.client_email || !payload.private_key) {
    throw new Error('GOOGLE_INDEXING_SERVICE_ACCOUNT must contain client_email and private_key');
  }
  return {
    client_email: payload.client_email,
    private_key: payload.private_key,
    token_uri: payload.token_uri,
  };
};

const createJwtAssertion = (key: ServiceAccountKey, scope: string): string => {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };
  const claimSet = {
    iss: key.client_email,
    scope,
    aud: key.token_uri ?? DEFAULT_TOKEN_URI,
    exp: nowSeconds + 3600,
    iat: nowSeconds,
  };

  const signingInput = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(claimSet))}`;
  const signature = createSign('RSA-SHA256')
    .update(signingInput)
    .sign(key.private_key);

  return `${signingInput}.${base64Url(signature)}`;
};

const fetchAccessToken = async (key: ServiceAccountKey): Promise<string> => {
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: createJwtAssertion(key, DEFAULT_SCOPE),
  });
  const response = await fetch(key.token_uri ?? DEFAULT_TOKEN_URI, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || typeof payload.access_token !== 'string') {
    throw new Error(`Failed to fetch access token: HTTP ${response.status}`);
  }
  return payload.access_token;
};

const submitUrl = async (
  url: string,
  accessToken: string,
  endpoint: string,
): Promise<SubmitResult> => {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        type: 'URL_UPDATED',
      }),
    });
    const payload = await response.json().catch(() => ({}));
    return {
      url,
      ok: response.ok,
      status: response.status,
      response: payload,
    };
  } catch (error) {
    return {
      url,
      ok: false,
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

const checkSupportedContent = async (url: string): Promise<SupportedContentCheck> => {
  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(20_000),
    });
    const html = await response.text();
    return {
      url,
      status: response.status,
      ok: response.ok && /"@type"\s*:\s*"JobPosting"/.test(html),
      ...(!/"@type"\s*:\s*"JobPosting"/.test(html)
        ? { error: 'JobPosting JSON-LD not found in live HTML' }
        : {}),
    };
  } catch (error) {
    return {
      url,
      ok: false,
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

const mapLimit = async <T, R>(
  items: readonly T[],
  limit: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> => {
  const results: R[] = [];
  let cursor = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const current = cursor;
      cursor += 1;
      results[current] = await mapper(items[current]!);
    }
  });

  await Promise.all(workers);
  return results;
};

const date = readOption('--date') ?? process.env.RECRAWL_DATE ?? currentMoscowDate();
const defaultUrlsPath = `output/recrawl-carousel/google-indexing-api-${date}.txt`;
const urlsPath = resolvePath(readOption('--urls') ?? defaultUrlsPath);
const outputPath = resolvePath(
  readOption('--out') ?? `output/recrawl-carousel/google-indexing-api-submit-${date}.jsonl`,
);
const siteUrl = readOption('--site') ?? DEFAULT_SITE_URL;
const limit = Math.min(parsePositiveInteger(readOption('--limit'), DEFAULT_LIMIT), DEFAULT_LIMIT);
const dryRun = hasFlag('--dry-run') || !hasFlag('--confirm-submit');
const confirmedSupportedContent = hasFlag('--confirm-supported-content');
const skipSupportedContentPreflight = hasFlag('--skip-supported-content-preflight');
const endpoint = readOption('--endpoint') ?? DEFAULT_PUBLISH_ENDPOINT;

if (!existsSync(urlsPath)) {
  throw new Error(`URL queue file not found: ${urlsPath}`);
}

const urls = await readUrls(urlsPath, limit, siteUrl);
if (urls.length === 0) {
  throw new Error(`URL queue is empty: ${urlsPath}`);
}

if (dryRun) {
  console.log(
    JSON.stringify(
      {
        mode: 'dry_run',
        surface: 'Google Indexing API urlNotifications.publish',
        urlsPath,
        outputPath,
        urlCount: urls.length,
        firstUrls: urls.slice(0, 10),
        nextRealRun:
          'Add --confirm-submit --confirm-supported-content and provide --service-account or GOOGLE_APPLICATION_CREDENTIALS.',
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

if (!confirmedSupportedContent) {
  throw new Error(
    'Refusing real submit without --confirm-supported-content for JobPosting/BroadcastEvent URLs.',
  );
}

const supportedContentChecks = skipSupportedContentPreflight
  ? []
  : await mapLimit(urls, 8, checkSupportedContent);
const unsupportedContentUrls = supportedContentChecks.filter((check) => !check.ok);
if (unsupportedContentUrls.length > 0) {
  throw new Error(
    `Refusing to submit ${unsupportedContentUrls.length} URL(s) without live JobPosting JSON-LD. ` +
      `First failed URL: ${unsupportedContentUrls[0]!.url}`,
  );
}

const serviceAccountPath = resolveServiceAccountPath();
const serviceAccountFromEnv = serviceAccountPath ? null : readServiceAccountFromEnv();
if (!serviceAccountPath && !serviceAccountFromEnv) {
  throw new Error(
    'Missing service account. Use --service-account, GOOGLE_INDEXING_SERVICE_ACCOUNT_PATH, GOOGLE_APPLICATION_CREDENTIALS, or GOOGLE_INDEXING_SERVICE_ACCOUNT.',
  );
}

const serviceAccount = serviceAccountFromEnv ?? await readServiceAccount(resolvePath(serviceAccountPath!));
const accessToken = await fetchAccessToken(serviceAccount);
const results: SubmitResult[] = [];

for (const url of urls) {
  results.push(await submitUrl(url, accessToken, endpoint));
}

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(
  outputPath,
  results.map((result) => JSON.stringify(result)).join('\n') + '\n',
  'utf8',
);

const failed = results.filter((result) => !result.ok);
console.log(
  JSON.stringify(
    {
      mode: 'submitted',
      endpoint,
      urlsPath,
      outputPath,
      supportedContentPreflight: skipSupportedContentPreflight
        ? 'skipped'
        : `${supportedContentChecks.length}/${urls.length} live URLs contain JobPosting JSON-LD`,
      submitted: results.length,
      failed: failed.length,
      failedUrls: failed.slice(0, 10).map((result) => result.url),
    },
    null,
    2,
  ),
);

if (failed.length > 0) {
  process.exitCode = 1;
}

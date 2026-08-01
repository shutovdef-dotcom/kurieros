#!/usr/bin/env tsx
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

type SitemapSubmitResult = {
	mode: 'dry_run' | 'submitted';
	siteUrl: string;
	sitemapUrl: string;
	endpoint: string;
	sitemapStatus: number;
	discoveredSitemapFiles: number;
	discoveredUrls: number;
	requiredUrlChecks: Record<string, boolean>;
	requiredPatternChecks: Array<{
		pattern: string;
		minCount: number;
		count: number;
		ok: boolean;
	}>;
	submitStatus: number | 'dry-run';
	ok: boolean;
	responseText?: string;
	outputPath: string;
};

const rootDir = resolve(dirname(new URL(import.meta.url).pathname), '..');
const DEFAULT_SITEMAP_URL = 'https://kurerok.ru/sitemap-index.xml';
const DEFAULT_SITE_URL = 'https://kurerok.ru/';
const DEFAULT_ENDPOINT_BASE = 'https://www.googleapis.com/webmasters/v3/sites';

const readOption = (name: string): string | undefined => {
	const exactIndex = process.argv.indexOf(name);
	if (exactIndex >= 0) return process.argv[exactIndex + 1];
	const prefix = `${name}=`;
	return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
};

const readRepeatedOption = (name: string): string[] =>
	process.argv.flatMap((arg, index, args) => {
		if (arg === name) return args[index + 1] ? [args[index + 1]!] : [];
		const prefix = `${name}=`;
		return arg.startsWith(prefix) ? [arg.slice(prefix.length)] : [];
	});

const hasFlag = (name: string): boolean => process.argv.includes(name);

const currentMoscowDate = (): string =>
	new Intl.DateTimeFormat('en-CA', {
		timeZone: 'Europe/Moscow',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	}).format(new Date());

const resolvePath = (path: string): string => (path.startsWith('/') ? path : resolve(rootDir, path));

const parseNonNegativeInteger = (value: string | undefined, fallback: number): number => {
	if (value === undefined) return fallback;
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed < 0) {
		throw new Error(`Expected non-negative integer, got: ${value}`);
	}
	return parsed;
};

const fetchText = async (url: string): Promise<{ status: number; text: string }> => {
	let lastError: unknown;
	for (let attempt = 1; attempt <= 3; attempt += 1) {
		try {
			const response = await fetch(url, {
				method: 'GET',
				signal: AbortSignal.timeout(30_000),
			});
			return {
				status: response.status,
				text: await response.text(),
			};
		} catch (error) {
			lastError = error;
			await new Promise((resolveDelay) => setTimeout(resolveDelay, attempt * 500));
		}
	}

	throw new Error(
		`Failed to fetch ${url}: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
	);
};

const extractLocs = (xml: string): string[] =>
	[...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((match) => match[1]!.trim());

const readSitemapUrls = async (
	sitemapUrl: string,
	seen = new Set<string>(),
): Promise<{ sitemapFiles: string[]; urls: string[]; rootStatus: number }> => {
	if (seen.has(sitemapUrl)) {
		return { sitemapFiles: [], urls: [], rootStatus: 200 };
	}
	seen.add(sitemapUrl);

	const { status, text } = await fetchText(sitemapUrl);
	if (status < 200 || status >= 300) {
		throw new Error(`Failed to fetch sitemap ${sitemapUrl}: HTTP ${status}`);
	}

	const locs = extractLocs(text);
	if (/<sitemapindex[\s>]/i.test(text)) {
		const children = [];
		for (const loc of locs) {
			children.push(await readSitemapUrls(loc, seen));
		}
		return {
			sitemapFiles: [sitemapUrl, ...children.flatMap((child) => child.sitemapFiles)],
			urls: children.flatMap((child) => child.urls),
			rootStatus: status,
		};
	}

	return {
		sitemapFiles: [sitemapUrl],
		urls: locs,
		rootStatus: status,
	};
};

const getAccessToken = (): string | undefined =>
	process.env.GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN?.trim() ||
	process.env.GOOGLE_WEBMASTERS_ACCESS_TOKEN?.trim();

const buildEndpoint = (siteUrl: string, sitemapUrl: string): string =>
	`${DEFAULT_ENDPOINT_BASE}/${encodeURIComponent(siteUrl)}/sitemaps/${encodeURIComponent(sitemapUrl)}`;

const submitSitemap = async (
	endpoint: string,
	accessToken: string,
): Promise<{ status: number; ok: boolean; text: string }> => {
	const response = await fetch(endpoint, {
		method: 'PUT',
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
	});
	return {
		status: response.status,
		ok: response.ok,
		text: await response.text(),
	};
};

const date = readOption('--date') ?? process.env.RECRAWL_DATE ?? currentMoscowDate();
const siteUrl = readOption('--site-url') ?? process.env.GSC_SITE_URL ?? DEFAULT_SITE_URL;
const sitemapUrl = readOption('--sitemap') ?? process.env.GOOGLE_SITEMAP_URL ?? DEFAULT_SITEMAP_URL;
const outputPath = resolvePath(
	readOption('--out') ?? `output/google-sitemap-submit/google-sitemap-submit-${date}.json`,
);
const requiredUrls = readRepeatedOption('--require-url');
const requiredPattern = readOption('--require-pattern');
const minRequiredPatternCount = parseNonNegativeInteger(
	readOption('--min-required-pattern-count'),
	requiredPattern ? 1 : 0,
);
const dryRun = hasFlag('--dry-run') || !hasFlag('--confirm-submit');
const endpoint = readOption('--endpoint') ?? buildEndpoint(siteUrl, sitemapUrl);

const sitemap = await readSitemapUrls(sitemapUrl);
const sitemapUrlSet = new Set(sitemap.urls);
const requiredUrlChecks = Object.fromEntries(
	requiredUrls.map((url) => [url, sitemapUrlSet.has(url)]),
);
const requiredPatternChecks = requiredPattern
	? [
			{
				pattern: requiredPattern,
				minCount: minRequiredPatternCount,
				count: sitemap.urls.filter((url) => new RegExp(requiredPattern).test(url)).length,
				ok:
					sitemap.urls.filter((url) => new RegExp(requiredPattern).test(url)).length >=
					minRequiredPatternCount,
			},
		]
	: [];

const missingRequiredUrls = Object.entries(requiredUrlChecks)
	.filter(([, ok]) => !ok)
	.map(([url]) => url);
const failedPatternChecks = requiredPatternChecks.filter((check) => !check.ok);
if (missingRequiredUrls.length > 0 || failedPatternChecks.length > 0) {
	throw new Error(
		[
			'Refusing to submit sitemap because required URL/pattern checks failed.',
			...(missingRequiredUrls.length > 0
				? [`Missing URLs: ${missingRequiredUrls.slice(0, 5).join(', ')}`]
				: []),
			...(failedPatternChecks.length > 0
				? failedPatternChecks.map(
						(check) =>
							`Pattern ${check.pattern} matched ${check.count}, expected at least ${check.minCount}`,
					)
				: []),
		].join(' '),
	);
}

const accessToken = getAccessToken();
if (!dryRun && !accessToken) {
	throw new Error(
		'Missing Google Search Console access token. Set GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN or GOOGLE_WEBMASTERS_ACCESS_TOKEN.',
	);
}

const submit = dryRun
	? { status: 'dry-run' as const, ok: true, text: '' }
	: await submitSitemap(endpoint, accessToken!);

const result: SitemapSubmitResult = {
	mode: dryRun ? 'dry_run' : 'submitted',
	siteUrl,
	sitemapUrl,
	endpoint,
	sitemapStatus: sitemap.rootStatus,
	discoveredSitemapFiles: sitemap.sitemapFiles.length,
	discoveredUrls: sitemap.urls.length,
	requiredUrlChecks,
	requiredPatternChecks,
	submitStatus: submit.status,
	ok: submit.ok,
	...(submit.text ? { responseText: submit.text.slice(0, 2_000) } : {}),
	outputPath,
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(result, null, 2));

if (!result.ok) {
	process.exitCode = 1;
}

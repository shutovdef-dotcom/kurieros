#!/usr/bin/env tsx
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	buildSeoSurfaceReport,
	createSeoSurfaceBaseline,
	evaluateSeoReleaseGuard,
	type SeoAuditFile,
	type SeoFeedSnapshot,
	type SeoSurfaceBaseline,
} from '../src/utils/seoSurfaceAudit';
import {
	buildYandexVacancyFeed,
	type YandexVacancyFeed,
} from '../src/utils/yandexVacancyFeed';
import { buildYandexVacancyFeedPilot } from '../src/utils/yandexVacancyFeedPilot';
import { BLOG_RELEASE_MANIFEST } from '../src/utils/blogManifest';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const defaultDistDir = resolve(rootDir, 'dist');
const defaultBaselinePath = resolve(rootDir, 'docs/seo/seo-surface-baseline.v1.json');

const readOption = (name: string): string | undefined => {
	const index = process.argv.indexOf(name);
	if (index >= 0) return process.argv[index + 1];
	const prefix = `${name}=`;
	return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
};

const hasFlag = (name: string): boolean => process.argv.includes(name);

const walk = async (dir: string): Promise<string[]> => {
	const paths: string[] = [];
	for (const entry of await readdir(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) paths.push(...await walk(path));
		else if (entry.isFile()) paths.push(path);
	}
	return paths;
};

const readAuditFiles = async (
	distDir: string,
): Promise<{ htmlFiles: SeoAuditFile[]; sitemapFiles: SeoAuditFile[] }> => {
	const paths = await walk(distDir);
	const htmlPaths = paths.filter((path) => path.endsWith('.html')).sort();
	const sitemapPaths = paths
		.filter((path) => /(?:^|\/)sitemap[^/]*\.xml$/i.test(path))
		.sort();
	const load = async (path: string): Promise<SeoAuditFile> => ({
		path: relative(distDir, path),
		content: await readFile(path, 'utf8'),
	});
	return {
		htmlFiles: await Promise.all(htmlPaths.map(load)),
		sitemapFiles: await Promise.all(sitemapPaths.map(load)),
	};
};

const normalizeLandingUrl = (value: string): string => {
	const url = new URL(value);
	url.hash = '';
	return url.toString();
};

const physicalPictureUrl = (value: string): string => {
	const url = new URL(value);
	url.search = '';
	url.hash = '';
	return url.toString();
};

const feedSnapshot = (feed: YandexVacancyFeed): SeoFeedSnapshot => ({
	offers: feed.offers.length,
	normalizedLandingUrls: new Set(feed.offers.map((offer) => normalizeLandingUrl(offer.url))).size,
	sets: feed.sets.length,
	physicalPictures: new Set(feed.offers.map((offer) => physicalPictureUrl(offer.picture))).size,
});

const readBaseline = async (path: string): Promise<SeoSurfaceBaseline | null> => {
	try {
		return JSON.parse(await readFile(path, 'utf8')) as SeoSurfaceBaseline;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
		throw error;
	}
};

const distDir = resolve(rootDir, readOption('--dist') ?? defaultDistDir);
const baselinePath = resolve(rootDir, readOption('--baseline') ?? defaultBaselinePath);
const siteUrl = (process.env.SITE_URL || 'https://kurerok.ru').replace(/\/+$/, '');
const blogReleaseSlugs = BLOG_RELEASE_MANIFEST.releases.map((release) => release.slug);
const blogSitemapUrls = blogReleaseSlugs.length > 0
	? [`${siteUrl}/blog/`, ...blogReleaseSlugs.map((slug) => `${siteUrl}/blog/${slug}/`)]
	: [];
const writeReviewedBaseline = hasFlag('--write-reviewed-baseline');
const reportOnly = hasFlag('--report-only');
const auditFiles = await readAuditFiles(distDir);
const legacyFeed = buildYandexVacancyFeed({ siteUrl });
const pilotFeed = buildYandexVacancyFeedPilot({ siteUrl });
const report = buildSeoSurfaceReport({
	siteUrl,
	...auditFiles,
	feeds: {
		legacy: feedSnapshot(legacyFeed),
		pilot: feedSnapshot(pilotFeed),
	},
});

if (writeReviewedBaseline) {
	const id = String(process.env.SEO_BASELINE_ID ?? '').trim();
	const reviewReason = String(process.env.SEO_BASELINE_REVIEW_REASON ?? '').trim();
	if (!id || !reviewReason) {
		throw new Error(
			'Writing a reviewed baseline requires SEO_BASELINE_ID and SEO_BASELINE_REVIEW_REASON.',
		);
	}
	if (report.sitemap.canonicalConflicts.length > 0) {
		throw new Error('Refusing to baseline a sitemap with canonical conflicts.');
	}
	const baseline = createSeoSurfaceBaseline(report, {
		id,
		reviewReason,
		blogReleaseSlugs,
		blogSitemapUrls,
	});
	await mkdir(dirname(baselinePath), { recursive: true });
	await writeFile(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`, 'utf8');
	console.log(JSON.stringify({ baselinePath, baseline }, null, 2));
	process.exit(0);
}

if (reportOnly) {
	console.log(JSON.stringify(report, null, 2));
	process.exit(0);
}

const baseline = await readBaseline(baselinePath);
const guard = evaluateSeoReleaseGuard(report, baseline, {
	blogReleaseSlugs,
	expectedBlogSitemapUrls: blogSitemapUrls,
});
console.log(JSON.stringify({ report, guard }, null, 2));
if (!guard.ok) process.exit(1);

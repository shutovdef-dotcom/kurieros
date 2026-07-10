import { createHash } from 'node:crypto';

export type SeoAuditFile = {
	path: string;
	content: string;
};

export type SeoFeedSnapshot = {
	offers: number;
	normalizedLandingUrls: number;
	sets: number;
	physicalPictures: number;
};

export type SeoAuditInput = {
	siteUrl: string;
	htmlFiles: SeoAuditFile[];
	sitemapFiles: SeoAuditFile[];
	feeds: {
		legacy: SeoFeedSnapshot;
		pilot: SeoFeedSnapshot;
	};
};

export type SitemapCanonicalConflict = {
	type:
		| 'duplicate_sitemap_url'
		| 'external_sitemap_url'
		| 'missing_built_route'
		| 'missing_canonical'
		| 'multiple_canonicals'
		| 'sitemap_non_self_canonical'
		| 'sitemap_noindex_route';
	url: string;
	canonicalUrl?: string;
	routePath?: string;
};

export type SeoSurfaceReport = {
	schemaVersion: 1;
	routes: {
		total: number;
		indexable: number;
		noindex: number;
		urlSetHash: string;
		indexableUrlSetHash: string;
	};
	sitemap: {
		pageUrlCount: number;
		urlSetHash: string;
		rawXmlHash: string;
		canonicalConflicts: SitemapCanonicalConflict[];
	};
	structuredData: {
		jobPostingPages: number;
		jobPostingItems: number;
		breadcrumbPages: number;
		breadcrumbItems: number;
	};
	vacancies: {
		total: number;
		indexable: number;
		noindex: number;
		jobPostingPages: number;
		breadcrumbPages: number;
		indexabilityReasons: Record<string, number>;
	};
	feeds: {
		legacy: SeoFeedSnapshot;
		pilot: SeoFeedSnapshot;
	};
};

export type SeoSurfaceBaseline = {
	schemaVersion: 1;
	id: string;
	reviewReason: string;
	reviewedSurfaceUrlSetHashes: string[];
	report: SeoSurfaceReport;
};

export type SeoGuardFinding = {
	code:
		| 'canonical_conflict'
		| 'missing_reviewed_baseline'
		| 'surface_delta_review_required'
		| 'job_posting_drop'
		| 'job_posting_change_review_required'
		| 'surface_delta_reviewed';
	message: string;
};

export type SeoReleaseGuardResult = {
	ok: boolean;
	failures: SeoGuardFinding[];
	reviewedExceptions: SeoGuardFinding[];
	deltas: {
		sitemapSurfacePercent: number;
		jobPostingPercent: number;
	};
};

type RouteRecord = {
	filePath: string;
	url: string;
	indexable: boolean;
	canonicalUrls: string[];
	jobPostingItems: number;
	breadcrumbItems: number;
	vacancyReason?: string;
};

const sha256 = (value: string): string =>
	createHash('sha256').update(value, 'utf8').digest('hex');

const normalizeFilePath = (value: string): string =>
	value.replaceAll('\\', '/').replace(/^\.\//, '');

const normalizeUrl = (value: string, siteUrl: string): string => {
	const url = new URL(value, `${siteUrl.replace(/\/+$/, '')}/`);
	url.hash = '';
	return url.toString();
};

const urlSetHash = (urls: Iterable<string>): string =>
	sha256([...new Set(urls)].sort().join('\n'));

const routePathFromHtmlFile = (filePath: string): string => {
	const normalized = normalizeFilePath(filePath);
	if (normalized === 'index.html') return '/';
	if (normalized.endsWith('/index.html')) {
		return `/${normalized.slice(0, -'index.html'.length)}`;
	}
	return `/${normalized}`;
};

const getAttribute = (tag: string, name: string): string | undefined => {
	const quoted = tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'));
	if (quoted) return quoted[2];
	return tag.match(new RegExp(`\\b${name}\\s*=\\s*([^\\s>]+)`, 'i'))?.[1];
};

const getCanonicalUrls = (html: string, siteUrl: string): string[] => {
	const urls: string[] = [];
	for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
		const tag = match[0];
		const rel = getAttribute(tag, 'rel')?.toLowerCase().split(/\s+/) ?? [];
		if (!rel.includes('canonical')) continue;
		const href = getAttribute(tag, 'href');
		if (!href) continue;
		try {
			urls.push(normalizeUrl(href, siteUrl));
		} catch {
			urls.push(href);
		}
	}
	return [...new Set(urls)].sort();
};

const isIndexableHtml = (html: string): boolean => {
	for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
		const tag = match[0];
		if (getAttribute(tag, 'name')?.toLowerCase() !== 'robots') continue;
		return !/\bnoindex\b/i.test(getAttribute(tag, 'content') ?? '');
	}
	return true;
};

const countSchemaType = (value: unknown, targetType: string): number => {
	if (Array.isArray(value)) {
		return value.reduce((sum, item) => sum + countSchemaType(item, targetType), 0);
	}
	if (!value || typeof value !== 'object') return 0;
	const record = value as Record<string, unknown>;
	const nodeTypes = Array.isArray(record['@type'])
		? record['@type']
		: [record['@type']];
	const ownCount = nodeTypes.includes(targetType) ? 1 : 0;
	return Object.values(record).reduce<number>(
		(sum, item) => sum + countSchemaType(item, targetType),
		ownCount,
	);
};

const countStructuredData = (html: string): { jobPosting: number; breadcrumb: number } => {
	let jobPosting = 0;
	let breadcrumb = 0;
	for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
		const attrs = match[1] ?? '';
		if (getAttribute(attrs, 'type')?.toLowerCase() !== 'application/ld+json') continue;
		try {
			const data = JSON.parse(match[2] ?? '') as unknown;
			jobPosting += countSchemaType(data, 'JobPosting');
			breadcrumb += countSchemaType(data, 'BreadcrumbList');
		} catch {
			// Invalid JSON-LD is handled by schema/build tests; the audit records no item.
		}
	}
	return { jobPosting, breadcrumb };
};

const getVacancyReason = (html: string): string | undefined => {
	const match = html.match(/\bdata-vacancy-indexability\s*=\s*(["'])(.*?)\1/i);
	return match?.[2]?.trim() || undefined;
};

const buildRoutes = (
	htmlFiles: SeoAuditFile[],
	siteUrl: string,
): RouteRecord[] => htmlFiles
	.map((file): RouteRecord | null => {
		if (!/<html\b/i.test(file.content) && !/<!doctype\s+html/i.test(file.content)) return null;
		const filePath = normalizeFilePath(file.path);
		if (filePath.startsWith('api/')) return null;
		const routePath = routePathFromHtmlFile(filePath);
		const schema = countStructuredData(file.content);
		return {
			filePath,
			url: normalizeUrl(routePath, siteUrl),
			indexable: isIndexableHtml(file.content),
			canonicalUrls: getCanonicalUrls(file.content, siteUrl),
			jobPostingItems: schema.jobPosting,
			breadcrumbItems: schema.breadcrumb,
			vacancyReason: getVacancyReason(file.content),
		};
	})
	.filter((route): route is RouteRecord => Boolean(route))
	.sort((a, b) => a.url.localeCompare(b.url));

const decodeXml = (value: string): string => value
	.replace(/&amp;/g, '&')
	.replace(/&lt;/g, '<')
	.replace(/&gt;/g, '>')
	.replace(/&quot;/g, '"')
	.replace(/&apos;/g, "'");

const sitemapPageUrls = (
	files: SeoAuditFile[],
	siteUrl: string,
): { urls: string[]; duplicateUrls: string[] } => {
	const occurrences = new Map<string, number>();
	for (const file of files) {
		if (/sitemap-index\.xml$/i.test(normalizeFilePath(file.path))) continue;
		for (const match of file.content.matchAll(/<loc>\s*([\s\S]*?)\s*<\/loc>/gi)) {
			const rawUrl = decodeXml(match[1] ?? '').trim();
			if (!rawUrl) continue;
			let url: string;
			try {
				url = normalizeUrl(rawUrl, siteUrl);
			} catch {
				url = rawUrl;
			}
			occurrences.set(url, (occurrences.get(url) ?? 0) + 1);
		}
	}
	return {
		urls: [...occurrences.keys()].sort(),
		duplicateUrls: [...occurrences]
			.filter(([, count]) => count > 1)
			.map(([url]) => url)
			.sort(),
	};
};

const canonicalConflicts = (
	pageUrls: string[],
	duplicateUrls: string[],
	routes: RouteRecord[],
	siteUrl: string,
): SitemapCanonicalConflict[] => {
	const routeByUrl = new Map(routes.map((route) => [route.url, route]));
	const siteOrigin = new URL(siteUrl).origin;
	const conflicts: SitemapCanonicalConflict[] = duplicateUrls.map((url) => ({
		type: 'duplicate_sitemap_url',
		url,
	}));

	for (const url of pageUrls) {
		let parsed: URL;
		try {
			parsed = new URL(url);
		} catch {
			conflicts.push({ type: 'external_sitemap_url', url });
			continue;
		}
		if (parsed.origin !== siteOrigin) {
			conflicts.push({ type: 'external_sitemap_url', url });
			continue;
		}
		const route = routeByUrl.get(url);
		if (!route) {
			conflicts.push({ type: 'missing_built_route', url });
			continue;
		}
		if (route.canonicalUrls.length === 0) {
			conflicts.push({ type: 'missing_canonical', url, routePath: route.filePath });
			continue;
		}
		if (route.canonicalUrls.length > 1) {
			conflicts.push({
				type: 'multiple_canonicals',
				url,
				canonicalUrl: route.canonicalUrls.join(', '),
				routePath: route.filePath,
			});
			continue;
		}
		if (route.canonicalUrls[0] !== url) {
			conflicts.push({
				type: 'sitemap_non_self_canonical',
				url,
				canonicalUrl: route.canonicalUrls[0],
				routePath: route.filePath,
			});
		}
		if (!route.indexable) {
			conflicts.push({ type: 'sitemap_noindex_route', url, routePath: route.filePath });
		}
	}
	return conflicts.sort((a, b) =>
		a.url.localeCompare(b.url) || a.type.localeCompare(b.type),
	);
};

const rawSitemapHash = (files: SeoAuditFile[]): string => sha256(
	[...files]
		.map((file) => ({ path: normalizeFilePath(file.path), content: file.content }))
		.sort((a, b) => a.path.localeCompare(b.path))
		.map((file) => `${file.path}\u0000${file.content}`)
		.join('\u0000'),
);

const sortedCountRecord = (values: Array<string | undefined>): Record<string, number> => {
	const counts = new Map<string, number>();
	for (const value of values) {
		if (!value) continue;
		counts.set(value, (counts.get(value) ?? 0) + 1);
	}
	return Object.fromEntries([...counts].sort(([a], [b]) => a.localeCompare(b)));
};

export const buildSeoSurfaceReport = (input: SeoAuditInput): SeoSurfaceReport => {
	const siteUrl = normalizeUrl('/', input.siteUrl);
	const routes = buildRoutes(input.htmlFiles, siteUrl);
	const indexableRoutes = routes.filter((route) => route.indexable);
	const vacancies = routes.filter((route) => new URL(route.url).pathname.startsWith('/v/'));
	const sitemap = sitemapPageUrls(input.sitemapFiles, siteUrl);

	return {
		schemaVersion: 1,
		routes: {
			total: routes.length,
			indexable: indexableRoutes.length,
			noindex: routes.length - indexableRoutes.length,
			urlSetHash: urlSetHash(routes.map((route) => route.url)),
			indexableUrlSetHash: urlSetHash(indexableRoutes.map((route) => route.url)),
		},
		sitemap: {
			pageUrlCount: sitemap.urls.length,
			urlSetHash: urlSetHash(sitemap.urls),
			rawXmlHash: rawSitemapHash(input.sitemapFiles),
			canonicalConflicts: canonicalConflicts(
				sitemap.urls,
				sitemap.duplicateUrls,
				routes,
				siteUrl,
			),
		},
		structuredData: {
			jobPostingPages: routes.filter((route) => route.jobPostingItems > 0).length,
			jobPostingItems: routes.reduce((sum, route) => sum + route.jobPostingItems, 0),
			breadcrumbPages: routes.filter((route) => route.breadcrumbItems > 0).length,
			breadcrumbItems: routes.reduce((sum, route) => sum + route.breadcrumbItems, 0),
		},
		vacancies: {
			total: vacancies.length,
			indexable: vacancies.filter((route) => route.indexable).length,
			noindex: vacancies.filter((route) => !route.indexable).length,
			jobPostingPages: vacancies.filter((route) => route.jobPostingItems > 0).length,
			breadcrumbPages: vacancies.filter((route) => route.breadcrumbItems > 0).length,
			indexabilityReasons: sortedCountRecord(vacancies.map((route) => route.vacancyReason)),
		},
		feeds: {
			legacy: { ...input.feeds.legacy },
			pilot: { ...input.feeds.pilot },
		},
	};
};

export const createSeoSurfaceBaseline = (
	report: SeoSurfaceReport,
	options: { id: string; reviewReason: string },
): SeoSurfaceBaseline => {
	const id = options.id.trim();
	const reviewReason = options.reviewReason.trim();
	if (!id) throw new Error('SEO baseline id is required.');
	if (!reviewReason) throw new Error('SEO baseline review reason is required.');
	return {
		schemaVersion: 1,
		id,
		reviewReason,
		reviewedSurfaceUrlSetHashes: [report.sitemap.urlSetHash],
		report,
	};
};

const percentDelta = (current: number, baseline: number): number => {
	if (baseline === 0) return current === 0 ? 0 : 100;
	return Number((((current - baseline) / baseline) * 100).toFixed(6));
};

const MAX_UNREVIEWED_SURFACE_URL_DELTA = 14;

const sortFindings = (findings: SeoGuardFinding[]): SeoGuardFinding[] =>
	findings.sort((a, b) => a.code.localeCompare(b.code) || a.message.localeCompare(b.message));

export const evaluateSeoReleaseGuard = (
	report: SeoSurfaceReport,
	baseline: SeoSurfaceBaseline | null | undefined,
): SeoReleaseGuardResult => {
	const failures: SeoGuardFinding[] = [];
	const reviewedExceptions: SeoGuardFinding[] = [];

	if (report.sitemap.canonicalConflicts.length > 0) {
		failures.push({
			code: 'canonical_conflict',
			message: `Sitemap has ${report.sitemap.canonicalConflicts.length} canonical conflict(s).`,
		});
	}
	if (!baseline) {
		failures.push({
			code: 'missing_reviewed_baseline',
			message: 'A versioned reviewed SEO baseline is required.',
		});
		return {
			ok: false,
			failures: sortFindings(failures),
			reviewedExceptions,
			deltas: { sitemapSurfacePercent: 0, jobPostingPercent: 0 },
		};
	}

	const sitemapSurfacePercent = percentDelta(
		report.sitemap.pageUrlCount,
		baseline.report.sitemap.pageUrlCount,
	);
	const jobPostingPercent = percentDelta(
		report.structuredData.jobPostingPages,
		baseline.report.structuredData.jobPostingPages,
	);
	const sitemapCountDelta = Math.abs(
		report.sitemap.pageUrlCount - baseline.report.sitemap.pageUrlCount,
	);
	const sitemapUrlSetChanged =
		report.sitemap.urlSetHash !== baseline.report.sitemap.urlSetHash;
	const sitemapReviewRequired =
		Math.abs(sitemapSurfacePercent) > 5 ||
		sitemapCountDelta > MAX_UNREVIEWED_SURFACE_URL_DELTA ||
		(sitemapUrlSetChanged && sitemapCountDelta === 0);
	if (sitemapReviewRequired) {
		if (baseline.reviewedSurfaceUrlSetHashes.includes(report.sitemap.urlSetHash)) {
			reviewedExceptions.push({
				code: 'surface_delta_reviewed',
				message: `Sitemap surface delta ${sitemapSurfacePercent}% (${sitemapCountDelta} URL changes) matches an explicitly reviewed URL-set hash.`,
			});
		} else {
			failures.push({
				code: 'surface_delta_review_required',
				message: `Sitemap surface delta ${sitemapSurfacePercent}% (${sitemapCountDelta} URL changes) requires review.`,
			});
		}
	}
	if (jobPostingPercent < -5) {
		failures.push({
			code: 'job_posting_drop',
			message: `JobPosting page count changed by ${jobPostingPercent}%, below the -5% release floor.`,
		});
	} else if (jobPostingPercent > 5) {
		failures.push({
			code: 'job_posting_change_review_required',
			message: `JobPosting page count changed by +${jobPostingPercent}%, above the +5% review ceiling.`,
		});
	}

	return {
		ok: failures.length === 0,
		failures: sortFindings(failures),
		reviewedExceptions: sortFindings(reviewedExceptions),
		deltas: { sitemapSurfacePercent, jobPostingPercent },
	};
};

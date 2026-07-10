import { describe, expect, it } from 'vitest';
import {
	buildSeoSurfaceReport,
	createSeoSurfaceBaseline,
	evaluateSeoReleaseGuard,
	type SeoAuditInput,
	type SeoSurfaceReport,
} from '../src/utils/seoSurfaceAudit';

const siteUrl = 'https://kurerok.ru';

const html = ({
	canonical,
	robots = 'index, follow',
	structuredTypes = [],
}: {
	canonical: string;
	robots?: string;
	structuredTypes?: string[];
}) => `<!doctype html>
<html lang="ru">
<head>
  <meta name="robots" content="${robots}">
  <link rel="canonical" href="${canonical}">
  <script type="application/ld+json">${JSON.stringify({
		'@context': 'https://schema.org',
		'@graph': structuredTypes.map((type) => ({ '@type': type })),
	})}</script>
</head>
<body>Fixture</body>
</html>`;

const sitemap = (lastmod = '2026-07-10') => `<?xml version="1.0"?>
<urlset>
  <url><loc>https://kurerok.ru/</loc><lastmod>${lastmod}</lastmod></url>
  <url><loc>https://kurerok.ru/v/open-role/</loc><lastmod>${lastmod}</lastmod></url>
  <url><loc>https://kurerok.ru/about/</loc><lastmod>${lastmod}</lastmod></url>
</urlset>`;

const baseInput = (lastmod = '2026-07-10'): SeoAuditInput => ({
	siteUrl,
	htmlFiles: [
		{
			path: 'index.html',
			content: html({
				canonical: `${siteUrl}/`,
				structuredTypes: ['BreadcrumbList'],
			}),
		},
		{
			path: 'about/index.html',
			content: html({ canonical: `${siteUrl}/about/` }),
		},
		{
			path: 'v/open-role/index.html',
			content: html({
				canonical: `${siteUrl}/v/open-role/`,
				structuredTypes: ['JobPosting', 'BreadcrumbList'],
			}),
		},
		{
			path: 'v/hidden-role/index.html',
			content: html({
				canonical: `${siteUrl}/v/hidden-role/`,
				robots: 'noindex, follow',
				structuredTypes: ['BreadcrumbList'],
			}),
		},
	],
	sitemapFiles: [
		{ path: 'sitemap-pages-0.xml', content: sitemap(lastmod) },
		{
			path: 'sitemap-index.xml',
			content: '<sitemapindex><sitemap><loc>https://kurerok.ru/sitemap-pages-0.xml</loc></sitemap></sitemapindex>',
		},
	],
	feeds: {
		legacy: {
			offers: 9_658,
			normalizedLandingUrls: 6_634,
			sets: 843,
			physicalPictures: 15,
		},
		pilot: {
			offers: 381,
			normalizedLandingUrls: 381,
			sets: 50,
			physicalPictures: 15,
		},
	},
});

const reportWith = (
	report: SeoSurfaceReport,
	overrides: {
		sitemapUrls?: number;
		sitemapHash?: string;
		jobPostingPages?: number;
	} = {},
): SeoSurfaceReport => ({
	...report,
	sitemap: {
		...report.sitemap,
		pageUrlCount: overrides.sitemapUrls ?? report.sitemap.pageUrlCount,
		urlSetHash: overrides.sitemapHash ?? report.sitemap.urlSetHash,
	},
	structuredData: {
		...report.structuredData,
		jobPostingPages:
			overrides.jobPostingPages ?? report.structuredData.jobPostingPages,
	},
});

describe('SEO surface report', () => {
	it('counts routes, indexability, vacancy schema, breadcrumbs and both feed modes', () => {
		const report = buildSeoSurfaceReport(baseInput());

		expect(report.routes).toMatchObject({
			total: 4,
			indexable: 3,
			noindex: 1,
		});
		expect(report.structuredData).toEqual({
			jobPostingPages: 1,
			jobPostingItems: 1,
			breadcrumbPages: 3,
			breadcrumbItems: 3,
		});
		expect(report.vacancies).toMatchObject({
			total: 2,
			indexable: 1,
			noindex: 1,
			jobPostingPages: 1,
			breadcrumbPages: 2,
		});
		expect(report.sitemap.pageUrlCount).toBe(3);
		expect(report.sitemap.canonicalConflicts).toEqual([]);
		expect(report.feeds.legacy.offers).toBe(9_658);
		expect(report.feeds.pilot.sets).toBe(50);
	});

	it('hashes sorted route and sitemap URL sets separately from raw XML', () => {
		const first = buildSeoSurfaceReport(baseInput('2026-07-10'));
		const secondInput = baseInput('2026-07-11');
		secondInput.htmlFiles.reverse();
		secondInput.sitemapFiles.reverse();
		const second = buildSeoSurfaceReport(secondInput);

		expect(first.routes.urlSetHash).toMatch(/^[a-f0-9]{64}$/);
		expect(first.sitemap.urlSetHash).toBe(second.sitemap.urlSetHash);
		expect(first.routes.urlSetHash).toBe(second.routes.urlSetHash);
		expect(first.sitemap.rawXmlHash).not.toBe(second.sitemap.rawXmlHash);
	});

	it('detects and deterministically sorts sitemap URLs that are not self-canonical', () => {
		const input = baseInput();
		input.htmlFiles.push({
			path: 'legacy/index.html',
			content: html({ canonical: `${siteUrl}/preferred/` }),
		});
		input.sitemapFiles[0]!.content = input.sitemapFiles[0]!.content.replace(
			'</urlset>',
			'<url><loc>https://kurerok.ru/legacy/</loc></url></urlset>',
		);

		const report = buildSeoSurfaceReport(input);

		expect(report.sitemap.canonicalConflicts).toEqual([
			{
				type: 'sitemap_non_self_canonical',
				url: `${siteUrl}/legacy/`,
				canonicalUrl: `${siteUrl}/preferred/`,
				routePath: 'legacy/index.html',
			},
		]);
	});
});

describe('SEO release guard', () => {
	it('passes an unchanged report against an explicit reviewed baseline', () => {
		const report = buildSeoSurfaceReport(baseInput());
		const baseline = createSeoSurfaceBaseline(report, {
			id: 'fixture-v1',
			reviewReason: 'Initial reviewed fixture.',
		});

		expect(evaluateSeoReleaseGuard(report, baseline)).toEqual({
			ok: true,
			failures: [],
			reviewedExceptions: [],
			deltas: {
				sitemapSurfacePercent: 0,
				jobPostingPercent: 0,
			},
		});
	});

	it('fails any canonical conflict regardless of reviewed surface hashes', () => {
		const report = buildSeoSurfaceReport(baseInput());
		const baseline = createSeoSurfaceBaseline(report, {
			id: 'fixture-v1',
			reviewReason: 'Initial reviewed fixture.',
		});
		const conflicted = {
			...report,
			sitemap: {
				...report.sitemap,
				canonicalConflicts: [
					{
						type: 'missing_built_route' as const,
						url: `${siteUrl}/missing/`,
					},
				],
			},
		};

		const guard = evaluateSeoReleaseGuard(conflicted, baseline);
		expect(guard.ok).toBe(false);
		expect(guard.failures.map((failure) => failure.code)).toContain('canonical_conflict');
	});

	it('requires explicit hash review when the sitemap surface changes by more than 5%', () => {
		const report = buildSeoSurfaceReport(baseInput());
		const baselineReport = reportWith(report, {
			sitemapUrls: 100,
			sitemapHash: 'baseline-hash',
			jobPostingPages: 100,
		});
		const baseline = createSeoSurfaceBaseline(baselineReport, {
			id: 'fixture-v1',
			reviewReason: 'Initial reviewed fixture.',
		});
		const changed = reportWith(report, {
			sitemapUrls: 106,
			sitemapHash: 'new-reviewed-hash',
			jobPostingPages: 100,
		});

		const unreviewed = evaluateSeoReleaseGuard(changed, baseline);
		expect(unreviewed.ok).toBe(false);
		expect(unreviewed.failures.map((failure) => failure.code)).toContain(
			'surface_delta_review_required',
		);

		const reviewed = evaluateSeoReleaseGuard(changed, {
			...baseline,
			reviewedSurfaceUrlSetHashes: [
				...baseline.reviewedSurfaceUrlSetHashes,
				'new-reviewed-hash',
			],
		});
		expect(reviewed.ok).toBe(true);
		expect(reviewed.reviewedExceptions.map((exception) => exception.code)).toEqual([
			'surface_delta_reviewed',
		]);
	});

	it('fails a JobPosting drop above 5% and allows the exact 5% boundary', () => {
		const report = buildSeoSurfaceReport(baseInput());
		const baselineReport = reportWith(report, {
			sitemapUrls: 100,
			jobPostingPages: 100,
		});
		const baseline = createSeoSurfaceBaseline(baselineReport, {
			id: 'fixture-v1',
			reviewReason: 'Initial reviewed fixture.',
		});

		const failing = evaluateSeoReleaseGuard(
			reportWith(report, { sitemapUrls: 100, jobPostingPages: 94 }),
			baseline,
		);
		expect(failing.failures.map((failure) => failure.code)).toContain(
			'job_posting_drop',
		);

		const boundary = evaluateSeoReleaseGuard(
			reportWith(report, { sitemapUrls: 100, jobPostingPages: 95 }),
			baseline,
		);
		expect(boundary.ok).toBe(true);
	});
});

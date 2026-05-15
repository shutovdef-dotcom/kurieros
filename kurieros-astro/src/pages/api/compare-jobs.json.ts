import type { APIRoute } from 'astro';
import jobsData from '../../data/jobs';
import { slugifyCompany } from '../../utils/companies';

// Slim JSON endpoint for /compare/ page client-side lookups.
// Replaces inline `define:vars={{ allCompareJobs }}` (~3.9 MB HTML)
// with a separately-cached fetch (~147 KB gzipped (3.7 MB uncompressed),
// fetched only when user interacts with city/transport filter on the
// compare page).

const TRANSPORT_LABELS: Record<string, string> = {
	auto: 'Авто',
	bicycle: 'Велосипед / самокат',
	foot: 'Пешком',
	remote: 'Удалённо / офис',
};

const transportLabel = (tags: string[]): string => {
	const tag = tags.find((t) => t in TRANSPORT_LABELS);
	return tag ? TRANSPORT_LABELS[tag] : 'Смешанный формат';
};

const transportProvisionLabel = (provision: 'own' | 'company' | 'not_required'): string => {
	if (provision === 'company') return 'Компания выдает транспортное средство';
	if (provision === 'not_required') return 'Транспорт не требуется';
	return 'Нужно своё транспортное средство';
};

const normalizeOs = (value?: string): string => {
	const normalized = String(value ?? '').trim().toLowerCase();
	const hasAndroid = /android|андроид/.test(normalized);
	const hasIos = /(?:^|[^a-z])ios(?:[^a-z]|$)|iphone|ipad|айос|айфон/.test(normalized);
	if (hasAndroid && hasIos) return 'Android или iOS';
	if (hasIos) return 'iOS';
	if (hasAndroid) return 'Android';
	return 'Android или iOS';
};

export const GET: APIRoute = () => {
	const slim = jobsData.map((job) => {
		const companySlug = slugifyCompany(job.company);
		return {
			id: job.id,
			slug: job.slug,
			title: job.title,
			company: job.company,
			companyLogo: job.companyLogo,
			companySlug,
			companyHref: `/companies/${companySlug}/`,
			salary: job.salary,
			location: job.location,
			transport: transportLabel(job.tags),
			transport_provision: transportProvisionLabel(job.transportProvision),
			contract: job.details.employment_type,
			citizenship: job.details.citizenship,
			payout: job.details.payment_freq,
			bonus: job.benefits[0] || 'Условия уточняются при отклике',
			age: job.details.age,
			os: normalizeOs(job.details.os),
			link: `/v/${job.slug}/`,
		};
	});

	return new Response(JSON.stringify(slim), {
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Cache-Control': 'public, max-age=600, s-maxage=3600',
			'X-Robots-Tag': 'noindex',
		},
	});
};

import jobsData from '../data/jobs';
import { CATEGORIES } from '../data/constants';
import { vacancySources } from '../data/vacancies';
import type { GeneratedJob, VacancyOffer, VacancySource } from '../data/vacancyTypes';
import { isCityBlocked, slugifyCity } from './cities';
import { slugifyCompany } from './companies';
import {
	buildJobsByCityMap,
	filterJobsByCriteria,
	getCityJobsFromMap,
} from './jobFilters';
import { HUB_CONFIGS } from './transportHubs';
import { getVacancyDetailPath } from './vacancyUrl';

export const YANDEX_VACANCY_FEED_PATH = '/yandex-vacancies.xml';

const MIN_SET_OFFERS = 3;
const MIN_PRICE = 1_000;
const MAX_PRICE = 1_000_000;
const MAX_OFFERS = 30_000;
const DEFAULT_SITE_URL = 'https://kurerok.ru';
const YANDEX_FEED_TIME_ZONE = 'Europe/Moscow';

type FeedJobPair = {
	job: GeneratedJob;
	source: VacancySource;
	offer: VacancyOffer;
	price: YandexFeedPrice;
};

export type YandexFeedCategory = {
	id: number;
	name: string;
	parentId?: number;
};

export type YandexFeedSet = {
	id: string;
	name: string;
	url: string;
	offerUrls: string[];
};

export type YandexFeedPrice = {
	value: number;
	from: boolean;
	salaryMax?: number;
	salesNotes: string;
};

export type YandexFeedOffer = {
	id: string;
	name: string;
	vendor: string;
	url: string;
	price: YandexFeedPrice;
	currencyId: 'RUR';
	categoryId: number;
	setIds: string[];
	picture: string;
	description: string;
	conversion: string;
	params: Array<{ name: string; value: string | number | boolean }>;
};

export type YandexVacancyFeed = {
	generatedAt: Date;
	siteUrl: string;
	shop: {
		name: string;
		company: string;
		url: string;
	};
	categories: YandexFeedCategory[];
	sets: YandexFeedSet[];
	offers: YandexFeedOffer[];
	stats: {
		sourceJobs: number;
		includedOffers: number;
		excludedNonRub: number;
		excludedNoOffer: number;
		excludedInvalidSalary: number;
		excludedNoSets: number;
	};
};

type YandexVacancyFeedInput = {
	jobs?: GeneratedJob[];
	sources?: VacancySource[];
	siteUrl?: string;
	generatedAt?: Date;
};

type SetBucket = {
	id: string;
	name: string;
	url: string;
	jobs: GeneratedJob[];
};

export type YandexFeedValidationResult = {
	ok: boolean;
	errors: string[];
	warnings: string[];
};

const REQUIRED_CATEGORIES: YandexFeedCategory[] = [
	{ id: 1, name: 'Вакансия' },
	{ id: 2, name: 'Работодатель' },
];

const VACANCY_CATEGORIES: YandexFeedCategory[] = [
	{ id: 11, name: 'Административный персонал', parentId: 1 },
	{ id: 12, name: 'Банки, инвестиции, лизинг', parentId: 1 },
	{ id: 18, name: 'Домашний персонал', parentId: 1 },
	{ id: 33, name: 'Общественное питание', parentId: 1 },
	{ id: 36, name: 'Рабочий персонал', parentId: 1 },
	{ id: 44, name: 'Транспорт, логистика', parentId: 1 },
	{ id: 53, name: 'Без специальной подготовки', parentId: 1 },
];

const normalizeSiteUrl = (siteUrl: string): string => siteUrl.replace(/\/+$/, '');

const absoluteUrl = (pathOrUrl: string, siteUrl: string): string =>
	new URL(pathOrUrl, `${normalizeSiteUrl(siteUrl)}/`).toString();

const normalizeSetOfferUrl = (url: string): string => {
	try {
		const parsed = new URL(url);
		parsed.hash = '';
		return parsed.toString();
	} catch {
		return url.split('#')[0] ?? url;
	}
};

const escapeXml = (value: string | number | boolean): string =>
	String(value)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');

const cdataSafeText = (value: string): string => value.replace(/\]\]>/g, ']]&gt;');

const sanitizeXmlId = (value: string): string =>
	value
		.toLowerCase()
		.replace(/[^a-z0-9-]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 120);

const generatedJobSlugForOffer = (source: VacancySource, offer: VacancyOffer): string =>
	`${source.slug}-${slugifyCity(offer.city)}-${offer.transport}`;

const buildOfferLookup = (sources: VacancySource[]) => {
	const lookup = new Map<string, { source: VacancySource; offer: VacancyOffer }>();
	for (const source of sources) {
		for (const offer of source.offers) {
			if (!offer.isActive || isCityBlocked(offer.city)) continue;
			lookup.set(generatedJobSlugForOffer(source, offer), { source, offer });
		}
	}
	return lookup;
};

const normalizeSalary = (value: number | undefined): number | null =>
	typeof value === 'number' && Number.isFinite(value) && value > 0
		? Math.round(value)
		: null;

const buildFeedPrice = (offer: VacancyOffer): YandexFeedPrice | null => {
	const min = normalizeSalary(offer.pay.monthly?.min);
	const max = normalizeSalary(offer.pay.monthly?.max);
	const value = min ?? max;
	if (value === null || value < MIN_PRICE || value > MAX_PRICE) {
		return null;
	}

	if (min !== null && max !== null && max > min) {
		return {
			value: min,
			from: true,
			salaryMax: max <= MAX_PRICE ? max : undefined,
			salesNotes: 'от, в месяц',
		};
	}

	return {
		value,
		from: min !== null && max === null,
		...(max !== null && min === null ? { salaryMax: max } : {}),
		salesNotes: min !== null && max === null ? 'от, в месяц' : 'до, в месяц',
	};
};

const getYandexCategoryId = (job: GeneratedJob): number => {
	const sourceSlug = job.sourceSlug.toLowerCase();
	if (sourceSlug.includes('tbank') || sourceSlug.includes('alfa-bank') || sourceSlug.includes('efin')) {
		return 12;
	}
	if (sourceSlug.includes('burger-king')) {
		return 33;
	}
	if (sourceSlug.includes('qlean')) {
		return 18;
	}
	if (sourceSlug.includes('voxys') || job.transport === 'remote' || job.transport === 'office') {
		return 11;
	}
	if (job.transport === 'service') {
		return 36;
	}
	return 44;
};

const getScheduleParam = (schedule: string): string => {
	const lower = schedule.toLowerCase();
	if (lower.includes('удален') || lower.includes('удалён')) return 'Удаленная работа';
	if (lower.includes('смен')) return 'Сменный график';
	if (lower.includes('вахт')) return 'Вахтовый метод';
	if (lower.includes('гиб') || lower.includes('свобод')) return 'Гибкий график';
	return 'Полный день';
};

const getEmploymentParam = (job: GeneratedJob): string => {
	const schedule = job.details.schedule.toLowerCase();
	if (schedule.includes('свобод') || schedule.includes('гиб') || schedule.includes('подработ')) {
		return 'Частичная';
	}
	return 'Полная';
};

const getPublishedIso = (updatedAt: string): string => {
	const parsed = new Date(updatedAt);
	return Number.isNaN(parsed.getTime()) ? new Date(0).toISOString() : parsed.toISOString();
};

const buildConversion = (job: GeneratedJob, price: YandexFeedPrice): string => {
	const priorityBoost = typeof job.priority === 'number'
		? Math.min(Math.max(0, job.priority), 100) / 25
		: 0;
	const salaryBoost = Math.min((price.salaryMax ?? price.value) / 100_000, 8);
	const hotBoost = job.isHot ? 0.75 : 0;
	return (1 + priorityBoost + salaryBoost + hotBoost).toFixed(5);
};

const buildPictureUrl = (job: GeneratedJob, offerId: string, siteUrl: string): string => {
	const url = new URL(absoluteUrl(job.companyLogo, siteUrl));
	url.searchParams.set('yfeed', offerId);
	return url.toString();
};

const uniqueJobs = (jobs: GeneratedJob[]): GeneratedJob[] => {
	const seen = new Set<string>();
	const out: GeneratedJob[] = [];
	for (const job of jobs) {
		if (seen.has(job.slug)) continue;
		seen.add(job.slug);
		out.push(job);
	}
	return out;
};

const addSetBucket = (
	buckets: Map<string, SetBucket>,
	id: string,
	name: string,
	path: string,
	jobs: GeneratedJob[],
	siteUrl: string,
) => {
	const cleanedJobs = uniqueJobs(jobs);
	if (cleanedJobs.length < MIN_SET_OFFERS) return;
	buckets.set(id, {
		id,
		name,
		url: absoluteUrl(path, siteUrl),
		jobs: cleanedJobs,
	});
};

const getCitiesFromFeedJobs = (jobs: GeneratedJob[]): string[] => {
	const cities = new Set<string>();
	for (const job of jobs) {
		for (const city of job.location.split(',')) {
			const normalized = city.trim();
			if (!normalized || normalized === 'Вся Россия') continue;
			cities.add(normalized);
		}
	}
	return [...cities].sort((a, b) => a.localeCompare(b, 'ru'));
};

const buildSetBuckets = (jobs: GeneratedJob[], siteUrl: string): Map<string, SetBucket> => {
	const buckets = new Map<string, SetBucket>();
	const jobsByCity = buildJobsByCityMap(jobs);

	for (const city of getCitiesFromFeedJobs(jobs)) {
		const citySlug = slugifyCity(city);
		addSetBucket(
			buckets,
			`city-${sanitizeXmlId(citySlug)}`,
			`Работа курьером ${city}`,
			`/rabota-kurerom-${citySlug}/`,
			getCityJobsFromMap(jobsByCity, city),
			siteUrl,
		);
	}

	for (const category of CATEGORIES) {
		const categoryJobs = filterJobsByCriteria(jobs, {
			tag: category.tag || 'all',
			search: category.query || '',
		});
		addSetBucket(
			buckets,
			`cat-${sanitizeXmlId(category.slug)}`,
			`Работа курьером: ${category.name}`,
			`/rabota-kurerom-${category.slug}/`,
			categoryJobs,
			siteUrl,
		);
	}

	for (const cfg of Object.values(HUB_CONFIGS)) {
		addSetBucket(
			buckets,
			`hub-${sanitizeXmlId(cfg.slug)}`,
			cfg.h1,
			`/${cfg.slug}/`,
			filterJobsByCriteria(jobs, cfg.filter),
			siteUrl,
		);
	}

	const companyBuckets = new Map<string, GeneratedJob[]>();
	for (const job of jobs) {
		const companySlug = slugifyCompany(job.company);
		companyBuckets.set(companySlug, [...(companyBuckets.get(companySlug) ?? []), job]);
	}
	for (const [companySlug, companyJobs] of companyBuckets) {
		const firstJob = companyJobs[0];
		if (!firstJob) continue;
		addSetBucket(
			buckets,
			`company-${sanitizeXmlId(companySlug)}`,
			`Работа в ${firstJob.company}`,
			`/companies/${companySlug}/`,
			companyJobs,
			siteUrl,
		);
	}

	return buckets;
};

const buildOfferSetIds = (buckets: Map<string, SetBucket>): Map<string, string[]> => {
	const byJobSlug = new Map<string, string[]>();
	for (const bucket of buckets.values()) {
		for (const job of bucket.jobs) {
			byJobSlug.set(job.slug, [...(byJobSlug.get(job.slug) ?? []), bucket.id]);
		}
	}
	return byJobSlug;
};

const getBucketOfferUrls = (bucket: SetBucket, siteUrl: string): string[] =>
	bucket.jobs.map((job) => absoluteUrl(getVacancyDetailPath(job), siteUrl));

const hasEnoughUniqueBaseOfferUrls = (urls: string[]): boolean =>
	new Set(urls.map(normalizeSetOfferUrl)).size >= MIN_SET_OFFERS;

const filterQualifiedSetBuckets = (buckets: Map<string, SetBucket>, siteUrl: string): Map<string, SetBucket> =>
	new Map(
		[...buckets].filter(([, bucket]) =>
			hasEnoughUniqueBaseOfferUrls(getBucketOfferUrls(bucket, siteUrl)),
		),
	);

const buildPairs = (
	jobs: GeneratedJob[],
	sources: VacancySource[],
): {
	pairs: FeedJobPair[];
	stats: Pick<
		YandexVacancyFeed['stats'],
		'excludedNonRub' | 'excludedNoOffer' | 'excludedInvalidSalary'
	>;
} => {
	const offerLookup = buildOfferLookup(sources);
	const pairs: FeedJobPair[] = [];
	let excludedNonRub = 0;
	let excludedNoOffer = 0;
	let excludedInvalidSalary = 0;

	for (const job of jobs) {
		if (job.currency !== 'RUB') {
			excludedNonRub += 1;
			continue;
		}
		const matched = offerLookup.get(job.slug);
		if (!matched) {
			excludedNoOffer += 1;
			continue;
		}
		const price = buildFeedPrice(matched.offer);
		if (!price) {
			excludedInvalidSalary += 1;
			continue;
		}
		pairs.push({ job, source: matched.source, offer: matched.offer, price });
	}

	return { pairs, stats: { excludedNonRub, excludedNoOffer, excludedInvalidSalary } };
};

const buildOfferDescription = (job: GeneratedJob): string =>
	[
		job.shortDescription,
		`График: ${job.details.schedule}.`,
		`Выплаты: ${job.details.payment_freq}.`,
		`Оформление: ${job.details.employment_type}.`,
	]
		.filter(Boolean)
		.join(' ');

const buildYandexOffer = (
	pair: FeedJobPair,
	setIds: string[],
	siteUrl: string,
): YandexFeedOffer => {
	const { job, price } = pair;
	const offerId = `v${job.id}`;
	const salaryMax = price.salaryMax ?? price.value;
	const params: YandexFeedOffer['params'] = [
		{ name: 'Конверсия', value: buildConversion(job, price) },
		{ name: 'Регион', value: job.location },
		{ name: 'Опубликовано', value: getPublishedIso(job.updatedAt) },
		{ name: 'График работы', value: getScheduleParam(job.details.schedule) },
		{ name: 'Тип занятости', value: getEmploymentParam(job) },
		{ name: 'Зарплата до', value: salaryMax },
		{ name: 'Сайт работодателя', value: job.applyLink.startsWith('https://') ? job.applyLink : absoluteUrl(getVacancyDetailPath(job), siteUrl) },
		{ name: 'Размещено кадровым агентством', value: false },
	];

	return {
		id: offerId,
		name: job.title,
		vendor: job.company,
		url: absoluteUrl(getVacancyDetailPath(job), siteUrl),
		price,
		currencyId: 'RUR',
		categoryId: getYandexCategoryId(job),
		setIds,
		picture: buildPictureUrl(job, offerId, siteUrl),
		description: buildOfferDescription(job),
		conversion: String(params[0]?.value ?? '1.00000'),
		params,
	};
};

export const buildYandexVacancyFeed = ({
	jobs = jobsData,
	sources = vacancySources,
	siteUrl = DEFAULT_SITE_URL,
	generatedAt = new Date(),
}: YandexVacancyFeedInput = {}): YandexVacancyFeed => {
	const normalizedSiteUrl = normalizeSiteUrl(siteUrl);
	const { pairs, stats } = buildPairs(jobs, sources);
	const feedJobs = pairs.map((pair) => pair.job);
	const buckets = buildSetBuckets(feedJobs, normalizedSiteUrl);
	const qualifiedBuckets = filterQualifiedSetBuckets(buckets, normalizedSiteUrl);
	const setIdsByJobSlug = buildOfferSetIds(qualifiedBuckets);
	const offers: YandexFeedOffer[] = [];
	let excludedNoSets = 0;

	for (const pair of pairs) {
		const setIds = setIdsByJobSlug.get(pair.job.slug) ?? [];
		if (setIds.length === 0) {
			excludedNoSets += 1;
			continue;
		}
		offers.push(buildYandexOffer(pair, setIds, normalizedSiteUrl));
	}

	const usedCategoryIds = new Set(offers.map((offer) => offer.categoryId));
	const categories = [
		...REQUIRED_CATEGORIES,
		...VACANCY_CATEGORIES.filter((category) => usedCategoryIds.has(category.id)),
	];
	const sets = [...qualifiedBuckets.values()]
		.map((bucket) => ({
			id: bucket.id,
			name: bucket.name,
			url: bucket.url,
			offerUrls: getBucketOfferUrls(bucket, normalizedSiteUrl)
				.filter((url) => offers.some((offer) => offer.url === url)),
		}))
		.filter((set) => set.offerUrls.length >= MIN_SET_OFFERS && hasEnoughUniqueBaseOfferUrls(set.offerUrls));

	return {
		generatedAt,
		siteUrl: normalizedSiteUrl,
		shop: {
			name: 'КурьерОк',
			company: 'КурьерОк',
			url: normalizedSiteUrl,
		},
		categories,
		sets,
		offers,
		stats: {
			sourceJobs: jobs.length,
			includedOffers: offers.length,
			excludedNoSets,
			...stats,
		},
	};
};

const renderCategory = (category: YandexFeedCategory): string => {
	const parent = category.parentId ? ` parentId="${escapeXml(category.parentId)}"` : '';
	return `      <category id="${escapeXml(category.id)}"${parent}>${escapeXml(category.name)}</category>`;
};

const renderSet = (set: YandexFeedSet): string => [
	`      <set id="${escapeXml(set.id)}">`,
	`        <name>${escapeXml(set.name)}</name>`,
	`        <url>${escapeXml(set.url)}</url>`,
	'      </set>',
].join('\n');

const renderOffer = (offer: YandexFeedOffer): string => {
	const priceFrom = offer.price.from ? ' from="true"' : '';
	const params = offer.params
		.map((param) => `        <param name="${escapeXml(param.name)}">${escapeXml(param.value)}</param>`)
		.join('\n');
	return [
		`      <offer id="${escapeXml(offer.id)}">`,
		`        <name>${escapeXml(offer.name)}</name>`,
		`        <vendor>${escapeXml(offer.vendor)}</vendor>`,
		`        <url>${escapeXml(offer.url)}</url>`,
		`        <price${priceFrom}>${escapeXml(offer.price.value)}</price>`,
		`        <currencyId>${escapeXml(offer.currencyId)}</currencyId>`,
		`        <sales_notes>${escapeXml(offer.price.salesNotes)}</sales_notes>`,
		`        <categoryId>${escapeXml(offer.categoryId)}</categoryId>`,
		`        <set-ids>${escapeXml(offer.setIds.join(','))}</set-ids>`,
		`        <picture>${escapeXml(offer.picture)}</picture>`,
		`        <description><![CDATA[${cdataSafeText(offer.description)}]]></description>`,
		params,
		'      </offer>',
	].join('\n');
};

const formatYmlDate = (date: Date): string => {
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone: YANDEX_FEED_TIME_ZONE,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		hourCycle: 'h23',
	}).formatToParts(date);
	const byType = new Map(parts.map((part) => [part.type, part.value]));

	return `${byType.get('year')}-${byType.get('month')}-${byType.get('day')} ${byType.get('hour')}:${byType.get('minute')}`;
};

export const renderYandexVacancyFeedXml = (feed: YandexVacancyFeed): string => [
	'<?xml version="1.0" encoding="utf-8" standalone="yes"?>',
	`<yml_catalog date="${escapeXml(formatYmlDate(feed.generatedAt))}">`,
	'  <shop>',
	`    <name>${escapeXml(feed.shop.name)}</name>`,
	`    <company>${escapeXml(feed.shop.company)}</company>`,
	`    <url>${escapeXml(feed.shop.url)}</url>`,
	'    <currencies>',
	'      <currency id="RUR" rate="1" />',
	'    </currencies>',
	'    <categories>',
	...feed.categories.map(renderCategory),
	'    </categories>',
	'    <sets>',
	...feed.sets.map(renderSet),
	'    </sets>',
	'    <offers>',
	...feed.offers.map(renderOffer),
	'    </offers>',
	'  </shop>',
	'</yml_catalog>',
	'',
].join('\n');

export const validateYandexVacancyFeed = (feed: YandexVacancyFeed): YandexFeedValidationResult => {
	const errors: string[] = [];
	const warnings: string[] = [];
	const setIds = new Set(feed.sets.map((set) => set.id));
	const offerUrls = new Set<string>();
	const pictureUrls = new Set<string>();

	if (feed.offers.length === 0) {
		errors.push('Feed contains no offers.');
	}
	if (feed.offers.length > MAX_OFFERS) {
		errors.push(`Feed contains ${feed.offers.length} offers; Yandex limit is ${MAX_OFFERS}.`);
	}
	for (const requiredId of [1, 2]) {
		if (!feed.categories.some((category) => category.id === requiredId)) {
			errors.push(`Required category ${requiredId} is missing.`);
		}
	}
	for (const set of feed.sets) {
		if (set.offerUrls.length < MIN_SET_OFFERS) {
			errors.push(`Set ${set.id} has ${set.offerUrls.length} offers; minimum is ${MIN_SET_OFFERS}.`);
		}
		const uniqueBaseOfferUrlCount = new Set(set.offerUrls.map(normalizeSetOfferUrl)).size;
		if (uniqueBaseOfferUrlCount < MIN_SET_OFFERS) {
			errors.push(`Set ${set.id} has ${uniqueBaseOfferUrlCount} unique base offer URLs; minimum is ${MIN_SET_OFFERS}.`);
		}
	}
	for (const offer of feed.offers) {
		const context = `offer ${offer.id}`;
		if (!offer.name) errors.push(`${context}: name is missing.`);
		if (!offer.vendor) errors.push(`${context}: vendor is missing.`);
		if (!offer.url) errors.push(`${context}: url is missing.`);
		if (!offer.picture) errors.push(`${context}: picture is missing.`);
		if (!offer.setIds.length) errors.push(`${context}: set-ids is empty.`);
		if (offer.price.value < MIN_PRICE || offer.price.value > MAX_PRICE) {
			errors.push(`${context}: price ${offer.price.value} is outside ${MIN_PRICE}..${MAX_PRICE}.`);
		}
		if (offer.currencyId !== 'RUR') {
			errors.push(`${context}: currencyId must be RUR.`);
		}
		if (!feed.categories.some((category) => category.id === offer.categoryId)) {
			errors.push(`${context}: categoryId ${offer.categoryId} is not declared.`);
		}
		for (const setId of offer.setIds) {
			if (!setIds.has(setId)) {
				errors.push(`${context}: references missing set ${setId}.`);
			}
		}
		if (offerUrls.has(offer.url)) {
			errors.push(`${context}: duplicate url ${offer.url}.`);
		}
		offerUrls.add(offer.url);
		if (pictureUrls.has(offer.picture)) {
			errors.push(`${context}: duplicate picture ${offer.picture}.`);
		}
		pictureUrls.add(offer.picture);
		const conversion = Number(offer.conversion);
		if (!Number.isFinite(conversion)) {
			errors.push(`${context}: conversion is not numeric.`);
		}
	}
	if (feed.stats.excludedNonRub > 0) {
		warnings.push(`Excluded ${feed.stats.excludedNonRub} non-RUB vacancies from the Russia/RUR feed.`);
	}
	if (feed.stats.excludedNoSets > 0) {
		warnings.push(`Excluded ${feed.stats.excludedNoSets} vacancies without a qualifying set.`);
	}

	return {
		ok: errors.length === 0,
		errors,
		warnings,
	};
};

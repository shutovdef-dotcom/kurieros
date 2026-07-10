import jobsData, { detailJobs as defaultDetailJobs } from '../data/jobs';
import { getCompanyHomepage } from '../data/companyHomepages';
import { vacancySources } from '../data/vacancies';
import type { GeneratedJob, VacancySource } from '../data/vacancyTypes';
import { slugifyCity } from './cities';
import {
	buildJobsByCityMap,
	getCityJobsFromMap,
} from './jobFilters';
import { getVacancyIndexability } from './vacancyIndexability';
import { getVacancyCanonicalPath, getVacancyDetailPath } from './vacancyUrl';
import {
	buildYandexVacancyFeed,
	validateYandexVacancyFeed,
	type YandexFeedOffer,
	type YandexFeedSet,
	type YandexFeedValidationResult,
	type YandexVacancyFeed,
} from './yandexVacancyFeed';

const DEFAULT_SITE_URL = 'https://kurerok.ru';
const MIN_SET_OFFERS = 5;
const MAX_SET_OFFERS = 24;
const MIN_SETS = 40;
const MAX_SETS = 50;
const MIN_SET_VENDORS = 3;
const MIN_SET_NAMES = 3;
const VISIBLE_LISTING_LIMIT = 24;
const STALE_REPORT_DAYS = 60;

export type YandexVacancyFeedPilotInput = {
	jobs?: GeneratedJob[];
	detailJobs?: GeneratedJob[];
	sources?: VacancySource[];
	siteUrl?: string;
	generatedAt?: Date;
	maxSets?: number;
};

export type YandexFeedDuplicateName = {
	vendor: string;
	name: string;
	count: number;
	urls: string[];
};

export type YandexFeedReasonReport = {
	sourceRows: number;
	normalizedUniquePages: number;
	indexablePages: number;
	includedOffers: number;
	qualifiedSets: number;
	nonCanonicalSourceRows: number;
	exclusionsByReason: {
		duplicateCanonical: number;
		nonRub: number;
		missingSourceOffer: number;
		invalidSalary: number;
		nonIndexableLanding: number;
		duplicateOfferName: number;
		notVisibleInInitialHtml: number;
		notInQualifiedSet: number;
	};
	duplicateNames: YandexFeedDuplicateName[];
	duplicateSetCompositions: string[][];
	duplicateExactPictures: number;
	physicalPictures: number;
	staleOffers: number;
};

export type YandexVacancyFeedPilot = YandexVacancyFeed & {
	report: YandexFeedReasonReport;
};

type PilotCandidate = {
	job: GeneratedJob;
	offer: YandexFeedOffer;
};

type PilotSetCandidate = {
	id: string;
	name: string;
	url: string;
	candidates: PilotCandidate[];
};

const normalizeSiteUrl = (siteUrl: string): string => siteUrl.replace(/\/+$/, '');

const absoluteUrl = (pathOrUrl: string, siteUrl: string): string =>
	new URL(pathOrUrl, `${normalizeSiteUrl(siteUrl)}/`).toString();

const normalizeName = (value: string): string =>
	value.trim().toLocaleLowerCase('ru-RU').replace(/\s+/g, ' ');

const canonicalOfferUrl = (job: GeneratedJob, siteUrl: string): string =>
	absoluteUrl(getVacancyCanonicalPath(job), siteUrl);

const getCities = (jobs: GeneratedJob[]): string[] => {
	const cities = new Set<string>();
	for (const job of jobs) {
		for (const rawCity of job.location.split(',')) {
			const city = rawCity.trim();
			if (city && city !== 'Вся Россия') cities.add(city);
		}
	}
	return [...cities].sort((a, b) => a.localeCompare(b, 'ru'));
};

const duplicateSetCompositions = (sets: YandexFeedSet[]): string[][] => {
	const byComposition = new Map<string, string[]>();
	for (const set of sets) {
		const key = [...set.offerUrls].sort().join('\n');
		byComposition.set(key, [...(byComposition.get(key) ?? []), set.id]);
	}
	return [...byComposition.values()].filter((setIds) => setIds.length > 1);
};

const physicalPictureUrl = (pictureUrl: string): string => {
	try {
		const url = new URL(pictureUrl);
		url.search = '';
		url.hash = '';
		return url.toString();
	} catch {
		return pictureUrl.split(/[?#]/, 1)[0] ?? pictureUrl;
	}
};

const withOfficialEmployerSite = (offer: YandexFeedOffer): YandexFeedOffer => {
	const officialHomepage = getCompanyHomepage(offer.vendor);
	const params = offer.params.filter((param) => param.name !== 'Сайт работодателя');
	return {
		...offer,
		params: officialHomepage
			? [...params, { name: 'Сайт работодателя', value: officialHomepage }]
			: params,
	};
};

const duplicateNameGroups = (
	candidates: PilotCandidate[],
	siteUrl: string,
): {
	duplicateKeys: Set<string>;
	report: YandexFeedDuplicateName[];
} => {
	const groups = new Map<string, PilotCandidate[]>();
	for (const candidate of candidates) {
		const key = `${normalizeName(candidate.offer.vendor)}\u0000${normalizeName(candidate.offer.name)}`;
		groups.set(key, [...(groups.get(key) ?? []), candidate]);
	}
	const duplicates = [...groups].filter(([, grouped]) => grouped.length > 1);
	return {
		duplicateKeys: new Set(duplicates.map(([key]) => key)),
		report: duplicates
			.map(([, grouped]) => ({
				vendor: grouped[0]!.offer.vendor,
				name: grouped[0]!.offer.name,
				count: grouped.length,
				urls: grouped.map(({ job }) => canonicalOfferUrl(job, siteUrl)),
			}))
			.sort((a, b) => b.count - a.count || a.vendor.localeCompare(b.vendor, 'ru')),
	};
};

/**
 * Build a deliberately small, reviewable feed candidate.
 *
 * The public `/yandex-vacancies.xml` route intentionally does not call this
 * function. A production switch requires owner approval after manual sample
 * moderation. The candidate starts from canonical detail jobs and intersects
 * them with the first 24 cards rendered in each city landing's main HTML.
 */
export const buildYandexVacancyFeedPilot = ({
	jobs = jobsData,
	detailJobs = defaultDetailJobs,
	sources = vacancySources,
	siteUrl = DEFAULT_SITE_URL,
	generatedAt = new Date(),
	maxSets = MAX_SETS,
}: YandexVacancyFeedPilotInput = {}): YandexVacancyFeedPilot => {
	const normalizedSiteUrl = normalizeSiteUrl(siteUrl);
	const detailJobByPath = new Map<string, GeneratedJob>();
	for (const job of detailJobs) {
		const path = getVacancyCanonicalPath(job);
		if (!detailJobByPath.has(path)) detailJobByPath.set(path, job);
	}
	const canonicalDetailJobs = [...detailJobByPath.values()];
	const canonicalFeed = buildYandexVacancyFeed({
		jobs: canonicalDetailJobs,
		sources,
		siteUrl: normalizedSiteUrl,
		generatedAt,
	});
	const offerByUrl = new Map(canonicalFeed.offers.map((offer) => [offer.url, offer]));
	const feedCandidates = canonicalDetailJobs
		.map((job): PilotCandidate | null => {
			const offer = offerByUrl.get(canonicalOfferUrl(job, normalizedSiteUrl));
			return offer ? { job, offer } : null;
		})
		.filter((candidate): candidate is PilotCandidate => Boolean(candidate));
	const indexableCandidates = feedCandidates.filter(({ job }) =>
		getVacancyIndexability(job).indexable,
	);
	const nonIndexableLanding = feedCandidates.length - indexableCandidates.length;
	const { duplicateKeys, report: duplicateNames } = duplicateNameGroups(
		indexableCandidates,
		normalizedSiteUrl,
	);
	const nameUniqueCandidates = indexableCandidates.filter(({ offer }) => {
		const key = `${normalizeName(offer.vendor)}\u0000${normalizeName(offer.name)}`;
		return !duplicateKeys.has(key);
	});
	const candidateByPath = new Map(
		nameUniqueCandidates.map((candidate) => [getVacancyCanonicalPath(candidate.job), candidate]),
	);

	const jobsByCity = buildJobsByCityMap(jobs);
	const visibleCanonicalPaths = new Set<string>();
	const qualifiedSetById = new Map<string, PilotSetCandidate>();
	for (const city of getCities(jobs)) {
		const visiblePaths = Array.from(new Set(
			getCityJobsFromMap(jobsByCity, city)
				.slice(0, VISIBLE_LISTING_LIMIT)
				.map((job) => getVacancyCanonicalPath(job)),
		));
		for (const path of visiblePaths) visibleCanonicalPaths.add(path);
		const candidates = visiblePaths
			.map((path) => candidateByPath.get(path))
			.filter((candidate): candidate is PilotCandidate => Boolean(candidate));
		const vendors = new Set(candidates.map(({ offer }) => normalizeName(offer.vendor)));
		const names = new Set(candidates.map(({ offer }) => normalizeName(offer.name)));
		if (
			candidates.length < MIN_SET_OFFERS ||
			candidates.length > MAX_SET_OFFERS ||
			vendors.size < MIN_SET_VENDORS ||
			names.size < MIN_SET_NAMES
		) {
			continue;
		}
		const citySlug = slugifyCity(city);
		const set: PilotSetCandidate = {
			id: `city-${citySlug}`,
			name: `Работа курьером ${city}`,
			url: absoluteUrl(`/rabota-kurerom-${citySlug}/`, normalizedSiteUrl),
			candidates,
		};
		const existing = qualifiedSetById.get(set.id);
		if (!existing || set.candidates.length > existing.candidates.length) {
			qualifiedSetById.set(set.id, set);
		}
	}

	const setLimit = Number.isFinite(maxSets)
		? Math.max(0, Math.min(MAX_SETS, Math.floor(maxSets)))
		: MAX_SETS;
	const selectedSets = [...qualifiedSetById.values()]
		.sort((a, b) => b.candidates.length - a.candidates.length || a.id.localeCompare(b.id))
		.slice(0, setLimit);
	const setIdsByOfferUrl = new Map<string, string[]>();
	for (const set of selectedSets) {
		for (const { job } of set.candidates) {
			const url = canonicalOfferUrl(job, normalizedSiteUrl);
			setIdsByOfferUrl.set(url, [...(setIdsByOfferUrl.get(url) ?? []), set.id]);
		}
	}
	const offers = nameUniqueCandidates
		.filter(({ job }) => setIdsByOfferUrl.has(canonicalOfferUrl(job, normalizedSiteUrl)))
		.map(({ job, offer }) => withOfficialEmployerSite({
			...offer,
			url: canonicalOfferUrl(job, normalizedSiteUrl),
			setIds: setIdsByOfferUrl.get(canonicalOfferUrl(job, normalizedSiteUrl))!,
		}));
	const includedUrls = new Set(offers.map((offer) => offer.url));
	const sets: YandexFeedSet[] = selectedSets.map((set) => ({
		id: set.id,
		name: set.name,
		url: set.url,
		offerUrls: set.candidates
			.map(({ job }) => canonicalOfferUrl(job, normalizedSiteUrl))
			.filter((url) => includedUrls.has(url)),
	}));
	const usedCategoryIds = new Set(offers.map((offer) => offer.categoryId));
	const categories = canonicalFeed.categories.filter((category) =>
		category.id === 1 || category.id === 2 || usedCategoryIds.has(category.id),
	);

	const duplicateOfferName = duplicateNames.reduce((sum, group) => sum + group.count, 0);
	const notVisibleInInitialHtml = nameUniqueCandidates.filter(({ job }) =>
		!visibleCanonicalPaths.has(getVacancyCanonicalPath(job)),
	).length;
	const notInQualifiedSet = nameUniqueCandidates.filter(({ job }) => {
		const path = getVacancyCanonicalPath(job);
		return visibleCanonicalPaths.has(path) && !includedUrls.has(canonicalOfferUrl(job, normalizedSiteUrl));
	}).length;
	const staleCutoff = generatedAt.getTime() - STALE_REPORT_DAYS * 24 * 60 * 60 * 1_000;
	const staleOffers = indexableCandidates.filter(({ job }) => {
		const updatedAt = new Date(job.updatedAt).getTime();
		return !Number.isFinite(updatedAt) || updatedAt < staleCutoff;
	}).length;
	const pictures = offers.map((offer) => offer.picture);
	const duplicateCanonical = Math.max(0, jobs.length - detailJobByPath.size);

	return {
		generatedAt,
		siteUrl: normalizedSiteUrl,
		shop: canonicalFeed.shop,
		categories,
		sets,
		offers,
		stats: {
			sourceJobs: jobs.length,
			includedOffers: offers.length,
			excludedNonRub: canonicalFeed.stats.excludedNonRub,
			excludedNoOffer: canonicalFeed.stats.excludedNoOffer,
			excludedInvalidSalary: canonicalFeed.stats.excludedInvalidSalary,
			excludedNoSets: indexableCandidates.length - offers.length,
		},
		report: {
			sourceRows: jobs.length,
			normalizedUniquePages: detailJobByPath.size,
			indexablePages: indexableCandidates.length,
			includedOffers: offers.length,
			qualifiedSets: sets.length,
			nonCanonicalSourceRows: jobs.filter(
				(job) => getVacancyDetailPath(job) !== getVacancyCanonicalPath(job),
			).length,
			exclusionsByReason: {
				duplicateCanonical,
				nonRub: canonicalFeed.stats.excludedNonRub,
				missingSourceOffer: canonicalFeed.stats.excludedNoOffer,
				invalidSalary: canonicalFeed.stats.excludedInvalidSalary,
				nonIndexableLanding,
				duplicateOfferName,
				notVisibleInInitialHtml,
				notInQualifiedSet,
			},
			duplicateNames,
			duplicateSetCompositions: duplicateSetCompositions(sets),
			duplicateExactPictures: pictures.length - new Set(pictures).size,
			physicalPictures: new Set(pictures.map(physicalPictureUrl)).size,
			staleOffers,
		},
	};
};

export const validateYandexVacancyFeedPilot = (
	feed: YandexVacancyFeedPilot,
): YandexFeedValidationResult => {
	const baseValidation = validateYandexVacancyFeed(feed);
	const errors = [...baseValidation.errors];
	const warnings = [...baseValidation.warnings];
	const indexableCanonicalPaths = new Set(
		defaultDetailJobs
			.filter((job) => getVacancyIndexability(job).indexable)
			.map((job) => getVacancyCanonicalPath(job)),
	);
	const offerByUrl = new Map(feed.offers.map((offer) => [offer.url, offer]));

	if (feed.sets.length < MIN_SETS || feed.sets.length > MAX_SETS) {
		errors.push(`Pilot has ${feed.sets.length} sets; expected ${MIN_SETS}..${MAX_SETS}.`);
	}
	for (const set of feed.sets) {
		if (!set.id.startsWith('city-')) errors.push(`Pilot set ${set.id} is not a city set.`);
		if (set.offerUrls.length < MIN_SET_OFFERS || set.offerUrls.length > MAX_SET_OFFERS) {
			errors.push(
				`Pilot set ${set.id} has ${set.offerUrls.length} offers; expected ${MIN_SET_OFFERS}..${MAX_SET_OFFERS}.`,
			);
		}
		if (new Set(set.offerUrls).size !== set.offerUrls.length) {
			errors.push(`Pilot set ${set.id} contains duplicate offer URLs.`);
		}
		const setOffers = set.offerUrls
			.map((url) => offerByUrl.get(url))
			.filter((offer): offer is YandexFeedOffer => Boolean(offer));
		if (setOffers.length !== set.offerUrls.length) {
			errors.push(`Pilot set ${set.id} references an offer URL missing from the feed.`);
		}
		if (new Set(setOffers.map((offer) => normalizeName(offer.vendor))).size < MIN_SET_VENDORS) {
			errors.push(`Pilot set ${set.id} has insufficient employer diversity.`);
		}
		if (new Set(setOffers.map((offer) => normalizeName(offer.name))).size < MIN_SET_NAMES) {
			errors.push(`Pilot set ${set.id} has insufficient vacancy-name diversity.`);
		}
		for (const offer of setOffers) {
			if (!offer.setIds.includes(set.id)) {
				errors.push(`Pilot offer ${offer.id} does not reference containing set ${set.id}.`);
			}
		}
	}

	const seenNames = new Set<string>();
	const siteOrigin = new URL(feed.siteUrl).origin;
	for (const offer of feed.offers) {
		let parsedUrl: URL | null = null;
		try {
			parsedUrl = new URL(offer.url);
		} catch {
			errors.push(`Pilot offer ${offer.id} has an invalid canonical URL ${offer.url}.`);
		}
		if (parsedUrl) {
			const isCleanVacancyPath = /^\/v\/[^/]+\/$/.test(parsedUrl.pathname);
			if (parsedUrl.origin !== siteOrigin || parsedUrl.hash || parsedUrl.search || !isCleanVacancyPath) {
				errors.push(
					`Pilot offer ${offer.id} must use a clean canonical URL without query or hash: ${offer.url}.`,
				);
			}
			if (!indexableCanonicalPaths.has(parsedUrl.pathname)) {
				errors.push(`Pilot offer ${offer.id} points to a non-indexable landing: ${offer.url}.`);
			}
		}

		const nameKey = `${normalizeName(offer.vendor)}\u0000${normalizeName(offer.name)}`;
		if (seenNames.has(nameKey)) {
			errors.push(`Pilot offer ${offer.id} duplicates vacancy name for ${offer.vendor}: ${offer.name}.`);
		}
		seenNames.add(nameKey);

		const employerSites = offer.params.filter((param) => param.name === 'Сайт работодателя');
		if (employerSites.length > 1) {
			errors.push(`Pilot offer ${offer.id} has more than one employer-site parameter.`);
		}
		const employerSite = employerSites[0]?.value;
		const verifiedHomepage = getCompanyHomepage(offer.vendor);
		if (employerSite !== undefined && employerSite !== verifiedHomepage) {
			errors.push(
				`Pilot offer ${offer.id} employer site is not the verified official homepage for ${offer.vendor}.`,
			);
		}
		for (const setId of offer.setIds) {
			const set = feed.sets.find((candidate) => candidate.id === setId);
			if (set && !set.offerUrls.includes(offer.url)) {
				errors.push(`Pilot offer ${offer.id} is absent from referenced set ${setId}.`);
			}
		}
	}

	const repeatedCompositions = duplicateSetCompositions(feed.sets);
	if (repeatedCompositions.length > 0) {
		errors.push(`Pilot contains ${repeatedCompositions.length} duplicate set compositions.`);
	}
	if (feed.report.includedOffers !== feed.offers.length) {
		errors.push('Pilot reason report includedOffers does not match the emitted offer count.');
	}
	if (feed.report.qualifiedSets !== feed.sets.length) {
		errors.push('Pilot reason report qualifiedSets does not match the emitted set count.');
	}
	if (feed.report.staleOffers > 0) {
		warnings.push(`Pilot has ${feed.report.staleOffers} offers pending source freshness recheck.`);
	}

	return { ok: errors.length === 0, errors, warnings };
};

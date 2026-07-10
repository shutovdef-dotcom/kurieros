import { describe, expect, it } from 'vitest';
import jobsData, { detailJobs } from '../src/data/jobs';
import { getCompanyHomepage } from '../src/data/companyHomepages';
import { slugifyCity } from '../src/utils/cities';
import {
	buildJobsByCityMap,
	getCityJobsFromMap,
} from '../src/utils/jobFilters';
import { getVacancyIndexability } from '../src/utils/vacancyIndexability';
import { getVacancyCanonicalPath } from '../src/utils/vacancyUrl';
import {
	buildYandexVacancyFeedPilot,
	validateYandexVacancyFeedPilot,
} from '../src/utils/yandexVacancyFeedPilot';

const siteUrl = 'https://kurerok.ru';
const pilot = buildYandexVacancyFeedPilot({
	siteUrl,
	generatedAt: new Date('2026-07-10T12:00:00+03:00'),
});

const normalizedUrl = (value: string): string => {
	const url = new URL(value);
	url.hash = '';
	return url.toString();
};

const detailJobByUrl = new Map(
	detailJobs.map((job) => [
		new URL(getVacancyCanonicalPath(job), siteUrl).toString(),
		job,
	]),
);

const visibleCanonicalUrlsByCitySlug = (() => {
	const jobsByCity = buildJobsByCityMap(jobsData);
	return new Map(
		[...jobsByCity.keys()].map((city) => [
			slugifyCity(city),
			new Set(
				getCityJobsFromMap(jobsByCity, city)
					.slice(0, 24)
					.map((job) => new URL(getVacancyCanonicalPath(job), siteUrl).toString()),
			),
		]),
	);
})();

describe('Yandex vacancy feed pilot', () => {
	it('builds a bounded city-only pilot from unique canonical indexable detail pages', () => {
		const validation = validateYandexVacancyFeedPilot(pilot, { mode: 'structure' });
		const offerUrls = pilot.offers.map((offer) => offer.url);

		expect(validation.errors).toEqual([]);
		expect(pilot.sets.length).toBeGreaterThanOrEqual(40);
		expect(pilot.sets.length).toBeLessThanOrEqual(60);
		expect(new Set(offerUrls).size).toBe(offerUrls.length);
		expect(pilot.report.includedOffers).toBe(pilot.offers.length);
		expect(pilot.report.qualifiedSets).toBe(pilot.sets.length);

		for (const offer of pilot.offers) {
			expect(offer.url).toBe(normalizedUrl(offer.url));
			expect(new URL(offer.url).hash).toBe('');
			const detailJob = detailJobByUrl.get(offer.url);
			expect(detailJob, offer.url).toBeDefined();
			expect(getVacancyIndexability(detailJob!).indexable, offer.url).toBe(true);
		}
	});

	it('uses sourceCheckedAt and blocks publication while any emitted offer is stale', () => {
		const staleCutoff = new Date('2026-07-10T12:00:00+03:00').getTime() -
			60 * 24 * 60 * 60 * 1_000;
		const expectedStaleOffers = pilot.offers.filter((offer) => {
			const sourceCheckedAt = detailJobByUrl.get(offer.url)?.sourceCheckedAt;
			const checkedAt = Date.parse(sourceCheckedAt ?? '');
			return !Number.isFinite(checkedAt) || checkedAt < staleCutoff;
		}).length;

		expect(expectedStaleOffers).toBeGreaterThan(0);
		expect(pilot.report.staleOffers).toBe(expectedStaleOffers);

		const publicationValidation = validateYandexVacancyFeedPilot(pilot);
		expect(publicationValidation.ok).toBe(false);
		expect(publicationValidation.errors).toEqual(
			expect.arrayContaining([expect.stringContaining('publication blocked')]),
		);
	});

	it('keeps every set within the pilot bounds, diverse, and visible in the landing HTML batch', () => {
		const offerByUrl = new Map(pilot.offers.map((offer) => [offer.url, offer]));

		for (const set of pilot.sets) {
			expect(set.id).toMatch(/^city-/);
			expect(set.offerUrls.length, set.id).toBeGreaterThanOrEqual(5);
			expect(set.offerUrls.length, set.id).toBeLessThanOrEqual(24);

			const offers = set.offerUrls.map((url) => offerByUrl.get(url));
			expect(offers.every(Boolean), set.id).toBe(true);
			expect(new Set(offers.map((offer) => offer!.vendor)).size, set.id).toBeGreaterThanOrEqual(3);
			expect(new Set(offers.map((offer) => offer!.name)).size, set.id).toBeGreaterThanOrEqual(3);

			const citySlug = set.id.replace(/^city-/, '');
			const visibleUrls = visibleCanonicalUrlsByCitySlug.get(citySlug);
			expect(visibleUrls, set.id).toBeDefined();
			for (const offerUrl of set.offerUrls) {
				expect(visibleUrls!.has(offerUrl), `${set.id}: ${offerUrl}`).toBe(true);
			}
		}
	});

	it('uses only verified official employer homepages and never an apply/tracking URL', () => {
		for (const offer of pilot.offers) {
			const employerSite = offer.params.find(
				(param) => param.name === 'Сайт работодателя',
			)?.value;
			const verifiedHomepage = getCompanyHomepage(offer.vendor);

			if (verifiedHomepage) {
				expect(employerSite, offer.id).toBe(verifiedHomepage);
			} else {
				expect(employerSite, offer.id).toBeUndefined();
			}
		}
	});

	it('reports canonical dedupe and all material exclusion gates', () => {
		expect(pilot.report.sourceRows).toBe(jobsData.length);
		expect(pilot.report.normalizedUniquePages).toBe(detailJobs.length);
		expect(pilot.report.indexablePages).toBeGreaterThan(pilot.offers.length);
		expect(pilot.report.exclusionsByReason.duplicateCanonical).toBeGreaterThan(0);
		expect(pilot.report.exclusionsByReason.nonIndexableLanding).toBeGreaterThan(0);
		expect(pilot.report.exclusionsByReason.duplicateOfferName).toBeGreaterThan(0);
		expect(pilot.report.exclusionsByReason.notInQualifiedSet).toBeGreaterThan(0);
		expect(pilot.report.duplicateNames).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ vendor: 'Т-Банк', count: expect.any(Number) }),
			]),
		);
	});

	it('rejects a pilot that regresses to a hash URL, noindex landing, or tracking employer site', () => {
		const badOffer = pilot.offers[0];
		const noindexJob = detailJobs.find((job) => !getVacancyIndexability(job).indexable);
		expect(badOffer).toBeDefined();
		expect(noindexJob).toBeDefined();

		const hashFeed = structuredClone(pilot);
		hashFeed.offers[0]!.url = `${badOffer!.url}#variant`;
		expect(validateYandexVacancyFeedPilot(hashFeed).errors).toEqual(
			expect.arrayContaining([expect.stringContaining('canonical URL')]),
		);

		const noindexFeed = structuredClone(pilot);
		noindexFeed.offers[0]!.url = new URL(
			getVacancyCanonicalPath(noindexJob!),
			siteUrl,
		).toString();
		expect(validateYandexVacancyFeedPilot(noindexFeed).errors).toEqual(
			expect.arrayContaining([expect.stringContaining('non-indexable landing')]),
		);

		const trackingFeed = structuredClone(pilot);
		const employerSite = trackingFeed.offers[0]!.params.find(
			(param) => param.name === 'Сайт работодателя',
		);
		expect(employerSite).toBeDefined();
		employerSite!.value = 'https://trk.ppdu.ru/click/fake';
		expect(validateYandexVacancyFeedPilot(trackingFeed).errors).toEqual(
			expect.arrayContaining([expect.stringContaining('verified official homepage')]),
		);
	});
});

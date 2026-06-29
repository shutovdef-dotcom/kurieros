import { describe, expect, it } from 'vitest';
import {
	buildYandexVacancyFeed,
	renderYandexVacancyFeedXml,
	validateYandexVacancyFeed,
	YANDEX_VACANCY_FEED_PATH,
} from '../src/utils/yandexVacancyFeed';

const feed = buildYandexVacancyFeed({
	siteUrl: 'https://kurerok.ru',
	generatedAt: new Date('2026-06-19T09:00:00+03:00'),
});

describe('Yandex vacancy feed', () => {
	it('builds a valid non-empty feed for Webmaster vacancies', () => {
		const validation = validateYandexVacancyFeed(feed);
		expect(validation.errors).toEqual([]);
		expect(feed.offers.length).toBeGreaterThan(1_000);
		expect(feed.sets.length).toBeGreaterThan(100);
	});

	it('declares required Yandex vacancy categories and uses only declared category IDs', () => {
		expect(feed.categories).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ id: 1, name: 'Вакансия' }),
				expect.objectContaining({ id: 2, name: 'Работодатель' }),
			]),
		);
		const categoryIds = new Set(feed.categories.map((category) => category.id));
		for (const offer of feed.offers) {
			expect(categoryIds.has(offer.categoryId), `category for ${offer.id}`).toBe(true);
		}
	});

	it('keeps offer URLs and picture URLs unique', () => {
		const offerUrls = feed.offers.map((offer) => offer.url);
		const pictureUrls = feed.offers.map((offer) => offer.picture);
		expect(new Set(offerUrls).size).toBe(offerUrls.length);
		expect(new Set(pictureUrls).size).toBe(pictureUrls.length);
	});

	it('uses RUR salary values in the Yandex-supported range', () => {
		for (const offer of feed.offers) {
			expect(offer.currencyId).toBe('RUR');
			expect(offer.price.value, `price for ${offer.id}`).toBeGreaterThanOrEqual(1_000);
			expect(offer.price.value, `price for ${offer.id}`).toBeLessThanOrEqual(1_000_000);
		}
	});

	it('renders XML with sets, offers, and the public route path', () => {
		const xml = renderYandexVacancyFeedXml(feed);
		expect(YANDEX_VACANCY_FEED_PATH).toBe('/yandex-vacancies.xml');
		expect(xml.slice(0, 120)).toContain('<yml_catalog date="2026-06-19 09:00">');
		expect(xml).toContain('<sets>');
		expect(xml).toContain('<offers>');
		expect(xml).toContain('<currency id="RUR" rate="1" />');
		expect(xml).not.toContain('<![CDATA[]]>');
	});

	it('rejects sets that only meet the offer minimum through same-page hash fragments', () => {
		const validation = validateYandexVacancyFeed({
			...feed,
			sets: [
				{
					id: 'city-anchor-only',
					name: 'Работа курьером Тестоград',
					url: 'https://kurerok.ru/rabota-kurerom-testograd/',
					offerUrls: [
						'https://kurerok.ru/v/tetrika-tutor-testograd-foot/#subject-math',
						'https://kurerok.ru/v/tetrika-tutor-testograd-foot/#subject-russian',
						'https://kurerok.ru/v/tetrika-tutor-testograd-foot/#subject-english',
					],
				},
			],
			offers: [
				{
					...feed.offers[0],
					id: 'anchor-1',
					url: 'https://kurerok.ru/v/tetrika-tutor-testograd-foot/#subject-math',
					picture: 'https://kurerok.ru/logo.svg?test=anchor-1',
					setIds: ['city-anchor-only'],
				},
				{
					...feed.offers[0],
					id: 'anchor-2',
					url: 'https://kurerok.ru/v/tetrika-tutor-testograd-foot/#subject-russian',
					picture: 'https://kurerok.ru/logo.svg?test=anchor-2',
					setIds: ['city-anchor-only'],
				},
				{
					...feed.offers[0],
					id: 'anchor-3',
					url: 'https://kurerok.ru/v/tetrika-tutor-testograd-foot/#subject-english',
					picture: 'https://kurerok.ru/logo.svg?test=anchor-3',
					setIds: ['city-anchor-only'],
				},
			],
			stats: {
				...feed.stats,
				includedOffers: 3,
			},
		});

		expect(validation.errors).toContain(
			'Set city-anchor-only has 1 unique base offer URLs; minimum is 3.',
		);
	});
});

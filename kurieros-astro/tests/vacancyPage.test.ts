import { describe, expect, it } from 'vitest';
import type { VacancyOffer, VacancySource } from '../src/data/vacancyTypes';
import { applyHourlyJitter } from '../src/utils/fnv1a';
import {
	buildVacancyCalculatorModel,
	computeFallbackHourlyRate,
	parseAmountFromText,
	parseHourlyRateFromRateText,
	parseSalaryValue,
	resolveHourlyRate,
	selectTopN,
} from '../src/utils/vacancyPage';

const baseOffer: VacancyOffer = {
	city: 'Москва',
	transport: 'foot',
	pay: {
		currency: 'RUB',
		paymentFrequency: 'еженедельно',
		hourly: { text: 'от 350 ₽/час' },
	},
	isActive: true,
	updatedAt: '2026-06-01',
	salaryConfidence: 'official',
};

const sourceWithOffers = (offers: VacancyOffer[]): Pick<VacancySource, 'offers'> => ({ offers });
const sourceWithCalculator = (
	offers: VacancyOffer[],
	incomeCalculator: VacancySource['incomeCalculator'],
	slug = 'test-source',
): Pick<VacancySource, 'offers' | 'incomeCalculator' | 'slug'> => ({
	slug,
	offers,
	incomeCalculator,
});

const buildMonthlyOffer = (monthly: VacancyOffer['pay']['monthly']): VacancyOffer => ({
	...baseOffer,
	pay: {
		currency: 'RUB',
		paymentFrequency: '2 раза в месяц',
		monthly,
		rate: monthly?.text,
	},
});

describe('vacancy page money helpers', () => {
	it('keeps the legacy salary parser behavior used for sorting', () => {
		expect(parseSalaryValue('до 298 800 ₽/мес')).toBe(298800);
		expect(parseSalaryValue('60 000–90 000 ₽/мес')).toBe(6000090000);
		expect(parseSalaryValue('по договоренности')).toBe(0);
	});

	it('extracts the first positive amount from human text', () => {
		expect(parseAmountFromText('от 450 ₽/час')).toBe(450);
		expect(parseAmountFromText('до 2 160 ₽ за смену')).toBe(2160);
		expect(parseAmountFromText('')).toBeNull();
		expect(parseAmountFromText('без ставки')).toBeNull();
	});

	it('parses hourly rates only when an hourly unit is present', () => {
		expect(parseHourlyRateFromRateText('от 420 ₽/час')).toBe(420);
		expect(parseHourlyRateFromRateText('420 ₽ за смену')).toBeNull();
		expect(parseHourlyRateFromRateText('2 160 ₽ за 12 часов')).toBeNull();
		expect(parseHourlyRateFromRateText('от 390 ₽/hour')).toBe(390);
		expect(parseHourlyRateFromRateText('от 450 ₽ в час')).toBe(450);
		expect(parseHourlyRateFromRateText('1 985 ₸/ч')).toBe(1985);
		expect(parseHourlyRateFromRateText('1 985 KZT за час')).toBe(1985);
		expect(parseHourlyRateFromRateText('215 сом/час')).toBe(215);
		expect(parseHourlyRateFromRateText('7 BYN/час')).toBe(7);
	});

	it('resolves hourly rate from max, then min, then text', () => {
		expect(resolveHourlyRate({ ...baseOffer, pay: { ...baseOffer.pay, hourly: { text: 'от 350 ₽/час', min: 300, max: 450 } } })).toBe(450);
		expect(resolveHourlyRate({ ...baseOffer, pay: { ...baseOffer.pay, hourly: { text: 'от 350 ₽/час', min: 300 } } })).toBe(300);
		expect(resolveHourlyRate(baseOffer)).toBe(350);
		expect(resolveHourlyRate(undefined)).toBeNull();
	});

	it('computes fallback hourly rate from the best active offer in the same city', () => {
		const slug = 'ozon-courier-msk';
		const sources = [
			sourceWithOffers([
				{ ...baseOffer, city: 'Москва', pay: { ...baseOffer.pay, hourly: { text: 'от 350 ₽/час', max: 520 } } },
				{ ...baseOffer, city: 'Москва', isActive: false, pay: { ...baseOffer.pay, hourly: { text: 'от 900 ₽/час', max: 900 } } },
				{ ...baseOffer, city: 'Санкт-Петербург', pay: { ...baseOffer.pay, hourly: { text: 'от 700 ₽/час', max: 700 } } },
			]),
			sourceWithOffers([
				{ ...baseOffer, city: 'Москва', pay: { ...baseOffer.pay, hourly: { text: 'от 610 ₽/час' } } },
			]),
		];

		expect(computeFallbackHourlyRate(sources, 'Москва', slug)).toBe(applyHourlyJitter(610, slug));
		expect(computeFallbackHourlyRate(sources, 'Казань', slug)).toBeNull();
	});

	it('keeps fallback hourly benchmarks inside the requested currency', () => {
		const slug = 'yandex-go-almaty-foot';
		const sources = [
			sourceWithOffers([
				{ ...baseOffer, city: 'Алматы', pay: { ...baseOffer.pay, hourly: { text: 'от 900 ₽/час', max: 900 } } },
				{
					...baseOffer,
					city: 'Алматы',
					pay: {
						...baseOffer.pay,
						currency: 'KZT',
						hourly: { text: 'от 1 985 ₸/час', max: 1985 },
					},
				},
			]),
		];

		expect(computeFallbackHourlyRate(sources, 'Алматы', slug, 'KZT')).toBe(applyHourlyJitter(1985, slug));
		expect(computeFallbackHourlyRate(sources, 'Алматы', slug, 'BYN')).toBeNull();
	});
});

describe('buildVacancyCalculatorModel', () => {
	it('keeps an exact hourly calculator for sources with published hourly pay', () => {
		const offer = {
			...baseOffer,
			pay: {
				...baseOffer.pay,
				hourly: { min: 300, max: 450, text: '300–450 ₽/час' },
			},
		};
		const source = sourceWithCalculator([offer], { mode: 'hourly' });

		const model = buildVacancyCalculatorModel({
			source,
			offer,
			sources: [source],
			city: 'Москва',
			slug: 'yandex-eda-courier-moskva-foot',
			rateText: offer.pay.rate ?? '',
		});

		expect(model).toMatchObject({
			kind: 'hourly',
			hourlyRate: 450,
			formattedHourlyRate: '450 ₽/час',
			isEstimated: false,
			rateBasis: 'source_hourly',
			rateLabel: 'Ставка в этой вакансии',
			totalMonthly: 79200,
		});
	});

	it('formats exact hourly calculators in the offer currency', () => {
		const offer: VacancyOffer = {
			...baseOffer,
			city: 'Алматы',
			pay: {
				...baseOffer.pay,
				currency: 'KZT',
				hourly: { min: 1985, max: 1985, text: '1 985 ₸/час' },
			},
		};
		const source = sourceWithCalculator([offer], { mode: 'hourly' }, 'yandex-go-kz-courier');

		const model = buildVacancyCalculatorModel({
			source,
			offer,
			sources: [source],
			city: 'Алматы',
			slug: 'yandex-go-kz-courier-almaty-foot',
			rateText: offer.pay.rate ?? '',
		});

		expect(model).toMatchObject({
			kind: 'hourly',
			hourlyRate: 1985,
			formattedHourlyRate: '1 985 ₸/час',
			totalMonthly: 349360,
		});
	});

	it('marks Ozon-style hourly fallback as an estimated city benchmark', () => {
		const offer: VacancyOffer = {
			...buildMonthlyOffer({ min: 70_000, text: 'от 70 000 ₽/мес' }),
			pay: {
				currency: 'RUB',
				paymentFrequency: 'еженедельно',
				monthly: { min: 70_000, text: 'от 70 000 ₽/мес' },
				hourly: { max: 480, text: 'от 480 ₽/час' },
			},
		};
		const source = sourceWithCalculator([offer], { mode: 'estimated_hourly' }, 'ozon-courier');

		const model = buildVacancyCalculatorModel({
			source,
			offer,
			sources: [source],
			city: 'Москва',
			slug: 'ozon-courier-moskva-foot',
			rateText: offer.pay.rate ?? '',
		});

		expect(model).toMatchObject({
			kind: 'hourly',
			hourlyRate: 480,
			isEstimated: true,
			rateBasis: 'city_estimate',
			rateLabel: 'Оценочная ставка по городу',
		});
	});

	it('derives Burger King hourly calculator from monthly pay and configured hours', () => {
		const offer = buildMonthlyOffer({ min: 64_000, max: 94_000, text: '64 000–94 000 ₽/мес' });
		const source = sourceWithCalculator([offer], { mode: 'monthly_derived_hourly', monthlyHours: 176 }, 'burger-king-cook-cashier');

		const model = buildVacancyCalculatorModel({
			source,
			offer,
			sources: [source],
			city: 'Москва',
			slug: 'burger-king-cook-cashier-moskva-foot',
			rateText: offer.pay.rate ?? '',
		});

		expect(model).toMatchObject({
			kind: 'hourly',
			hourlyRate: 534,
			formattedHourlyRate: '534 ₽/час',
			isEstimated: true,
			rateBasis: 'monthly_derived',
			rateLabel: 'Расчётная ставка по месячному доходу',
			totalMonthly: 93984,
		});
	});

	it('uses a monthly-only model for roles without a meaningful hourly calculator', () => {
		const offer = buildMonthlyOffer({ min: 70_000, text: 'от 70 000 ₽/мес' });
		const source = sourceWithCalculator([offer], { mode: 'monthly' }, 'tbank-representative');

		const model = buildVacancyCalculatorModel({
			source,
			offer,
			sources: [source],
			city: 'Москва',
			slug: 'tbank-representative-moskva-foot',
			rateText: offer.pay.rate ?? '',
		});

		expect(model).toMatchObject({
			kind: 'monthly',
			monthlyText: 'от 70 000 ₽/мес',
			helperText: 'Почасовая ставка не указана в источнике.',
		});
	});

	it('builds a meeting calculator from base monthly pay plus per-meeting fee', () => {
		const offer: VacancyOffer = {
			...baseOffer,
			pay: {
				currency: 'RUB',
				paymentFrequency: 'еженедельно',
				monthly: { min: 50_000, text: 'от 50 000 ₽/мес' },
				perOrder: { min: 400, max: 400, text: 'в среднем 400 ₽ за встречу' },
			},
		};
		const source = sourceWithCalculator([offer], { mode: 'meeting' }, 'efin-bank-representative');

		const model = buildVacancyCalculatorModel({
			source,
			offer,
			sources: [source],
			city: 'Москва',
			slug: 'efin-bank-representative-moskva-foot',
			rateText: offer.pay.rate ?? '',
		});

		expect(model).toMatchObject({
			kind: 'meeting',
			monthlyBase: 50000,
			meetingFee: 400,
			formattedMonthlyBase: '50 000 ₽',
			formattedMeetingFee: '400 ₽',
			initialDays: 22,
			initialMeetingsPerDay: 4,
			totalMonthly: 85200,
		});
	});

	it('can disable the calculator explicitly', () => {
		const offer = buildMonthlyOffer({ min: 70_000, text: 'от 70 000 ₽/мес' });
		const source = sourceWithCalculator([offer], { mode: 'hidden' }, 'hidden-source');

		expect(buildVacancyCalculatorModel({
			source,
			offer,
			sources: [source],
			city: 'Москва',
			slug: 'hidden-source-moskva-foot',
			rateText: offer.pay.rate ?? '',
		})).toEqual({ kind: 'hidden' });
	});
});

describe('selectTopN', () => {
	it('matches stable full sort + slice ordering', () => {
		const items = [
			{ id: 'a', score: 3 },
			{ id: 'b', score: 5 },
			{ id: 'c', score: 5 },
			{ id: 'd', score: 4 },
			{ id: 'e', score: 1 },
		];
		const compare = (a: number, b: number) => b - a;

		const bounded = selectTopN(items, 3, (item) => item.score, compare);
		const fullSort = items
			.map((item, index) => ({ item, key: item.score, index }))
			.sort((a, b) => compare(a.key, b.key) || a.index - b.index)
			.slice(0, 3)
			.map((entry) => entry.item);

		expect(bounded).toEqual(fullSort);
		expect(bounded.map((item) => item.id)).toEqual(['b', 'c', 'd']);
	});

	it('returns an empty array for non-positive limits', () => {
		expect(selectTopN([1, 2, 3], 0, (value) => value, (a, b) => b - a)).toEqual([]);
		expect(selectTopN([1, 2, 3], -1, (value) => value, (a, b) => b - a)).toEqual([]);
	});
});

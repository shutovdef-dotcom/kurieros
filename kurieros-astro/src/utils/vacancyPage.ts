import type {
	CurrencyCode,
	IncomeCalculatorConfig,
	MoneyRange,
	VacancyOffer,
	VacancySource,
} from '../data/vacancyTypes';
import { applyHourlyJitter } from './fnv1a';
import { formatMoneyPerHour, formatMoneyWithCurrency } from './money';

type SourceWithOffers = Pick<VacancySource, 'offers'>;
type SourceWithCalculator = Pick<VacancySource, 'offers' | 'incomeCalculator' | 'slug'>;

const DEFAULT_CALCULATOR_DAYS = 22;
const DEFAULT_CALCULATOR_HOURS = 8;
const DEFAULT_MONTHLY_HOURS = DEFAULT_CALCULATOR_DAYS * DEFAULT_CALCULATOR_HOURS;
const DEFAULT_MEETINGS_PER_DAY = 4;

type HourlyRateBasis = 'source_hourly' | 'city_estimate' | 'monthly_derived';

export type VacancyCalculatorModel =
	| {
			kind: 'hourly';
			hourlyRate: number;
			formattedHourlyRate: string;
			isEstimated: boolean;
			rateBasis: HourlyRateBasis;
			rateLabel: string;
			helperText?: string;
			initialDays: number;
			initialHours: number;
			totalMonthly: number;
	  }
	| {
			kind: 'meeting';
			monthlyBase: number;
			meetingFee: number;
			formattedMonthlyBase: string;
			formattedMeetingFee: string;
			initialDays: number;
			initialMeetingsPerDay: number;
			totalMonthly: number;
	  }
	| {
			kind: 'monthly';
			monthlyText: string;
			helperText: string;
	  }
	| { kind: 'hidden' };

type BuildVacancyCalculatorModelInput = {
	source?: SourceWithCalculator;
	offer?: VacancyOffer;
	sources: readonly SourceWithOffers[];
	city: string;
	slug: string;
	rateText: string;
};

export const parseSalaryValue = (salary: string): number =>
	Number(salary.replace(/[^\d]/g, '')) || 0;

export const parseAmountFromText = (value?: string): number | null => {
	if (!value) return null;
	const normalized = value.replace(/[\u00a0\u202f]/g, ' ');
	const match = normalized.match(/(\d[\d\s]*)/);
	if (!match) return null;
	const parsed = Number(match[1].replace(/\s+/g, ''));
	return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export const parseHourlyRateFromRateText = (value: string): number | null => {
	const normalized = value.replace(/[\u00a0\u202f]/g, ' ');
	const hourlyUnit = '(?:ч|час|часа|часов|hour|soat|соат|саат|ժամ|сағ|год|гадз|घंट|giờ|小时)';
	const hourlyUnitRe = new RegExp(
		`(?:/\\s*${hourlyUnit}|(?:^|\\s)${hourlyUnit}(?=\\s|$|[.,;:)]))`,
		'i',
	);
	if (!hourlyUnitRe.test(normalized)) return null;

	const currency = '(?:₽|руб\\.?|р\\.?|BYN|Br|бел\\.?\\s*руб\\.?|₸|KZT|тенге|KGS|сом|UZS|сум)';
	const hourlyRateRe = new RegExp(
		`(\\d[\\d\\s]*)\\s*${currency}\\s*(?:/\\s*${hourlyUnit}|(?:в|за)\\s*1?\\s*${hourlyUnit}|${hourlyUnit})`,
		'i',
	);
	const match = normalized.match(hourlyRateRe);
	if (!match) return null;
	const parsed = Number(match[1].replace(/\s+/g, ''));
	return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const getMoneyRangeValue = (range?: MoneyRange): number | null => {
	const numericValue =
		(typeof range?.max === 'number' && Number.isFinite(range.max) ? range.max : null) ??
		(typeof range?.min === 'number' && Number.isFinite(range.min) ? range.min : null);
	if (numericValue && numericValue > 0) {
		return numericValue;
	}
	return parseAmountFromText(range?.text);
};

const getCalculatorConfig = (source?: SourceWithCalculator): IncomeCalculatorConfig => (
	source?.incomeCalculator ?? { mode: 'hourly' }
);

export const resolveHourlyRate = (offer?: VacancyOffer): number | null => {
	if (!offer) return null;
	const numericRate =
		(typeof offer.pay.hourly?.max === 'number' && Number.isFinite(offer.pay.hourly.max) ? offer.pay.hourly.max : null) ??
		(typeof offer.pay.hourly?.min === 'number' && Number.isFinite(offer.pay.hourly.min) ? offer.pay.hourly.min : null);
	if (numericRate && numericRate > 0) {
		return numericRate;
	}
	return parseAmountFromText(offer.pay.hourly?.text);
};

export const computeFallbackHourlyRate = (
	sources: readonly SourceWithOffers[],
	city: string,
	slug: string,
	currency: CurrencyCode = 'RUB',
): number | null => {
	let best = 0;
	for (const source of sources) {
		for (const offer of source.offers) {
			if (!offer.isActive || offer.city !== city) continue;
			if (offer.pay.currency !== currency) continue;
			const rate =
				(typeof offer.pay.hourly?.max === 'number' && Number.isFinite(offer.pay.hourly.max) ? offer.pay.hourly.max : 0) ||
				(typeof offer.pay.hourly?.min === 'number' && Number.isFinite(offer.pay.hourly.min) ? offer.pay.hourly.min : 0) ||
				(parseAmountFromText(offer.pay.hourly?.text) ?? 0);
			if (rate > best) best = rate;
		}
	}
	if (best <= 0) return null;
	return applyHourlyJitter(best, slug);
};

const deriveHourlyRateFromMonthly = (
	offer: VacancyOffer | undefined,
	monthlyHours: number | undefined,
): number | null => {
	const monthlyValue = getMoneyRangeValue(offer?.pay.monthly);
	const normalizedMonthlyHours = typeof monthlyHours === 'number' && Number.isFinite(monthlyHours) && monthlyHours > 0
		? monthlyHours
		: DEFAULT_MONTHLY_HOURS;
	if (!monthlyValue || monthlyValue <= 0) return null;
	return Math.round(monthlyValue / normalizedMonthlyHours);
};

const buildHourlyModel = (
	hourlyRate: number,
	rateBasis: HourlyRateBasis,
	rateLabel: string,
	currency: CurrencyCode,
	helperText?: string,
): VacancyCalculatorModel => ({
	kind: 'hourly',
	hourlyRate,
	formattedHourlyRate: formatMoneyPerHour(hourlyRate, currency),
	isEstimated: rateBasis !== 'source_hourly',
	rateBasis,
	rateLabel,
	...(helperText ? { helperText } : {}),
	initialDays: DEFAULT_CALCULATOR_DAYS,
	initialHours: DEFAULT_CALCULATOR_HOURS,
	totalMonthly: hourlyRate * DEFAULT_CALCULATOR_DAYS * DEFAULT_CALCULATOR_HOURS,
});

const buildMonthlyModel = (offer: VacancyOffer | undefined): VacancyCalculatorModel => {
	const monthlyText = offer?.pay.monthly?.text ?? offer?.pay.rate;
	if (!monthlyText) return { kind: 'hidden' };
	return {
		kind: 'monthly',
		monthlyText,
		helperText: 'Почасовая ставка не указана в источнике.',
	};
};

const buildMeetingModel = (offer: VacancyOffer | undefined, currency: CurrencyCode): VacancyCalculatorModel => {
	const monthlyBase = getMoneyRangeValue(offer?.pay.monthly);
	const meetingFee = getMoneyRangeValue(offer?.pay.perOrder);
	if (!monthlyBase || !meetingFee) {
		return buildMonthlyModel(offer);
	}
	return {
		kind: 'meeting',
		monthlyBase,
		meetingFee,
		formattedMonthlyBase: formatMoneyWithCurrency(monthlyBase, currency),
		formattedMeetingFee: formatMoneyWithCurrency(meetingFee, currency),
		initialDays: DEFAULT_CALCULATOR_DAYS,
		initialMeetingsPerDay: DEFAULT_MEETINGS_PER_DAY,
		totalMonthly: monthlyBase + DEFAULT_CALCULATOR_DAYS * DEFAULT_MEETINGS_PER_DAY * meetingFee,
	};
};

export const buildVacancyCalculatorModel = ({
	source,
	offer,
	sources,
	city,
	slug,
	rateText,
}: BuildVacancyCalculatorModelInput): VacancyCalculatorModel => {
	const config = getCalculatorConfig(source);
	const currency = offer?.pay.currency ?? 'RUB';

	if (config.mode === 'hidden') {
		return { kind: 'hidden' };
	}

	if (config.mode === 'monthly') {
		return buildMonthlyModel(offer);
	}

	if (config.mode === 'meeting') {
		return buildMeetingModel(offer, currency);
	}

	if (config.mode === 'monthly_derived_hourly') {
		const derivedRate =
			deriveHourlyRateFromMonthly(offer, config.monthlyHours) ??
			resolveHourlyRate(offer) ??
			parseHourlyRateFromRateText(rateText);
		if (derivedRate) {
			const monthlyHours = config.monthlyHours ?? DEFAULT_MONTHLY_HOURS;
			return buildHourlyModel(
				derivedRate,
				'monthly_derived',
				'Расчётная ставка по месячному доходу',
				currency,
				`Месячный доход разделён на ${monthlyHours} часов.`,
			);
		}
		return buildMonthlyModel(offer);
	}

	const directHourlyRate = resolveHourlyRate(offer) ?? parseHourlyRateFromRateText(rateText);
	const fallbackHourlyRate = directHourlyRate === null
		? computeFallbackHourlyRate(sources, city, slug, currency)
		: null;
	const hourlyRate = directHourlyRate ?? fallbackHourlyRate;
	if (!hourlyRate) {
		return buildMonthlyModel(offer);
	}

	if (config.mode === 'estimated_hourly') {
		return buildHourlyModel(
			hourlyRate,
			'city_estimate',
			'Оценочная ставка по городу',
			currency,
			'Ориентир рассчитан по близким курьерским ставкам в этом городе.',
		);
	}

	if (directHourlyRate === null) {
		return buildHourlyModel(
			hourlyRate,
			'city_estimate',
			'Оценочная ставка по городу',
			currency,
			'Ориентир рассчитан по близким курьерским ставкам в этом городе.',
		);
	}

	return buildHourlyModel(
		hourlyRate,
		'source_hourly',
		'Ставка в этой вакансии',
		currency,
	);
};

export function selectTopN<T, K>(
	items: readonly T[],
	n: number,
	project: (item: T) => K,
	compare: (a: K, b: K) => number,
): T[] {
	if (n <= 0) return [];
	const kept: Array<{ item: T; key: K }> = [];
	for (const item of items) {
		const key = project(item);
		let index = 0;
		while (index < kept.length && compare(key, kept[index].key) >= 0) {
			index++;
		}
		if (index >= n) continue;
		kept.splice(index, 0, { item, key });
		if (kept.length > n) kept.length = n;
	}
	return kept.map((entry) => entry.item);
}

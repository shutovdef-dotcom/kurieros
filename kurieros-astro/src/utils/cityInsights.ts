/**
 * City-insights block (Z1.1) — unique per-city content that breaks
 * Yandex's near-duplicate clustering of the ~958 city listing pages.
 *
 * Every string is derived from per-city data (population, region, live
 * vacancy counts, Kuper 12-hour-shift rates) so no two cities render the
 * same prose. All builders are PURE — the page does the data lookups
 * (`getCityShiftRates`, `getCityRegion`) and passes the results in, which
 * keeps this module unit-testable in isolation (no JSON imports).
 *
 * Summary composition (owner-chosen, SEO tone): demand & scale + pay in
 * context + regional interlink. No advice voice.
 */
import { formatMoney, formatRussianPlural, getVacancyPluralText, humanJoin } from './format';
import type { CityShiftRates } from './kuperCityRates';

/** Working shifts assumed when projecting a 12-hour shift rate to a month. */
export const SHIFTS_PER_MONTH = 22;

export type SalaryRow = {
	/** Human role label, e.g. «Авто». */
	label: string;
	/** Rubles per 12-hour shift. */
	perShift: number;
	/** Rubles per month ≈ perShift × SHIFTS_PER_MONTH. */
	perMonth: number;
};

const ROLE_ROWS: readonly { key: keyof CityShiftRates; label: string }[] = [
	{ key: 'auto', label: 'Авто' },
	{ key: 'footBike', label: 'Пеший / вело' },
	{ key: 'packer', label: 'Сборщик заказов' },
];

/**
 * Salary table rows for the roles Kuper ships in the city. Empty array
 * when no rates exist → the page renders the summary without a table.
 */
export function buildCitySalaryRows(
	rates: CityShiftRates | null,
	maxSalary: number,
	shiftsPerMonth: number = SHIFTS_PER_MONTH,
): SalaryRow[] {
	if (rates) {
		return ROLE_ROWS.flatMap(({ key, label }) => {
			const perShift = rates[key];
			return perShift === undefined
				? []
				: [{ label, perShift, perMonth: perShift * shiftsPerMonth }];
		});
	}
	// No Kuper shift rate → one derived row from the city's own vacancies:
	// the real advertised monthly figure + a per-shift estimate at the same
	// 22-shift basis used for the Kuper rows.
	if (maxSalary > 0) {
		return [
			{
				label: 'По активным вакансиям',
				perShift: Math.round(maxSalary / shiftsPerMonth),
				perMonth: maxSalary,
			},
		];
	}
	return [];
}

/** Population-tier label used as the city's scale signal in the summary. */
export function cityTier(population: number): string {
	if (population >= 1_000_000) return 'Город-миллионник';
	if (population >= 500_000) return 'Крупный город';
	if (population >= 250_000) return 'Средний по размеру город';
	if (population >= 50_000) return 'Небольшой город';
	return 'Малый город';
}

export type CitySummaryArgs = {
	/** Prepositional-case city name, e.g. «в Казани». */
	prep: string;
	population: number;
	/** Russian region name, e.g. «Татарстан». */
	region?: string;
	/** Federal district, e.g. «Приволжский». */
	district?: string;
	vacancyCount: number;
	companyNames: string[];
	rates: CityShiftRates | null;
	/** National mean auto-courier 12h-shift rate, for the comparison clause. */
	nationalAutoAvg: number;
	shiftsPerMonth?: number;
};

/**
 * Builds the SEO-oriented per-city summary paragraph (Z1.1). Three
 * data-driven beats — demand & scale, pay in context, regional interlink
 * — woven so no two cities render the same prose.
 */
export function buildCitySummary(args: CitySummaryArgs): string {
	const {
		prep,
		population,
		region,
		district,
		vacancyCount,
		companyNames,
		rates,
		nationalAutoAvg,
		shiftsPerMonth = SHIFTS_PER_MONTH,
	} = args;

	const sentences: string[] = [];

	// 1. Спрос — SEO anchor «работа курьером {prep}».
	const vacancyText = `${vacancyCount} ${getVacancyPluralText(vacancyCount)}`;
	const employerText = `${companyNames.length} ${formatRussianPlural(companyNames.length, [
		'прямого работодателя',
		'прямых работодателей',
		'прямых работодателей',
	])}`;
	const topCompanies = companyNames.slice(0, 3);
	sentences.push(
		`Работа курьером ${prep} — это ${vacancyText} от ${employerText}` +
			(topCompanies.length ? ` (${humanJoin(topCompanies)})` : '') +
			'.',
	);

	// 2. Масштаб + «где находится» — tier, population, region, federal district.
	// Fallback cities created from partner data may not have a population
	// record yet; avoid rendering a fake "0 жителей" fact.
	const locationSuffix = region
		? `, регион ${region}${district ? ` (${district} федеральный округ)` : ''}`
		: '';
	if (population > 0) {
		const populationText = `${formatMoney(population)} ${formatRussianPlural(population, [
			'житель',
			'жителя',
			'жителей',
		])}`;
		sentences.push(`${cityTier(population)} — ${populationText}${locationSuffix}.`);
	} else {
		sentences.push(
			region
				? `Направление ${prep} относится к региону ${region}${district ? ` (${district} федеральный округ)` : ''}.`
				: `Направление ${prep} добавлено в каталог по активным вакансиям.`,
		);
	}

	// 3. Заработок в контексте — SEO anchor «зарплата курьера {prep}».
	const autoShift = rates?.auto;
	if (autoShift !== undefined && nationalAutoAvg > 0) {
		const pct = Math.round(((autoShift - nationalAutoAvg) / nationalAutoAvg) * 100);
		const comparison =
			pct === 0
				? 'на уровне средней ставки по России'
				: pct > 0
					? `на ${pct} % выше средней по России`
					: `на ${Math.abs(pct)} % ниже средней по России`;
		sentences.push(
			`Зарплата курьера ${prep}: больше всего платят автокурьерам — ${formatMoney(autoShift)} ₽ за смену ` +
				`(≈ ${formatMoney(autoShift * shiftsPerMonth)} ₽ в месяц при ${shiftsPerMonth} сменах), это ${comparison}.`,
		);
	}

	// Перелинковка на соседние города рендерится отдельным блоком ссылок
	// (см. getNearbyCities + CityInsights.astro), не прозой.
	return sentences.join(' ');
}

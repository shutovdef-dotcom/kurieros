import { describe, it, expect } from 'vitest';
import {
	buildCitySalaryRows,
	buildCitySummary,
	cityTier,
	SHIFTS_PER_MONTH,
} from '../src/utils/cityInsights';

// Z1.1 — the city-insights block exists to make every city page's prose
// unique (anti-duplicate). These tests pin the pure builders: the salary
// math, the population-tier thresholds, and that the summary actually
// weaves in the per-city facts (counts, region, pay comparison) rather
// than emitting a constant template.

describe('buildCitySalaryRows', () => {
	it('returns an empty array when there are no Kuper rates and no salary', () => {
		expect(buildCitySalaryRows(null, 0)).toEqual([]);
	});

	it('projects per-shift rates to a month at 22 shifts in auto/foot/packer order', () => {
		const rows = buildCitySalaryRows({ auto: 6816, footBike: 5676, packer: 2784 }, 0);

		expect(rows.map((r) => r.label)).toEqual(['Авто', 'Пеший / вело', 'Сборщик заказов']);
		expect(rows[0]).toEqual({ label: 'Авто', perShift: 6816, perMonth: 6816 * 22 });
		expect(SHIFTS_PER_MONTH).toBe(22);
	});

	it('omits roles the city does not have', () => {
		const rows = buildCitySalaryRows({ footBike: 5676 }, 0);

		expect(rows).toHaveLength(1);
		expect(rows[0]?.label).toBe('Пеший / вело');
	});

	it('honours a custom shifts-per-month basis', () => {
		const [row] = buildCitySalaryRows({ auto: 5000 }, 0, 20);
		expect(row?.perMonth).toBe(100_000);
	});

	it('derives a single row from the vacancy max when there are no Kuper rates', () => {
		const rows = buildCitySalaryRows(null, 120_000);

		expect(rows).toHaveLength(1);
		expect(rows[0]).toEqual({
			label: 'По активным вакансиям',
			perShift: Math.round(120_000 / 22),
			perMonth: 120_000,
		});
	});
});

describe('cityTier', () => {
	it('labels by population threshold', () => {
		expect(cityTier(1_308_660)).toBe('Город-миллионник');
		expect(cityTier(617_264)).toBe('Крупный город');
		expect(cityTier(349_951)).toBe('Средний по размеру город');
		expect(cityTier(60_000)).toBe('Небольшой город');
		expect(cityTier(4_000)).toBe('Малый город');
	});
});

describe('buildCitySummary', () => {
	const kazan = {
		prep: 'в Казани',
		population: 1_308_660,
		region: 'Татарстан',
		district: 'Приволжский',
		vacancyCount: 40,
		companyNames: ['Яндекс.Еда', 'Купер', 'Озон', 'Самокат'],
		rates: { auto: 6816, footBike: 5676, packer: 2784 },
		nationalAutoAvg: 4909,
	};

	it('weaves in the SEO anchor, demand, scale and the pay comparison', () => {
		const text = buildCitySummary(kazan);

		expect(text).toContain('Работа курьером в Казани');
		expect(text).toContain('40 вакансий');
		expect(text).toContain('Город-миллионник');
		expect(text).toContain('Зарплата курьера в Казани');
		expect(text).toContain('за смену');
		expect(text).toContain('39'); // (6816−4909)/4909 ≈ +39 %
		expect(text).toContain('выше средней по России');
	});

	it('states region and federal district in the scale sentence', () => {
		expect(buildCitySummary(kazan)).toContain('регион Татарстан (Приволжский федеральный округ)');
	});

	it('omits the location suffix when region/district are unknown', () => {
		const text = buildCitySummary({ ...kazan, region: undefined, district: undefined });
		expect(text).toContain('Город-миллионник');
		expect(text).not.toContain('регион');
		expect(text).not.toContain('федеральный округ');
	});

	it('does not render fake population for fallback cities', () => {
		const text = buildCitySummary({
			...kazan,
			prep: 'в Алматы',
			population: 0,
			region: undefined,
			district: undefined,
			rates: null,
		});

		expect(text).toContain('Направление в Алматы добавлено в каталог по активным вакансиям.');
		expect(text).not.toContain('0 жителей');
		expect(text).not.toContain('Малый город');
	});

	it('omits the pay sentence in the summary when Kuper has no rates (the table carries it)', () => {
		const text = buildCitySummary({ ...kazan, rates: null });

		expect(text).not.toContain('за смену');
		expect(text).not.toContain('₽');
		expect(text).toContain('Город-миллионник'); // demand/scale still present
	});

	it('pluralises the employer count correctly', () => {
		expect(buildCitySummary({ ...kazan, companyNames: ['Озон'] })).toContain(
			'1 прямого работодателя',
		);
		expect(buildCitySummary(kazan)).toContain('4 прямых работодателей');
	});
});

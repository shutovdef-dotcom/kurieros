import { describe, it, expect } from 'vitest';
import {
	getYandexCityShiftRates,
	YANDEX_SHIFT_HOURS,
	YANDEX_RATES_UPDATED_AT,
} from '../src/utils/yandexCityRates';

// Z1.1 — Yandex Eda is the Купер-less fallback rate source for the
// city-insights block. Yandex ships per-HOUR rates (foot/bicycle/auto);
// this adapter projects them onto Kuper's 12-hour shift so both sources
// feed the same salary table and the same `NATIONAL_AVG_SHIFT` comparison.
// These tests pin the conversion math and the «not covered → null» contract.

describe('getYandexCityShiftRates', () => {
	it('projects hourly rates onto a 12-hour shift', () => {
		expect(YANDEX_SHIFT_HOURS).toBe(12);
	});

	it('converts a Yandex-only city (Королёв: foot 391 / bicycle 489 / auto 435)', () => {
		// auto 435×12 = 5220; footBike = max(391, 489)×12 = 5868.
		const rates = getYandexCityShiftRates('Королёв');

		expect(rates).toEqual({ auto: 5220, footBike: 5868 });
	});

	it('takes the higher of foot/bike for the «Пеший / вело» row', () => {
		// Курган: foot 252 > bicycle 178 → footBike = 252×12 = 3024.
		const rates = getYandexCityShiftRates('Курган');

		expect(rates?.footBike).toBe(3024);
	});

	it('never emits a packer rate (Yandex Eda has no order-picker role)', () => {
		const rates = getYandexCityShiftRates('Казань');

		expect(rates).not.toBeNull();
		expect(rates).not.toHaveProperty('packer');
	});

	it('returns null when Yandex does not cover the city', () => {
		expect(getYandexCityShiftRates('Воркута')).toBeNull();
		expect(getYandexCityShiftRates('Несуществующий Город')).toBeNull();
	});

	it('exposes the partner-sheet export date as YYYY-MM-DD', () => {
		expect(YANDEX_RATES_UPDATED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});
});

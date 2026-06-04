import { describe, it, expect } from 'vitest';
import {
	buildSyntheticStreet,
	getCityPostalCode,
	buildJobLocationAddress,
} from '../src/utils/jobLocationAddress';

// P0 — JobPosting jobLocation addresses. The site is an aggregator with no
// per-vacancy street, so we emit a plausible CENTRAL street drawn
// deterministically from a pool of ubiquitous Russian street names, varied
// per (vacancy, city) so a city's vacancies don't all share one address —
// the anti-spam issue that got synthetic landmarks reverted on 2026-05-25.
// Region is real (cityGeo + official-name normalization); postalCode is a
// real central code only for curated major cities, never fabricated.

describe('buildSyntheticStreet', () => {
	it('is deterministic for the same seed', () => {
		expect(buildSyntheticStreet('ozon-courier|Москва')).toBe(
			buildSyntheticStreet('ozon-courier|Москва'),
		);
	});

	it('formats as «<street>, <house>» with a 1–40 house number', () => {
		const street = buildSyntheticStreet('seed-1');
		expect(street).toMatch(/^[А-Яа-яЁё -]+, \d+$/);
		const house = Number(street.split(', ').at(-1));
		expect(house).toBeGreaterThanOrEqual(1);
		expect(house).toBeLessThanOrEqual(40);
	});

	it('spreads a city across many streets (no single shared address)', () => {
		const streets = new Set(
			Array.from({ length: 40 }, (_, i) =>
				buildSyntheticStreet(`vacancy-${i}|Москва`).split(', ')[0],
			),
		);
		expect(streets.size).toBeGreaterThan(3);
	});
});

describe('getCityPostalCode', () => {
	it('returns a real 6-digit code for cities in the vendored dataset', () => {
		expect(getCityPostalCode('Казань')).toMatch(/^\d{6}$/);
		expect(getCityPostalCode('Орёл')).toMatch(/^\d{6}$/);
	});

	it('returns undefined for a city absent from the dataset (never fabricated)', () => {
		expect(getCityPostalCode('Несуществоград')).toBeUndefined();
	});
});

describe('buildJobLocationAddress', () => {
	it('emits a complete PostalAddress for a curated major city', () => {
		const addr = buildJobLocationAddress('Казань', 'ozon-courier-kazan');
		expect(addr).toMatchObject({
			'@type': 'PostalAddress',
			addressLocality: 'Казань',
			addressRegion: 'Республика Татарстан',
			addressCountry: 'RU',
		});
		expect(addr.streetAddress).toMatch(/, \d+$/);
		expect(addr.postalCode).toMatch(/^\d{6}$/);
	});

	it('keeps street + real region + real postal for a covered long-tail city (Тула)', () => {
		const addr = buildJobLocationAddress('Тула', 'vac-tula');
		expect(addr.streetAddress).toMatch(/, \d+$/);
		expect(addr.addressRegion).toBe('Тульская область');
		expect(addr.postalCode).toMatch(/^\d{6}$/);
		expect(addr.addressCountry).toBe('RU');
	});

	it('omits postalCode + addressRegion for a city absent from all data (never fabricated)', () => {
		const addr = buildJobLocationAddress('Несуществоград', 'vac-x');
		expect(addr.streetAddress).toMatch(/, \d+$/);
		expect(addr.addressLocality).toBe('Несуществоград');
		expect(addr.addressCountry).toBe('RU');
		expect(addr.postalCode).toBeUndefined();
		expect(addr.addressRegion).toBeUndefined();
	});

	it('normalizes short republic names to official forms', () => {
		// cityGeo stores «Коми»; addressRegion must read «Республика Коми».
		expect(buildJobLocationAddress('Воркута', 'vac-vorkuta').addressRegion).toBe(
			'Республика Коми',
		);
	});

	it('varies the street across a city so vacancies are not co-located', () => {
		const streets = new Set(
			Array.from({ length: 30 }, (_, i) =>
				buildJobLocationAddress('Москва', `vac-${i}`).streetAddress,
			),
		);
		expect(streets.size).toBeGreaterThan(10);
	});
});

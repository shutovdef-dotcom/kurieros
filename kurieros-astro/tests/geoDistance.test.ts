import { describe, it, expect } from 'vitest';
import { haversineKm, nearestByDistance } from '../src/utils/geoDistance';

// Z1.1 — neighbour ranking for the city-insights block depends on these
// pure distance helpers. Pin the maths and the "k nearest" selection.

describe('haversineKm', () => {
	it('returns ~0 for identical points', () => {
		expect(haversineKm(55.75, 37.62, 55.75, 37.62)).toBeCloseTo(0, 5);
	});

	it('matches the known Moscow–Saint Petersburg distance (~633 km)', () => {
		const d = haversineKm(55.7558, 37.6178, 59.9391, 30.3151);
		expect(d).toBeGreaterThan(620);
		expect(d).toBeLessThan(650);
	});
});

describe('nearestByDistance', () => {
	const moscow = { lat: 55.7558, lon: 37.6178 };
	const candidates = [
		{ slug: 'spb', lat: 59.9391, lon: 30.3151 }, // ~633 km
		{ slug: 'tula', lat: 54.1961, lon: 37.6182 }, // ~173 km
		{ slug: 'vladivostok', lat: 43.1155, lon: 131.8855 }, // ~6400 km
		{ slug: 'tver', lat: 56.8587, lon: 35.9176 }, // ~161 km
	];

	it('returns the k closest, nearest first', () => {
		const out = nearestByDistance(moscow, candidates, 2);
		expect(out.map((c) => c.slug)).toEqual(['tver', 'tula']);
	});

	it('never returns more than k', () => {
		expect(nearestByDistance(moscow, candidates, 3)).toHaveLength(3);
	});

	it('matches the previous full-sort semantics, including stable ties', () => {
		const tiedCandidates = [
			{ slug: 'tie-a', lat: 55.7558, lon: 37.6178 },
			{ slug: 'far', lat: 43.1155, lon: 131.8855 },
			{ slug: 'tie-b', lat: 55.7558, lon: 37.6178 },
			{ slug: 'near', lat: 56.8587, lon: 35.9176 },
		];
		const referenceNearest = (k: number) =>
			tiedCandidates
				.map((candidate) => ({
					candidate,
					distance: haversineKm(moscow.lat, moscow.lon, candidate.lat, candidate.lon),
				}))
				.sort((a, b) => a.distance - b.distance)
				.slice(0, k)
				.map((entry) => entry.candidate.slug);

		for (const k of [0, 1, 2, 3, tiedCandidates.length, tiedCandidates.length + 10]) {
			expect(nearestByDistance(moscow, tiedCandidates, k).map((candidate) => candidate.slug))
				.toEqual(referenceNearest(k));
		}
	});
});

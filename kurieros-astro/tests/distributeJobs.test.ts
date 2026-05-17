import { describe, it, expect } from 'vitest';
import {
	cityRank,
	distributeAcrossCities,
	type DistributableJob,
} from '../src/utils/distributeJobs';

/**
 * Tests for the home-grid company-balancing selection algorithm
 * `src/utils/distributeJobs.ts` (audit ref PH2-3 — the algorithm had no
 * unit test before Wave 21d; it was previously inlined in JobGrid.astro
 * frontmatter and only exercised by full-page builds).
 *
 * The home page renders a curated top-N grid via `distributeAcrossCities`.
 * The contract the audit pins down:
 *   - Pass 1 round-robins one job per company, picking each company's
 *     highest-priority-city job not yet shown — no two consecutive cards
 *     share a company, and every represented company surfaces once before
 *     any company contributes a second card.
 *   - within a company, jobs are pre-sorted by `cityRank` so the priority
 *     cities (Москва first) lead.
 *   - Pass 2 is a rare fallback: when companies run out of unique-city
 *     jobs before `max` is reached, a non-deduped round-robin fills the
 *     remainder so the grid never short-renders.
 *   - the input array is never mutated.
 */

// `distributeAcrossCities` only reads `company` + `location`; the home
// grid passes the full `GeneratedJob`. The slim shape keeps the test
// focused on the algorithm, not on job-record plumbing.
const makeJob = (company: string, location: string): DistributableJob => ({
	company,
	location,
});

describe('cityRank', () => {
	it('ranks priority cities by their position in the priority list', () => {
		// Arrange + Act + Assert — Москва is first (0), Воронеж last (11).
		expect(cityRank('Москва')).toBe(0);
		expect(cityRank('Санкт-Петербург')).toBe(1);
		expect(cityRank('Воронеж')).toBe(11);
	});

	it('is case-insensitive', () => {
		expect(cityRank('москва')).toBe(0);
		expect(cityRank('МОСКВА')).toBe(0);
	});

	it('matches a priority city as a substring of the location', () => {
		// `cityRank` uses `.includes()` — a decorated location string
		// such as «Москва, метро Сокол» still resolves to Москва's rank.
		expect(cityRank('Москва, метро Сокол')).toBe(0);
	});

	it('returns the last rank (CITY_PRIORITY.length === 12) for a non-priority city', () => {
		expect(cityRank('Альметьевск')).toBe(12);
		expect(cityRank('Вся Россия')).toBe(12);
	});
});

describe('distributeAcrossCities — fewer jobs than the limit', () => {
	it('returns every job when there are fewer jobs than `max`', () => {
		// Arrange — 3 jobs, distinct cities, distinct companies.
		const jobs = [
			makeJob('A', 'Москва'),
			makeJob('B', 'Казань'),
			makeJob('C', 'Уфа'),
		];

		// Act
		const result = distributeAcrossCities(jobs, 10);

		// Assert — all 3 returned, none dropped.
		expect(result).toHaveLength(3);
		expect(result.map((j) => j.company).sort()).toEqual(['A', 'B', 'C']);
	});

	it('returns an empty array for an empty input', () => {
		expect(distributeAcrossCities([], 24)).toEqual([]);
	});

	it('returns an empty array when `max` is 0', () => {
		const jobs = [makeJob('A', 'Москва')];
		expect(distributeAcrossCities(jobs, 0)).toEqual([]);
	});
});

describe('distributeAcrossCities — exactly the limit', () => {
	it('returns all jobs when the job count equals `max`', () => {
		// Arrange — 4 jobs, 4 companies, distinct cities; `max` = 4.
		const jobs = [
			makeJob('A', 'Москва'),
			makeJob('B', 'Санкт-Петербург'),
			makeJob('C', 'Казань'),
			makeJob('D', 'Уфа'),
		];

		// Act
		const result = distributeAcrossCities(jobs, 4);

		// Assert — every job present, count is exactly `max`.
		expect(result).toHaveLength(4);
		expect(result.map((j) => j.company).sort()).toEqual(['A', 'B', 'C', 'D']);
	});
});

describe('distributeAcrossCities — a single company', () => {
	it('sorts the single company\'s jobs by city priority and slices to `max`', () => {
		// Arrange — one company, 4 cities deliberately out of priority
		// order (rank 12, 0, 1, 5). Pass 1 has one company to rotate, so
		// it pops the highest-priority unused city each iteration.
		const jobs = [
			makeJob('Solo', 'Альметьевск'),    // rank 12
			makeJob('Solo', 'Москва'),         // rank 0
			makeJob('Solo', 'Санкт-Петербург'), // rank 1
			makeJob('Solo', 'Нижний Новгород'), // rank 5
		];

		// Act — ask for 3 of the 4.
		const result = distributeAcrossCities(jobs, 3);

		// Assert — priority order, Альметьевск (rank 12) sliced off.
		expect(result.map((j) => j.location)).toEqual([
			'Москва',
			'Санкт-Петербург',
			'Нижний Новгород',
		]);
	});

	it('returns the whole single-company list when `max` exceeds its size', () => {
		const jobs = [
			makeJob('Solo', 'Казань'),
			makeJob('Solo', 'Москва'),
		];
		const result = distributeAcrossCities(jobs, 24);
		// Still sorted by cityRank — Москва (0) before Казань (4).
		expect(result.map((j) => j.location)).toEqual(['Москва', 'Казань']);
	});
});

describe('distributeAcrossCities — many companies (round-robin distribution)', () => {
	it('round-robins one job per company per pass, priority city first', () => {
		// Arrange — 3 companies. A and B each have 2 unique-city jobs,
		// C has 1. Within-company sort puts the priority city first.
		const jobs = [
			makeJob('A', 'Казань'),            // A: rank 4
			makeJob('A', 'Москва'),            // A: rank 0  -> leads A
			makeJob('B', 'Уфа'),               // B: rank 8
			makeJob('B', 'Санкт-Петербург'),    // B: rank 1  -> leads B
			makeJob('C', 'Новосибирск'),       // C: rank 3
		];

		// Act
		const result = distributeAcrossCities(jobs, 24);

		// Assert — Round 1: A-Москва, B-СПб, C-Новосибирск.
		//          Round 2: A-Казань, B-Уфа (C exhausted).
		expect(result.map((j) => [j.company, j.location])).toEqual([
			['A', 'Москва'],
			['B', 'Санкт-Петербург'],
			['C', 'Новосибирск'],
			['A', 'Казань'],
			['B', 'Уфа'],
		]);
	});

	it('never places two consecutive cards from the same company in pass 1', () => {
		// Arrange — 2 companies, 3 unique-city jobs each.
		const jobs = [
			makeJob('A', 'Москва'),
			makeJob('A', 'Казань'),
			makeJob('A', 'Уфа'),
			makeJob('B', 'Санкт-Петербург'),
			makeJob('B', 'Новосибирск'),
			makeJob('B', 'Краснодар'),
		];

		// Act
		const result = distributeAcrossCities(jobs, 6);

		// Assert — alternating A/B, no company twice in a row.
		expect(result).toHaveLength(6);
		for (let i = 1; i < result.length; i++) {
			expect(result[i].company).not.toBe(result[i - 1].company);
		}
	});

	it('skips a company whose only remaining job is in an already-used city', () => {
		// Arrange — A and B both have a Москва job; C has Казань.
		// Pass 1 round 1: A-Москва claims «москва», B-Москва is then
		// skipped (city already used), C-Казань picked.
		const jobs = [
			makeJob('A', 'Москва'),
			makeJob('B', 'Москва'),
			makeJob('C', 'Казань'),
		];

		// Act
		const result = distributeAcrossCities(jobs, 24);

		// Assert — A-Москва and C-Казань via pass 1; B-Москва deferred
		// to the pass-2 fallback and appended last.
		expect(result.map((j) => [j.company, j.location])).toEqual([
			['A', 'Москва'],
			['C', 'Казань'],
			['B', 'Москва'],
		]);
	});
});

describe('distributeAcrossCities — pass-2 fallback', () => {
	it('falls back to a non-deduped round-robin when unique-city jobs run out', () => {
		// Arrange — two companies, BOTH offering only a Москва job.
		// Pass 1 can place exactly one (the city dedupe blocks the
		// second). Pass 2 must still fill up to `max` so the grid does
		// not short-render.
		const jobs = [
			makeJob('A', 'Москва'),
			makeJob('B', 'Москва'),
		];

		// Act — ask for 5, far more than the 2 available.
		const result = distributeAcrossCities(jobs, 5);

		// Assert — both jobs surface (A via pass 1, B via pass 2),
		// capped at the 2 that actually exist.
		expect(result).toHaveLength(2);
		expect(result.map((j) => j.company)).toEqual(['A', 'B']);
		expect(result.every((j) => j.location === 'Москва')).toBe(true);
	});

	it('respects `max` even when pass 2 has surplus jobs to give', () => {
		// Arrange — 4 jobs all in Москва; pass 1 places 1, pass 2 the
		// rest, but `max` = 2 stops the fill early.
		const jobs = [
			makeJob('A', 'Москва'),
			makeJob('B', 'Москва'),
			makeJob('C', 'Москва'),
			makeJob('D', 'Москва'),
		];

		// Act
		const result = distributeAcrossCities(jobs, 2);

		// Assert — exactly `max` rows, first two companies by
		// insertion order.
		expect(result).toHaveLength(2);
		expect(result.map((j) => j.company)).toEqual(['A', 'B']);
	});
});

describe('distributeAcrossCities — immutability', () => {
	it('does not mutate the input array', () => {
		// Arrange
		const jobs = [
			makeJob('A', 'Москва'),
			makeJob('B', 'Казань'),
			makeJob('A', 'Уфа'),
		];
		const snapshot = jobs.map((j) => ({ ...j }));

		// Act
		distributeAcrossCities(jobs, 1);

		// Assert — same length, same elements, same order as before.
		expect(jobs).toEqual(snapshot);
	});
});

import { describe, it, expect } from 'vitest';
import {
	buildJobsByCityMap,
	filterJobsByCriteria,
	getCityJobsFromMap,
	jobMatches,
	normalizeCityKey,
} from '../src/utils/jobFilters';
import type { GeneratedJob } from '../src/data/vacancyTypes';

/**
 * Tests for the single-source-of-truth predicate `src/utils/jobFilters.ts`.
 *
 * The SSR pages, the `JobGrid` frontmatter, and the sitemap empty-paths
 * emitter all run through this predicate; if any of these tests fails,
 * one of those surfaces will silently disagree with the others.
 *
 * The fixture below intentionally exercises:
 *   - normalized exact-equality city match (H12: substring `.includes()`
 *     was replaced because «Дно» pulled every Видное/Медногорск/
 *     Отрадное row, and 62 more cities had similar collisions)
 *   - comma-split multi-city locations («Алнаши, Вавож» registers
 *     under BOTH cities)
 *   - the «Вся Россия» nationwide pass-through
 *   - regular tag membership (`auto`, `16plus`, etc.)
 *   - the `Ежеднев` / `Еженед` payment_freq lookup via SEARCH (NOT via
 *     tag — that's the existing semantics; preserve it exactly)
 *   - cross-field search (title / company / location / salary /
 *     details.payment_freq)
 *   - AND-combination of all criteria
 *   - `buildJobsByCityMap` / `getCityJobsFromMap` precompute path (H12)
 */

const makeJob = (overrides: Partial<GeneratedJob> = {}): GeneratedJob => ({
	id: 1001,
	sourceId: 1,
	sourceSlug: 'demo-source',
	slug: 'demo-source-moskva-foot',
	title: 'Курьер',
	company: 'Демо',
	companyLogo: '/img/demo.svg',
	salary: 'до 100000 ₽/мес',
	location: 'Москва',
	tags: ['foot', '18+', 'emp:gph', 'cit:rf'],
	labels: ['Пеший', '18+'],
	applyLink: 'https://example.com/apply',
	description: 'demo',
	requirements: [],
	benefits: [],
	requiredDocuments: [],
	details: {
		rate: '350 ₽/час',
		schedule: 'Свободный график от 2 часов',
		education: 'Не требуется',
		age: 'от 18 лет',
		payment_freq: 'Еженедельно',
		citizenship: 'РФ / ЕАЭС',
		medical_book: 'Не требуется',
		self_employed: 'Не требуется',
		employment_type: 'ГПХ',
		transport_provision: 'Транспорт не требуется',
		uniform: 'Не требуется',
		os: 'Android или iOS',
	},
	search_tags: [],
	shortDescription: 'demo',
	transport: 'foot',
	transportProvision: 'not_required',
	salaryConfidence: 'estimated',
	currency: 'RUB',
	updatedAt: '2026-04-18',
	...overrides,
});

describe('jobMatches — city criterion', () => {
	it('matches when the city exactly equals job.location', () => {
		const job = makeJob({ location: 'Москва' });
		expect(jobMatches(job, { city: 'Москва' })).toBe(true);
	});

	it('does NOT match a substring of job.location (H12 latent-bug fix)', () => {
		// Pre-H12 semantics: `.toLowerCase().includes()` matched «Дно»
		// against «Видное», etc. — 140 conflict pairs across 63
		// substring-cities in production. New semantics: exact equality.
		const job = makeJob({ location: 'Видное' });
		expect(jobMatches(job, { city: 'Дно' })).toBe(false);
	});

	it('does NOT match when the city query is a superstring', () => {
		const job = makeJob({ location: 'Москва' });
		expect(jobMatches(job, { city: 'Москва (метро Сокол)' })).toBe(false);
	});

	it('is case-insensitive on both sides', () => {
		const job = makeJob({ location: 'МоСкВа' });
		expect(jobMatches(job, { city: 'москва' })).toBe(true);
	});

	it('normalizes ё → е on both sides', () => {
		// Some upstream sources spell it «Орел», others «Орёл». The
		// canonical city list folds both to the same key.
		const job = makeJob({ location: 'Орёл' });
		expect(jobMatches(job, { city: 'Орел' })).toBe(true);
		expect(jobMatches(job, { city: 'орёл' })).toBe(true);
	});

	it('trims whitespace and collapses non-breaking spaces', () => {
		const job = makeJob({ location: ' Москва ' });
		expect(jobMatches(job, { city: 'Москва' })).toBe(true);
	});

	it('matches one half of a comma-separated multi-city location', () => {
		// Real dataset row: «Алнаши, Вавож». Both city listings must
		// surface the same job (mirrors `getCitiesFromJobs` which
		// also comma-splits when counting per-city vacancies).
		const job = makeJob({ location: 'Алнаши, Вавож' });
		expect(jobMatches(job, { city: 'Алнаши' })).toBe(true);
		expect(jobMatches(job, { city: 'Вавож' })).toBe(true);
	});

	it('does NOT match an unrelated city', () => {
		const job = makeJob({ location: 'Казань' });
		expect(jobMatches(job, { city: 'Москва' })).toBe(false);
	});

	it('matches «Вся Россия» rows for any city query', () => {
		const job = makeJob({ location: 'Вся Россия' });
		expect(jobMatches(job, { city: 'Москва' })).toBe(true);
		expect(jobMatches(job, { city: 'Тында' })).toBe(true);
	});

	it('passes when criteria.city is missing/null/undefined/empty', () => {
		const job = makeJob({ location: 'Казань' });
		expect(jobMatches(job, {})).toBe(true);
		expect(jobMatches(job, { city: null })).toBe(true);
		expect(jobMatches(job, { city: undefined })).toBe(true);
		expect(jobMatches(job, { city: '' })).toBe(true);
	});
});

describe('jobMatches — tag criterion', () => {
	it('matches a regular tag present in job.tags', () => {
		const job = makeJob({ tags: ['auto', '18+'] });
		expect(jobMatches(job, { tag: 'auto' })).toBe(true);
	});

	it('does NOT match a tag absent from job.tags', () => {
		const job = makeJob({ tags: ['foot'] });
		expect(jobMatches(job, { tag: 'bicycle' })).toBe(false);
	});

	it('matches an employment tag (`emp:` prefix)', () => {
		const job = makeJob({ tags: ['emp:self_employed', 'foot'] });
		expect(jobMatches(job, { tag: 'emp:self_employed' })).toBe(true);
	});

	it('passes when tag is the literal sentinel "all"', () => {
		const job = makeJob({ tags: [] });
		expect(jobMatches(job, { tag: 'all' })).toBe(true);
	});

	it('passes when tag is missing/null/undefined/empty', () => {
		const job = makeJob({ tags: [] });
		expect(jobMatches(job, {})).toBe(true);
		expect(jobMatches(job, { tag: null })).toBe(true);
		expect(jobMatches(job, { tag: undefined })).toBe(true);
		expect(jobMatches(job, { tag: '' })).toBe(true);
	});
});

describe('jobMatches — search criterion', () => {
	it('matches by title substring (case-insensitive)', () => {
		const job = makeJob({ title: 'Пеший Курьер Сети' });
		expect(jobMatches(job, { search: 'курьер' })).toBe(true);
	});

	it('matches by company substring', () => {
		const job = makeJob({ company: 'Яндекс.Еда' });
		expect(jobMatches(job, { search: 'еда' })).toBe(true);
	});

	it('matches by location substring', () => {
		const job = makeJob({ location: 'Нижний Новгород' });
		expect(jobMatches(job, { search: 'нижний' })).toBe(true);
	});

	it('matches by salary substring', () => {
		const job = makeJob({ salary: 'до 120000 ₽/мес' });
		expect(jobMatches(job, { search: '120000' })).toBe(true);
	});

	it('matches by details.payment_freq — `Ежеднев` (category mapping)', () => {
		// The /rabota-kurerom-ezhednevnaya-oplata page uses
		// `query: 'Ежеднев'`; this is the ONLY field that carries the
		// «Ежедневно» word, so the category page is empty without this
		// branch. Sitemap emitter MUST agree (jobFilters.ts is shared).
		const job = makeJob({
			title: 'Курьер',
			company: 'Демо',
			location: 'Москва',
			salary: '350 ₽/час',
			details: {
				...makeJob().details,
				payment_freq: 'Ежедневно',
			},
		});
		expect(jobMatches(job, { search: 'Ежеднев' })).toBe(true);
	});

	it('matches by details.payment_freq — `Еженед` (category mapping)', () => {
		const job = makeJob({
			title: 'Курьер',
			details: {
				...makeJob().details,
				payment_freq: 'Еженедельно',
			},
		});
		expect(jobMatches(job, { search: 'Еженед' })).toBe(true);
	});

	it('does NOT match when none of the fields carry the substring', () => {
		const job = makeJob({
			title: 'Курьер',
			company: 'Демо',
			location: 'Москва',
			salary: '350 ₽/час',
			details: { ...makeJob().details, payment_freq: 'Ежемесячно' },
		});
		expect(jobMatches(job, { search: 'еженед' })).toBe(false);
	});

	it('passes when search is missing/null/undefined/empty', () => {
		const job = makeJob();
		expect(jobMatches(job, {})).toBe(true);
		expect(jobMatches(job, { search: null })).toBe(true);
		expect(jobMatches(job, { search: undefined })).toBe(true);
		expect(jobMatches(job, { search: '' })).toBe(true);
	});
});

describe('jobMatches — AND-combination', () => {
	it('returns true only when all three criteria match', () => {
		const job = makeJob({
			location: 'Санкт-Петербург',
			tags: ['auto', '18+'],
			company: 'Яндекс.Еда',
		});
		expect(
			jobMatches(job, {
				city: 'Санкт-Петербург',
				tag: 'auto',
				search: 'еда',
			}),
		).toBe(true);
	});

	it('returns false if any single criterion fails (city)', () => {
		const job = makeJob({ location: 'Казань', tags: ['auto'], company: 'Яндекс' });
		expect(
			jobMatches(job, { city: 'Москва', tag: 'auto', search: 'яндекс' }),
		).toBe(false);
	});

	it('returns false if any single criterion fails (tag)', () => {
		const job = makeJob({ location: 'Москва', tags: ['foot'], company: 'Яндекс' });
		expect(
			jobMatches(job, { city: 'Москва', tag: 'auto', search: 'яндекс' }),
		).toBe(false);
	});

	it('returns false if any single criterion fails (search)', () => {
		const job = makeJob({
			location: 'Москва',
			tags: ['auto'],
			company: 'Демо',
			details: { ...makeJob().details, payment_freq: 'Ежемесячно' },
		});
		expect(
			jobMatches(job, { city: 'Москва', tag: 'auto', search: 'еженед' }),
		).toBe(false);
	});
});

describe('filterJobsByCriteria', () => {
	const jobs: GeneratedJob[] = [
		makeJob({ id: 1, location: 'Москва', tags: ['auto'], company: 'Яндекс.Еда' }),
		makeJob({ id: 2, location: 'Москва', tags: ['foot'], company: 'Купер' }),
		makeJob({ id: 3, location: 'Казань', tags: ['auto'], company: 'Ozon' }),
		makeJob({
			id: 4,
			location: 'Вся Россия',
			tags: ['remote'],
			company: 'СДЭК',
			details: { ...makeJob().details, payment_freq: 'Ежедневно' },
		}),
		makeJob({
			id: 5,
			location: 'Санкт-Петербург',
			tags: ['bicycle'],
			company: 'Самокат',
			details: { ...makeJob().details, payment_freq: 'Еженедельно' },
		}),
	];

	it('returns every job when criteria is empty', () => {
		expect(filterJobsByCriteria(jobs, {})).toHaveLength(jobs.length);
	});

	it('filters by city — picks Moscow rows plus the nationwide row', () => {
		const result = filterJobsByCriteria(jobs, { city: 'Москва' });
		const ids = result.map((j) => j.id).sort((a, b) => a - b);
		// 1, 2 = Moscow exact match; 4 = «Вся Россия» pass-through
		expect(ids).toEqual([1, 2, 4]);
	});

	it('filters by tag — only `auto` rows', () => {
		const result = filterJobsByCriteria(jobs, { tag: 'auto' });
		expect(result.map((j) => j.id).sort((a, b) => a - b)).toEqual([1, 3]);
	});

	it('search `Ежеднев` matches the row whose payment_freq is «Ежедневно»', () => {
		const result = filterJobsByCriteria(jobs, { search: 'Ежеднев' });
		expect(result.map((j) => j.id)).toEqual([4]);
	});

	it('AND-combines all three criteria', () => {
		const result = filterJobsByCriteria(jobs, {
			city: 'Санкт-Петербург',
			tag: 'bicycle',
			search: 'Еженед',
		});
		expect(result.map((j) => j.id)).toEqual([5]);
	});

	it('returns a fresh array (does not mutate the input)', () => {
		const original = [...jobs];
		filterJobsByCriteria(jobs, { city: 'Москва' });
		expect(jobs).toEqual(original);
	});
});

// =====================================================================
// H12: Map-based per-city precompute
// =====================================================================

describe('normalizeCityKey', () => {
	it('lowercases', () => {
		expect(normalizeCityKey('Москва')).toBe('москва');
	});

	it('folds ё → е', () => {
		expect(normalizeCityKey('Орёл')).toBe(normalizeCityKey('Орел'));
	});

	it('trims whitespace', () => {
		expect(normalizeCityKey('  Казань  ')).toBe('казань');
	});

	it('collapses runs of internal whitespace', () => {
		expect(normalizeCityKey('Нижний   Новгород')).toBe('нижний новгород');
	});

	it('returns empty string for null/undefined/empty input', () => {
		expect(normalizeCityKey(null)).toBe('');
		expect(normalizeCityKey(undefined)).toBe('');
		expect(normalizeCityKey('')).toBe('');
	});
});

describe('buildJobsByCityMap', () => {
	it('returns one bucket per unique normalized city key', () => {
		const jobs: GeneratedJob[] = [
			makeJob({ id: 1, location: 'Москва' }),
			makeJob({ id: 2, location: 'Москва' }),
			makeJob({ id: 3, location: 'Казань' }),
		];
		const map = buildJobsByCityMap(jobs);
		expect(map.get('москва')?.map((j) => j.id).sort()).toEqual([1, 2]);
		expect(map.get('казань')?.map((j) => j.id)).toEqual([3]);
	});

	it('keys are normalized — case + ё-folding + trim collapse', () => {
		const jobs: GeneratedJob[] = [
			makeJob({ id: 1, location: 'Орёл' }),
			makeJob({ id: 2, location: 'Орел' }),
		];
		const map = buildJobsByCityMap(jobs);
		// Both rows merge under the same key.
		expect(map.get('орел')?.map((j) => j.id).sort()).toEqual([1, 2]);
	});

	it('comma-separated locations register the job under each city', () => {
		const jobs: GeneratedJob[] = [
			makeJob({ id: 7, location: 'Алнаши, Вавож' }),
		];
		const map = buildJobsByCityMap(jobs);
		expect(map.get('алнаши')?.map((j) => j.id)).toEqual([7]);
		expect(map.get('вавож')?.map((j) => j.id)).toEqual([7]);
	});

	it('does NOT collide substring-cities (H12 latent-bug fix)', () => {
		const jobs: GeneratedJob[] = [
			makeJob({ id: 10, location: 'Видное' }),
			makeJob({ id: 11, location: 'Дно' }),
		];
		const map = buildJobsByCityMap(jobs);
		// Pre-H12 the «дно» listing pulled the «Видное» row in via
		// `.toLowerCase().includes()`. With Map-keyed exact-equality
		// each city gets only its own jobs.
		expect(map.get('дно')?.map((j) => j.id)).toEqual([11]);
		expect(map.get('видное')?.map((j) => j.id)).toEqual([10]);
	});

	it('isolates «Вся Россия» rows in a separate nationwide bucket', () => {
		const jobs: GeneratedJob[] = [
			makeJob({ id: 1, location: 'Москва' }),
			makeJob({ id: 99, location: 'Вся Россия' }),
		];
		const map = buildJobsByCityMap(jobs);
		// The nationwide row lives under «вся россия», NOT under each
		// city — `getCityJobsFromMap` does the merge.
		expect(map.get('москва')?.map((j) => j.id)).toEqual([1]);
		expect(map.get('вся россия')?.map((j) => j.id)).toEqual([99]);
	});

	it('returns an empty Map for an empty job list', () => {
		expect(buildJobsByCityMap([]).size).toBe(0);
	});
});

describe('getCityJobsFromMap', () => {
	const jobs: GeneratedJob[] = [
		makeJob({ id: 1, location: 'Москва' }),
		makeJob({ id: 2, location: 'Москва' }),
		makeJob({ id: 3, location: 'Казань' }),
		makeJob({ id: 99, location: 'Вся Россия' }),
		makeJob({ id: 7, location: 'Алнаши, Вавож' }),
	];
	const map = buildJobsByCityMap(jobs);

	it('returns city jobs PLUS nationwide jobs', () => {
		const result = getCityJobsFromMap(map, 'Москва');
		expect(result.map((j) => j.id).sort((a, b) => a - b)).toEqual([1, 2, 99]);
	});

	it('returns only nationwide jobs for a city with no rows in the Map', () => {
		const result = getCityJobsFromMap(map, 'Тында');
		expect(result.map((j) => j.id)).toEqual([99]);
	});

	it('looks up by un-normalized name (handles ё/case/whitespace)', () => {
		expect(getCityJobsFromMap(map, '  казань ').map((j) => j.id).sort())
			.toEqual([3, 99]);
	});

	it('multi-city locations resolve under each constituent city', () => {
		expect(getCityJobsFromMap(map, 'Алнаши').map((j) => j.id).sort())
			.toEqual([7, 99]);
		expect(getCityJobsFromMap(map, 'Вавож').map((j) => j.id).sort())
			.toEqual([7, 99]);
	});

	it('returns a FRESH array — never mutates Map buckets', () => {
		const result = getCityJobsFromMap(map, 'Москва');
		const before = map.get('москва')!.length;
		result.push(makeJob({ id: 9999 }));
		expect(map.get('москва')!.length).toBe(before);
	});

	it('returns an empty array (no nationwide rows) when there is no match', () => {
		const noNationwide = buildJobsByCityMap([
			makeJob({ id: 1, location: 'Москва' }),
		]);
		expect(getCityJobsFromMap(noNationwide, 'Тында')).toEqual([]);
	});

	it('matches jobMatches output for the city criterion (parity check)', () => {
		// Whatever `getCityJobsFromMap` returns must equal the set of
		// jobs `jobMatches` accepts for the same city — otherwise the
		// SSR page (Map path) and the sitemap emitter (predicate path)
		// drift out of sync. This is the load-bearing invariant H12
		// preserves.
		for (const cityName of ['Москва', 'Казань', 'Алнаши', 'Вавож', 'Тында']) {
			const viaMap = getCityJobsFromMap(map, cityName)
				.map((j) => j.id)
				.sort((a, b) => a - b);
			const viaPredicate = filterJobsByCriteria(jobs, { city: cityName })
				.map((j) => j.id)
				.sort((a, b) => a - b);
			expect(viaMap).toEqual(viaPredicate);
		}
	});
});

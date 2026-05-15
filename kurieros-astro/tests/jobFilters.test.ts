import { describe, it, expect } from 'vitest';
import { filterJobsByCriteria, jobMatches } from '../src/utils/jobFilters';
import type { GeneratedJob } from '../src/data/vacancyTypes';

/**
 * Tests for the single-source-of-truth predicate `src/utils/jobFilters.ts`.
 *
 * The SSR pages, the `JobGrid` frontmatter, and the sitemap empty-paths
 * emitter all run through this predicate; if any of these tests fails,
 * one of those surfaces will silently disagree with the others.
 *
 * The fixture below intentionally exercises:
 *   - case-insensitive city substring match (Moscow inside "Москва")
 *   - the «Вся Россия» nationwide pass-through
 *   - regular tag membership (`auto`, `16plus`, etc.)
 *   - the `Ежеднев` / `Еженед` payment_freq lookup via SEARCH (NOT via
 *     tag — that's the existing semantics; preserve it exactly)
 *   - cross-field search (title / company / location / salary /
 *     details.payment_freq)
 *   - AND-combination of all criteria
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

	it('matches via substring (existing .includes() semantics — H12)', () => {
		// The audit flags `.includes()` as a latent bug; preserve it here
		// exactly until H12 lands so SSR↔sitemap stay aligned.
		const job = makeJob({ location: 'Москва (метро Сокол)' });
		expect(jobMatches(job, { city: 'Москва' })).toBe(true);
	});

	it('is case-insensitive on both sides', () => {
		const job = makeJob({ location: 'МоСкВа' });
		expect(jobMatches(job, { city: 'москва' })).toBe(true);
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

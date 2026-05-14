import { CITY_BLOCKLIST, CITY_DATASET } from '../data/cities-dataset';
import { cyrillicToLatin } from './transliterate';

type JobLike = {
	location?: string;
};

const normalizeCityDisplayName = (name: string) =>
	name
		.replace(/[\u00A0\u202F\u2007]/g, ' ')
		.replace(/[\u2010-\u2015]/g, '-')
		.replace(/\s+/g, ' ')
		.replace(/\s*-\s*/g, '-')
		.trim();

const normalizeCityKey = (name: string) =>
	normalizeCityDisplayName(name)
		.toLowerCase()
		.replace(/ё/g, 'е');

const CITY_BY_KEY = new Map(
	CITY_DATASET.map((city) => [normalizeCityKey(city.name), city]),
);
const CITY_POPULATION_RANK = new Map(
	CITY_DATASET.map((city, index) => [normalizeCityKey(city.name), CITY_DATASET.length - index]),
);
const BLOCKLIST_KEYS = new Set(CITY_BLOCKLIST.map((name) => normalizeCityKey(name)));
const ALL_RUSSIA_KEY = normalizeCityKey('Вся Россия');

export const isCityBlocked = (name: string) =>
	BLOCKLIST_KEYS.has(normalizeCityKey(name));

export const slugifyCity = (name: string) =>
	cyrillicToLatin(name)
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

const getCityCounts = (jobs: JobLike[]) => {
	const counts = new Map<string, number>();

	jobs
		.flatMap((job) => (job.location || '').split(','))
		.map((city) => {
			const normalizedName = normalizeCityDisplayName(city);
			const cityKey = normalizeCityKey(normalizedName);
			return CITY_BY_KEY.get(cityKey)?.name ?? normalizedName;
		})
		.filter((city) => city && normalizeCityKey(city) !== ALL_RUSSIA_KEY)
		.forEach((city) => counts.set(city, (counts.get(city) ?? 0) + 1));

	return counts;
};

export const getCitiesFromJobs = (jobs: JobLike[]) => {
	const counts = getCityCounts(jobs);

	return Array.from(counts.entries())
		.map(([name, vacancyCount]) => {
			const known = CITY_BY_KEY.get(normalizeCityKey(name));
			const slug = known?.slug ?? slugifyCity(name);
			const prep = known?.prep ?? `в ${name}`;
			const population = known?.population ?? 0;
			return { name, slug, prep, vacancyCount, population };
		})
		.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
};

export const getCityNames = (jobs: JobLike[]) =>
	getCitiesFromJobs(jobs).map((city) => city.name);

export const getCityHref = (name: string) => {
	const known = CITY_BY_KEY.get(normalizeCityKey(name));
	const slug = known?.slug ?? slugifyCity(name);
	return `/rabota-kurerom-${slug}/`;
};

const getPopulationRank = (name: string) => CITY_POPULATION_RANK.get(normalizeCityKey(name)) ?? 0;

const compareCityNamesByPopulation = (a: string, b: string) =>
	getPopulationRank(b) - getPopulationRank(a) || a.localeCompare(b, 'ru');

export const sortCityNamesByPopulation = (names: string[]) =>
	[...names].sort(compareCityNamesByPopulation);

import { CITIES } from '../data/constants';
import { CITY_POPULATION_ORDER } from '../data/cityPopulationOrder';

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

const CANONICAL_CITY_BY_KEY = new Map(
	CITY_POPULATION_ORDER.map((city) => [normalizeCityKey(city), city]),
);
const KNOWN_CITIES = new Map(CITIES.map((city) => [normalizeCityKey(city.name), city]));
const CITY_POPULATION_RANK = new Map(
	CITY_POPULATION_ORDER.map((city, index) => [normalizeCityKey(city), CITY_POPULATION_ORDER.length - index]),
);
const ALL_RUSSIA_KEY = normalizeCityKey('Вся Россия');

const SLUG_MAP: Record<string, string> = {
	а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
	и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
	с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch',
	ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya'
};

export const slugifyCity = (name: string) =>
	name
		.toLowerCase()
		.split('')
		.map((char) => SLUG_MAP[char] ?? char)
		.join('')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

const getCityCounts = (jobs: JobLike[]) => {
	const counts = new Map<string, number>();

	jobs
		.flatMap((job) => (job.location || '').split(','))
		.map((city) => {
			const normalizedName = normalizeCityDisplayName(city);
			const cityKey = normalizeCityKey(normalizedName);
			return CANONICAL_CITY_BY_KEY.get(cityKey) ?? normalizedName;
		})
		.filter((city) => city && normalizeCityKey(city) !== ALL_RUSSIA_KEY)
		.forEach((city) => counts.set(city, (counts.get(city) ?? 0) + 1));

	return counts;
};

export const getCitiesFromJobs = (jobs: JobLike[]) => {
	const counts = getCityCounts(jobs);

	return Array.from(counts.entries())
		.map(([name, vacancyCount]) => {
			const known = KNOWN_CITIES.get(normalizeCityKey(name));
			const slug = known?.slug ?? slugifyCity(name);
			const prep = known?.prep ?? `в ${name}`;
			return { name, slug, prep, vacancyCount };
		})
		.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
};

export const getCityNames = (jobs: JobLike[]) =>
	getCitiesFromJobs(jobs).map((city) => city.name);

export const getCityHref = (name: string) => {
	const known = KNOWN_CITIES.get(normalizeCityKey(name));
	const slug = known?.slug ?? slugifyCity(name);
	return `/rabota-kurerom-${slug}/`;
};

const getPopulationRank = (name: string) => CITY_POPULATION_RANK.get(normalizeCityKey(name)) ?? 0;

const compareCityNamesByPopulation = (a: string, b: string) =>
	getPopulationRank(b) - getPopulationRank(a) || a.localeCompare(b, 'ru');

export const sortCityNamesByPopulation = (names: string[]) =>
	[...names].sort(compareCityNamesByPopulation);

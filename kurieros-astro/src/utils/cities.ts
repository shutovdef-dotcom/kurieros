import { CITIES } from '../data/constants';

type JobLike = {
	location?: string;
};

const KNOWN_CITIES = new Map(CITIES.map((city) => [city.name, city]));

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

export const getCityCounts = (jobs: JobLike[]) => {
	const counts = new Map<string, number>();

	jobs
		.flatMap((job) => (job.location || '').split(','))
		.map((city) => city.trim())
		.filter((city) => city && city !== 'Вся Россия')
		.forEach((city) => counts.set(city, (counts.get(city) ?? 0) + 1));

	return counts;
};

export const getCitiesFromJobs = (jobs: JobLike[]) => {
	const counts = getCityCounts(jobs);

	return Array.from(counts.entries())
		.map(([name, vacancyCount]) => {
			const known = KNOWN_CITIES.get(name);
			const slug = known?.slug ?? slugifyCity(name);
			const prep = known?.prep ?? `в ${name}`;
			return { name, slug, prep, vacancyCount };
		})
		.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
};

export const getCityNames = (jobs: JobLike[]) =>
	getCitiesFromJobs(jobs).map((city) => city.name);

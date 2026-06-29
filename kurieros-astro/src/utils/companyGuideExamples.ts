import type { JobLike } from './companies';

const FALLBACK_CITY_RANK = 1_000_000;

const roleMatchers = [
  (job: JobLike) => job.tags.includes('foot') || /пеш/i.test(job.title),
  (job: JobLike) => job.tags.includes('bicycle') || /вело/i.test(job.title),
  (job: JobLike) => job.tags.includes('auto') || /авто/i.test(job.title),
  (job: JobLike) => /сбор/i.test(job.title) || job.slug.includes('order-picker'),
];

const normalizeCity = (city: string): string => city.trim().toLocaleLowerCase('ru-RU');

const buildCityRank = (featuredCities: readonly string[]): Map<string, number> =>
  new Map(featuredCities.map((city, index) => [normalizeCity(city), index]));

const locationCities = (location: string): string[] =>
  location
    .split(',')
    .map((city) => city.trim())
    .filter(Boolean);

const cityRankForLocation = (
  location: string,
  cityRank: ReadonlyMap<string, number>,
): number =>
  Math.min(
    ...locationCities(location).map((city) => cityRank.get(normalizeCity(city)) ?? FALLBACK_CITY_RANK),
  );

const hasCity = (job: JobLike, city: string): boolean => {
  const cityKey = normalizeCity(city);

  return locationCities(job.location).some((locationCity) => normalizeCity(locationCity) === cityKey);
};

const roleRank = (job: JobLike): number => {
  const rank = roleMatchers.findIndex((matcher) => matcher(job));

  return rank === -1 ? roleMatchers.length : rank;
};

const addUniqueJob = (
  target: JobLike[],
  seenSlugs: Set<string>,
  job: JobLike | undefined,
): void => {
  if (!job || seenSlugs.has(job.slug)) return;

  seenSlugs.add(job.slug);
  target.push(job);
};

export const orderGuideCities = (
  cities: readonly string[],
  featuredCities: readonly string[],
  limit: number,
): string[] => {
  const cityRank = buildCityRank(featuredCities);

  return [...cities]
    .sort((cityA, cityB) => {
      const cityARank = cityRank.get(normalizeCity(cityA)) ?? FALLBACK_CITY_RANK;
      const cityBRank = cityRank.get(normalizeCity(cityB)) ?? FALLBACK_CITY_RANK;

      return cityARank - cityBRank || cityA.localeCompare(cityB, 'ru');
    })
    .slice(0, limit);
};

export const pickGuideVacancyExamples = (
  jobs: readonly JobLike[],
  featuredCities: readonly string[],
  limit: number,
): JobLike[] => {
  const picked: JobLike[] = [];
  const seenSlugs = new Set<string>();
  const cityRank = buildCityRank(featuredCities);

  featuredCities.forEach((city, cityIndex) => {
    if (picked.length >= limit) return;

    const cityJobs = jobs.filter((job) => hasCity(job, city));
    const preferredRoleIndex = cityIndex % roleMatchers.length;
    const preferredJob =
      cityJobs.find((job) => roleMatchers[preferredRoleIndex](job)) ??
      cityJobs.sort((jobA, jobB) => roleRank(jobA) - roleRank(jobB))[0];

    addUniqueJob(picked, seenSlugs, preferredJob);
  });

  if (picked.length < limit) {
    const fallbackJobs = [...jobs].sort((jobA, jobB) => {
      const cityDiff =
        cityRankForLocation(jobA.location, cityRank) - cityRankForLocation(jobB.location, cityRank);

      return (
        cityDiff ||
        roleRank(jobA) - roleRank(jobB) ||
        jobA.title.localeCompare(jobB.title, 'ru')
      );
    });

    fallbackJobs.forEach((job) => {
      if (picked.length < limit) {
        addUniqueJob(picked, seenSlugs, job);
      }
    });
  }

  return picked.slice(0, limit);
};

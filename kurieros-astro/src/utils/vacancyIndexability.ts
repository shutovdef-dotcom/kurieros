import vacancyIndexability from '../generated/vacancy-indexability.json';
import {
  HARD_NOINDEX_VACANCY_PATHS,
  TOP_INDEXABLE_VACANCY_CITIES,
  type VacancyIndexabilityDecision,
} from '../data/vacancyIndexabilityPolicy';
import { getVacancyCanonicalPath } from './vacancyUrl';

type VacancyIndexabilityJob = {
  slug: string;
  detailSlug?: string;
  location: string;
};

const hardNoindexPaths = new Set<string>(HARD_NOINDEX_VACANCY_PATHS);
const topIndexableCities = new Set<string>(TOP_INDEXABLE_VACANCY_CITIES);
const localIndexablePaths = new Set<string>(vacancyIndexability.localIndexablePaths);
const gscIndexablePaths = new Set<string>(vacancyIndexability.gscIndexablePaths);

const splitJobCities = (location: string): string[] =>
  location
    .split(',')
    .map((city) => city.trim())
    .filter((city) => city && city !== 'Вся Россия');

export const getVacancyIndexability = (
  job: VacancyIndexabilityJob,
): VacancyIndexabilityDecision => {
  const path = getVacancyCanonicalPath(job);
  if (hardNoindexPaths.has(path)) {
    return {
      indexable: false,
      robots: 'noindex, follow',
      reason: 'hard_noindex',
    };
  }

  const isTopCity = splitJobCities(job.location).some((city) =>
    topIndexableCities.has(city),
  );
  if (isTopCity) {
    return {
      indexable: true,
      robots: 'index, follow',
      reason: 'top_city_allowlist',
    };
  }

  if (localIndexablePaths.has(path)) {
    return {
      indexable: true,
      robots: 'index, follow',
      reason: 'local_score',
    };
  }

  if (gscIndexablePaths.has(path)) {
    return {
      indexable: true,
      robots: 'index, follow',
      reason: 'gsc_vacancy_intent',
    };
  }

  return {
    indexable: false,
    robots: 'noindex, follow',
    reason: 'low_unique_search_demand',
  };
};

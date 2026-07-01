export const TOP_INDEXABLE_VACANCY_CITIES = [
  'Москва',
  'Санкт-Петербург',
  'Казань',
] as const;

export const HARD_NOINDEX_VACANCY_PATHS = [] as const;

export const INDEXABLE_GSC_RECOMMENDATIONS = [
  'index_detail',
  'index_detail_watch',
] as const;

export type VacancyIndexabilityReason =
  | 'top_city_allowlist'
  | 'local_score'
  | 'gsc_vacancy_intent'
  | 'hard_noindex'
  | 'low_unique_search_demand';

export type VacancyIndexabilityDecision = {
  indexable: boolean;
  robots: 'index, follow' | 'noindex, follow';
  reason: VacancyIndexabilityReason;
};

type VacancyCtrTreatment = {
  id: string;
  titleOverride: string;
  controlSourceSlug: string;
  successThreshold: string;
};

const VACANCY_CTR_TREATMENTS: Readonly<Record<string, VacancyCtrTreatment>> = {
  'ozon-goods-handler-horugvino-foot': {
    id: 'horugvino-warehouse-title-v1',
    titleOverride: 'Работа на складе Ozon в Хоругвино — от 65 000 ₽, график 2/2',
    controlSourceSlug: 'ozon-goods-handler',
    successThreshold: '100 impressions or 21 days; CTR >= 2%; position >= 5',
  },
};

export const getVacancyTitleOverride = (slug: string): string | undefined =>
  VACANCY_CTR_TREATMENTS[slug]?.titleOverride;

export const getVacancyCtrTreatment = (
  slug: string,
): VacancyCtrTreatment | undefined => VACANCY_CTR_TREATMENTS[slug];

import { CITY_DATASET } from './cities-dataset';
import { slugifyCity } from '../utils/cities';
import baseline from './seoTitleTestBaseline.json';
import freshCatalogue from './ozon-fresh-vacancies.json';
import expandedBaseline from './seoExpandedTitleBaseline.json';

type VacancyCtrTreatment = {
  id: string;
  titleOverride: string;
  controlSourceSlug: string;
  successThreshold: string;
};

const VACANCY_CTR_TREATMENTS: Readonly<Record<string, VacancyCtrTreatment>> = {
  'ozon-goods-handler-horugvino-foot': {
    id: 'horugvino-goods-handler-title-v2',
    titleOverride: 'Специалист по обработке товаров Ozon в Хоругвино',
    controlSourceSlug: 'ozon-goods-handler',
    successThreshold: 'Review 28 complete days after verified publication, at comparable query, device and position mix; low volume is inconclusive',
  },
};

export type FreshTitleArm = 'role' | 'income' | 'income_emoji';
type FreshTitleTest = VacancyCtrTreatment & { arm: FreshTitleArm; city: string };

// Frozen URL assignment: the same HTML is served to visitors and crawlers.
// All arms launch together; changing cities mid-test invalidates comparison.
const freshTests = new Map<string, FreshTitleTest>(baseline.cohorts.map((row) => {
  const arm = row.arm;
  if (arm !== 'role' && arm !== 'income' && arm !== 'income_emoji') {
    throw new Error(`Unknown title-test arm: ${arm}`);
  }
  const citySlug = row.slug.replace(/^ozon-fresh-courier-/u, '').replace(/-foot$/u, '');
  const city = CITY_DATASET.find((item) => slugifyCity(item.name) === citySlug)?.name ??
    freshCatalogue.flatMap((role) => role.cities).find((item) => slugifyCity(item.cityName) === citySlug)?.cityName;
  if (!city) throw new Error(`Missing title-test city: ${citySlug}`);
  const roleTitle = `Пеший курьер Ozon fresh · ${city}`;
  const titleOverride = `${arm === 'income_emoji' ? '⚡ ' : ''}${roleTitle}${arm === 'role' ? '' : ' — до 8 000 ₽/день'}`;
  if (titleOverride.length > 70) throw new Error(`Title-test text is too long: ${row.slug}`);
  return [row.slug, {
    id: `${baseline.id}-${arm}`,
    arm,
    city,
    titleOverride,
    controlSourceSlug: 'ozon-fresh-courier',
    successThreshold: 'Compare 28 complete post-publication days and actual Google title uptake; segment by query, device and position; low volume is inconclusive',
  }];
}));

export const getFreshTitleTest = (slug: string): FreshTitleTest | undefined => freshTests.get(slug);

// This complete, frozen Pages export supersedes the initial Fresh-only test.
// Keep its archived accessor above for historical reports, not page rendering.
const expandedTests = new Map(expandedBaseline.cohorts.map((row) => [row.slug, {
  id: `${expandedBaseline.id}-${row.arm}`,
  arm: row.arm,
  city: row.city,
  titleOverride: row.title,
  controlSourceSlug: row.sourceSlug,
  successThreshold: 'Compare complete periods after actual Google title uptake; segment by source, query, device and position; account for concurrent redesign and inconclusive low volume',
}]));

export const getVacancyTitleExperiment = (slug: string) => expandedTests.get(slug);

export const getVacancyTitleOverride = (slug: string): string | undefined =>
  expandedTests.get(slug)?.titleOverride ?? VACANCY_CTR_TREATMENTS[slug]?.titleOverride;

export const getVacancyCtrTreatment = (
  slug: string,
): VacancyCtrTreatment | undefined => expandedTests.get(slug) ?? VACANCY_CTR_TREATMENTS[slug];

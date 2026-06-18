import type { ReviewLike } from './companies';
import { seededShuffle } from './seededShuffle';

export const BRAND_REVIEW_SAMPLE_LIMIT = 6;
export const HOMEPAGE_REVIEW_SAMPLE_LIMIT = 3;
export const COMPANY_FEATURED_REVIEW_LIMIT = 4;

export const REVIEW_SAMPLE_SEEDS = {
  brandPrefix: 'otzyvy-',
  homepage: 'reviews-home',
} as const;

type NamedReview = Pick<ReviewLike, 'name'>;
type CityReview = Pick<ReviewLike, 'city'>;

export const pickUniqueReviewerNames = <T extends NamedReview>(
  reviews: readonly T[],
  limit: number,
): T[] => {
  const picked: T[] = [];
  const seenNames = new Set<string>();

  for (const review of reviews) {
    const nameKey = review.name.trim().toLowerCase();
    if (seenNames.has(nameKey)) continue;
    seenNames.add(nameKey);
    picked.push(review);
    if (picked.length >= limit) break;
  }

  return picked;
};

const normalizeSampleKey = (value: string): string => value.trim().toLowerCase();

export const pickDiverseReviewSample = <T extends NamedReview & CityReview>(
  reviews: readonly T[],
  seed: string,
  limit: number,
): T[] => {
  const shuffled = seededShuffle(reviews, seed);
  const picked: T[] = [];
  const seenNames = new Set<string>();
  const seenCities = new Set<string>();

  const tryPick = (review: T, requireUniqueCity: boolean): boolean => {
    const nameKey = normalizeSampleKey(review.name);
    const cityKey = normalizeSampleKey(review.city);
    if (seenNames.has(nameKey)) return false;
    if (requireUniqueCity && seenCities.has(cityKey)) return false;

    seenNames.add(nameKey);
    seenCities.add(cityKey);
    picked.push(review);
    return picked.length >= limit;
  };

  for (const review of shuffled) {
    if (tryPick(review, true)) return picked;
  }

  for (const review of shuffled) {
    if (tryPick(review, false)) return picked;
  }

  for (const review of shuffled) {
    if (picked.includes(review)) continue;
    picked.push(review);
    if (picked.length >= limit) break;
  }

  return picked;
};

export const pickBrandReviewSample = <T extends ReviewLike>(
  brandReviews: readonly T[],
  brand: string,
): T[] => pickDiverseReviewSample(
  brandReviews,
  `${REVIEW_SAMPLE_SEEDS.brandPrefix}${brand}`,
  BRAND_REVIEW_SAMPLE_LIMIT,
);

export const pickAggregateBrandReviewSample = <T extends ReviewLike>(
  brandReviews: readonly T[],
  brand: string,
): T[] => pickBrandReviewSample(brandReviews, brand);

export const pickBrandReviewBlockSample = <T extends ReviewLike>(
  brandReviews: readonly T[],
  company: string,
): T[] => pickBrandReviewSample(brandReviews, company);

export const pickHomepageReviewSample = <T extends NamedReview>(
  reviews: readonly T[],
): T[] =>
  pickUniqueReviewerNames(
    seededShuffle(reviews, REVIEW_SAMPLE_SEEDS.homepage),
    HOMEPAGE_REVIEW_SAMPLE_LIMIT,
  );

export const pickFeaturedCompanyReviews = <T extends ReviewLike>(
  brandReviews: readonly T[],
  brand: string,
): T[] => pickBrandReviewSample(brandReviews, brand).slice(0, COMPANY_FEATURED_REVIEW_LIMIT);

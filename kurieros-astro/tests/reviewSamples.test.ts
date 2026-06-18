import { describe, expect, it } from 'vitest';
import {
  BRAND_REVIEW_SAMPLE_LIMIT,
  COMPANY_FEATURED_REVIEW_LIMIT,
  HOMEPAGE_REVIEW_SAMPLE_LIMIT,
  REVIEW_SAMPLE_SEEDS,
  pickAggregateBrandReviewSample,
  pickBrandReviewSample,
  pickBrandReviewBlockSample,
  pickDiverseReviewSample,
  pickFeaturedCompanyReviews,
  pickHomepageReviewSample,
  pickUniqueReviewerNames,
} from '../src/utils/reviewSamples';
import { seededShuffle } from '../src/utils/seededShuffle';
import type { ReviewLike } from '../src/utils/companies';

const makeReview = (index: number, overrides: Partial<ReviewLike> = {}): ReviewLike => ({
  company: overrides.company ?? 'Яндекс Еда',
  rating: overrides.rating ?? 4,
  city: overrides.city ?? 'Москва',
  comment: overrides.comment ?? `Комментарий ${index}`,
  pros: overrides.pros ?? `Плюсы ${index}`,
  cons: overrides.cons ?? `Минусы ${index}`,
  date: overrides.date ?? `2025-01-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`,
  name: overrides.name ?? `Reviewer ${index}`,
});

describe('review sample helpers', () => {
  it('uses one brand sample for aggregate and vacancy review blocks', () => {
    const reviews = Array.from({ length: 10 }, (_, index) => makeReview(index, {
      city: `Город ${index}`,
    }));
    const actual = pickAggregateBrandReviewSample(reviews, 'Яндекс Еда');
    const vacancyBlock = pickBrandReviewBlockSample(reviews, 'Яндекс Еда');
    const direct = pickBrandReviewSample(reviews, 'Яндекс Еда');

    expect(actual.map((review) => review.name)).toEqual(
      vacancyBlock.map((review) => review.name),
    );
    expect(actual.map((review) => review.name)).toEqual(direct.map((review) => review.name));
    expect(actual).toHaveLength(BRAND_REVIEW_SAMPLE_LIMIT);
  });

  it('keeps brand samples deterministic on the shared brand seed', () => {
    const reviews = Array.from({ length: 10 }, (_, index) => makeReview(index, {
      city: `Город ${index}`,
    }));
    const expected = pickDiverseReviewSample(
      reviews,
      `${REVIEW_SAMPLE_SEEDS.brandPrefix}Яндекс Еда`,
      BRAND_REVIEW_SAMPLE_LIMIT,
    );
    const actual1 = pickBrandReviewSample(reviews, 'Яндекс Еда');
    const actual2 = pickBrandReviewSample(reviews, 'Яндекс Еда');

    expect(actual1.map((review) => review.name)).toEqual(actual2.map((review) => review.name));
    expect(new Set(actual1.map((review) => review.name)).size).toBe(actual1.length);
    expect(actual1.map((review) => review.name)).toEqual(expected.map((review) => review.name));
  });

  it('prefers unique reviewer names and cities for brand samples', () => {
    const reviews = [
      makeReview(0, { name: 'Анна', city: 'Москва' }),
      makeReview(1, { name: 'Анна', city: 'Казань' }),
      makeReview(2, { name: 'Борис', city: 'Москва' }),
      makeReview(3, { name: 'Вера', city: 'Самара' }),
      makeReview(4, { name: 'Глеб', city: 'Тула' }),
      makeReview(5, { name: 'Дина', city: 'Омск' }),
      makeReview(6, { name: 'Егор', city: 'Пермь' }),
      makeReview(7, { name: 'Жанна', city: 'Уфа' }),
    ];
    const sample = pickBrandReviewSample(reviews, 'Яндекс Еда');

    expect(sample).toHaveLength(BRAND_REVIEW_SAMPLE_LIMIT);
    expect(new Set(sample.map((review) => review.name)).size).toBe(sample.length);
    expect(new Set(sample.map((review) => review.city)).size).toBe(sample.length);
  });

  it('falls back to repeated names only when the pool lacks enough unique names', () => {
    const reviews = [
      makeReview(0, { name: 'Анна', city: 'Москва' }),
      makeReview(1, { name: 'Анна', city: 'Казань' }),
      makeReview(2, { name: 'Борис', city: 'Самара' }),
      makeReview(3, { name: 'Борис', city: 'Тула' }),
      makeReview(4, { name: 'Вера', city: 'Омск' }),
      makeReview(5, { name: 'Вера', city: 'Пермь' }),
      makeReview(6, { name: 'Вера', city: 'Уфа' }),
    ];
    const sample = pickBrandReviewSample(reviews, 'Яндекс Еда');

    expect(sample).toHaveLength(BRAND_REVIEW_SAMPLE_LIMIT);
    expect(new Set(sample.map((review) => review.name)).size).toBe(3);
  });

  it('keeps homepage samples unique by reviewer name', () => {
    const reviews = [
      makeReview(0, { name: 'Анна' }),
      makeReview(1, { name: 'Анна' }),
      makeReview(2, { name: 'Борис' }),
      makeReview(3, { name: 'Вера' }),
      makeReview(4, { name: 'Глеб' }),
    ];
    const expected = pickUniqueReviewerNames(
      seededShuffle(reviews, REVIEW_SAMPLE_SEEDS.homepage),
      HOMEPAGE_REVIEW_SAMPLE_LIMIT,
    );

    expect(pickHomepageReviewSample(reviews).map((review) => review.name)).toEqual(
      expected.map((review) => review.name),
    );
    expect(new Set(pickHomepageReviewSample(reviews).map((review) => review.name)).size)
      .toBe(pickHomepageReviewSample(reviews).length);
  });

  it('uses the shared brand sample for company page featured reviews', () => {
    const reviews = Array.from({ length: 10 }, (_, index) => makeReview(index, {
      city: `Город ${index}`,
    }));
    const expected = pickBrandReviewSample(reviews, 'Яндекс Еда')
      .slice(0, COMPANY_FEATURED_REVIEW_LIMIT);

    expect(pickFeaturedCompanyReviews(reviews, 'Яндекс Еда').map((review) => review.name)).toEqual([
      ...expected.map((review) => review.name),
    ]);
    expect(pickFeaturedCompanyReviews(reviews, 'Яндекс Еда'))
      .toHaveLength(COMPANY_FEATURED_REVIEW_LIMIT);
  });

  it('does not mutate input arrays', () => {
    const reviews = Array.from({ length: 8 }, (_, index) => makeReview(index));
    const before = reviews.map((review) => review.name);

    pickAggregateBrandReviewSample(reviews, 'Яндекс Еда');
    pickBrandReviewSample(reviews, 'Яндекс Еда');
    pickBrandReviewBlockSample(reviews, 'Яндекс Еда');
    pickHomepageReviewSample(reviews);
    pickFeaturedCompanyReviews(reviews, 'Яндекс Еда');

    expect(reviews.map((review) => review.name)).toEqual(before);
  });
});

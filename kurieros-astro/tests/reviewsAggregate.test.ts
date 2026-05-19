/**
 * Unit tests for src/utils/reviewsAggregate.ts
 *
 * AAA (Arrange-Act-Assert) structure throughout.
 * Synthetic fixtures only — no file I/O, no imports from reviews.json.
 */

import { describe, it, expect } from 'vitest';
import {
  REVIEWS_BRAND_SLUG,
  MIN_REVIEWS_PER_BRAND,
  buildReviewAggregate,
  buildReviewsSchemaGraph,
  type BrandReviewSummary,
  type ReviewLike,
} from '../src/utils/reviewsAggregate';

// ---- Fixtures --------------------------------------------------------

/** Build a minimal ReviewLike with sensible defaults. */
function makeReview(overrides: Partial<ReviewLike> & { company: string }): ReviewLike {
  return {
    company: overrides.company,
    rating: overrides.rating ?? 4,
    city: overrides.city ?? 'Москва',
    comment: overrides.comment ?? 'Нормально',
    pros: overrides.pros ?? 'Плюсы',
    cons: overrides.cons ?? 'Минусы',
    date: overrides.date ?? '2025-01-01T00:00:00.000Z',
    name: overrides.name ?? 'Аноним',
  };
}

/** Make N reviews for a given company with optional rating. */
function makeReviews(
  company: string,
  count: number,
  rating?: number,
): ReviewLike[] {
  return Array.from({ length: count }, (_, i) =>
    makeReview({ company, rating, name: `User${i}` }),
  );
}

// ---- REVIEWS_BRAND_SLUG -----------------------------------------------

describe('REVIEWS_BRAND_SLUG', () => {
  it('contains exactly 8 entries', () => {
    // Arrange / Act: the constant is imported directly.
    const entries = Object.entries(REVIEWS_BRAND_SLUG);
    // Assert
    expect(entries).toHaveLength(8);
  });

  it('every value is a non-empty slug-format string', () => {
    // Arrange
    const slugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
    // Act / Assert
    for (const [brand, slug] of Object.entries(REVIEWS_BRAND_SLUG)) {
      expect(slug, `slug for "${brand}"`).toMatch(slugPattern);
      expect(slug.length, `slug for "${brand}"`).toBeGreaterThan(0);
    }
  });

  it('contains all 8 expected brand display names as keys', () => {
    // Arrange
    const expectedBrands = [
      'Купер (ex. СберМаркет)',
      'Альфа-Банк',
      'Efin',
      'Т-Банк',
      'Яндекс Еда',
      'Бургер Кинг',
      'Ozon fresh',
      'Ozon',
    ];
    // Act / Assert
    for (const brand of expectedBrands) {
      expect(REVIEWS_BRAND_SLUG, `brand "${brand}" should be a key`).toHaveProperty(brand);
    }
  });

  it('maps Купер (ex. СберМаркет) to kuper-ex-sbermarket', () => {
    expect(REVIEWS_BRAND_SLUG['Купер (ex. СберМаркет)']).toBe('kuper-ex-sbermarket');
  });
});

// ---- buildReviewAggregate --------------------------------------------

describe('buildReviewAggregate', () => {
  it('returns [] when input is []', () => {
    // Arrange
    const input: ReviewLike[] = [];
    // Act
    const result = buildReviewAggregate(input);
    // Assert
    expect(result).toEqual([]);
  });

  it('groups reviews by the company field', () => {
    // Arrange
    const reviews = [
      ...makeReviews('BrandA', 5, 4),
      ...makeReviews('BrandB', 3, 3),
    ];
    // Act
    const result = buildReviewAggregate(reviews);
    // Assert
    const brands = result.map((s) => s.brand);
    expect(brands).toContain('BrandA');
    expect(brands).toContain('BrandB');
    expect(result.find((s) => s.brand === 'BrandA')?.reviewCount).toBe(5);
    expect(result.find((s) => s.brand === 'BrandB')?.reviewCount).toBe(3);
  });

  it('excludes brands with < MIN_REVIEWS_PER_BRAND reviews', () => {
    // Arrange: brand has exactly MIN_REVIEWS_PER_BRAND - 1 reviews
    const reviews = makeReviews('SmallBrand', MIN_REVIEWS_PER_BRAND - 1, 4);
    // Act
    const result = buildReviewAggregate(reviews);
    // Assert
    expect(result).toHaveLength(0);
  });

  it('includes brands with exactly MIN_REVIEWS_PER_BRAND reviews', () => {
    // Arrange
    const reviews = makeReviews('ExactBrand', MIN_REVIEWS_PER_BRAND, 4);
    // Act
    const result = buildReviewAggregate(reviews);
    // Assert
    expect(result).toHaveLength(1);
    expect(result[0].brand).toBe('ExactBrand');
    expect(result[0].reviewCount).toBe(MIN_REVIEWS_PER_BRAND);
  });

  it('averageRating is 1-decimal, clamped to [1, 5]', () => {
    // Arrange: ratings that average to e.g. 4.333...
    const reviews = [
      makeReview({ company: 'Brand', rating: 4 }),
      makeReview({ company: 'Brand', rating: 4 }),
      makeReview({ company: 'Brand', rating: 5 }),
    ];
    // Act
    const result = buildReviewAggregate(reviews);
    // Assert
    const avg = result[0].averageRating;
    expect(avg).toBe(4.3);
    // 1 decimal: no more than 1 decimal place
    expect(String(avg).split('.')[1]?.length ?? 0).toBeLessThanOrEqual(1);
    // Clamped to [1, 5]
    expect(avg).toBeGreaterThanOrEqual(1);
    expect(avg).toBeLessThanOrEqual(5);
  });

  it('averageRating is exactly 5 when all ratings are 5', () => {
    // Arrange
    const reviews = makeReviews('PerfectBrand', 5, 5);
    // Act
    const result = buildReviewAggregate(reviews);
    // Assert
    expect(result[0].averageRating).toBe(5);
    // Must not exceed 5 due to floating-point
    expect(result[0].averageRating).not.toBeGreaterThan(5);
  });

  it('excludes non-finite ratings from the average', () => {
    // Arrange: mix of finite and non-finite ratings
    const reviews = [
      makeReview({ company: 'Brand', rating: 4 }),
      makeReview({ company: 'Brand', rating: NaN }),
      makeReview({ company: 'Brand', rating: Infinity }),
      makeReview({ company: 'Brand', rating: 4 }),
      makeReview({ company: 'Brand', rating: 4 }),
    ];
    // Act
    const result = buildReviewAggregate(reviews);
    // Assert: average should use only the 3 finite-4 ratings
    expect(result[0].averageRating).toBe(4);
    expect(Number.isFinite(result[0].averageRating)).toBe(true);
    expect(result[0].averageRating).not.toBeNaN();
  });

  it('ratingDistribution counts only integer ratings 1-5', () => {
    // Arrange: mix of integer, fractional, and out-of-range ratings
    const reviews = [
      makeReview({ company: 'Brand', rating: 1 }),
      makeReview({ company: 'Brand', rating: 3 }),
      makeReview({ company: 'Brand', rating: 5 }),
      makeReview({ company: 'Brand', rating: 3.5 }), // fractional — excluded
      makeReview({ company: 'Brand', rating: 6 }),   // out of range — excluded
      makeReview({ company: 'Brand', rating: 0 }),   // out of range — excluded
    ];
    // Act
    const result = buildReviewAggregate(reviews);
    const dist = result[0].ratingDistribution;
    // Assert: only integers 1, 3, 5 counted
    expect(dist[1]).toBe(1);
    expect(dist[2]).toBe(0);
    expect(dist[3]).toBe(1);
    expect(dist[4]).toBe(0);
    expect(dist[5]).toBe(1);
  });

  it('ratingDistribution has keys 1-5 always present', () => {
    // Arrange
    const reviews = makeReviews('Brand', 3, 4);
    // Act
    const result = buildReviewAggregate(reviews);
    const dist = result[0].ratingDistribution;
    // Assert: all 5 keys exist
    expect(dist).toHaveProperty('1');
    expect(dist).toHaveProperty('2');
    expect(dist).toHaveProperty('3');
    expect(dist).toHaveProperty('4');
    expect(dist).toHaveProperty('5');
  });

  it('sampleReviews length is ≤6', () => {
    // Arrange: 10 reviews for a brand
    const reviews = makeReviews('Brand', 10, 4);
    // Act
    const result = buildReviewAggregate(reviews);
    // Assert
    expect(result[0].sampleReviews.length).toBeLessThanOrEqual(6);
  });

  it('sampleReviews is deterministic — two calls with same input produce same result', () => {
    // Arrange
    const reviews = makeReviews('Brand', 10, 4);
    // Act
    const result1 = buildReviewAggregate(reviews);
    const result2 = buildReviewAggregate(reviews);
    // Assert
    expect(result1[0].sampleReviews.map((r) => r.name)).toEqual(
      result2[0].sampleReviews.map((r) => r.name),
    );
  });

  it('result is sorted descending by reviewCount', () => {
    // Arrange
    const reviews = [
      ...makeReviews('Smaller', 3, 4),
      ...makeReviews('Larger', 10, 4),
      ...makeReviews('Medium', 6, 4),
    ];
    // Act
    const result = buildReviewAggregate(reviews);
    // Assert
    const counts = result.map((s) => s.reviewCount);
    for (let i = 0; i < counts.length - 1; i++) {
      expect(counts[i]).toBeGreaterThanOrEqual(counts[i + 1]);
    }
    expect(result[0].brand).toBe('Larger');
  });

  it('companyHref is defined for a brand in REVIEWS_BRAND_SLUG', () => {
    // Arrange: use an exact brand display name from the map
    const reviews = makeReviews('Яндекс Еда', 5, 4);
    // Act
    const result = buildReviewAggregate(reviews);
    // Assert
    expect(result[0].companyHref).toBe('/companies/yandex-eda/');
  });

  it('companyHref is undefined for a brand not in REVIEWS_BRAND_SLUG', () => {
    // Arrange: brand name not in the map
    const reviews = makeReviews('Неизвестная Компания', 5, 4);
    // Act
    const result = buildReviewAggregate(reviews);
    // Assert
    expect(result[0].companyHref).toBeUndefined();
  });

  it('does not mutate the input array', () => {
    // Arrange
    const reviews = makeReviews('Brand', 5, 4);
    const originalLength = reviews.length;
    const firstItem = reviews[0];
    // Act
    buildReviewAggregate(reviews);
    // Assert: input array unchanged
    expect(reviews).toHaveLength(originalLength);
    expect(reviews[0]).toBe(firstItem);
  });
});

// ---- buildReviewsSchemaGraph ------------------------------------------

describe('buildReviewsSchemaGraph', () => {
  const PAGE_URL = 'https://kurerok.ru/otzyvy/';
  const SITE_URL = 'https://kurerok.ru';

  /** Build a minimal BrandReviewSummary. */
  function makeSummary(overrides: Partial<BrandReviewSummary> & { brand: string }): BrandReviewSummary {
    const brand = overrides.brand;
    const slug = REVIEWS_BRAND_SLUG[brand] ?? '';
    const defaultCompanyHref = slug !== '' ? `/companies/${slug}/` : undefined;
    return {
      brand,
      slug: overrides.slug ?? slug,
      companyHref: overrides.companyHref !== undefined ? overrides.companyHref : defaultCompanyHref,
      reviewCount: overrides.reviewCount ?? 5,
      averageRating: overrides.averageRating ?? 4.2,
      ratingDistribution: overrides.ratingDistribution ?? { 1: 0, 2: 0, 3: 1, 4: 2, 5: 2 },
      sampleReviews: overrides.sampleReviews ?? makeReviews(brand, 3, 4),
    };
  }

  it('@graph top node is CollectionPage', () => {
    // Arrange
    const summaries: BrandReviewSummary[] = [];
    // Act
    const graph = buildReviewsSchemaGraph(summaries, PAGE_URL, SITE_URL);
    // Assert
    expect(graph.length).toBeGreaterThanOrEqual(1);
    expect(graph[0]['@type']).toBe('CollectionPage');
  });

  it('no top-level AggregateRating node exists in @graph', () => {
    // Arrange: provide a summary with all conditions met
    const summaries = [makeSummary({ brand: 'Яндекс Еда', reviewCount: 5, averageRating: 4.2 })];
    // Act
    const graph = buildReviewsSchemaGraph(summaries, PAGE_URL, SITE_URL);
    // Assert: no root-level AggregateRating — cast through unknown to widen the type
    // (TypeScript knows the schema union doesn't include AggregateRating, but we want
    // to assert this property defensively for documentation and future-proofing.)
    const hasAggregateRating = (graph as unknown[]).some(
      (node) => (node as { '@type'?: string })['@type'] === 'AggregateRating',
    );
    expect(hasAggregateRating).toBe(false);
  });

  it('emits Organization + aggregateRating for brand with companyHref and reviewCount>=MIN', () => {
    // Arrange
    const summaries = [
      makeSummary({ brand: 'Яндекс Еда', reviewCount: 5, averageRating: 4.2 }),
    ];
    // Act
    const graph = buildReviewsSchemaGraph(summaries, PAGE_URL, SITE_URL);
    // Assert: one Organization node present
    const orgNodes = graph.filter((n) => n['@type'] === 'Organization');
    expect(orgNodes).toHaveLength(1);
    const org = orgNodes[0] as { '@type': 'Organization'; name: string; aggregateRating: unknown };
    expect(org.name).toBe('Яндекс Еда');
    expect(org.aggregateRating).toBeDefined();
  });

  it('does NOT emit Organization for brand with companyHref=undefined', () => {
    // Arrange: brand not in the map — companyHref is undefined
    const summaries: BrandReviewSummary[] = [
      {
        brand: 'Неизвестная Компания',
        slug: '',
        companyHref: undefined,
        reviewCount: 5,
        averageRating: 4.0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 5, 5: 0 },
        sampleReviews: makeReviews('Неизвестная Компания', 3, 4),
      },
    ];
    // Act
    const graph = buildReviewsSchemaGraph(summaries, PAGE_URL, SITE_URL);
    // Assert: no Organization nodes
    const orgNodes = graph.filter((n) => n['@type'] === 'Organization');
    expect(orgNodes).toHaveLength(0);
  });

  it('does NOT emit Organization for brand with reviewCount < MIN_REVIEWS_PER_BRAND', () => {
    // Arrange: brand in map but review count below threshold
    const summaries: BrandReviewSummary[] = [
      {
        brand: 'Яндекс Еда',
        slug: 'yandex-eda',
        companyHref: '/companies/yandex-eda/',
        reviewCount: MIN_REVIEWS_PER_BRAND - 1,
        averageRating: 4.0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 2, 5: 0 },
        sampleReviews: makeReviews('Яндекс Еда', 2, 4),
      },
    ];
    // Act
    const graph = buildReviewsSchemaGraph(summaries, PAGE_URL, SITE_URL);
    // Assert
    const orgNodes = graph.filter((n) => n['@type'] === 'Organization');
    expect(orgNodes).toHaveLength(0);
  });

  it('ratingValue is a finite number in [1, 5] in every aggregateRating', () => {
    // Arrange: multiple brands with valid data
    const summaries = [
      makeSummary({ brand: 'Яндекс Еда', averageRating: 4.2 }),
      makeSummary({ brand: 'Альфа-Банк', averageRating: 3.8 }),
    ];
    // Act
    const graph = buildReviewsSchemaGraph(summaries, PAGE_URL, SITE_URL);
    // Assert: every aggregateRating ratingValue is valid
    const orgNodes = graph.filter((n) => n['@type'] === 'Organization') as Array<{
      aggregateRating: { ratingValue: number };
    }>;
    for (const org of orgNodes) {
      const rv = org.aggregateRating.ratingValue;
      expect(Number.isFinite(rv)).toBe(true);
      expect(rv).not.toBeNaN();
      expect(rv).toBeGreaterThanOrEqual(1);
      expect(rv).toBeLessThanOrEqual(5);
      expect(rv).not.toBe(0);
    }
  });

  it('Review samples are ≤6 per brand', () => {
    // Arrange: summary with 6 sample reviews (max allowed)
    const sixSamples = makeReviews('Яндекс Еда', 6, 4);
    const summaries: BrandReviewSummary[] = [
      {
        brand: 'Яндекс Еда',
        slug: 'yandex-eda',
        companyHref: '/companies/yandex-eda/',
        reviewCount: 10,
        averageRating: 4.0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 10, 5: 0 },
        sampleReviews: sixSamples,
      },
    ];
    // Act
    const graph = buildReviewsSchemaGraph(summaries, PAGE_URL, SITE_URL);
    // Assert
    const orgNode = graph.find((n) => n['@type'] === 'Organization') as
      | { review?: unknown[] }
      | undefined;
    expect(orgNode).toBeDefined();
    expect((orgNode?.review ?? []).length).toBeLessThanOrEqual(6);
  });

  it('each review node has @type: "Review"', () => {
    // Arrange
    const summaries = [makeSummary({ brand: 'Яндекс Еда', reviewCount: 5, averageRating: 4.2 })];
    // Act
    const graph = buildReviewsSchemaGraph(summaries, PAGE_URL, SITE_URL);
    // Assert
    const orgNode = graph.find((n) => n['@type'] === 'Organization') as
      | { review?: Array<{ '@type': string }> }
      | undefined;
    expect(orgNode?.review).toBeDefined();
    for (const reviewNode of orgNode?.review ?? []) {
      expect(reviewNode['@type']).toBe('Review');
    }
  });

  it('@graph ItemList has correct number of entries matching summaries', () => {
    // Arrange: 3 summaries (mix of with/without companyHref)
    const summaries: BrandReviewSummary[] = [
      makeSummary({ brand: 'Яндекс Еда', reviewCount: 5, averageRating: 4.2 }),
      makeSummary({ brand: 'Альфа-Банк', reviewCount: 4, averageRating: 3.9 }),
      {
        brand: 'Неизвестный Бренд',
        slug: '',
        companyHref: undefined,
        reviewCount: 3,
        averageRating: 4.0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 3, 5: 0 },
        sampleReviews: makeReviews('Неизвестный Бренд', 3, 4),
      },
    ];
    // Act
    const graph = buildReviewsSchemaGraph(summaries, PAGE_URL, SITE_URL);
    // Assert
    const collectionPage = graph[0] as {
      '@type': 'CollectionPage';
      mainEntity: { itemListElement: unknown[] };
    };
    expect(collectionPage.mainEntity.itemListElement).toHaveLength(3);
  });

  it('CollectionPage url equals pageUrl', () => {
    // Arrange
    const summaries = [makeSummary({ brand: 'Яндекс Еда' })];
    // Act
    const graph = buildReviewsSchemaGraph(summaries, PAGE_URL, SITE_URL);
    // Assert
    const page = graph[0] as { url: string };
    expect(page.url).toBe(PAGE_URL);
  });

  it('Organization url uses siteUrl + companyHref without trailing slash doubling', () => {
    // Arrange: test with trailing slash on siteUrl
    const summaries = [makeSummary({ brand: 'Яндекс Еда', reviewCount: 5, averageRating: 4 })];
    // Act
    const graphWithSlash = buildReviewsSchemaGraph(summaries, PAGE_URL, 'https://kurerok.ru/');
    const graphWithoutSlash = buildReviewsSchemaGraph(summaries, PAGE_URL, 'https://kurerok.ru');
    // Assert: both produce the same valid URL
    const orgWithSlash = graphWithSlash.find((n) => n['@type'] === 'Organization') as { url: string };
    const orgWithoutSlash = graphWithoutSlash.find((n) => n['@type'] === 'Organization') as { url: string };
    expect(orgWithSlash.url).toBe('https://kurerok.ru/companies/yandex-eda/');
    expect(orgWithoutSlash.url).toBe('https://kurerok.ru/companies/yandex-eda/');
  });

  it('does not emit Organization when averageRating is non-finite (NaN)', () => {
    // Arrange: averageRating is NaN (edge case if somehow constructed)
    const summaries: BrandReviewSummary[] = [
      {
        brand: 'Яндекс Еда',
        slug: 'yandex-eda',
        companyHref: '/companies/yandex-eda/',
        reviewCount: 5,
        averageRating: NaN,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 5, 5: 0 },
        sampleReviews: makeReviews('Яндекс Еда', 3, 4),
      },
    ];
    // Act
    const graph = buildReviewsSchemaGraph(summaries, PAGE_URL, SITE_URL);
    // Assert: no Organization emitted for NaN averageRating
    const orgNodes = graph.filter((n) => n['@type'] === 'Organization');
    expect(orgNodes).toHaveLength(0);
  });
});

// ---- MIN_REVIEWS_PER_BRAND export ------------------------------------

describe('MIN_REVIEWS_PER_BRAND', () => {
  it('is exported as a number equal to 3', () => {
    expect(typeof MIN_REVIEWS_PER_BRAND).toBe('number');
    expect(MIN_REVIEWS_PER_BRAND).toBe(3);
  });
});

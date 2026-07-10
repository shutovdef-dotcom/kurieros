import { describe, expect, it } from 'vitest';
import { deriveCatalogueMetadata } from '../tools/lib/ozon-crawler.mjs';

const previous = {
  sourceCheckedAt: '2026-04-29T12:00:00.000Z',
  contentUpdatedAt: '2026-04-29T12:00:00.000Z',
};

describe('deriveCatalogueMetadata', () => {
  it('advances only sourceCheckedAt when a repeat crawl has identical content', () => {
    expect(
      deriveCatalogueMetadata({
        previous,
        previousCatalogue: [{ slug: 'rocket:courier', cities: [] }],
        nextCatalogue: [{ slug: 'rocket:courier', cities: [] }],
        checkedAt: '2026-07-10T09:30:00.000Z',
      }),
    ).toEqual({
      sourceCheckedAt: '2026-07-10T09:30:00.000Z',
      contentUpdatedAt: '2026-04-29T12:00:00.000Z',
    });
  });

  it('advances contentUpdatedAt only when normalized catalogue content changes', () => {
    expect(
      deriveCatalogueMetadata({
        previous,
        previousCatalogue: [{ slug: 'rocket:courier', cities: [] }],
        nextCatalogue: [{ slug: 'rocket:courier', cities: [{ cityName: 'Москва' }] }],
        checkedAt: '2026-07-10T09:30:00.000Z',
      }),
    ).toEqual({
      sourceCheckedAt: '2026-07-10T09:30:00.000Z',
      contentUpdatedAt: '2026-07-10T09:30:00.000Z',
    });
  });

  it('initializes both timestamps on the first successful source check', () => {
    expect(
      deriveCatalogueMetadata({
        previous: undefined,
        previousCatalogue: undefined,
        nextCatalogue: [{ slug: 'rocket:courier', cities: [] }],
        checkedAt: '2026-07-10T09:30:00.000Z',
      }),
    ).toEqual({
      sourceCheckedAt: '2026-07-10T09:30:00.000Z',
      contentUpdatedAt: '2026-07-10T09:30:00.000Z',
    });
  });

  it('rejects an invalid source-check timestamp instead of writing false freshness', () => {
    expect(() =>
      deriveCatalogueMetadata({
        previous,
        previousCatalogue: [],
        nextCatalogue: [],
        checkedAt: 'not-a-date',
      }),
    ).toThrow(/checkedAt/i);
  });
});

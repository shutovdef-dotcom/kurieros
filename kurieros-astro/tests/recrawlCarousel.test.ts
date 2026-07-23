import { describe, expect, it } from 'vitest';
import { buildRecrawlCarouselBatch } from '../src/utils/recrawlCarousel';

describe('buildRecrawlCarouselBatch', () => {
  it('mixes high-GSC vacancy pages with broad restored vacancy rotation', () => {
    const batch = buildRecrawlCarouselBatch({
      date: '2026-07-23',
      limit: 3,
      highPriorityShare: 2 / 3,
      indexablePaths: [
        '/v/a/',
        '/v/b/',
        '/v/c/',
        '/v/d/',
      ],
      gscRows: [
        { path: '/v/a/', clicks: 0, impressions: 4, avgPosition: 3 },
        { path: '/v/b/', clicks: 1, impressions: 1, avgPosition: 10 },
        { path: '/v/c/', clicks: 0, impressions: 10, avgPosition: 5 },
      ],
    });

    expect(batch.queueSizes).toEqual({
      totalIndexable: 4,
      highPriority: 2,
      broad: 2,
    });
    expect(batch.paths).toEqual(['/v/b/', '/v/c/', '/v/a/']);
    expect(batch.urls).toEqual([
      'https://kurerok.ru/v/b/',
      'https://kurerok.ru/v/c/',
      'https://kurerok.ru/v/a/',
    ]);
  });

  it('rotates the daily carousel deterministically by date', () => {
    const commonInput = {
      limit: 2,
      highPriorityShare: 0.5,
      indexablePaths: ['/v/a/', '/v/b/', '/v/c/', '/v/d/'],
      gscRows: [
        { path: '/v/a/', clicks: 2, impressions: 20, avgPosition: 2 },
        { path: '/v/b/', clicks: 1, impressions: 30, avgPosition: 3 },
      ],
    };

    expect(buildRecrawlCarouselBatch({ ...commonInput, date: '2026-07-23' }).paths)
      .toEqual(['/v/a/', '/v/c/']);
    expect(buildRecrawlCarouselBatch({ ...commonInput, date: '2026-07-24' }).paths)
      .toEqual(['/v/b/', '/v/d/']);
  });

  it('uses 200 URLs as the default daily limit for Google Indexing API queues', () => {
    const batch = buildRecrawlCarouselBatch({
      engine: 'google-indexing-api',
      date: '2026-07-23',
      indexablePaths: Array.from({ length: 250 }, (_, index) => `/v/job-${index}/`),
    });

    expect(batch.engine).toBe('google-indexing-api');
    expect(batch.limit).toBe(200);
    expect(batch.urls).toHaveLength(200);
  });

  it('normalizes clean vacancy URLs and excludes query, hash, and non-vacancy URLs', () => {
    const batch = buildRecrawlCarouselBatch({
      date: '2026-07-23',
      limit: 10,
      indexablePaths: [
        'https://kurerok.ru/v/a',
        'https://kurerok.ru/v/a/',
        'https://kurerok.ru/v/b/?utm=1',
        'https://kurerok.ru/v/c/#fragment',
        '/api/grid/',
        '/rabota-kurerom-moskva/',
      ],
      gscRows: [{ path: '/v/a/', clicks: 10, impressions: 100, avgPosition: 1 }],
    });

    expect(batch.paths).toEqual(['/v/a/']);
    expect(batch.queueSizes.totalIndexable).toBe(1);
  });
});

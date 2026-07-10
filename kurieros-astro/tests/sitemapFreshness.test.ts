import { describe, expect, it } from 'vitest';
import {
  buildSitemapFreshnessManifest,
  getSitemapContentUpdatedAt,
} from '../src/utils/sitemapFreshness';

describe('sitemap content freshness', () => {
  it('builds a deterministic path-to-content-date manifest', () => {
    const manifest = buildSitemapFreshnessManifest([
      {
        id: 'guide-b',
        contentUpdatedAt: '2026-06-02',
        paths: ['/guide/b/'],
      },
      {
        id: 'guide-a',
        contentUpdatedAt: '2026-06-01',
        paths: ['/guide/', '/guide/a/'],
      },
    ]);

    expect(manifest).toEqual({
      schemaVersion: 1,
      entries: {
        '/guide/': '2026-06-01',
        '/guide/a/': '2026-06-01',
        '/guide/b/': '2026-06-02',
      },
    });
    expect(Object.keys(manifest.entries)).toEqual([
      '/guide/',
      '/guide/a/',
      '/guide/b/',
    ]);
  });

  it('does not leak source-check or build timestamps into the manifest', () => {
    const manifest = buildSitemapFreshnessManifest([
      {
        id: 'knowledge-base',
        contentUpdatedAt: '2026-04-26',
        paths: ['/guide/vozrast/'],
        sourceCheckedAt: '2026-07-10T15:00:00.000Z',
        generatedAt: '2026-07-10T15:01:00.000Z',
      } as never,
    ]);

    const serialized = JSON.stringify(manifest);
    expect(serialized).not.toContain('sourceCheckedAt');
    expect(serialized).not.toContain('generatedAt');
    expect(serialized).toContain('2026-04-26');
  });

  it('omits unknown paths instead of inventing a lastmod', () => {
    const manifest = buildSitemapFreshnessManifest([
      {
        id: 'guide',
        contentUpdatedAt: '2026-05-19',
        paths: ['/kak-stat-kurerom/'],
      },
    ]);

    expect(
      getSitemapContentUpdatedAt(
        manifest,
        'https://kurerok.ru/kak-stat-kurerom/',
      ),
    ).toBe('2026-05-19');
    expect(
      getSitemapContentUpdatedAt(
        manifest,
        'https://kurerok.ru/v/unknown-vacancy/',
      ),
    ).toBeUndefined();
  });

  it('rejects invalid dates, non-canonical paths and conflicting owners', () => {
    expect(() =>
      buildSitemapFreshnessManifest([
        { id: 'bad-date', contentUpdatedAt: '2026-02-31', paths: ['/guide/'] },
      ]),
    ).toThrow(/contentUpdatedAt/i);

    expect(() =>
      buildSitemapFreshnessManifest([
        { id: 'bad-path', contentUpdatedAt: '2026-06-01', paths: ['guide'] },
      ]),
    ).toThrow(/canonical path/i);

    expect(() =>
      buildSitemapFreshnessManifest([
        { id: 'first', contentUpdatedAt: '2026-06-01', paths: ['/guide/'] },
        { id: 'second', contentUpdatedAt: '2026-06-02', paths: ['/guide/'] },
      ]),
    ).toThrow(/conflicting content dates/i);
  });
});

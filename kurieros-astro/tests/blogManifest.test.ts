import { describe, expect, it } from 'vitest';
import {
  BlogReleaseManifestSchema,
  getSitemapDateForBlogRelease,
} from '../src/utils/blogManifest';

const release = {
  sequence: 1,
  slug: 'test-article',
  releasedAt: '2026-08-03T09:04:00+03:00',
  firstPublishedAt: '2026-08-03T09:04:00+03:00',
  sourceCheckedAt: '2026-08-03T09:00:00+03:00',
  revision: 1,
  contentSha256: 'a'.repeat(64),
  deploySha: 'abcdef1',
};

describe('blog release manifest', () => {
  it('requires explicit actual release and publication facts', () => {
    expect(() =>
      BlogReleaseManifestSchema.parse({
        schemaVersion: 1,
        timezone: 'Europe/Moscow',
        generatedAt: null,
        releases: [{ ...release, firstPublishedAt: undefined }],
      }),
    ).toThrow();
  });

  it('keeps a truthful sitemap date tied to the latest actual content change', () => {
    expect(getSitemapDateForBlogRelease(release)).toBe('2026-08-03');
    expect(
      getSitemapDateForBlogRelease({
        ...release,
        modifiedAt: '2026-08-12T17:20:00+03:00',
      }),
    ).toBe('2026-08-12');
  });
});

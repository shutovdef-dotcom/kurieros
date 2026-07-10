import { describe, expect, it } from 'vitest';
import { buildBlogReleaseManifest } from '../src/utils/blogReleaseManifest';
import type { BlogCalendarEntry, BlogReleaseLedger, BlogReleaseRecord } from '../src/utils/blogRelease';

const calendar: BlogCalendarEntry[] = [
  { sequence: 1, slug: 'article-one', nominalPublishAt: '2026-08-03T09:00:00+03:00' },
  { sequence: 2, slug: 'article-two', nominalPublishAt: '2026-08-05T09:00:00+03:00' },
];

const ledger: BlogReleaseLedger = {
  schemaVersion: 1,
  timezone: 'Europe/Moscow',
  releases: [],
};

const candidate: BlogReleaseRecord = {
  sequence: 1,
  slug: 'article-one',
  releasedAt: '2026-08-03T09:03:00+03:00',
  firstPublishedAt: '2026-08-03T09:03:00+03:00',
  revision: 1,
  contentSha256: 'a'.repeat(64),
  deploySha: 'abcdef1',
};

describe('blog release manifest emitter', () => {
  it('does not turn a nominal date or a build date into publication evidence', () => {
    expect(buildBlogReleaseManifest(calendar, ledger)).toEqual({
      schemaVersion: 1,
      timezone: 'Europe/Moscow',
      generatedAt: null,
      releases: [],
    });
  });

  it('includes exactly one valid transient release candidate for its deployment build', () => {
    expect(buildBlogReleaseManifest(calendar, ledger, candidate)).toEqual({
      schemaVersion: 1,
      timezone: 'Europe/Moscow',
      generatedAt: candidate.releasedAt,
      releases: [candidate],
    });
  });

  it('fails closed when a candidate skips the release cursor', () => {
    expect(() =>
      buildBlogReleaseManifest(calendar, ledger, {
        ...candidate,
        sequence: 2,
        slug: 'article-two',
      }),
    ).toThrow(/release_not_strict_prefix/);
  });
});

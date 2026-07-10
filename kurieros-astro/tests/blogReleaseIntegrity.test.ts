import { describe, expect, it } from 'vitest';
import type { BlogContentDocument } from '../src/utils/blogContent';
import { validateReleasedBlogContentIntegrity } from '../src/utils/blogReleaseIntegrity';
import type { BlogReleaseLedger } from '../src/utils/blogRelease';

const document = (slug: string, contentSha256: string): BlogContentDocument => ({
  slug,
  contentSha256,
  body: '## Тест',
  wordCount: 700,
  headingCount: 3,
  frontmatter: {
    title: 'Достаточно длинный заголовок для тестовой статьи',
    description: 'Достаточно длинное описание тестовой статьи, чтобы удовлетворить редакционный контракт.',
    author: 'КурьерОк',
    type: 'new',
    status: 'ready',
    primaryIntent: 'тестовый запрос',
    pillarHref: '/guide/dohod/',
    sourceIds: ['official-source'],
    checkedAt: '2026-07-10',
    relatedSlugs: [],
    researchGate: 'none',
  },
});

const ledger = (contentSha256: string): BlogReleaseLedger => ({
  schemaVersion: 1,
  timezone: 'Europe/Moscow',
  releases: [{
    sequence: 1,
    slug: 'article-one',
    releasedAt: '2026-08-03T09:05:00+03:00',
    firstPublishedAt: '2026-08-03T09:05:00+03:00',
    sourceCheckedAt: '2026-08-03T09:00:00+03:00',
    revision: 1,
    contentSha256,
    deploySha: 'abcdef1',
  }],
});

describe('released blog content integrity', () => {
  it('accepts the exact editorial fingerprint recorded in the durable ledger', () => {
    expect(validateReleasedBlogContentIntegrity(ledger('a'.repeat(64)), [
      document('article-one', 'a'.repeat(64)),
    ])).toEqual({ ok: true, issues: [] });
  });

  it('fails closed if a published Markdown file changes without a revision record', () => {
    expect(validateReleasedBlogContentIntegrity(ledger('a'.repeat(64)), [
      document('article-one', 'b'.repeat(64)),
    ])).toEqual({
      ok: false,
      issues: [{
        slug: 'article-one',
        code: 'released_content_hash_mismatch',
        detail: 'ledger content SHA-256 does not match the current Markdown file',
      }],
    });
  });

  it('fails closed if a ledger row has no corresponding Markdown document', () => {
    expect(validateReleasedBlogContentIntegrity(ledger('a'.repeat(64)), [])).toEqual({
      ok: false,
      issues: [{
        slug: 'article-one',
        code: 'missing_released_document',
        detail: 'ledger release has no Markdown document',
      }],
    });
  });
});

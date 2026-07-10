import { describe, expect, it } from 'vitest';
import {
  BLOG_SOURCE_REGISTRY,
  BlogSourceRegistrySchema,
} from '../src/utils/blogSourceRegistry';

describe('blog source registry', () => {
  it('parses the versioned production registry', () => {
    expect(() => BlogSourceRegistrySchema.parse(BLOG_SOURCE_REGISTRY)).not.toThrow();
  });

  it('uses one unique HTTPS source id for every listed primary source', () => {
    const ids = BLOG_SOURCE_REGISTRY.sources.map((source) => source.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(BLOG_SOURCE_REGISTRY.sources.length).toBeGreaterThanOrEqual(12);
    expect(BLOG_SOURCE_REGISTRY.sources.every((source) => source.url.startsWith('https://'))).toBe(true);
    expect(
      BLOG_SOURCE_REGISTRY.sources.every(
        (source) => source.scope.length > 0 && source.allowedClaims.length > 0,
      ),
    ).toBe(true);
  });

  it('covers each of the 100 scheduled briefs exactly once with known sources', () => {
    const articles = BLOG_SOURCE_REGISTRY.articleSources;
    const sourceIds = new Set(BLOG_SOURCE_REGISTRY.sources.map((source) => source.id));

    expect(articles).toHaveLength(100);
    expect(new Set(articles.map((article) => article.sequence)).size).toBe(100);
    expect(new Set(articles.map((article) => article.slug)).size).toBe(100);
    expect(articles.map((article) => article.sequence)).toEqual(Array.from({ length: 100 }, (_, i) => i + 1));
    expect(
      articles.every((article) => article.sourceIds.every((sourceId) => sourceIds.has(sourceId))),
    ).toBe(true);
  });

  it('marks every research brief with a named internal dataset rather than a fictional citation', () => {
    const researchSequences = [10, 20, 23, 40, 50, 60, 70, 80, 90, 99, 100];
    const bySequence = new Map(
      BLOG_SOURCE_REGISTRY.articleSources.map((article) => [article.sequence, article]),
    );

    for (const sequence of researchSequences) {
      const article = bySequence.get(sequence);
      expect(article?.requiresInternalDataset).toBe(true);
      expect(article?.internalDataset?.id).toMatch(/^kurerok-/);
      expect(article?.sourceGate).toBe('required_before_release');
    }
  });

  it('rejects duplicate source ids, HTTP URLs, and unknown article source references', () => {
    const duplicateId = structuredClone(BLOG_SOURCE_REGISTRY);
    duplicateId.sources[1].id = duplicateId.sources[0].id;
    expect(BlogSourceRegistrySchema.safeParse(duplicateId).success).toBe(false);

    const insecureUrl = structuredClone(BLOG_SOURCE_REGISTRY);
    insecureUrl.sources[0].url = 'http://example.test/source';
    expect(BlogSourceRegistrySchema.safeParse(insecureUrl).success).toBe(false);

    const unknownCoverage = structuredClone(BLOG_SOURCE_REGISTRY);
    unknownCoverage.articleSources[0].sourceIds = ['not-in-registry'];
    expect(BlogSourceRegistrySchema.safeParse(unknownCoverage).success).toBe(false);
  });
});

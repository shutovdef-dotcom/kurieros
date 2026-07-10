import { describe, expect, it } from 'vitest';
import { auditBlogContentCorpus, parseBlogContentDocument } from '../src/utils/blogContent';

const markdown = `---
title: "Достаточно длинный заголовок для тестового редакционного материала"
description: "Достаточно длинное описание для проверки схемы, в котором ровно столько текста, чтобы пройти минимальное ограничение."
author: "КурьерОк"
type: "new"
status: "ready"
primaryIntent: "тестовый запрос"
pillarHref: "/guide/dohod/"
sourceIds:
  - "official-source"
checkedAt: "2026-07-10"
relatedSlugs: []
researchGate: "none"
---

## Первый раздел

${'Проверяемый текст '.repeat(230)}

## Второй раздел

${'Ещё текст '.repeat(230)}

## Третий раздел

${'Финальный текст '.repeat(230)}
`;

describe('blog content audit', () => {
  it('parses frontmatter and fingerprints the complete editorial source', () => {
    const document = parseBlogContentDocument('test-article', markdown);
    expect(document.contentSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(document.wordCount).toBeGreaterThan(650);
    expect(document.headingCount).toBe(3);
  });

  it('rejects a corpus whose Markdown frontmatter drifts from the editorial contract', () => {
    const document = parseBlogContentDocument('test-article', markdown);
    const audit = auditBlogContentCorpus(
      [{
        sequence: 1,
        slug: 'test-article',
        title: document.frontmatter.title,
        type: 'new',
        primaryIntent: 'different intent',
        pillarHref: '/guide/dohod/',
      }],
      [{ slug: 'test-article', sourceIds: ['official-source'], requiresInternalDataset: false }],
      [document],
    );

    expect(audit.ok).toBe(false);
    expect(audit.issues).toContainEqual(expect.objectContaining({ code: 'calendar_metadata_mismatch' }));
  });
});

import { describe, expect, it } from 'vitest';
import { parseBlogContentDocument } from '../src/utils/blogContent';
import { createBlogReleaseCandidate, planVerifiedBlogRelease } from '../src/utils/blogReleaseOrchestrator';
import type { BlogReleaseEvidence } from '../src/utils/blogReleaseEvidence';
import type { BlogReleaseLedger } from '../src/utils/blogRelease';

const markdown = `---
title: "Достаточно длинный заголовок для тестового редакционного материала"
description: "Достаточно длинное описание для проверки схемы, в котором ровно столько текста, чтобы пройти минимальное ограничение."
author: "КурьерОк"
type: "new"
status: "ready"
primaryIntent: "тестовый запрос"
pillarHref: "/guide/dohod/"
sourceIds: ["official-source"]
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

const ledger: BlogReleaseLedger = { schemaVersion: 1, timezone: 'Europe/Moscow', releases: [] };
const evidence: BlogReleaseEvidence = {
  schemaVersion: 1,
  sourceMaxAgeDays: 30,
  entries: [{
    slug: 'test-article',
    sourceIds: ['official-source'],
    checkedAt: '2026-08-02T12:00:00+03:00',
    evidenceReference: 'review-log/test-article-2026-08-02',
  }],
};

const plan = (overrides: {
  scheduleEnabled?: boolean;
  paused?: boolean;
  calendarResearchRequired?: boolean;
  registryRequiresInternalDataset?: boolean;
  sourceGateRequired?: boolean;
} = {}) =>
  planVerifiedBlogRelease({
    calendar: [{
      sequence: 1,
      slug: 'test-article',
      title: 'Достаточно длинный заголовок для тестового редакционного материала',
      type: 'new',
      primaryIntent: 'тестовый запрос',
      pillarHref: '/guide/dohod/',
      nominalPublishAt: '2026-08-03T09:00:00+03:00',
      sourceGate: { required: overrides.sourceGateRequired ?? true },
      researchGate: { required: overrides.calendarResearchRequired ?? false },
    }],
    sourceBriefs: [{
      slug: 'test-article',
      sourceIds: ['official-source'],
      requiresInternalDataset: overrides.registryRequiresInternalDataset ?? false,
      ...(overrides.registryRequiresInternalDataset ? { internalDataset: { id: 'kurerok-test-snapshot' } } : {}),
    }],
    documents: [parseBlogContentDocument('test-article', markdown)],
    evidence,
    ledger,
    now: '2026-08-03T09:05:00+03:00',
    scheduleEnabled: overrides.scheduleEnabled ?? true,
    paused: overrides.paused ?? false,
  });

describe('verified blog release orchestration', () => {
  it('creates one fingerprinted candidate only after every independent gate is true', () => {
    const orchestration = plan();
    expect(orchestration.audit.ok).toBe(true);
    expect(orchestration.plan).toMatchObject({ eligible: true, candidate: { slug: 'test-article' } });

    expect(createBlogReleaseCandidate(
      orchestration,
      '2026-08-03T09:05:00+03:00',
      'abcdef1',
    )).toMatchObject({
      sequence: 1,
      slug: 'test-article',
      firstPublishedAt: '2026-08-03T09:05:00+03:00',
      sourceCheckedAt: '2026-08-02T12:00:00+03:00',
      revision: 1,
    });
  });

  it('keeps the kill switch ahead of a technically ready candidate', () => {
    expect(plan({ paused: true }).plan).toMatchObject({
      eligible: false,
      reasons: ['schedule_paused'],
      candidate: undefined,
    });
  });

  it('fails closed when the calendar tries to weaken a source-registry research requirement', () => {
    const orchestration = plan({ registryRequiresInternalDataset: true, calendarResearchRequired: false });

    expect(orchestration.plan).toMatchObject({
      eligible: false,
      candidate: expect.objectContaining({ slug: 'test-article' }),
    });
    expect(orchestration.evidenceReasonsBySlug['test-article']).toContain(
      'calendar_registry_research_gate_mismatch',
    );
  });

  it('fails closed when a calendar entry explicitly disables its source gate', () => {
    const orchestration = plan({ sourceGateRequired: false });

    expect(orchestration.plan).toMatchObject({ eligible: false });
    expect(orchestration.evidenceReasonsBySlug['test-article']).toContain(
      'calendar_source_gate_disabled',
    );
  });
});

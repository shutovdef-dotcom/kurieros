import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  AGE_GUIDE,
  buildAgeGuideFaqEntities,
  getAgeGuideSource,
} from '../src/data/ageGuide';
import { knowledgeBaseData, TOPIC_META } from '../src/utils/knowledge';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const REQUIRED_ROLE_IDS = ['foot', 'bike', 'auto', 'picker', 'bank'];
const OFFICIAL_SOURCE_HOSTS = new Set([
  'kuper.ru',
  'job.kuper.ru',
  'logistics.kuper.ru',
  'pro.yandex.ru',
  'www.tbank.ru',
  'job.alfabank.ru',
]);

describe('age guide evidence', () => {
  it('keeps global knowledge source IDs unique and every fact resolvable', () => {
    const sourceIds = knowledgeBaseData.sources.map((source) => source.id);
    expect(new Set(sourceIds).size).toBe(sourceIds.length);

    for (const item of knowledgeBaseData.items) {
      for (const fact of item.facts) {
        expect(
          sourceIds,
          item.id + ' references unknown knowledge source ' + fact.source_id,
        ).toContain(fact.source_id);
      }
    }
  });

  it('uses only dated official employer sources for age facts', () => {
    const referencedSourceIds = new Set([
      ...AGE_GUIDE.rows.flatMap((row) => row.sourceIds),
      ...AGE_GUIDE.roleSections.flatMap((section) => section.sourceIds),
      ...AGE_GUIDE.faqItems.flatMap((item) => item.sourceIds),
    ]);

    expect(referencedSourceIds.size).toBeGreaterThanOrEqual(6);
    for (const sourceId of referencedSourceIds) {
      const source = getAgeGuideSource(sourceId);
      expect(source, 'missing source ' + sourceId).toBeDefined();
      expect(source!.verified_at).toMatch(ISO_DATE_RE);
      expect(source!.verified_at).toBe('2026-07-10');
      const url = new URL(source!.url);
      expect(url.protocol).toBe('https:');
      expect(OFFICIAL_SOURCE_HOSTS.has(url.hostname), source!.url).toBe(true);
    }
  });

  it('has unique fact IDs and covers foot, bike, auto, picker and bank separately', () => {
    const rowIds = AGE_GUIDE.rows.map((row) => row.id);
    expect(new Set(rowIds).size).toBe(rowIds.length);
    expect(new Set(AGE_GUIDE.rows.map((row) => row.roleId))).toEqual(
      new Set(REQUIRED_ROLE_IDS),
    );

    for (const row of AGE_GUIDE.rows) {
      expect(row.verifiedAt).toMatch(ISO_DATE_RE);
      expect(row.sourceIds.length).toBeGreaterThan(0);
      expect(row.companyHref).toMatch(/^\/companies\/[a-z0-9-]+\/$/);
      expect(row.vacancyHref).toMatch(/^\/v\/[a-z0-9-]+\/$/);
      expect(row.minimumAge.trim()).not.toBe('');
      expect(row.parentalConsent.trim()).not.toBe('');
      expect(row.employment.trim()).not.toBe('');
    }
  });

  it('gives the age topic its own truthful content-update date', () => {
    expect(TOPIC_META['возраст'].contentUpdatedAt).toBe(AGE_GUIDE.modifiedDate);
    expect(AGE_GUIDE.modifiedDate).toBe('2026-07-10');
  });
});

describe('age guide FAQ parity', () => {
  it('builds FAQ schema from the same visible FAQ collection', () => {
    const entities = buildAgeGuideFaqEntities(AGE_GUIDE.faqItems);

    expect(entities).toHaveLength(AGE_GUIDE.faqItems.length);
    expect(
      entities.map((entity) => ({
        question: entity.name,
        answer: entity.acceptedAnswer.text,
      })),
    ).toEqual(
      AGE_GUIDE.faqItems.map((item) => ({
        question: item.question,
        answer: item.answer,
      })),
    );
  });

  it('renders the shared FAQ collection and age component on the existing topic URL', () => {
    const page = readFileSync('src/pages/guide/[topic].astro', 'utf8');
    const component = readFileSync('src/components/AgeGuide.astro', 'utf8');

    expect(page).toContain("topic === 'возраст'");
    expect(page).toContain('<AgeGuide />');
    expect(page).toContain('buildAgeGuideFaqEntities(AGE_GUIDE.faqItems)');
    expect(component).toContain('AGE_GUIDE.faqItems.map');
  });
});

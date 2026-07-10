import { describe, expect, it } from 'vitest';
import { EDITORIAL_POLICY } from '../src/data/editorialPolicy';

describe('editorial and vacancy freshness policy', () => {
  it('publishes a fixed review date and the required trust disclosures', () => {
    expect(EDITORIAL_POLICY.updatedAt).toBe('2026-07-10');
    expect(EDITORIAL_POLICY.sections.map((section) => section.id)).toEqual([
      'sources',
      'dates',
      'salary',
      'applications',
      'corrections',
    ]);
  });

  it('distinguishes source checks, content changes and employer publication dates', () => {
    const policyText = EDITORIAL_POLICY.sections
      .flatMap((section) => [section.title, ...section.paragraphs])
      .join(' ');

    expect(policyText).toContain('дата публикации работодателем');
    expect(policyText).toContain('проверка источника');
    expect(policyText).toContain('изменение содержания');
    expect(policyText).toContain('не подменяем');
  });

  it('discloses partner applications and forbids invented salary facts', () => {
    const policyText = EDITORIAL_POLICY.sections
      .flatMap((section) => section.paragraphs)
      .join(' ');

    expect(policyText).toContain('партнёр');
    expect(policyText).toContain('не платит');
    expect(policyText).toContain('не публикуем как подтверждённую');
  });
});

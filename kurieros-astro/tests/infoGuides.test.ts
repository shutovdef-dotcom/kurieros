/**
 * Unit tests for src/utils/infoGuides.ts
 *
 * AAA structure throughout.
 * Anti-thin-content assertions are `it.todo` stubs — blocked on OQ#2
 * editorial content (beads B8/B9/B10). Do NOT delete these stubs;
 * their presence gates thin-content detection in code review.
 */

import { describe, it, expect } from 'vitest';
import {
  INFO_GUIDES,
  KNOWN_LINK_SLUGS,
  buildGuideSchemaGraph,
  type InfoGuideConfig,
} from '../src/utils/infoGuides';

const PAGE_URL = 'https://kurerok.ru/skolko-zarabatyvaet-kurer/';
const SITE_URL = 'https://kurerok.ru';

// Helpers
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function getGraphTypes(graph: Record<string, unknown>[]): string[] {
  return graph.map((node) => node['@type'] as string);
}

// ---------------------------------------------------------------------------
describe('INFO_GUIDES', () => {
  it('has exactly 3 entries', () => {
    // Arrange / Act
    const keys = Object.keys(INFO_GUIDES);
    // Assert
    expect(keys).toHaveLength(3);
  });

  it('slugs match expected values', () => {
    // Arrange
    const expected = {
      income: 'skolko-zarabatyvaet-kurer',
      'how-to-become': 'kak-stat-kurerom',
      'work-conditions': 'usloviya-raboty-kurerom',
    };
    // Act / Assert
    for (const [key, slug] of Object.entries(expected)) {
      expect(INFO_GUIDES[key as keyof typeof INFO_GUIDES].slug).toBe(slug);
    }
  });

  it('income entry has showCalculator=true', () => {
    // Arrange / Act
    const { showCalculator } = INFO_GUIDES.income;
    // Assert
    expect(showCalculator).toBe(true);
  });

  it('how-to-become entry has howTo defined', () => {
    // Arrange / Act
    const { howTo } = INFO_GUIDES['how-to-become'];
    // Assert
    expect(howTo).toBeDefined();
    expect(howTo).not.toBeUndefined();
  });

  it('work-conditions entry has howTo=undefined', () => {
    // Arrange / Act
    const { howTo } = INFO_GUIDES['work-conditions'];
    // Assert
    expect(howTo).toBeUndefined();
  });

  it('income ctaHubSlug is rabota-peshim-kurerom', () => {
    // Arrange / Act
    const { ctaHubSlug } = INFO_GUIDES.income;
    // Assert
    expect(ctaHubSlug).toBe('rabota-peshim-kurerom');
  });

  it('each seoTitle is <=70 chars', () => {
    // Arrange / Act / Assert
    for (const [key, config] of Object.entries(INFO_GUIDES)) {
      expect(
        config.seoTitle.length,
        `INFO_GUIDES['${key}'].seoTitle exceeds 70 chars: "${config.seoTitle}"`,
      ).toBeLessThanOrEqual(70);
    }
  });

  it('each metaDescription is <=170 chars', () => {
    // Arrange / Act / Assert
    for (const [key, config] of Object.entries(INFO_GUIDES)) {
      expect(
        config.metaDescription.length,
        `INFO_GUIDES['${key}'].metaDescription exceeds 170 chars: "${config.metaDescription}"`,
      ).toBeLessThanOrEqual(170);
    }
  });

  it('each publishedDate and modifiedDate are valid ISO date strings', () => {
    // Arrange / Act / Assert
    for (const [key, config] of Object.entries(INFO_GUIDES)) {
      expect(
        config.publishedDate,
        `INFO_GUIDES['${key}'].publishedDate must be YYYY-MM-DD`,
      ).toMatch(ISO_DATE_RE);
      expect(
        config.modifiedDate,
        `INFO_GUIDES['${key}'].modifiedDate must be YYYY-MM-DD`,
      ).toMatch(ISO_DATE_RE);
    }
  });

  it('income entry has howTo=undefined', () => {
    // Arrange / Act
    const { howTo } = INFO_GUIDES.income;
    // Assert
    expect(howTo).toBeUndefined();
  });

  it('work-conditions entry has showCalculator falsy', () => {
    // Arrange / Act
    const { showCalculator } = INFO_GUIDES['work-conditions'];
    // Assert
    expect(showCalculator).toBeFalsy();
  });

  it('how-to-become entry has >=3 howTo steps with non-empty name and text', () => {
    // Arrange
    const { howTo } = INFO_GUIDES['how-to-become'];
    // Act / Assert
    expect(howTo).toBeDefined();
    expect(howTo!.steps.length).toBeGreaterThanOrEqual(3);
    for (const step of howTo!.steps) {
      expect(step.name.trim().length).toBeGreaterThan(0);
      expect(step.text.trim().length).toBeGreaterThan(0);
    }
  });

  it('income and work-conditions entries have faqItems.length >= 2', () => {
    // Arrange / Act / Assert
    expect(INFO_GUIDES.income.faqItems.length).toBeGreaterThanOrEqual(2);
    expect(INFO_GUIDES['work-conditions'].faqItems.length).toBeGreaterThanOrEqual(2);
    expect(INFO_GUIDES['how-to-become'].faqItems.length).toBeGreaterThanOrEqual(2);
  });

  it('relatedGuideSlugs reference only known slugs', () => {
    // Arrange / Act / Assert
    for (const [key, config] of Object.entries(INFO_GUIDES)) {
      for (const slug of config.relatedGuideSlugs) {
        expect(
          KNOWN_LINK_SLUGS.has(slug),
          `INFO_GUIDES['${key}'].relatedGuideSlugs contains unrecognised slug: "${slug}"`,
        ).toBe(true);
      }
    }
  });

  // Anti-thin-content assertions — un-skipped in B8/B9/B10 (OQ#2 resolved).
  it('each entry has >=2 sections with non-empty heading and body', () => {
    // Arrange / Act / Assert
    for (const [key, config] of Object.entries(INFO_GUIDES)) {
      expect(
        config.sections.length,
        `INFO_GUIDES['${key}'].sections must have >=2 entries`,
      ).toBeGreaterThanOrEqual(2);
      for (const section of config.sections) {
        expect(
          section.heading.trim().length,
          `INFO_GUIDES['${key}'] has a section with empty heading`,
        ).toBeGreaterThan(0);
        expect(
          section.body.trim().length,
          `INFO_GUIDES['${key}'] has a section with empty body`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it('each entry faqItems is non-empty', () => {
    // Arrange / Act / Assert
    for (const [key, config] of Object.entries(INFO_GUIDES)) {
      expect(
        config.faqItems.length,
        `INFO_GUIDES['${key}'].faqItems must have >=1 item`,
      ).toBeGreaterThan(0);
      for (const item of config.faqItems) {
        expect(
          item.question.trim().length,
          `INFO_GUIDES['${key}'] has a faqItem with empty question`,
        ).toBeGreaterThan(0);
        expect(
          item.answer.trim().length,
          `INFO_GUIDES['${key}'] has a faqItem with empty answer`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it('total body word count across sections is >=300 per guide', () => {
    // Arrange / Act / Assert
    for (const [key, config] of Object.entries(INFO_GUIDES)) {
      const totalText = config.sections.map((s) => s.body).join(' ');
      const wordCount = totalText.trim().split(/\s+/).filter(Boolean).length;
      expect(
        wordCount,
        `INFO_GUIDES['${key}'] total word count is ${wordCount} — must be >=300`,
      ).toBeGreaterThanOrEqual(300);
    }
  });
});

// ---------------------------------------------------------------------------
describe('buildGuideSchemaGraph', () => {
  it('@graph contains Article, FAQPage, BreadcrumbList for config without howTo', () => {
    // Arrange
    const config: InfoGuideConfig = INFO_GUIDES.income; // howTo is undefined

    // Act
    const result = buildGuideSchemaGraph(config, PAGE_URL, SITE_URL);
    const types = getGraphTypes(result['@graph']);

    // Assert
    expect(types).toContain('Article');
    expect(types).toContain('FAQPage');
    expect(types).toContain('BreadcrumbList');
    expect(result['@graph']).toHaveLength(3);
  });

  it('@graph contains Article, HowTo, FAQPage, BreadcrumbList for config with howTo', () => {
    // Arrange
    const config: InfoGuideConfig = INFO_GUIDES['how-to-become']; // howTo defined

    // Act
    const result = buildGuideSchemaGraph(config, PAGE_URL, SITE_URL);
    const types = getGraphTypes(result['@graph']);

    // Assert
    expect(types).toContain('Article');
    expect(types).toContain('HowTo');
    expect(types).toContain('FAQPage');
    expect(types).toContain('BreadcrumbList');
    expect(result['@graph']).toHaveLength(4);
  });

  it('HowTo is absent when config.howTo is undefined', () => {
    // Arrange
    const config: InfoGuideConfig = INFO_GUIDES['work-conditions']; // howTo: undefined

    // Act
    const result = buildGuideSchemaGraph(config, PAGE_URL, SITE_URL);
    const types = getGraphTypes(result['@graph']);

    // Assert
    expect(types).not.toContain('HowTo');
  });

  it('Article.headline is <=110 chars', () => {
    // Arrange / Act / Assert
    for (const config of Object.values(INFO_GUIDES)) {
      const result = buildGuideSchemaGraph(config, PAGE_URL, SITE_URL);
      const article = result['@graph'].find((n) => n['@type'] === 'Article');
      expect(article).toBeDefined();
      expect((article!['headline'] as string).length).toBeLessThanOrEqual(110);
    }
  });

  it('truncates headline to 107 chars + ellipsis when h1 exceeds 110 chars', () => {
    // Arrange
    const longH1 = 'А'.repeat(115); // 115 chars — exceeds 110
    const config: InfoGuideConfig = {
      ...INFO_GUIDES.income,
      h1: longH1,
    };

    // Act
    const result = buildGuideSchemaGraph(config, PAGE_URL, SITE_URL);
    const article = result['@graph'].find((n) => n['@type'] === 'Article');
    const headline = article!['headline'] as string;

    // Assert
    expect(headline.length).toBeLessThanOrEqual(110);
    expect(headline.endsWith('…')).toBe(true);
    // '…' is a single Unicode character (U+2026), so length = 107 + 1 = 108
    expect(headline.length).toBe(108);
  });

  it('Article has author, publisher, inLanguage="ru-RU"', () => {
    // Arrange
    const config = INFO_GUIDES.income;

    // Act
    const result = buildGuideSchemaGraph(config, PAGE_URL, SITE_URL);
    const article = result['@graph'].find((n) => n['@type'] === 'Article');

    // Assert
    expect(article).toBeDefined();
    expect(article!['author']).toBeDefined();
    expect(typeof article!['author']).toBe('object');
    expect(article!['publisher']).toBeDefined();
    expect(typeof article!['publisher']).toBe('object');
    expect(article!['inLanguage']).toBe('ru-RU');
  });

  it('Article.datePublished equals config.publishedDate', () => {
    // Arrange
    const config = INFO_GUIDES.income;

    // Act
    const result = buildGuideSchemaGraph(config, PAGE_URL, SITE_URL);
    const article = result['@graph'].find((n) => n['@type'] === 'Article');

    // Assert
    expect(article!['datePublished']).toBe(config.publishedDate);
  });

  it('Article.dateModified equals config.modifiedDate', () => {
    // Arrange
    const config = INFO_GUIDES['how-to-become'];

    // Act
    const result = buildGuideSchemaGraph(config, PAGE_URL, SITE_URL);
    const article = result['@graph'].find((n) => n['@type'] === 'Article');

    // Assert
    expect(article!['dateModified']).toBe(config.modifiedDate);
  });

  it('FAQPage.mainEntity is present (array of question nodes)', () => {
    // Arrange
    const config = INFO_GUIDES.income;

    // Act
    const result = buildGuideSchemaGraph(config, PAGE_URL, SITE_URL);
    const faqPage = result['@graph'].find((n) => n['@type'] === 'FAQPage');

    // Assert
    expect(faqPage).toBeDefined();
    const mainEntity = faqPage!['mainEntity'] as unknown[];
    expect(Array.isArray(mainEntity)).toBe(true);
    expect(mainEntity.length).toBeGreaterThan(0);
    const first = mainEntity[0] as Record<string, unknown>;
    expect(first['@type']).toBe('Question');
  });
});

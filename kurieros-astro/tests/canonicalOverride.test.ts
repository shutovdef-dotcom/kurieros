/**
 * Tests for Bead 007 — Decision A canonical map, getEmptyListingPaths hub
 * extension, and sitemap priority assignments.
 *
 * AAA pattern throughout; no file I/O except the optional dist read-backs.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CATEGORY_CANONICAL_HUB } from '../src/utils/categoryCanonicalHub';
import { CATEGORIES } from '../src/data/constants';
import { HUB_CONFIGS, isHubEmpty } from '../src/utils/transportHubs';
import { getEmptyListingPaths } from '../src/utils/listingSlugs';
import type { GeneratedJob } from '../src/data/vacancyTypes';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));
const worktreeRoot = resolve(__dirname, '..');

const ALL_CATEGORY_SLUGS = new Set(CATEGORIES.map((c) => c.slug));
const ALL_HUB_PATHS = new Set(
  Object.values(HUB_CONFIGS).map((cfg) => `/${cfg.slug}/`),
);

/** Minimal synthetic GeneratedJob for isHubEmpty fixture tests */
function makeJob(overrides: Partial<GeneratedJob> = {}): GeneratedJob {
  return {
    id: 1,
    sourceId: 1,
    sourceSlug: 'test-source',
    slug: 'test-source-moskva-foot',
    title: 'Курьер тест',
    company: 'Тест Компания',
    companyLogo: '',
    salary: 'до 100 000 ₽/мес',
    location: 'Москва',
    tags: ['foot', '18+'],
    labels: ['Пешком', '18+'],
    applyLink: '#',
    description: 'Описание',
    requirements: [],
    benefits: [],
    requiredDocuments: [],
    details: {
      rate: '100 000 ₽/мес',
      schedule: 'Свободный график',
      education: 'Не требуется',
      age: 'от 18 лет',
      payment_freq: 'Еженедельно',
      citizenship: 'РФ',
      medical_book: 'Не требуется',
      self_employed: 'Не требуется',
      employment_type: 'Самозанятость',
      transport_provision: 'Не требуется',
      uniform: 'Уточняется',
      os: 'Android или iOS',
    },
    search_tags: [],
    shortDescription: 'Краткое описание',
    transport: 'foot',
    transportProvision: 'not_required',
    salaryConfidence: 'estimated',
    currency: 'RUB',
    updatedAt: '2026-01-01',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// CATEGORY_CANONICAL_HUB map integrity
// ---------------------------------------------------------------------------

describe('CATEGORY_CANONICAL_HUB map integrity', () => {
  it('has exactly 4 entries', () => {
    // Arrange: the map exported from categoryCanonicalHub.ts
    // Act: count keys
    const keys = Object.keys(CATEGORY_CANONICAL_HUB);
    // Assert
    expect(keys).toHaveLength(4);
  });

  it('every key is a real CATEGORIES slug', () => {
    // Arrange: full set of valid category slugs from constants.ts
    // Act / Assert: each key must exist in the CATEGORIES catalogue
    for (const key of Object.keys(CATEGORY_CANONICAL_HUB)) {
      expect(ALL_CATEGORY_SLUGS.has(key)).toBe(true);
    }
  });

  it('every value is one of the 4 real hub paths with trailing slash', () => {
    // Arrange: hub paths derived from HUB_CONFIGS slugs (/{slug}/)
    // Act / Assert: each value must resolve to a known hub path
    for (const value of Object.values(CATEGORY_CANONICAL_HUB)) {
      expect(ALL_HUB_PATHS.has(value)).toBe(true);
    }
  });

  it('no hub path appears as a key (no self-override loop)', () => {
    // Arrange: map keys are bare slugs (e.g. 'peshkom'); hub paths look
    // like '/rabota-peshim-kurerom/' — no intersection is possible by
    // construction, but assert explicitly to prevent future accidents.
    const keys = new Set(Object.keys(CATEGORY_CANONICAL_HUB));
    for (const hubPath of ALL_HUB_PATHS) {
      expect(keys.has(hubPath)).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// isHubEmpty guard — used by both [slug].astro and getEmptyListingPaths
// ---------------------------------------------------------------------------

describe('isHubEmpty guard', () => {
  it('returns true when jobs array is empty', () => {
    // Arrange
    const emptyJobs: GeneratedJob[] = [];
    const cfg = HUB_CONFIGS.foot;
    // Act
    const result = isHubEmpty(emptyJobs, cfg);
    // Assert
    expect(result).toBe(true);
  });

  it('returns false when at least one matching job exists', () => {
    // Arrange: one foot-tagged job
    const jobs = [makeJob({ tags: ['foot', '18+'], transport: 'foot' })];
    const cfg = HUB_CONFIGS.foot;
    // Act
    const result = isHubEmpty(jobs, cfg);
    // Assert
    expect(result).toBe(false);
  });

  it('returns true for foot hub when only bicycle jobs exist', () => {
    // Arrange: a bicycle job must not match the foot hub filter
    const jobs = [makeJob({ tags: ['bicycle', '18+'], transport: 'bicycle' })];
    const cfg = HUB_CONFIGS.foot;
    // Act
    const result = isHubEmpty(jobs, cfg);
    // Assert
    expect(result).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getEmptyListingPaths() — hub extension
// ---------------------------------------------------------------------------

describe('getEmptyListingPaths() hub extension', () => {
  it('returns a Set where every entry is a bare path (no trailing slash)', () => {
    // Arrange
    // Act
    const paths = getEmptyListingPaths();
    // Assert: every path starts with '/' and does NOT end with '/'
    for (const p of paths) {
      expect(p.startsWith('/')).toBe(true);
      expect(p.endsWith('/')).toBe(false);
    }
  });

  it('hub bare paths in the result have no trailing slash', () => {
    // Arrange: real output (uses real jobsData)
    const paths = getEmptyListingPaths();
    const hubBarePaths = Object.values(HUB_CONFIGS).map((cfg) => `/${cfg.slug}`);
    // Act / Assert: if a hub is empty the bare path appears; the slashed
    // variant must never appear (would break sitemap filter match in
    // getEmptyListingUrls which appends '/' itself).
    for (const barePath of hubBarePaths) {
      if (paths.has(barePath)) {
        expect(paths.has(`${barePath}/`)).toBe(false);
      }
    }
  });

  it('every entry follows city/category or hub path conventions', () => {
    // Arrange
    const paths = getEmptyListingPaths();
    // Act / Assert: each path is either a city/category listing path or a hub path
    for (const p of paths) {
      const isCityOrCategory = p.startsWith('/rabota-kurerom-');
      const isHub = Object.values(HUB_CONFIGS).some((cfg) => p === `/${cfg.slug}`);
      expect(isCityOrCategory || isHub).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Sitemap priority (build-output — skipped when dist/ is absent)
// ---------------------------------------------------------------------------

const distExists = existsSync(resolve(worktreeRoot, 'dist'));

describe.skipIf(!distExists)('sitemap priorities (build-output)', () => {
  function readAllSitemapContent(): string {
    const sitemapIndex = resolve(worktreeRoot, 'dist', 'sitemap-index.xml');
    if (!existsSync(sitemapIndex)) return '';
    const indexContent = readFileSync(sitemapIndex, 'utf8');
    const sitemapFiles = [...indexContent.matchAll(/sitemap-(?!index)[\w-]+\.xml/g)].map((m) => m[0]);
    return sitemapFiles
      .map((f) => {
        const p = resolve(worktreeRoot, 'dist', f);
        return existsSync(p) ? readFileSync(p, 'utf8') : '';
      })
      .join('\n');
  }

  it('/rabota-peshim-kurerom/ has priority 0.8 in sitemap', () => {
    // Arrange
    const content = readAllSitemapContent();
    // Act: find the URL entry
    const idx = content.indexOf('/rabota-peshim-kurerom/');
    // Assert
    expect(idx).toBeGreaterThan(-1);
    const snippet = content.slice(idx, idx + 300);
    expect(snippet).toContain('<priority>0.8</priority>');
  });

  it('/skolko-zarabatyvaet-kurer/ has priority 0.7 in sitemap', () => {
    // Arrange
    const content = readAllSitemapContent();
    // Act
    const idx = content.indexOf('/skolko-zarabatyvaet-kurer/');
    // Assert
    expect(idx).toBeGreaterThan(-1);
    const snippet = content.slice(idx, idx + 300);
    expect(snippet).toContain('<priority>0.7</priority>');
  });

  it('/otzyvy/ has priority 0.6 in sitemap', () => {
    // Arrange
    const content = readAllSitemapContent();
    // Act
    const idx = content.indexOf('/otzyvy/');
    // Assert
    expect(idx).toBeGreaterThan(-1);
    const snippet = content.slice(idx, idx + 300);
    expect(snippet).toContain('<priority>0.6</priority>');
  });

  it('existing slug /rabota-kurerom-moskva/ does not have priority 0.8', () => {
    // Arrange: a city listing page should stay at 0.7, not be misclassified
    // as a hub (priority 0.8).
    const content = readAllSitemapContent();
    const idx = content.indexOf('/rabota-kurerom-moskva/');
    if (idx === -1) return; // page not in sitemap (empty or excluded) — skip
    const snippet = content.slice(idx, idx + 300);
    expect(snippet).not.toContain('<priority>0.8</priority>');
  });
});

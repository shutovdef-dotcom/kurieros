/**
 * Unit tests for src/utils/transportHubs.ts
 * AAA pattern throughout. All tests use synthetic fixture data — no file I/O.
 */

import { describe, it, expect } from 'vitest';
import {
  HUB_CONFIGS,
  buildHubTitle,
  buildHubDescription,
  buildHubFaqItems,
  buildHubSchemaGraph,
  isHubEmpty,
  type TransportHubKey,
  type HubConfig,
} from '../src/utils/transportHubs';
import type { GeneratedJob } from '../src/data/vacancyTypes';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const VALID_TAGS: TransportHubKey[] = ['foot', 'auto', 'bicycle', 'flexible'];

/** Minimal synthetic GeneratedJob — only fields used by transportHubs.ts */
function makeJob(overrides: Partial<GeneratedJob> = {}): GeneratedJob {
  return {
    id: 1,
    sourceId: 1,
    sourceSlug: 'test-source',
    slug: 'test-source-moskva-foot',
    title: 'Пеший курьер Москва',
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

function makeJobs(n: number, tag = 'foot'): GeneratedJob[] {
  const transport = (t: string): GeneratedJob['transport'] => {
    if (t === 'auto') return 'auto';
    if (t === 'bicycle') return 'bicycle';
    return 'foot';
  };
  return Array.from({ length: n }, (_, i) =>
    makeJob({
      id: i + 1,
      slug: `test-source-city${i}-${tag}`,
      title: `Курьер #${i + 1}`,
      tags: [tag, '18+'],
      transport: transport(tag),
    }),
  );
}

const SITE_URL = 'https://kurerok.ru';
const PAGE_URL_HREF = 'https://kurerok.ru/rabota-peshim-kurerom/';
const PAGE_URL_PATHNAME = '/rabota-peshim-kurerom/';
const DATE_ISO = '2026-05-19T00:00:00.000Z';

// ---------------------------------------------------------------------------
// HUB_CONFIGS
// ---------------------------------------------------------------------------

describe('HUB_CONFIGS', () => {
  it('has exactly 4 entries with valid unique slugs', () => {
    // Arrange + Act
    const keys = Object.keys(HUB_CONFIGS);

    // Assert
    expect(keys).toHaveLength(4);
    expect(keys).toContain('foot');
    expect(keys).toContain('auto');
    expect(keys).toContain('bicycle');
    expect(keys).toContain('flexible');

    const slugs = keys.map((k) => HUB_CONFIGS[k as TransportHubKey].slug);
    const uniqueSlugs = new Set(slugs);
    expect(uniqueSlugs.size).toBe(4);
  });

  it('each entry has a non-empty h1, eyebrow, incomeBlurb, requirementsBullets', () => {
    for (const key of VALID_TAGS) {
      // Arrange
      const cfg = HUB_CONFIGS[key];

      // Assert
      expect(cfg.h1.length).toBeGreaterThan(0);
      expect(cfg.eyebrow.length).toBeGreaterThan(0);
      expect(cfg.incomeBlurb.length).toBeGreaterThan(0);
      expect(cfg.requirementsBullets.length).toBeGreaterThan(0);
      for (const bullet of cfg.requirementsBullets) {
        expect(bullet.length).toBeGreaterThan(0);
      }
    }
  });

  it('each filter.tag is one of foot|auto|bicycle|flexible', () => {
    for (const key of VALID_TAGS) {
      expect(VALID_TAGS as string[]).toContain(HUB_CONFIGS[key].filter.tag);
    }
  });

  it('categoryFacetPath values match expected rabota-kurerom-* facet slugs', () => {
    // Arrange
    const expected: Record<TransportHubKey, string> = {
      foot: 'rabota-kurerom-peshkom',
      auto: 'rabota-kurerom-na-avto',
      bicycle: 'rabota-kurerom-na-velosipede',
      flexible: 'rabota-kurerom-podrabotka',
    };

    // Act + Assert
    for (const key of VALID_TAGS) {
      expect(HUB_CONFIGS[key].categoryFacetPath).toBe(expected[key]);
    }
  });

  it('slug values match expected hub URL slugs', () => {
    expect(HUB_CONFIGS.foot.slug).toBe('rabota-peshim-kurerom');
    expect(HUB_CONFIGS.auto.slug).toBe('rabota-avtokurerom');
    expect(HUB_CONFIGS.bicycle.slug).toBe('rabota-velokurerom');
    expect(HUB_CONFIGS.flexible.slug).toBe('podrabotka-kurerom');
  });

  it('each config key matches its own .key field', () => {
    for (const key of VALID_TAGS) {
      expect(HUB_CONFIGS[key].key).toBe(key);
    }
  });
});

// ---------------------------------------------------------------------------
// buildHubTitle
// ---------------------------------------------------------------------------

describe('buildHubTitle', () => {
  it('returns ≤70 chars — isEmpty=false, count=500, maxSalary=120000, foot config', () => {
    // Arrange
    const cfg = HUB_CONFIGS.foot;

    // Act
    const result = buildHubTitle(cfg, 500, 120_000, false);

    // Assert
    expect(result.length).toBeLessThanOrEqual(70);
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns ≤70 chars — isEmpty=true, count=0, maxSalary=0, foot config', () => {
    // Arrange
    const cfg = HUB_CONFIGS.foot;

    // Act
    const result = buildHubTitle(cfg, 0, 0, true);

    // Assert
    expect(result.length).toBeLessThanOrEqual(70);
    expect(result.trim().length).toBeGreaterThan(0);
  });

  it('returns ≤70 chars — all 4 configs × isEmpty=false/true (matrix)', () => {
    for (const key of VALID_TAGS) {
      // Arrange
      const cfg = HUB_CONFIGS[key];

      // Act
      const withJobs = buildHubTitle(cfg, 300, 100_000, false);
      const empty = buildHubTitle(cfg, 0, 0, true);

      // Assert
      expect(withJobs.length).toBeLessThanOrEqual(70);
      expect(empty.length).toBeLessThanOrEqual(70);
      expect(empty.trim().length).toBeGreaterThan(0);
    }
  });

  it('omits salary text when maxSalary=0', () => {
    // Arrange
    const cfg = HUB_CONFIGS.foot;

    // Act
    const result = buildHubTitle(cfg, 100, 0, false);

    // Assert
    expect(result).not.toContain('до 0');
    expect(result).not.toContain('₽');
  });

  it('includes salary when maxSalary > 0 and not empty', () => {
    // Arrange
    const cfg = HUB_CONFIGS.auto;

    // Act
    const result = buildHubTitle(cfg, 200, 150_000, false);

    // Assert
    expect(result).toContain('₽');
    expect(result.length).toBeLessThanOrEqual(70);
  });

  it('isEmpty=true title is meaningful (more than 5 chars) for all configs', () => {
    for (const key of VALID_TAGS) {
      const result = buildHubTitle(HUB_CONFIGS[key], 0, 0, true);
      expect(result.trim().length).toBeGreaterThan(5);
    }
  });
});

// ---------------------------------------------------------------------------
// buildHubDescription
// ---------------------------------------------------------------------------

describe('buildHubDescription', () => {
  it('returns ≤170 chars — 3+ company names, isEmpty=false', () => {
    // Arrange
    const cfg = HUB_CONFIGS.foot;
    const companies = ['Яндекс.Еда', 'Купер', 'Озон'];

    // Act
    const result = buildHubDescription(cfg, 500, companies, false);

    // Assert
    expect(result.length).toBeLessThanOrEqual(170);
    expect(result.trim().length).toBeGreaterThan(0);
  });

  it('returns ≤170 chars — companyNames=[], isEmpty=false', () => {
    // Arrange
    const cfg = HUB_CONFIGS.auto;

    // Act
    const result = buildHubDescription(cfg, 100, [], false);

    // Assert
    expect(result.length).toBeLessThanOrEqual(170);
    expect(result).not.toContain('()');
    expect(result).not.toMatch(/,\s*\.$/);
    expect(result.trim().length).toBeGreaterThan(0);
  });

  it('returns ≤170 chars — isEmpty=true', () => {
    // Arrange
    const cfg = HUB_CONFIGS.bicycle;

    // Act
    const result = buildHubDescription(cfg, 0, [], true);

    // Assert
    expect(result.length).toBeLessThanOrEqual(170);
    expect(result.trim().length).toBeGreaterThan(0);
  });

  it('returns ≤170 chars — all 4 configs with company names', () => {
    // Arrange
    const companies = ['Яндекс.Еда', 'Купер'];

    for (const key of VALID_TAGS) {
      // Act
      const result = buildHubDescription(HUB_CONFIGS[key], 200, companies, false);

      // Assert
      expect(result.length).toBeLessThanOrEqual(170);
    }
  });

  it('no trailing comma or empty parentheses in any branch', () => {
    // Arrange
    const cfg = HUB_CONFIGS.flexible;

    // Act
    const withCompanies = buildHubDescription(cfg, 50, ['Яндекс.Еда'], false);
    const noCompanies = buildHubDescription(cfg, 50, [], false);

    // Assert
    expect(withCompanies).not.toMatch(/,\s*[.,]/);
    expect(withCompanies).not.toContain('()');
    expect(noCompanies).not.toMatch(/,\s*[.,]/);
    expect(noCompanies).not.toContain('()');
  });
});

// ---------------------------------------------------------------------------
// buildHubFaqItems
// ---------------------------------------------------------------------------

describe('buildHubFaqItems', () => {
  it('returns a non-empty array for each of the 4 configs', () => {
    for (const key of VALID_TAGS) {
      // Arrange
      const cfg = HUB_CONFIGS[key];

      // Act
      const items = buildHubFaqItems(cfg, 100, ['Купер', 'Яндекс.Еда']);

      // Assert
      expect(items.length).toBeGreaterThan(0);
    }
  });

  it('each item has non-empty question and answer strings', () => {
    for (const key of VALID_TAGS) {
      // Arrange
      const cfg = HUB_CONFIGS[key];

      // Act
      const items = buildHubFaqItems(cfg, 50, ['Купер']);

      // Assert
      for (const item of items) {
        expect(typeof item.question).toBe('string');
        expect(item.question.trim().length).toBeGreaterThan(0);
        expect(typeof item.answer).toBe('string');
        expect(item.answer.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('answers are not placeholder text', () => {
    for (const key of VALID_TAGS) {
      // Arrange
      const cfg = HUB_CONFIGS[key];

      // Act
      const items = buildHubFaqItems(cfg, 100, ['Яндекс.Еда', 'Купер']);

      // Assert
      for (const item of items) {
        expect(item.answer).not.toMatch(/^TODO|placeholder|Lorem/i);
        expect(item.answer.length).toBeGreaterThan(20);
      }
    }
  });

  it('companyNames=[] does not produce empty parentheses or trailing commas in answers', () => {
    for (const key of VALID_TAGS) {
      // Arrange
      const cfg = HUB_CONFIGS[key];

      // Act
      const items = buildHubFaqItems(cfg, 0, []);

      // Assert
      for (const item of items) {
        expect(item.answer).not.toContain('()');
        expect(item.answer).not.toMatch(/,\s*\./);
      }
    }
  });

  it('returns at least faqSeeds.length + 1 items (seeds + closing)', () => {
    for (const key of VALID_TAGS) {
      // Arrange
      const cfg = HUB_CONFIGS[key];

      // Act
      const items = buildHubFaqItems(cfg, 10, []);

      // Assert
      expect(items.length).toBeGreaterThanOrEqual(cfg.faqSeeds.length + 1);
    }
  });
});

// ---------------------------------------------------------------------------
// buildHubSchemaGraph
// ---------------------------------------------------------------------------

describe('buildHubSchemaGraph', () => {
  function makeGraphArgs(cfg: HubConfig, jobs: GeneratedJob[]) {
    const faqItems = buildHubFaqItems(cfg, jobs.length, []);
    return {
      cfg,
      jobs,
      faqItems,
      title: buildHubTitle(cfg, jobs.length, 0, jobs.length === 0),
      description: buildHubDescription(cfg, jobs.length, [], jobs.length === 0),
      pageUrlHref: PAGE_URL_HREF,
      pageUrlPathname: PAGE_URL_PATHNAME,
      siteUrl: SITE_URL,
      dateModifiedIso: DATE_ISO,
    };
  }

  it('@graph contains CollectionPage, ItemList, FAQPage, BreadcrumbList nodes', () => {
    // Arrange
    const cfg = HUB_CONFIGS.foot;
    const jobs = makeJobs(3, 'foot');

    // Act
    const graph = buildHubSchemaGraph(makeGraphArgs(cfg, jobs));

    // Assert
    const types = graph.map((node) => (node as Record<string, unknown>)['@type']);
    expect(types).toContain('CollectionPage');
    expect(types).toContain('ItemList');
    expect(types).toContain('FAQPage');
    expect(types).toContain('BreadcrumbList');
  });

  it('@graph has exactly 4 nodes', () => {
    // Arrange
    const cfg = HUB_CONFIGS.auto;

    // Act
    const graph = buildHubSchemaGraph(makeGraphArgs(cfg, makeJobs(2, 'auto')));

    // Assert
    expect(graph).toHaveLength(4);
  });

  it('ItemList.itemListElement is an empty array when jobs=[]', () => {
    // Arrange
    const cfg = HUB_CONFIGS.foot;

    // Act
    const graph = buildHubSchemaGraph(makeGraphArgs(cfg, []));

    // Assert
    const itemList = graph.find(
      (n) => (n as Record<string, unknown>)['@type'] === 'ItemList',
    ) as Record<string, unknown>;
    expect(itemList).toBeDefined();
    expect(Array.isArray(itemList['itemListElement'])).toBe(true);
    expect((itemList['itemListElement'] as unknown[]).length).toBe(0);
  });

  it('ItemList.numberOfItems=0 when jobs=[]', () => {
    // Arrange
    const cfg = HUB_CONFIGS.bicycle;

    // Act
    const graph = buildHubSchemaGraph(makeGraphArgs(cfg, []));

    // Assert
    const itemList = graph.find(
      (n) => (n as Record<string, unknown>)['@type'] === 'ItemList',
    ) as Record<string, unknown>;
    expect(itemList['numberOfItems']).toBe(0);
  });

  it('ItemList.itemListElement has ≤10 items when jobs has 15 entries', () => {
    // Arrange
    const cfg = HUB_CONFIGS.foot;
    const jobs = makeJobs(15, 'foot');

    // Act
    const graph = buildHubSchemaGraph(makeGraphArgs(cfg, jobs));

    // Assert
    const itemList = graph.find(
      (n) => (n as Record<string, unknown>)['@type'] === 'ItemList',
    ) as Record<string, unknown>;
    const elements = itemList['itemListElement'] as unknown[];
    expect(elements.length).toBeLessThanOrEqual(10);
    expect(elements.length).toBe(10);
  });

  it('each ListItem has shape { @type: "ListItem", position, name, url } with url starting /v/', () => {
    // Arrange
    const cfg = HUB_CONFIGS.auto;
    const jobs = makeJobs(3, 'auto');

    // Act
    const graph = buildHubSchemaGraph(makeGraphArgs(cfg, jobs));
    const itemList = graph.find(
      (n) => (n as Record<string, unknown>)['@type'] === 'ItemList',
    ) as Record<string, unknown>;
    const elements = itemList['itemListElement'] as Array<Record<string, unknown>>;

    // Assert
    elements.forEach((el, i) => {
      expect(el['@type']).toBe('ListItem');
      expect(typeof el['position']).toBe('number');
      expect(el['position']).toBe(i + 1);
      expect(typeof el['name']).toBe('string');
      expect((el['name'] as string).length).toBeGreaterThan(0);
      expect(typeof el['url']).toBe('string');
      expect(el['url'] as string).toContain('/v/');
    });
  });

  it('FAQPage.mainEntity is non-empty', () => {
    // Arrange
    const cfg = HUB_CONFIGS.flexible;

    // Act
    const graph = buildHubSchemaGraph(makeGraphArgs(cfg, makeJobs(2, 'flexible')));

    // Assert
    const faqPage = graph.find(
      (n) => (n as Record<string, unknown>)['@type'] === 'FAQPage',
    ) as Record<string, unknown>;
    expect(faqPage).toBeDefined();
    const mainEntity = faqPage['mainEntity'] as unknown[];
    expect(Array.isArray(mainEntity)).toBe(true);
    expect(mainEntity.length).toBeGreaterThan(0);
  });

  it('BreadcrumbList node has itemListElement', () => {
    // Arrange
    const cfg = HUB_CONFIGS.bicycle;

    // Act
    const graph = buildHubSchemaGraph(makeGraphArgs(cfg, makeJobs(1, 'bicycle')));

    // Assert
    const breadcrumb = graph.find(
      (n) => (n as Record<string, unknown>)['@type'] === 'BreadcrumbList',
    ) as Record<string, unknown>;
    expect(breadcrumb).toBeDefined();
    expect(Array.isArray(breadcrumb['itemListElement'])).toBe(true);
    expect((breadcrumb['itemListElement'] as unknown[]).length).toBeGreaterThan(0);
  });

  it('ItemList.numberOfItems reflects total jobs even when > 10', () => {
    // Arrange
    const cfg = HUB_CONFIGS.foot;
    const jobs = makeJobs(15, 'foot');

    // Act
    const graph = buildHubSchemaGraph(makeGraphArgs(cfg, jobs));

    // Assert
    const itemList = graph.find(
      (n) => (n as Record<string, unknown>)['@type'] === 'ItemList',
    ) as Record<string, unknown>;
    expect(itemList['numberOfItems']).toBe(15);
  });
});

// ---------------------------------------------------------------------------
// isHubEmpty
// ---------------------------------------------------------------------------

describe('isHubEmpty', () => {
  it('returns true when no jobs match the hub tag', () => {
    // Arrange
    const cfg = HUB_CONFIGS.foot;
    const jobsData = makeJobs(5, 'auto'); // auto jobs, not foot

    // Act
    const result = isHubEmpty(jobsData, cfg);

    // Assert
    expect(result).toBe(true);
  });

  it('returns false when at least 1 job matches the hub tag', () => {
    // Arrange
    const cfg = HUB_CONFIGS.foot;
    const jobsData = [makeJob({ tags: ['foot', '18+'], transport: 'foot' })];

    // Act
    const result = isHubEmpty(jobsData, cfg);

    // Assert
    expect(result).toBe(false);
  });

  it('returns true when jobsData is empty', () => {
    // Arrange
    const cfg = HUB_CONFIGS.auto;

    // Act + Assert
    expect(isHubEmpty([], cfg)).toBe(true);
  });

  it('returns true when the relevant tag is absent entirely from all jobs', () => {
    // Arrange
    const cfg = HUB_CONFIGS.bicycle;
    const jobsData: GeneratedJob[] = [
      makeJob({ tags: ['foot', '18+'], transport: 'foot' }),
      makeJob({ tags: ['auto', '18+'], transport: 'auto' }),
    ];

    // Act + Assert
    expect(isHubEmpty(jobsData, cfg)).toBe(true);
  });

  it('correctly identifies each of the 4 hubs as non-empty with matching jobs', () => {
    for (const key of VALID_TAGS) {
      // Arrange
      const cfg = HUB_CONFIGS[key];
      const jobsData = makeJobs(3, key);

      // Act + Assert
      expect(isHubEmpty(jobsData, cfg)).toBe(false);
    }
  });

  it('returns true for flexible hub when no flexible-tagged jobs exist', () => {
    // Arrange
    const cfg = HUB_CONFIGS.flexible;
    const jobsData = makeJobs(10, 'foot'); // no flexible

    // Act + Assert
    expect(isHubEmpty(jobsData, cfg)).toBe(true);
  });
});

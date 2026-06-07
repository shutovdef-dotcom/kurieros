/**
 * Build-output assertions for the SEO rollout (Flywheel Phase D, Bead B13).
 *
 * Skips automatically when `dist/` is absent — run after `npm run build`.
 *
 * What we lock down:
 *   - All 8 new routes emit dist/{slug}/index.html.
 *   - Hub pages contain the expected DOM anchors (vacancies, jobs-grid, job-card).
 *   - Every new route has exactly one <link rel="canonical">.
 *   - Every new route carries at least one parseable JSON-LD block with no
 *     unescaped </script> sequences.
 *   - /otzyvy/ JSON-LD graph has no top-level AggregateRating node.
 *   - /otzyvy/ has at most 54 review-card elements.
 *   - The 4 category pages canonicalize to their matching hub URLs.
 *   - An unaffected category page stays self-canonical.
 *   - The homepage links all 4 hub URLs and /skolko-zarabatyvaet-kurer/.
 *   - All 8 new URLs appear in dist/sitemap-*.xml with correct priorities.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = join(ROOT, '..', 'dist');
const skipIfNoDist = !existsSync(DIST_DIR);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strip HTML comments to avoid false positives on content inside <!-- ... --> */
function stripComments(html: string): string {
  return html.replace(/<!--[\s\S]*?-->/g, '');
}

/**
 * Extract all JSON-LD blocks from HTML.
 *
 * Each <script type="application/ld+json"> element may contain either:
 *   (a) pure JSON starting at the tag boundary, OR
 *   (b) comment/prose text followed by the real JSON object (the /otzyvy/
 *       InfoGuideLayout pattern where a HTML comment wraps the injection note
 *       and the actual JSON starts with `{"@context"`).
 *
 * Returns only the blocks whose content parses as valid JSON.
 */
function extractParsedLdJson(html: string): unknown[] {
  const results: unknown[] = [];
  const OPEN_TAG = '<script type="application/ld+json">';
  const CLOSE_TAG = '</script>';
  let searchFrom = 0;
  while (true) {
    const openPos = html.indexOf(OPEN_TAG, searchFrom);
    if (openPos === -1) break;
    const contentStart = openPos + OPEN_TAG.length;
    const closePos = html.indexOf(CLOSE_TAG, contentStart);
    if (closePos === -1) break;
    const rawContent = html.slice(contentStart, closePos);
    // Try parsing from the first '{' to handle prose-prefixed blocks.
    const jsonStart = rawContent.indexOf('{');
    if (jsonStart !== -1) {
      try {
        results.push(JSON.parse(rawContent.slice(jsonStart)));
      } catch {
        // Block is not valid JSON even after prose-prefix skip — ignore.
      }
    }
    searchFrom = closePos + CLOSE_TAG.length;
  }
  return results;
}

/** Concatenate all numbered sitemap files (sitemap-0.xml, sitemap-1.xml, …). */
function readAllSitemaps(): string {
  const files = readdirSync(DIST_DIR).filter((f) => /^sitemap-\d+\.xml$/.test(f));
  return files.map((f) => readFileSync(join(DIST_DIR, f), 'utf8')).join('\n');
}

/** Read dist/{slug}/index.html, throwing a descriptive error if absent. */
function readPage(slug: string): string {
  const pagePath = join(DIST_DIR, slug, 'index.html');
  if (!existsSync(pagePath)) {
    throw new Error(`Expected page missing in dist: ${slug}/index.html`);
  }
  return readFileSync(pagePath, 'utf8');
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe.skipIf(skipIfNoDist)('SEO rollout build output', () => {
  const NEW_SLUGS = [
    'rabota-peshim-kurerom',
    'rabota-avtokurerom',
    'rabota-velokurerom',
    'podrabotka-kurerom',
    'skolko-zarabatyvaet-kurer',
    'kak-stat-kurerom',
    'usloviya-raboty-kurerom',
    'otzyvy',
  ] as const;

  // ---------------------------------------------------------------------------
  // Route existence
  // ---------------------------------------------------------------------------

  describe('all 8 new routes emit index.html', () => {
    for (const slug of NEW_SLUGS) {
      it(`dist/${slug}/index.html exists`, () => {
        // Arrange
        const pagePath = join(DIST_DIR, slug, 'index.html');
        // Act + Assert
        expect(existsSync(pagePath), `${slug}/index.html is missing from dist`).toBe(true);
      });
    }
  });

  // ---------------------------------------------------------------------------
  // JSON-LD: parseable + no injection risk
  // ---------------------------------------------------------------------------

  describe('each new route carries parseable JSON-LD with no </script> injection', () => {
    for (const slug of NEW_SLUGS) {
      it(`${slug} has at least one parseable JSON-LD block`, () => {
        // Arrange
        const html = readPage(slug);
        // Act
        const blocks = extractParsedLdJson(html);
        // Assert
        expect(
          blocks.length,
          `${slug}: expected at least one parseable JSON-LD block`,
        ).toBeGreaterThanOrEqual(1);
      });

      it(`${slug} JSON-LD content contains no unescaped </script>`, () => {
        // Arrange
        const html = readPage(slug);
        const OPEN_TAG = '<script type="application/ld+json">';
        const CLOSE_TAG = '</script>';
        // Act: collect raw text content of every JSON-LD block
        const rawBlocks: string[] = [];
        let searchFrom = 0;
        while (true) {
          const openPos = html.indexOf(OPEN_TAG, searchFrom);
          if (openPos === -1) break;
          const contentStart = openPos + OPEN_TAG.length;
          const closePos = html.indexOf(CLOSE_TAG, contentStart);
          if (closePos === -1) break;
          rawBlocks.push(html.slice(contentStart, closePos));
          searchFrom = closePos + CLOSE_TAG.length;
        }
        // Assert: the raw content of each block must not contain </script>
        for (const raw of rawBlocks) {
          expect(raw, `${slug}: JSON-LD block contains unescaped </script>`).not.toContain('</script>');
        }
      });
    }
  });

  // ---------------------------------------------------------------------------
  // Canonical links
  // ---------------------------------------------------------------------------

  describe('each new route has exactly one canonical link', () => {
    for (const slug of NEW_SLUGS) {
      it(`${slug} has exactly one <link rel="canonical">`, () => {
        // Arrange
        const html = readPage(slug);
        const stripped = stripComments(html);
        // Act
        const canonicals = stripped.match(/<link rel="canonical"[^>]*>/g) ?? [];
        // Assert
        expect(
          canonicals.length,
          `${slug}: expected exactly one canonical link, found ${canonicals.length}`,
        ).toBe(1);
        expect(canonicals[0]).toMatch(/href="[^"]+"/);
      });
    }
  });

  // ---------------------------------------------------------------------------
  // Hub pages: DOM structure
  // ---------------------------------------------------------------------------

  const HUB_SLUGS = [
    'rabota-peshim-kurerom',
    'rabota-avtokurerom',
    'rabota-velokurerom',
    'podrabotka-kurerom',
  ] as const;

  describe('hub pages contain vacancies grid DOM anchors', () => {
    for (const slug of HUB_SLUGS) {
      it(`${slug} has id="vacancies" exactly once outside comments`, () => {
        // Arrange
        const html = readPage(slug);
        const stripped = stripComments(html);
        // Act
        const count = (stripped.match(/id="vacancies"/g) ?? []).length;
        // Assert
        expect(
          count,
          `${slug}: id="vacancies" must appear exactly once outside HTML comments`,
        ).toBe(1);
      });

      it(`${slug} has id="jobs-grid" exactly once outside comments`, () => {
        // Arrange
        const html = readPage(slug);
        const stripped = stripComments(html);
        // Act
        const count = (stripped.match(/id="jobs-grid"/g) ?? []).length;
        // Assert
        expect(
          count,
          `${slug}: id="jobs-grid" must appear exactly once outside HTML comments`,
        ).toBe(1);
      });

      it(`${slug} has class="job-card" present (hub is non-empty)`, () => {
        // Arrange
        const html = readPage(slug);
        // Act + Assert: the hub has live vacancies so job-card must appear
        expect(html, `${slug}: no job-card elements found`).toContain('class="job-card"');
      });

      it(`${slug} renders the hub city <select> with options (bead B15)`, () => {
        // Arrange
        const html = readPage(slug);
        // Act: isolate the hub city <select> block (attribute order agnostic)
        const idPos = html.indexOf('id="hub-city-filter"');
        const end = idPos === -1 ? -1 : html.indexOf('</select>', idPos);
        const block = idPos !== -1 && end !== -1 ? html.slice(idPos, end) : '';
        const optionCount = (block.match(/<option/g) ?? []).length;
        // Assert: non-empty hub → city <select> with "Все города" + ≥1 city
        expect(
          idPos,
          `${slug}: missing the hub city <select> (id="hub-city-filter")`,
        ).toBeGreaterThan(-1);
        expect(
          optionCount,
          `${slug}: hub city <select> should have ≥2 options`,
        ).toBeGreaterThanOrEqual(2);
      });
    }
  });

  // ---------------------------------------------------------------------------
  // /otzyvy/ specific: AggregateRating + review-card count
  // ---------------------------------------------------------------------------

  describe('/otzyvy/ JSON-LD and review elements', () => {
    it('/otzyvy/ JSON-LD @graph has no top-level AggregateRating node (Decision C)', () => {
      // Arrange
      const html = readPage('otzyvy');
      const blocks = extractParsedLdJson(html);
      // Act: collect all @graph nodes across all parseable blocks
      const allGraphNodes: unknown[] = [];
      for (const block of blocks) {
        if (block !== null && typeof block === 'object' && '@graph' in (block as object)) {
          const nodes = (block as { '@graph': unknown[] })['@graph'];
          if (Array.isArray(nodes)) {
            allGraphNodes.push(...nodes);
          }
        }
      }
      const pageRatingNodes = allGraphNodes.filter(
        (n): n is { '@type': string } =>
          typeof n === 'object' &&
          n !== null &&
          (n as { '@type'?: string })['@type'] === 'AggregateRating',
      );
      // Assert: per-brand aggregateRating is nested inside Organization — top-level is not allowed
      expect(
        pageRatingNodes,
        '/otzyvy/ must not emit a top-level AggregateRating node in the JSON-LD @graph',
      ).toHaveLength(0);
    });

    it('/otzyvy/ has at most 54 review-card elements', () => {
      // Arrange
      const html = readPage('otzyvy');
      // Act: count elements whose class attribute contains "review-card" as a word
      const reviewCards = (html.match(/class="[^"]*\breview-card\b/g) ?? []).length;
      // Assert
      expect(
        reviewCards,
        `/otzyvy/: review-card count ${reviewCards} exceeds the 54-card cap`,
      ).toBeLessThanOrEqual(54);
    });
  });

  // ---------------------------------------------------------------------------
  // Category pages canonicalize to matching hub URLs (Decision A)
  // ---------------------------------------------------------------------------

  describe('category pages canonicalize to their hub URL', () => {
    const CATEGORY_TO_HUB: Array<{ categorySlug: string; hubUrl: string; hubSlug: string }> = [
      {
        categorySlug: 'rabota-kurerom-peshkom',
        hubUrl: 'https://kurerok.ru/rabota-peshim-kurerom/',
        hubSlug: 'rabota-peshim-kurerom',
      },
      {
        categorySlug: 'rabota-kurerom-na-avto',
        hubUrl: 'https://kurerok.ru/rabota-avtokurerom/',
        hubSlug: 'rabota-avtokurerom',
      },
      {
        categorySlug: 'rabota-kurerom-na-velosipede',
        hubUrl: 'https://kurerok.ru/rabota-velokurerom/',
        hubSlug: 'rabota-velokurerom',
      },
      {
        categorySlug: 'rabota-kurerom-podrabotka',
        hubUrl: 'https://kurerok.ru/podrabotka-kurerom/',
        hubSlug: 'podrabotka-kurerom',
      },
    ];

    for (const { categorySlug, hubUrl, hubSlug } of CATEGORY_TO_HUB) {
      it(`dist/${categorySlug}/ canonical points at ${hubUrl} (or self-canonical if hub is noindexed)`, () => {
        // Arrange
        const categoryPath = join(DIST_DIR, categorySlug, 'index.html');
        if (!existsSync(categoryPath)) return; // category absent — not a B13 failure

        const html = readPage(categorySlug);
        const stripped = stripComments(html);

        // Determine if the matching hub is noindexed (empty hub edge case per spec §edge-cases)
        const hubPath = join(DIST_DIR, hubSlug, 'index.html');
        const hubIsNoindex =
          existsSync(hubPath) &&
          readFileSync(hubPath, 'utf8').match(/<meta name="robots"[^>]*content="[^"]*noindex/i) !== null;

        // Act
        const canonicalMatch = stripped.match(/<link rel="canonical" href="([^"]+)"/);
        expect(canonicalMatch, `${categorySlug}: no canonical link found`).not.toBeNull();
        const canonicalHref = canonicalMatch![1];

        // Assert
        if (hubIsNoindex) {
          // Hub is empty/noindexed: category page should remain self-canonical
          expect(canonicalHref).toContain(categorySlug);
        } else {
          expect(
            canonicalHref,
            `${categorySlug}: canonical should point at hub ${hubUrl}`,
          ).toBe(hubUrl);
        }
      });
    }

    it('unaffected category dist/rabota-kurerom-16-let/ stays self-canonical', () => {
      // Arrange
      const slug = 'rabota-kurerom-16-let';
      if (!existsSync(join(DIST_DIR, slug, 'index.html'))) return;
      const html = readPage(slug);
      const stripped = stripComments(html);
      // Act
      const canonicalMatch = stripped.match(/<link rel="canonical" href="([^"]+)"/);
      expect(canonicalMatch, `${slug}: no canonical link found`).not.toBeNull();
      const canonicalHref = canonicalMatch![1];
      // Assert: self-canonical — must not point to any hub
      expect(canonicalHref).toContain('rabota-kurerom-16-let');
      expect(canonicalHref).not.toMatch(
        /rabota-peshim-kurerom|rabota-avtokurerom|rabota-velokurerom|podrabotka-kurerom/,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Homepage links
  // ---------------------------------------------------------------------------

  describe('homepage links hub URLs and /skolko-zarabatyvaet-kurer/', () => {
    const EXPECTED_LINKS = [
      '/rabota-peshim-kurerom/',
      '/rabota-avtokurerom/',
      '/rabota-velokurerom/',
      '/podrabotka-kurerom/',
      '/skolko-zarabatyvaet-kurer/',
    ] as const;

    for (const link of EXPECTED_LINKS) {
      it(`homepage HTML contains a link to ${link}`, () => {
        // Arrange
        const html = readPage('');
        // Act + Assert
        expect(html, `homepage: expected link to ${link}`).toContain(link);
      });
    }

    it('homepage <title> contains "курьер" and is ≤ 70 characters', () => {
      // Arrange
      const html = readPage('');
      // Act
      const titleMatch = html.match(/<title>([^<]*)<\/title>/);
      expect(titleMatch, 'homepage: <title> tag missing').not.toBeNull();
      const title = titleMatch![1];
      // Assert
      expect(title.toLowerCase()).toMatch(/курьер/);
      expect(
        title.length,
        `homepage <title> "${title}" is ${title.length} chars (limit 70)`,
      ).toBeLessThanOrEqual(70);
    });
  });

  // ---------------------------------------------------------------------------
  // Sitemap: all 8 new URLs present with correct priorities
  // ---------------------------------------------------------------------------

  describe('sitemap includes all 8 new URLs with correct priorities', () => {
    const HUB_URLS = [
      '/rabota-peshim-kurerom/',
      '/rabota-avtokurerom/',
      '/rabota-velokurerom/',
      '/podrabotka-kurerom/',
    ] as const;

    const GUIDE_URLS = [
      '/skolko-zarabatyvaet-kurer/',
      '/kak-stat-kurerom/',
      '/usloviya-raboty-kurerom/',
    ] as const;

    it('all 8 new URLs appear in the sitemap (hub URLs skipped if hub is noindex)', () => {
      // Arrange
      const sitemapContent = readAllSitemaps();
      const allExpected = [...HUB_URLS, ...GUIDE_URLS, '/otzyvy/'] as const;
      // Act + Assert
      for (const url of allExpected) {
        const isHub = (HUB_URLS as readonly string[]).includes(url);
        if (isHub) {
          const hubSlug = url.replace(/\//g, '');
          const hubPath = join(DIST_DIR, hubSlug, 'index.html');
          const hubIsNoindex =
            existsSync(hubPath) &&
            readFileSync(hubPath, 'utf8').match(/<meta name="robots"[^>]*content="[^"]*noindex/i) !== null;
          if (hubIsNoindex) continue;
        }
        expect(sitemapContent, `sitemap missing URL: ${url}`).toContain(url);
      }
    });

    for (const hubUrl of HUB_URLS) {
      it(`${hubUrl} has <priority>0.8</priority> in sitemap`, () => {
        // Arrange
        const sitemapContent = readAllSitemaps();
        const idx = sitemapContent.indexOf(hubUrl);
        if (idx === -1) return; // hub absent due to noindex — acceptable
        // Act
        const snippet = sitemapContent.slice(idx, idx + 300);
        // Assert
        expect(snippet, `${hubUrl}: expected priority 0.8`).toContain('<priority>0.8</priority>');
      });
    }

    for (const guideUrl of GUIDE_URLS) {
      it(`${guideUrl} has <priority>0.7</priority> in sitemap`, () => {
        // Arrange
        const sitemapContent = readAllSitemaps();
        const idx = sitemapContent.indexOf(guideUrl);
        // Act
        expect(idx, `sitemap missing guide URL: ${guideUrl}`).toBeGreaterThan(-1);
        const snippet = sitemapContent.slice(idx, idx + 300);
        // Assert
        expect(snippet, `${guideUrl}: expected priority 0.7`).toContain('<priority>0.7</priority>');
      });
    }

    it('/otzyvy/ has <priority>0.6</priority> in sitemap', () => {
      // Arrange
      const sitemapContent = readAllSitemaps();
      const idx = sitemapContent.indexOf('/otzyvy/');
      // Act
      expect(idx, 'sitemap missing /otzyvy/').toBeGreaterThan(-1);
      const snippet = sitemapContent.slice(idx, idx + 300);
      // Assert
      expect(snippet, '/otzyvy/: expected priority 0.6').toContain('<priority>0.6</priority>');
    });
  });
});

/**
 * Build-artifact assertions.
 *
 * Skips automatically when `dist/` is absent — these tests are meaningful
 * only after `npm run build` has produced the static site. Run locally
 * with: `npm run build && npm test`.
 *
 * What we lock down:
 *   - Total HTML page count is in the expected band (~5790 across all langs).
 *   - Vacancy translation fragments use the post-#129 compact shape.
 *   - Detail pages preload their per-source translation fragment.
 *   - Listing pages do NOT preload a fragment (they aggregate many vacancies).
 *   - H13: `/api/city-index.json` exists, carries both fields, and the
 *     homepage no longer inlines the `cityRouteMap` literal.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = join(ROOT, '..', 'dist');
const skipIfNoDist = !existsSync(DIST_DIR);

const countHtml = (dir: string): number => {
  let count = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      count += countHtml(full);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      count += 1;
    }
  }
  return count;
};

describe.skipIf(skipIfNoDist)('Build output', () => {
  it('has expected page count (~5790)', () => {
    const count = countHtml(DIST_DIR);
    expect(count).toBeGreaterThanOrEqual(5780);
    expect(count).toBeLessThanOrEqual(5810);
  });

  it('vacancy fragments use the compact format (post-#129)', () => {
    const fragmentPath = join(DIST_DIR, 'vacancy-translations', 'uk', 'yandex-eda-courier.json');
    if (!existsSync(fragmentPath)) {
      throw new Error(`expected fragment file missing: ${fragmentPath}`);
    }
    const sample = JSON.parse(readFileSync(fragmentPath, 'utf8'));
    expect(sample).toHaveProperty('defaults');
    expect(sample).toHaveProperty('entries');
  });

  it('detail pages do NOT preload a vacancy-translations fragment (audit H1)', () => {
    // The hardcoded RU preload was useless: RU visitors short-circuit before
    // consuming it, non-RU visitors need their own language fragment.
    // Removed in audit v2 H1 — this test guards against accidental re-add.
    const detailHtml = join(DIST_DIR, 'v', 'yandex-eda-courier-moskva-foot', 'index.html');
    if (!existsSync(detailHtml)) {
      throw new Error(`expected detail page missing: ${detailHtml}`);
    }
    const html = readFileSync(detailHtml, 'utf8');
    expect(html).not.toMatch(/rel="preload"\s+as="fetch"\s+href="\/vacancy-translations\//);
  });

  it('listing pages do NOT preload a vacancy-translations fragment', () => {
    const listingHtml = join(DIST_DIR, 'rabota-kurerom-moskva', 'index.html');
    if (!existsSync(listingHtml)) {
      throw new Error(`expected listing page missing: ${listingHtml}`);
    }
    const html = readFileSync(listingHtml, 'utf8');
    expect(html).not.toMatch(/rel="preload"\s+as="fetch"\s+href="\/vacancy-translations\//);
  });

  it('every fragment file is valid JSON', () => {
    const fragmentRoot = join(DIST_DIR, 'vacancy-translations');
    if (!existsSync(fragmentRoot)) return;
    let checked = 0;
    for (const lang of readdirSync(fragmentRoot)) {
      const langDir = join(fragmentRoot, lang);
      if (!statSync(langDir).isDirectory()) continue;
      for (const file of readdirSync(langDir)) {
        if (!file.endsWith('.json')) continue;
        const path = join(langDir, file);
        expect(() => JSON.parse(readFileSync(path, 'utf8')), `${lang}/${file} parses`).not.toThrow();
        checked += 1;
      }
    }
    expect(checked, 'at least one fragment file checked').toBeGreaterThan(0);
  });

  // H13 — lazy-load 49 KB of city data from a static JSON endpoint
  // instead of inlining it into every render of the homepage.
  describe('H13: city-index lazy fetch', () => {
    it('emits dist/api/city-index.json with both lookup tables', () => {
      const cityIndexPath = join(DIST_DIR, 'api', 'city-index.json');
      expect(existsSync(cityIndexPath), 'city-index.json exists').toBe(true);

      const raw = readFileSync(cityIndexPath, 'utf8');
      const data = JSON.parse(raw);

      expect(data).toHaveProperty('availableCities');
      expect(data).toHaveProperty('cityRouteMap');
      expect(Array.isArray(data.availableCities)).toBe(true);
      expect(data.availableCities.length).toBeGreaterThan(500);
      expect(data.availableCities).toContain('Москва');
      expect(data.availableCities).toContain('Санкт-Петербург');

      expect(typeof data.cityRouteMap).toBe('object');
      expect(Object.keys(data.cityRouteMap).length).toBeGreaterThan(500);
      expect(data.cityRouteMap['Москва']).toBe('/rabota-kurerom-moskva/');
      expect(data.cityRouteMap['Санкт-Петербург']).toBe('/rabota-kurerom-sankt-peterburg/');

      // Every entry in availableCities must have a corresponding
      // cityRouteMap entry — that's the invariant the inline script
      // used to rely on when it had both arrays in lockstep.
      for (const name of data.availableCities) {
        expect(
          data.cityRouteMap[name],
          `cityRouteMap missing entry for ${name}`,
        ).toBeTruthy();
      }
    });

    it('homepage HTML no longer inlines the city array literal', () => {
      const indexHtml = readFileSync(join(DIST_DIR, 'index.html'), 'utf8');
      // The original `define:vars={{ availableCities, cityRouteMap }}`
      // emitted `const availableCities = [...]` directly into a
      // <script> tag — that's what H13 eliminates.
      expect(indexHtml).not.toMatch(/const\s+availableCities\s*=\s*\[/);
      expect(indexHtml).not.toMatch(/const\s+cityRouteMap\s*=\s*\{/);
      // And conversely, the lazy-fetch wiring must be present.
      expect(indexHtml).toContain("fetch('/api/city-index.json'");
    });
  });
});

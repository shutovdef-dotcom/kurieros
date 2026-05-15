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

  it('detail pages have a fragment preload hint', () => {
    const detailHtml = join(DIST_DIR, 'v', 'yandex-eda-courier-moskva-foot', 'index.html');
    if (!existsSync(detailHtml)) {
      throw new Error(`expected detail page missing: ${detailHtml}`);
    }
    const html = readFileSync(detailHtml, 'utf8');
    expect(html).toContain('rel="preload"');
    expect(html).toContain('vacancy-translations/ru/yandex-eda-courier.json');
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
});

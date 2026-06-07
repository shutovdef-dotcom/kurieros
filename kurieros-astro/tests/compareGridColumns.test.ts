import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const GRID_SOURCE = readFileSync(
  join(ROOT, '..', 'src', 'components', 'compare', 'CompareGrid.astro'),
  'utf8',
);
const RENDER_SOURCE = readFileSync(
  join(ROOT, '..', 'src', 'scripts', 'compare', 'render.ts'),
  'utf8',
);
const CATALOG_SOURCE = readFileSync(
  join(ROOT, '..', 'src', 'scripts', 'compare', 'catalogLoader.ts'),
  'utf8',
);

describe('compare grid column classes', () => {
  it('supports every filter-renderable column count without inline --cols', () => {
    for (let count = 0; count <= 12; count += 1) {
      expect(GRID_SOURCE).toContain(`.compare-grid--cols-${count}`);
    }
  });

  it('runtime renderers update column count through classes, not inline style', () => {
    expect(RENDER_SOURCE).not.toContain("style.setProperty('--cols'");
    expect(CATALOG_SOURCE).not.toContain("style.setProperty('--cols'");
    expect(RENDER_SOURCE).toContain('setCompareGridColumnClass(grid, jobs.length)');
    expect(CATALOG_SOURCE).toContain('setCompareGridColumnClass(grid, 0)');
  });
});

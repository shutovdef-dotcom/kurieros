/**
 * Static-source drift-guard for the compare-list cap + storage key.
 *
 * The compare list (jobs the user pins for side-by-side comparison) is
 * bounded by a single cap, `MAX_COMPARE_IDS`. That cap lives canonically
 * in `src/scripts/compare/compareList.ts` — a typed ES module, bundled
 * and test-covered.
 *
 * But some consumers initialise independently from that module:
 * `jobGridController.js`, the inline block in `Header.astro`, and
 * `compare.astro`'s build-time frontmatter each carry a hand-maintained
 * local `const MAX_COMPARE_IDS = 4`. A change to the cap in one copy does
 * NOT reach the others, yet `tests/compare-*.test.ts` stay green.
 *
 * This file reads all four sources as text and asserts:
 *   1. every copy declares `MAX_COMPARE_IDS = <n>` with the SAME value;
 *   2. every localStorage consumer uses the SAME `'compareList'` key
 *      literal. `compare.astro` is excluded from (2) on purpose: its
 *      build-time frontmatter never touches localStorage (the browser-side
 *      compare logic lives in the bundled `compareInit.ts` module), so it
 *      carries the cap but not the storage key.
 *
 * A future edit that bumps the cap (or renames the key) in one place only
 * fails CI here.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = dirname(fileURLToPath(import.meta.url));

/** The four files that each carry their own copy of the compare-list cap. */
const SOURCES = {
  'compareList.ts': join(ROOT, '..', 'src', 'scripts', 'compare', 'compareList.ts'),
  'jobGridController.js': join(ROOT, '..', 'src', 'scripts', 'jobGridController.js'),
  'Header.astro': join(ROOT, '..', 'src', 'components', 'Header.astro'),
  'compare.astro': join(ROOT, '..', 'src', 'pages', 'compare.astro'),
} as const;

const TEXT: Record<string, string> = Object.fromEntries(
  Object.entries(SOURCES).map(([name, path]) => [name, readFileSync(path, 'utf8')]),
);

/** localStorage key literal shared by every compare-list reader/writer. */
const STORAGE_KEY_LITERAL = "'compareList'";

/**
 * Files that actually read/write `localStorage` and so must carry the key
 * literal. `compare.astro` is intentionally absent — its frontmatter runs
 * at build time and never touches `localStorage`.
 */
const STORAGE_KEY_CONSUMERS = [
  'compareList.ts',
  'jobGridController.js',
  'Header.astro',
] as const;

/**
 * Extract the integer assigned to `MAX_COMPARE_IDS` in a source file.
 * Matches `const MAX_COMPARE_IDS = 4;` (whitespace tolerant). Returns
 * `null` if the declaration is absent.
 */
const extractMaxCompareIds = (source: string): number | null => {
  const match = source.match(/MAX_COMPARE_IDS\s*=\s*(\d+)/);
  return match ? Number.parseInt(match[1], 10) : null;
};

describe('compare-list cap parity — MAX_COMPARE_IDS', () => {
  it('every copy declares MAX_COMPARE_IDS', () => {
    for (const name of Object.keys(SOURCES)) {
      // If this fails: a copy dropped its `MAX_COMPARE_IDS` declaration —
      // it likely reverted to a bare `4` literal.
      expect(extractMaxCompareIds(TEXT[name]), name).not.toBeNull();
    }
  });

  it('the canonical module pins the cap at a sane positive value', () => {
    const canonical = extractMaxCompareIds(TEXT['compareList.ts']);
    expect(canonical).not.toBeNull();
    expect(canonical).toBeGreaterThan(0);
  });

  it('all four copies use the SAME MAX_COMPARE_IDS value', () => {
    const canonical = extractMaxCompareIds(TEXT['compareList.ts']);
    for (const name of Object.keys(SOURCES)) {
      // If this fails: the compare-list cap was changed in one file only.
      // The source of truth is `MAX_COMPARE_IDS` in compareList.ts —
      // mirror the new value into jobGridController.js, Header.astro,
      // compare.astro.
      expect(extractMaxCompareIds(TEXT[name]), name).toBe(canonical);
    }
  });
});

describe('compare-list storage-key parity', () => {
  it('every localStorage consumer uses the compareList key literal', () => {
    for (const name of STORAGE_KEY_CONSUMERS) {
      // If this fails: a copy renamed the storage key — stored compare
      // lists from older sessions become unreadable for that consumer.
      expect(TEXT[name], name).toContain(STORAGE_KEY_LITERAL);
    }
  });
});

describe('compare-list eviction direction — drop-oldest on add overflow', () => {
  it('jobGridController.js toggleCompare evicts the OLDEST id when full', () => {
    // The single fresh-"add to compare" overflow path. It must drop the
    // oldest id (`slice(1)`) and append the just-added one, so the job the
    // user just picked is kept (audit v5 M10). The `.slice(0, …)`
    // normalizers are defensive caps on stored data, NOT this path.
    const jobGrid = TEXT['jobGridController.js'];
    expect(jobGrid).toMatch(/compareList\.length\s*>=\s*MAX_COMPARE_IDS/);
    expect(jobGrid).toContain('[...compareList.slice(1), id]');
  });
});

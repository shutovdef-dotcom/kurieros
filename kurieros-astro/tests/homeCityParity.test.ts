/**
 * Static-source drift-guard for the home-page city-resolution twin.
 *
 * `src/pages/index.astro` runs an `is:inline` `<script>` that cannot
 * `import` (Wave 16 confirmed this). It therefore carries a
 * hand-maintained inline copy of the city-resolution logic that also
 * lives — canonically and test-covered — in `src/scripts/homeCity.js`.
 *
 * Because the page never imports the module, a fix made in one copy
 * does NOT reach the other, yet `tests/homeCity.test.ts` (which pins
 * the module) stays green. This file closes that gap: it reads BOTH
 * sources as text and asserts the load-bearing invariants are
 * byte-identical across the two copies. A future edit to one copy that
 * isn't mirrored to the other fails CI here.
 *
 * Pragmatic by design — it pins the constants that silently strand
 * users on the wrong city if they diverge (the TZ→city map, the
 * localStorage key literals, the Moscow alias list, the default city),
 * not every line of the two implementations.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const MODULE_SOURCE = readFileSync(
  join(ROOT, '..', 'src', 'scripts', 'homeCity.js'),
  'utf8',
);
const PAGE_SOURCE = readFileSync(
  join(ROOT, '..', 'src', 'pages', 'index.astro'),
  'utf8',
);

/** Extract every `'IANA/Zone': 'City'` pair as a normalized `tz=city` set. */
const extractTzPairs = (source: string): Set<string> => {
  const pairs = source.match(/'(?:Europe|Asia)\/[A-Za-z_]+'\s*:\s*'[^']+'/g) ?? [];
  return new Set(
    pairs.map((pair) => pair.replace(/\s+/g, '').replace(/'/g, '')),
  );
};

describe('homeCity.js <-> index.astro — TZ_TO_CITY parity', () => {
  it('both copies define a non-empty TZ map', () => {
    expect(extractTzPairs(MODULE_SOURCE).size).toBeGreaterThan(0);
    expect(extractTzPairs(PAGE_SOURCE).size).toBeGreaterThan(0);
  });

  it('the timezone -> city entries are identical in both copies', () => {
    const modulePairs = [...extractTzPairs(MODULE_SOURCE)].sort();
    const pagePairs = [...extractTzPairs(PAGE_SOURCE)].sort();
    // If this fails: a TZ entry was added/removed/changed in one copy
    // only. Mirror the edit into the other copy.
    expect(pagePairs).toEqual(modulePairs);
  });
});

describe('homeCity.js <-> index.astro — storage-key parity', () => {
  it('both copies use the selected-city storage key literal', () => {
    expect(MODULE_SOURCE).toContain("'kurieros-selected-city'");
    expect(PAGE_SOURCE).toContain("'kurieros-selected-city'");
  });

  it('both copies use the geo-banner-dismissed storage key literal', () => {
    expect(MODULE_SOURCE).toContain("'kurieros:geo-banner-dismissed'");
    expect(PAGE_SOURCE).toContain("'kurieros:geo-banner-dismissed'");
  });
});

describe('homeCity.js <-> index.astro — Moscow alias parity', () => {
  it('both copies recognise the same Latin Moscow aliases', () => {
    // The exact array literal used inside normalizeDetectedCity.
    const moscowAliasLiteral = "['moscow', 'moskva']";
    expect(MODULE_SOURCE).toContain(moscowAliasLiteral);
    expect(PAGE_SOURCE).toContain(moscowAliasLiteral);
  });
});

describe('homeCity.js <-> index.astro — default city parity', () => {
  it('both copies declare the same DEFAULT_CITY', () => {
    expect(MODULE_SOURCE).toMatch(/DEFAULT_CITY\s*=\s*'Москва'/);
    expect(PAGE_SOURCE).toMatch(/DEFAULT_CITY\s*=\s*'Москва'/);
  });
});

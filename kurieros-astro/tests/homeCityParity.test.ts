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
 * the module) stays green. This file narrows that gap: it reads BOTH
 * sources as text and asserts they stay in sync.
 *
 * Scope — two layers:
 *
 *   1. CONSTANTS — the TZ→city map, the two localStorage key literals,
 *      the Moscow-alias array, the default city. These must be byte-for-
 *      byte identical; a divergence silently strands users on the wrong
 *      city.
 *
 *   2. RESOLUTION-FUNCTION BODIES (audit v5 M11) — `getFallbackCity`,
 *      `normalizeDetectedCity`, `getTzCity` and the `safeStorage` shape.
 *      The two copies are NOT byte-identical by design: the module form
 *      is dependency-injected and defensively typed for unit testing
 *      (`Array.isArray` guards, an `opts.getTimeZone` seam, a `storage`
 *      parameter), while the inline form closes over outer-scope
 *      variables. So this layer does not assert whole-body equality —
 *      it extracts each function body from BOTH copies and pins the
 *      load-bearing ALGORITHMIC substrings (the `город` strip regex, the
 *      Moscow-alias check, the case-insensitive catalogue lookups, the
 *      TZ-map dereference, the error-swallowing `catch`). A behavioural
 *      edit to one copy's logic — changing the regex, the alias list,
 *      the comparison, the fallback — stops a pinned substring from
 *      matching and fails CI here.
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

// ---------------------------------------------------------------------------
// Layer 2 — resolution-function bodies (audit v5 M11)
// ---------------------------------------------------------------------------

/**
 * Extract a named function's body text (the code between its outermost
 * `{` and `}`). The param list is brace-balanced first so a default
 * value like `opts = {}` does not confuse the body-brace scan. Returns
 * `null` if the function is absent.
 */
const extractFunctionBody = (source: string, name: string): string | null => {
  const header = new RegExp(
    `(?:export\\s+)?(?:async\\s+)?function\\s+${name}\\s*\\(`,
  ).exec(source);
  if (!header) return null;

  // Walk past the parameter list (parens balanced).
  let i = header.index + header[0].length;
  let parenDepth = 1;
  for (; i < source.length && parenDepth > 0; i += 1) {
    if (source[i] === '(') parenDepth += 1;
    else if (source[i] === ')') parenDepth -= 1;
  }
  // Advance to the opening brace of the body.
  while (i < source.length && source[i] !== '{') i += 1;
  if (i >= source.length) return null;

  // Brace-balanced scan of the body.
  let braceDepth = 0;
  const start = i;
  for (; i < source.length; i += 1) {
    if (source[i] === '{') braceDepth += 1;
    else if (source[i] === '}') {
      braceDepth -= 1;
      if (braceDepth === 0) return source.slice(start + 1, i);
    }
  }
  return null;
};

/** Collapse all whitespace runs to a single space and trim. */
const normalizeWhitespace = (text: string): string =>
  text.replace(/\s+/g, ' ').trim();

/**
 * Extract the `safeStorage` (or `createSafeStorage`) object body — the
 * `get` / `set` / `remove` method block — from either copy.
 */
const extractSafeStorageBody = (source: string): string => {
  // Inline copy: `const safeStorage = { ... };`
  const inline = source.match(/safeStorage\s*=\s*\{[\s\S]*?\n\s*\};/);
  if (inline) return normalizeWhitespace(inline[0]);
  // Module copy: `createSafeStorage` returns the object literal.
  const factory = source.match(/return\s*\{[\s\S]*?remove\(key\)[\s\S]*?\n\s*\};/);
  return factory ? normalizeWhitespace(factory[0]) : '';
};

describe('homeCity.js <-> index.astro — getFallbackCity body parity', () => {
  it('both copies define a getFallbackCity body', () => {
    expect(extractFunctionBody(MODULE_SOURCE, 'getFallbackCity')).not.toBeNull();
    expect(extractFunctionBody(PAGE_SOURCE, 'getFallbackCity')).not.toBeNull();
  });

  it('both copies prefer DEFAULT_CITY then fall back to the first city', () => {
    // The whole resolution rule of getFallbackCity, pinned as substrings.
    // A change to either branch in one copy stops a pin from matching.
    const moduleBody = normalizeWhitespace(
      extractFunctionBody(MODULE_SOURCE, 'getFallbackCity') ?? '',
    );
    const pageBody = normalizeWhitespace(
      extractFunctionBody(PAGE_SOURCE, 'getFallbackCity') ?? '',
    );
    for (const body of [moduleBody, pageBody]) {
      expect(body).toContain('availableCities.includes(DEFAULT_CITY)');
      expect(body).toContain('return DEFAULT_CITY');
      expect(body).toContain("return availableCities[0] || ''");
    }
  });
});

describe('homeCity.js <-> index.astro — normalizeDetectedCity body parity', () => {
  it('both copies define a normalizeDetectedCity body', () => {
    expect(
      extractFunctionBody(MODULE_SOURCE, 'normalizeDetectedCity'),
    ).not.toBeNull();
    expect(
      extractFunctionBody(PAGE_SOURCE, 'normalizeDetectedCity'),
    ).not.toBeNull();
  });

  it('both copies share the same detection algorithm', () => {
    // Pins: case-insensitive direct match, the Russian «город » prefix
    // strip regex, the Latin Moscow-alias check, and the trimmed lookup.
    // These four lines ARE the algorithm — a behavioural edit to one copy
    // breaks a pin here.
    const moduleBody = normalizeWhitespace(
      extractFunctionBody(MODULE_SOURCE, 'normalizeDetectedCity') ?? '',
    );
    const pageBody = normalizeWhitespace(
      extractFunctionBody(PAGE_SOURCE, 'normalizeDetectedCity') ?? '',
    );
    for (const body of [moduleBody, pageBody]) {
      expect(body).toContain(
        'availableCities.find((city) => city.toLowerCase() === name.toLowerCase())',
      );
      expect(body).toContain("name.replace(/^город\\s+/i, '').trim()");
      expect(body).toContain(
        "['moscow', 'moskva'].includes(normalizedTrimmed)",
      );
      expect(body).toContain(
        'availableCities.find((city) => city.toLowerCase() === normalizedTrimmed)',
      );
    }
  });
});

describe('homeCity.js <-> index.astro — getTzCity body parity', () => {
  it('both copies define a getTzCity body', () => {
    expect(extractFunctionBody(MODULE_SOURCE, 'getTzCity')).not.toBeNull();
    expect(extractFunctionBody(PAGE_SOURCE, 'getTzCity')).not.toBeNull();
  });

  it('both copies dereference TZ_TO_CITY and gate on catalogue membership', () => {
    // Pins the TZ-map lookup, the catalogue-membership gate, and the
    // error-swallowing catch. (The module additionally carries an
    // `opts.getTimeZone` injection seam — intentional, not pinned.)
    const moduleBody = normalizeWhitespace(
      extractFunctionBody(MODULE_SOURCE, 'getTzCity') ?? '',
    );
    const pageBody = normalizeWhitespace(
      extractFunctionBody(PAGE_SOURCE, 'getTzCity') ?? '',
    );
    for (const body of [moduleBody, pageBody]) {
      expect(body).toContain('const city = TZ_TO_CITY[tz]');
      expect(body).toContain(
        "return city && availableCities.includes(city) ? city : ''",
      );
      expect(body).toMatch(/catch\s*\(_\)\s*\{\s*return\s*''/);
    }
  });
});

describe('homeCity.js <-> index.astro — safeStorage shape parity', () => {
  it('both copies expose get / set / remove that swallow storage errors', () => {
    // safeStorage differs structurally (the module takes an injected
    // `storage`, the inline copy hits `localStorage` directly), so the
    // pins below are the storage-API verbs + the try/catch contract that
    // MUST hold in both: read failures return null, writes/removes are
    // wrapped. A change to that contract breaks a pin.
    const moduleBody = extractSafeStorageBody(MODULE_SOURCE);
    const pageBody = extractSafeStorageBody(PAGE_SOURCE);

    expect(moduleBody).not.toBe('');
    expect(pageBody).not.toBe('');

    for (const body of [moduleBody, pageBody]) {
      expect(body).toMatch(/get\(key\)\s*\{\s*try\s*\{/);
      expect(body).toMatch(/getItem\(key\)/);
      expect(body).toMatch(/catch\s*\(_\)\s*\{\s*return null/);
      expect(body).toMatch(/set\(key,\s*value\)\s*\{\s*try\s*\{/);
      expect(body).toMatch(/setItem\(key,\s*value\)/);
      expect(body).toMatch(/remove\(key\)\s*\{\s*try\s*\{/);
      expect(body).toMatch(/removeItem\(key\)/);
    }
  });
});

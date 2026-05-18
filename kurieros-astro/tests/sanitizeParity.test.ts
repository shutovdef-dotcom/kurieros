/**
 * Static-source drift-guard for the XSS-sanitizer twin.
 *
 * `stripEventHandlers` (audit H10 / v3 M15) neutralizes attacker markup
 * — `on*` handlers, `javascript:`/`data:` URLs, active-content tags —
 * before DOMParser-fetched city HTML is cloned into the live document.
 * It exists in TWO copies:
 *
 *   - `src/scripts/sanitize.js` — the canonical, exported module,
 *     exercised by `tests/sanitize.test.ts`;
 *   - a hand-copied inline twin inside the `is:inline` `<script>` block
 *     of `src/components/JobGrid.astro` (the block needs `define:vars`
 *     constants, so it cannot `import` the module).
 *
 * `tests/sanitize.test.ts` only covers the MODULE. The inline twin —
 * the copy that actually runs in production for the city hot-swap — is
 * exercised by no test. An edit that hardens one copy and forgets the
 * other silently leaves a live XSS hole.
 *
 * Unlike the homeCity twin, this sanitizer is a VERBATIM hand-copy: the
 * two copies differ only in whitespace / line-wrapping and the module's
 * `export` keyword + JSDoc. So this guard extracts the body of every
 * sanitizer function from BOTH copies, whitespace-normalizes (collapsing
 * runs of whitespace AND whitespace adjacent to parentheses, and
 * dropping comments), and asserts the bodies are byte-identical. It also
 * pins the four shared constants. Any edit to one copy that is not
 * mirrored into the other fails CI here.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const MODULE_SOURCE = readFileSync(
  join(ROOT, '..', 'src', 'scripts', 'sanitize.js'),
  'utf8',
);
const TWIN_SOURCE = readFileSync(
  join(ROOT, '..', 'src', 'components', 'JobGrid.astro'),
  'utf8',
);

/** Every function that makes up the sanitizer, in dependency order. */
const SANITIZER_FUNCTIONS = [
  'stripEventHandlers',
  'sanitizeSubtree',
  'sanitizeElement',
  'isDangerousElement',
  'removeElement',
  'stripOnAttributes',
  'stripDangerousUrls',
] as const;

/**
 * Extract a named function's body text (between its outermost `{` and
 * `}`). The parameter list is brace-balanced first so a default value
 * like `opts = {}` cannot derail the body scan. Returns `null` when the
 * function is absent.
 */
const extractFunctionBody = (source: string, name: string): string | null => {
  const header = new RegExp(
    `(?:export\\s+)?(?:async\\s+)?function\\s+${name}\\s*\\(`,
  ).exec(source);
  if (!header) return null;

  let i = header.index + header[0].length;
  let parenDepth = 1;
  for (; i < source.length && parenDepth > 0; i += 1) {
    if (source[i] === '(') parenDepth += 1;
    else if (source[i] === ')') parenDepth -= 1;
  }
  while (i < source.length && source[i] !== '{') i += 1;
  if (i >= source.length) return null;

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

/**
 * Whitespace-only canonicalization: strip block and line comments,
 * collapse whitespace runs to a single space, and remove whitespace
 * immediately inside parentheses (the two copies wrap multi-condition
 * `if (...)` differently). Semantics are untouched — only formatting is
 * erased.
 */
const normalize = (text: string): string =>
  text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1')
    .replace(/\s+/g, ' ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .trim();

describe('sanitize.js <-> JobGrid.astro inline twin — function-body parity', () => {
  it('both copies define every sanitizer function', () => {
    for (const fn of SANITIZER_FUNCTIONS) {
      expect(
        extractFunctionBody(MODULE_SOURCE, fn),
        `${fn} (module)`,
      ).not.toBeNull();
      expect(
        extractFunctionBody(TWIN_SOURCE, fn),
        `${fn} (twin)`,
      ).not.toBeNull();
    }
  });

  it.each(SANITIZER_FUNCTIONS)(
    '%s is byte-identical (modulo whitespace) in both copies',
    (fn) => {
      const moduleBody = extractFunctionBody(MODULE_SOURCE, fn);
      const twinBody = extractFunctionBody(TWIN_SOURCE, fn);
      expect(moduleBody, `${fn} missing in module`).not.toBeNull();
      expect(twinBody, `${fn} missing in twin`).not.toBeNull();
      // If this fails: `${fn}` was edited in one copy only. The canonical
      // copy is `src/scripts/sanitize.js`; mirror the change into the
      // `is:inline` twin in `src/components/JobGrid.astro` (or vice
      // versa). Leaving them out of sync is a live XSS regression.
      expect(normalize(twinBody as string)).toBe(
        normalize(moduleBody as string),
      );
    },
  );
});

describe('sanitize.js <-> JobGrid.astro inline twin — constant parity', () => {
  it('both copies list the same dangerous tag set', () => {
    const tagList =
      /'SCRIPT',\s*'STYLE',\s*'IFRAME',\s*'OBJECT',\s*'EMBED',\s*'LINK',\s*'META'/;
    expect(MODULE_SOURCE).toMatch(tagList);
    expect(TWIN_SOURCE).toMatch(tagList);
  });

  it('both copies list the same URL-bearing attributes', () => {
    const urlAttrs = "['href', 'src', 'xlink:href', 'formaction']";
    expect(MODULE_SOURCE).toContain(urlAttrs);
    expect(TWIN_SOURCE).toContain(urlAttrs);
  });

  it('both copies use the same dangerous-URI-scheme regex', () => {
    const scheme = '/^\\s*(javascript|data|vbscript):/i';
    expect(MODULE_SOURCE).toContain(scheme);
    expect(TWIN_SOURCE).toContain(scheme);
  });

  it('both copies use the same remote-URL regex', () => {
    const remote = '/^\\s*(https?:)?\\/\\//i';
    expect(MODULE_SOURCE).toContain(remote);
    expect(TWIN_SOURCE).toContain(remote);
  });
});

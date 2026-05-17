/**
 * CI drift-guard for the dark-mode selector convention.
 *
 * Astro `<style>` blocks are scoped by default: a selector written
 * `body.dark-mode .X` is rewritten by the compiler to a hashed,
 * component-local selector that the global `dark-mode` class on
 * `<html>`/`<body>` can never match — so the dark-mode rule silently
 * never attaches (PR #183 / audit v5 M7).
 *
 * The fix is to wrap every dark-mode ancestor selector in `:global(...)`
 * so it escapes scoping, and to converge all three historical forms
 * (`body.dark-mode`, `html.dark-mode`, `:where(html, body).dark-mode`)
 * on the single canonical `:global(:where(html, body).dark-mode)`.
 *
 * This file reads every `.astro` file's scoped `<style>` block as text
 * and FAILS if any dark-mode ancestor selector (`body.dark-mode`,
 * `html.dark-mode`, or `:where(html, body).dark-mode`) appears WITHOUT a
 * `:global(...)` wrapper. A future edit that adds an unscoped dark-mode
 * rule — re-opening the bug PR #183 closed — fails CI here.
 *
 * NOTE: every `<style>` block in this codebase is a plain scoped
 * `<style>` (none carry `is:global`), so every dark-mode rule inside one
 * is scoped and must be `:global()`-wrapped. If an `is:global` block is
 * ever introduced, this guard already skips it.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, '..', 'src');

/** Recursively collect every `.astro` file path under `src/`. */
const collectAstroFiles = (dir: string): string[] => {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectAstroFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.astro')) {
      out.push(full);
    }
  }
  return out;
};

/** A `<style>` block: its opening-tag attribute string + inner CSS text. */
interface StyleBlock {
  readonly attrs: string;
  readonly css: string;
}

/** Extract every `<style>` block (attrs + inner text) from an `.astro` file. */
const extractStyleBlocks = (source: string): StyleBlock[] =>
  [...source.matchAll(/<style([^>]*)>([\s\S]*?)<\/style>/g)].map((m) => ({
    attrs: m[1],
    css: m[2],
  }));

/** True if a `<style>` opening-tag attribute string marks it global. */
const isGlobalStyleTag = (attrs: string): boolean => /\bis:global\b/.test(attrs);

/**
 * A dark-mode ancestor selector (`body.dark-mode`, `html.dark-mode`, or
 * `:where(html, body).dark-mode`) that is NOT immediately wrapped in
 * `:global(`. The negative lookbehind rejects the wrapped form. The bare
 * unqualified `.dark-mode` class is intentionally not matched — it is a
 * separate (out-of-scope) convention and `:global(.dark-mode)` is also
 * fine.
 */
const BARE_DARK_MODE_SELECTOR =
  /(?<!:global\()(?:body|html|:where\(html,\s*body\))\.dark-mode/g;

const ASTRO_FILES = collectAstroFiles(SRC);

/** Project-relative path for readable failure messages. */
const rel = (file: string): string => file.slice(file.indexOf('/src/') + 1);

describe('dark-mode selectors — every scoped rule is :global()-wrapped', () => {
  it('discovers .astro files to scan', () => {
    expect(ASTRO_FILES.length).toBeGreaterThan(0);
  });

  it('no scoped <style> block carries an unscoped dark-mode selector', () => {
    const violations: string[] = [];

    for (const file of ASTRO_FILES) {
      const source = readFileSync(file, 'utf8');
      for (const block of extractStyleBlocks(source)) {
        if (isGlobalStyleTag(block.attrs)) continue; // global: not scoped
        const hits = block.css.match(BARE_DARK_MODE_SELECTOR);
        if (hits) {
          violations.push(`${rel(file)}: ${[...new Set(hits)].join(', ')}`);
        }
      }
    }

    // If this fails: a dark-mode rule in a scoped <style> block is missing
    // its `:global(...)` wrapper — Astro will scope it and the global
    // `dark-mode` class can never match it (PR #183 / audit v5 M7).
    // Wrap the selector: `:global(:where(html, body).dark-mode) .X`.
    expect(violations).toEqual([]);
  });

  it('the canonical converged form is actually used somewhere', () => {
    // Sanity: confirm the sweep landed — at least one component now uses
    // the converged `:global(:where(html, body).dark-mode)` form.
    const usesCanonical = ASTRO_FILES.some((file) =>
      extractStyleBlocks(readFileSync(file, 'utf8')).some((block) =>
        block.css.includes(':global(:where(html, body).dark-mode)'),
      ),
    );
    expect(usesCanonical).toBe(true);
  });

  it('no legacy :global(body.dark-mode) / :global(html.dark-mode) form remains', () => {
    // The two pre-convergence wrapped forms must be fully migrated to
    // `:global(:where(html, body).dark-mode)`. A reappearance means a new
    // rule was added in the old style or the sweep regressed.
    const legacy: string[] = [];
    for (const file of ASTRO_FILES) {
      for (const block of extractStyleBlocks(readFileSync(file, 'utf8'))) {
        if (
          /:global\(\s*body\.dark-mode/.test(block.css) ||
          /:global\(\s*html\.dark-mode/.test(block.css)
        ) {
          legacy.push(rel(file));
        }
      }
    }
    expect(legacy).toEqual([]);
  });
});

/**
 * Static-source invariants for `src/scripts/compare/filters.js`.
 *
 * The fragment is browser-side glue that closes over symbols defined in
 * sibling fragments (`ensureFullCatalog`, `renderComparisonTable`, …) and
 * gets concatenated into the inline DOMContentLoaded body of
 * `src/pages/compare.astro`. Because it has no exports and no module
 * boundary, we can't unit-test the handler behavior in isolation — but we
 * CAN lock down the invariant that every callsite of the async
 * `applyServerFilters` is routed through the `safeApplyFilters` wrapper
 * (audit H7, HIGH).
 *
 * If someone adds another listener that calls `applyServerFilters` directly,
 * this test fails and forces the new callsite through the wrapper too.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const FILTERS_PATH = join(ROOT, '..', 'src', 'scripts', 'compare', 'filters.js');
const SOURCE = readFileSync(FILTERS_PATH, 'utf8');

describe('compare/filters.js — H7 unhandled rejection guard', () => {
  it('defines safeApplyFilters as a wrapper that attaches .catch', () => {
    // The wrapper function must exist…
    expect(SOURCE).toMatch(/function\s+safeApplyFilters\s*\(\s*\)/);
    // …and call applyServerFilters().catch(...) — anything else lets the
    // unhandled rejection through.
    expect(SOURCE).toMatch(/applyServerFilters\s*\(\s*\)\s*\.catch\s*\(/);
  });

  it('surfaces a user-visible error message via setStatus on rejection', () => {
    // The Russian error string is part of the contract — it's what the
    // user sees when a fetch fails. Don't silently localise it without
    // updating both this test and the audit doc.
    expect(SOURCE).toContain('Ошибка загрузки — попробуйте обновить страницу');
    // And it must be passed through setStatus(...) so it actually lands
    // in the DOM filter-status element.
    expect(SOURCE).toMatch(/setStatus\s*\(\s*['"]Ошибка загрузки/);
  });

  it('logs the rejection to console.error for debugging', () => {
    expect(SOURCE).toMatch(/console\.error\s*\(\s*['"]\[compare\] applyServerFilters failed/);
  });

  it('uses safeApplyFilters as the change-listener for city/transport selects', () => {
    expect(SOURCE).toMatch(/cityFilter\?\.addEventListener\(\s*['"]change['"]\s*,\s*safeApplyFilters\s*\)/);
    expect(SOURCE).toMatch(/transportFilter\?\.addEventListener\(\s*['"]change['"]\s*,\s*safeApplyFilters\s*\)/);
  });

  it('routes the filterReset click handler through safeApplyFilters (not the raw async fn)', () => {
    // filterReset's click handler does additional work (clearing input
    // values) before triggering a refresh; the final call must still
    // be the safe wrapper.
    const resetBlock = SOURCE.match(/filterReset\?\.addEventListener\(\s*['"]click['"][\s\S]*?\}\s*\)\s*;/);
    expect(resetBlock, 'filterReset click handler not found').not.toBeNull();
    const body = resetBlock![0];
    expect(body).toContain('safeApplyFilters()');
    // And it must NOT directly invoke the unwrapped async function
    // (which would re-introduce the unhandled rejection bug).
    expect(body).not.toMatch(/[^e]applyServerFilters\s*\(\s*\)/);
  });

  it('does not attach applyServerFilters directly to any event listener', () => {
    // Regression guard: a future edit shouldn't add a new listener that
    // bypasses safeApplyFilters. Match `addEventListener(... , applyServerFilters )`.
    expect(SOURCE).not.toMatch(/addEventListener\([^)]*,\s*applyServerFilters\s*\)/);
  });
});

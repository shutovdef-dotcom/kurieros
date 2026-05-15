// Orchestration entrypoint for the /compare/ page client-side logic.
//
// Replaces the hand-written closure that used to live inside
// `compare.astro` as a `?raw`-concatenated `set:html` inline script. That
// closure glued four `.js` fragments together through implicit shared scope
// — no compile-time check that `ensureFullCatalog`, `renderComparisonTable`,
// `jobsById`, `grid` etc. actually existed. A rename only failed at runtime
// in the browser on /compare/.
//
// This module is bundled and tree-shaken by Astro. It wires four typed
// sub-modules (catalog loader / list store / renderer / filters) as real
// functions calling each other — TypeScript now verifies every reference.
//
// Server data (the 4 preselected jobs, feature rows, total vacancy count)
// is no longer passed via `define:vars` (which forces `is:inline` and
// blocks `import`). Instead `compare.astro` serializes it into a
// `<script type="application/json">` tag and this module parses it. See the
// `initComparePage` argument type `CompareData`.
//
// Audit ref: v2 M1 (MEDIUM).

import { createCatalogLoader } from './catalogLoader';
import { createCompareList } from './compareList';
import { createFilters } from './filters';
import { createRenderer } from './render';
import { createScopedStyleApplier, findScopeAttribute } from './domHelpers';
import type { CompareData } from './types';

/**
 * Boot the /compare/ page client-side behaviour. Idempotent-safe to call
 * once on `DOMContentLoaded`. Bails out early (no-op) if the SSR
 * `.compare-grid` element is absent.
 *
 * Wires:
 *   - the lazy catalog loader (`/api/compare-jobs.json`, `force-cache`),
 *   - the localStorage `compareList` read/write store,
 *   - the grid renderer,
 *   - the city/transport server-side filter mode,
 * and binds the remove-from-compare click handler + cross-tab `storage`
 * sync listener.
 */
export function initComparePage(data: CompareData): void {
  const grid = document.querySelector<HTMLElement>('.compare-grid');
  if (!grid) return;

  const { compareJobs, features, totalCompareJobs } = data;

  const hasAvailableJobs = totalCompareJobs > 0;

  // Re-stamp Astro's component-scoped `data-astro-cid-*` attribute onto any
  // markup the renderer generates at runtime, so the scoped CSS still
  // applies. The scope is read once off the SSR grid element.
  const applyScopedStyles = createScopedStyleApplier(findScopeAttribute(grid));

  // Catalog loader owns `jobsById` (seeded with the preselected jobs) and
  // the lazy-fetch state. List store + renderer + filters all read through
  // its typed API instead of an implicit shared closure variable.
  const catalog = createCatalogLoader(compareJobs, { grid, applyScopedStyles });
  const compareList = createCompareList(catalog);
  const renderer = createRenderer({
    grid,
    features,
    hasAvailableJobs,
    applyScopedStyles,
  });

  /**
   * Render the manual (localStorage-driven) comparison. If the user has
   * stored IDs we don't yet have inlined, the full catalog is loaded BEFORE
   * pruning/writing so we don't erase valid stored IDs.
   */
  function renderSelectedComparison(): void {
    const storedIds = compareList.readStoredCompareIds();
    const needsCatalog = storedIds.some((id) => !catalog.hasJob(id));
    if (needsCatalog) {
      catalog.ensureFullCatalog().then(() => {
        if (catalog.getState().error && catalog.jobCount() === 0) {
          // showCatalogError() already rendered a message into the grid.
          return;
        }
        renderer.renderComparisonTable(compareList.getSelectedJobs());
      });
      return;
    }
    renderer.renderComparisonTable(compareList.getSelectedJobs());
  }

  renderSelectedComparison();

  // Remove-from-compare: a click on a column's remove button drops that
  // job id from localStorage and re-renders.
  grid.addEventListener('click', (event: MouseEvent) => {
    const target = event.target;
    const btn =
      target instanceof Element ? target.closest('.remove-col-btn') : null;
    if (!btn) return;

    const jobId = Number.parseInt(btn.getAttribute('data-job-id') || '', 10);
    if (!Number.isFinite(jobId)) return;

    compareList.writeCompareIds(
      compareList.readCompareIds().filter((id) => id !== jobId),
    );
    renderSelectedComparison();
  });

  // Cross-tab sync: another tab editing `compareList` re-renders this one.
  window.addEventListener('storage', (event: StorageEvent) => {
    if (event.key === 'compareList') {
      renderSelectedComparison();
    }
  });

  // City + transport filter mode. When the user picks a city/transport, the
  // full catalog is fetched and matching jobs render (overriding the
  // localStorage-driven manual mode). Clearing both filters falls back to
  // `renderSelectedComparison`.
  createFilters({ catalog, renderer, renderSelectedComparison });
}

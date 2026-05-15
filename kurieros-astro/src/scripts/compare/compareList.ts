// Compare-list localStorage helpers for the /compare/ page (typed ES module).
//
// Replaces the former `compare-list.js` `?raw` fragment. Where that fragment
// closed over `catalogLoaded` and `jobsById`, this module receives the
// typed `CatalogLoader` and reads that state through its explicit API.
//
// Behaviours preserved from PR #139:
//   - Defer pruning of stored IDs until the catalog has loaded (otherwise
//     we'd erase IDs that simply weren't inlined yet).
//   - `writeCompareIds` wraps `localStorage.setItem` in try/catch
//     (QuotaExceededError, SecurityError in private mode) and ALWAYS
//     dispatches `compareUpdate` to keep listeners in sync.
//
// localStorage format (DO NOT CHANGE — users have stored data in this shape):
//   key:   'compareList'
//   value: JSON-serialized array of integer job IDs, max 4
//          e.g. "[109013,109022]"

import type { CatalogLoader } from './catalogLoader';
import type { CompareJob } from './types';

const STORAGE_KEY = 'compareList';
const MAX_COMPARE_IDS = 4;
const COMPARE_UPDATE_EVENT = 'compareUpdate';

/** Public API returned by {@link createCompareList}. */
export interface CompareListStore {
  /** Read the raw stored IDs (deduped, capped at 4) — NOT pruned against the catalog. */
  readStoredCompareIds: () => number[];
  /**
   * Read stored IDs. Until the catalog has loaded this returns the raw
   * stored IDs unfiltered; afterwards it drops IDs not present in the
   * catalog. (Filtering too early would discard valid non-inlined IDs.)
   */
  readCompareIds: () => number[];
  /** Persist `ids` to localStorage and dispatch a `compareUpdate` event. */
  writeCompareIds: (ids: number[]) => void;
  /**
   * Resolve stored IDs to `CompareJob` objects. Once the full catalog is in
   * memory, a pruned ID list is written back if it changed.
   */
  getSelectedJobs: () => CompareJob[];
}

/**
 * Create the compare-list store. Reads catalog membership and load state
 * through the supplied {@link CatalogLoader}.
 */
export function createCompareList(catalog: CatalogLoader): CompareListStore {
  function readStoredCompareIds(): number[] {
    try {
      const rawList: unknown = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || '[]',
      );
      if (!Array.isArray(rawList)) return [];

      return rawList
        .map((id) => Number.parseInt(String(id), 10))
        .filter(
          (id, index, ids) => Number.isFinite(id) && ids.indexOf(id) === index,
        )
        .slice(0, MAX_COMPARE_IDS);
    } catch {
      return [];
    }
  }

  function readCompareIds(): number[] {
    // Until the full catalog has loaded, return ALL stored IDs unfiltered.
    // Filtering against the catalog too early would drop valid IDs that
    // live outside the inline preselected subset, and a follow-up
    // writeCompareIds would erase them permanently from localStorage.
    if (!catalog.getState().loaded) return readStoredCompareIds();
    return readStoredCompareIds().filter((id) => catalog.hasJob(id));
  }

  function writeCompareIds(ids: number[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch (err) {
      // QuotaExceededError or SecurityError (private mode) — keep
      // in-memory state consistent.
      console.warn('compareList write failed', err);
    }
    window.dispatchEvent(new CustomEvent(COMPARE_UPDATE_EVENT));
  }

  function getSelectedJobs(): CompareJob[] {
    const storedIds = readStoredCompareIds();
    const validIds = storedIds.filter((id) => catalog.hasJob(id));

    // Only persist the pruned list once the full catalog is in memory —
    // otherwise we'd silently drop IDs that simply weren't inlined yet.
    if (
      catalog.getState().loaded &&
      JSON.stringify(storedIds) !== JSON.stringify(validIds)
    ) {
      writeCompareIds(validIds);
    }

    return validIds
      .map((id) => catalog.getJob(id))
      .filter((job): job is CompareJob => Boolean(job));
  }

  return {
    readStoredCompareIds,
    readCompareIds,
    writeCompareIds,
    getSelectedJobs,
  };
}

// Compare-list localStorage helpers (browser-side, inline-script body fragment).
//
// Imported via Vite `?raw` and concatenated into the inline DOMContentLoaded
// callback in `compare.astro`. Closes over `catalogLoaded` (bool) and
// `jobsById` (Map) which MUST be defined in the surrounding scope.
//
// Behaviours preserved from PR #139:
//   - Defer pruning of stored IDs until catalog has loaded
//     (otherwise we'd erase IDs that simply weren't inlined yet).
//   - writeCompareIds wraps localStorage.setItem in try/catch
//     (QuotaExceededError, SecurityError in private mode) and
//     ALWAYS dispatches `compareUpdate` to keep listeners in sync.
//
// localStorage format (DO NOT CHANGE — users have stored data in this shape):
//   key:   'compareList'
//   value: JSON-serialized array of integer job IDs, max 4
//          e.g. "[109013,109022]"

    function readStoredCompareIds() {
      try {
        const rawList = JSON.parse(localStorage.getItem('compareList') || '[]');
        if (!Array.isArray(rawList)) return [];

        return rawList
          .map((id) => Number.parseInt(String(id), 10))
          .filter((id, index, ids) => Number.isFinite(id) && ids.indexOf(id) === index)
          .slice(0, 4);
      } catch {
        return [];
      }
    }

    function readCompareIds() {
      // Until the full catalog has loaded, return ALL stored IDs unfiltered.
      // Filtering against jobsById too early would drop valid IDs that live
      // outside the inline preselected subset, and a follow-up writeCompareIds
      // would erase them permanently from localStorage.
      if (!catalogLoaded) return readStoredCompareIds();
      return readStoredCompareIds().filter((id) => jobsById.has(id));
    }

    function writeCompareIds(ids) {
      try {
        localStorage.setItem('compareList', JSON.stringify(ids));
      } catch (err) {
        // QuotaExceededError or SecurityError (private mode) — keep in-memory state consistent
        console.warn('compareList write failed', err);
      }
      window.dispatchEvent(new CustomEvent('compareUpdate'));
    }

    function getSelectedJobs() {
      const storedIds = readStoredCompareIds();
      const validIds = storedIds.filter((id) => jobsById.has(id));

      // Only persist the pruned list once the full catalog is in memory —
      // otherwise we'd silently drop IDs that simply weren't inlined yet.
      if (catalogLoaded && JSON.stringify(storedIds) !== JSON.stringify(validIds)) {
        writeCompareIds(validIds);
      }

      return validIds.map((id) => jobsById.get(id)).filter(Boolean);
    }

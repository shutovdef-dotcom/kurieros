// Lazy catalog loader for the /compare/ page (browser-side, typed ES module).
//
// Replaces the former `catalog-loader.js` `?raw` fragment. Where that
// fragment closed over `fullCatalogPromise` / `catalogLoaded` /
// `catalogLoadError` / `jobsById` defined in a sibling closure, this module
// OWNS that state and exposes it through an explicit, type-checked API.
//
// Behaviours preserved from PR #139:
//   - HTTP non-ok responses reject with `HTTP <status>` Error, log via
//     console.error, then call `showCatalogError()` to surface a
//     user-visible banner if no preselected catalog is available.
//   - `cache: 'force-cache'` keeps revisits fast (catalog is immutable
//     within a build — see PR #134 / per-build cache stamp).
//
// Endpoint: GET /api/compare-jobs.json — returns CompareJob[].

import type { CompareJob } from './types';
import { setCompareGridColumnClass } from './gridColumns';

/** Read-only snapshot of the catalog loader's mutable internal state. */
export interface CatalogState {
  /** True once the full catalog has successfully loaded. */
  readonly loaded: boolean;
  /** The error from the last failed catalog fetch, or `null`. */
  readonly error: Error | null;
}

/** Public API returned by {@link createCatalogLoader}. */
export interface CatalogLoader {
  /**
   * Lazily fetch the full job catalog from `/api/compare-jobs.json`.
   * The in-flight promise is cached, so concurrent callers share one
   * request. On success every fetched job is merged into `jobsById`.
   * On failure the rejection is swallowed (logged + banner) and `[]`
   * is returned, so callers can treat the result uniformly.
   */
  ensureFullCatalog: () => Promise<CompareJob[]>;
  /** Look up a job by id across preselected + fetched catalog entries. */
  getJob: (id: number) => CompareJob | undefined;
  /** True if a job with `id` is currently known. */
  hasJob: (id: number) => boolean;
  /** Count of jobs currently known (preselected + fetched). */
  jobCount: () => number;
  /** Read-only snapshot of `{ loaded, error }`. */
  getState: () => CatalogState;
}

/** The compare grid container plus the scope-stamping helper bound to it. */
interface CatalogLoaderDeps {
  grid: HTMLElement;
  applyScopedStyles: (root: Element) => void;
}

const CATALOG_ENDPOINT = '/api/compare-jobs.json';

/**
 * Lightweight runtime shape check for one fetched catalogue element.
 *
 * `/api/compare-jobs.json` is same-origin and build-generated, but the
 * response is still untrusted `unknown` at the boundary. Rather than a
 * blind `as CompareJob[]`, every element is filtered through this guard so
 * a malformed entry is dropped instead of poisoning `jobsById`. Only the
 * load-bearing identity fields are checked (`id` keys the map, `slug` /
 * `title` are always rendered) — no Zod, no extra dependency.
 */
function isCompareJob(x: unknown): x is CompareJob {
  if (typeof x !== 'object' || x === null) return false;
  const job = x as Record<string, unknown>;
  return (
    typeof job.id === 'number' &&
    typeof job.slug === 'string' &&
    typeof job.title === 'string'
  );
}

/**
 * Create a catalog loader seeded with the preselected jobs already inlined
 * into the page. The loader owns the `jobsById` map and the catalog
 * load/error flags.
 */
export function createCatalogLoader(
  preselectedJobs: readonly CompareJob[],
  deps: CatalogLoaderDeps,
): CatalogLoader {
  const { grid, applyScopedStyles } = deps;

  const jobsById = new Map<number, CompareJob>(
    preselectedJobs.map((job) => [job.id, job]),
  );
  let fullCatalogPromise: Promise<CompareJob[]> | null = null;
  let catalogLoaded = false;
  let catalogLoadError: Error | null = null;

  /**
   * Surface a user-visible error banner — but only if the inline
   * preselected catalog is empty (we genuinely have nothing to display).
   * If a populated table is already on screen, the fetch failure is silent
   * to the user (still logged to the console).
   */
  function showCatalogError(): void {
    if (jobsById.size > 0) return;
    setCompareGridColumnClass(grid, 0);
    grid.innerHTML = `
      <div class="compare-empty-state" id="compare-error" role="alert">
        <h3>Не удалось загрузить данные</h3>
        <p>Попробуйте обновить страницу позже. Если проблема повторяется, напишите нам.</p>
        <a href="/" class="btn-primary compare-empty-state-link">Вернуться на главную</a>
      </div>
    `;
    applyScopedStyles(grid);
  }

  function ensureFullCatalog(): Promise<CompareJob[]> {
    if (fullCatalogPromise) return fullCatalogPromise;
    fullCatalogPromise = fetch(CATALOG_ENDPOINT, { cache: 'force-cache' })
      .then((response): Promise<unknown> => {
        if (!response.ok) {
          return Promise.reject(new Error(`HTTP ${response.status}`));
        }
        return response.json();
      })
      .then((jobs): CompareJob[] => {
        const list = Array.isArray(jobs) ? jobs.filter(isCompareJob) : [];
        for (const job of list) {
          jobsById.set(job.id, job);
        }
        catalogLoaded = true;
        catalogLoadError = null;
        return list;
      })
      .catch((err: unknown): CompareJob[] => {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error('compare: failed to load /api/compare-jobs.json', error);
        catalogLoadError = error;
        // Surface a user-visible error if we have nothing to show.
        showCatalogError();
        return [];
      });
    return fullCatalogPromise;
  }

  return {
    ensureFullCatalog,
    getJob: (id) => jobsById.get(id),
    hasJob: (id) => jobsById.has(id),
    jobCount: () => jobsById.size,
    getState: () => ({ loaded: catalogLoaded, error: catalogLoadError }),
  };
}

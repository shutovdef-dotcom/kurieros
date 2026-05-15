// Lazy catalog loader for compare page (browser-side, inline-script body fragment).
//
// Imported via Vite `?raw` and concatenated into the inline DOMContentLoaded
// callback in `compare.astro`. Closes over (must be defined in surrounding scope):
//   - `fullCatalogPromise` (Promise|null) — cache for in-flight fetch
//   - `catalogLoaded` (bool)               — set true on success
//   - `catalogLoadError` (Error|null)      — set on failure
//   - `jobsById` (Map<number, Job>)        — extended with fetched jobs
//   - `grid` (HTMLElement)                 — used by showCatalogError
//   - `applyScopedStyles` (fn)             — re-applies data-astro-cid
//
// Behaviours preserved from PR #139:
//   - HTTP non-ok responses reject with `HTTP <status>` Error,
//     log via console.error, then call showCatalogError() to surface
//     a user-visible banner if no preselected catalog is available.
//   - `cache: 'force-cache'` keeps revisits fast (catalog is immutable
//     within a build — see PR #134 / per-build cache stamp).
//
// Endpoint: GET /api/compare-jobs.json — returns Array<Job>; same shape as
// compareJobs (see mapCompareJob in compare.astro frontmatter).

    function ensureFullCatalog() {
      if (fullCatalogPromise) return fullCatalogPromise;
      fullCatalogPromise = fetch('/api/compare-jobs.json', { cache: 'force-cache' })
        .then((response) => {
          if (!response.ok) {
            return Promise.reject(new Error(`HTTP ${response.status}`));
          }
          return response.json();
        })
        .then((jobs) => {
          if (Array.isArray(jobs)) {
            for (const job of jobs) {
              jobsById.set(job.id, job);
            }
          }
          catalogLoaded = true;
          catalogLoadError = null;
          return jobs;
        })
        .catch((err) => {
          console.error('compare: failed to load /api/compare-jobs.json', err);
          catalogLoadError = err;
          // Surface a user-visible error if we have nothing to show.
          showCatalogError();
          return [];
        });
      return fullCatalogPromise;
    }

    function showCatalogError() {
      // Only show the error banner if the inline preselected catalog is empty
      // (i.e. we genuinely have nothing to display) AND the user hasn't already
      // got a populated table on screen.
      if (jobsById.size > 0) return;
      grid.style.setProperty('--cols', '0');
      grid.innerHTML = `
        <div class="compare-empty-state" id="compare-error" role="alert">
          <h3>Не удалось загрузить данные</h3>
          <p>Попробуйте обновить страницу позже. Если проблема повторяется, напишите нам.</p>
          <a href="/" class="btn-primary compare-empty-state-link">Вернуться на главную</a>
        </div>
      `;
      applyScopedStyles(grid);
    }

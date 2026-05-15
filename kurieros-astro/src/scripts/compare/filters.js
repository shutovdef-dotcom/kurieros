// City + transport server-side filter mode (browser-side).
//
// DOM-side adapter for the predicate in `src/utils/jobFilters.ts`. This
// file runs on JSON catalog blobs fetched at runtime (not the build-time
// `GeneratedJob[]` array), so it can't directly import the TypeScript
// predicate — but the city-matching semantics MUST stay in sync with
// `jobFilters.ts` (`job.location.toLowerCase().includes(...)` plus the
// «Вся Россия» free pass). If you change one, change both.
//
// Imported via Vite `?raw` and concatenated into the inline DOMContentLoaded
// callback in `compare.astro`. When the user picks city or transport, fetch
// the full catalog and render matching jobs (overrides the localStorage-driven
// manual selection mode).
//
// Closes over (must be defined in surrounding scope):
//   - `ensureFullCatalog` (fn)             — defined in catalog-loader.js
//   - `renderComparisonTable` (fn)         — defined in render.js
//   - `renderCompanyLinks` (fn)            — defined in render.js
//   - `renderSelectedComparison` (fn)      — defined in init.js
//
// UI cap: 12 columns. We slice matched results to 12 for the visible grid
// but display the full match count in the status line so users know whether
// to narrow further.

    const cityFilter = document.getElementById('compare-city-filter');
    const transportFilter = document.getElementById('compare-transport-filter');
    const filterReset = document.getElementById('compare-filter-reset');
    const filterStatus = document.getElementById('compare-filters-status');

    const TRANSPORT_LABEL_TO_TAG = {
      'Авто': 'auto',
      'Велосипед / самокат': 'bicycle',
      'Пешком': 'foot',
      'Удалённо / офис': 'remote',
    };

    function jobMatchesTransport(job, tagValue) {
      if (!tagValue) return true;
      const label = String(job.transport || '');
      if (TRANSPORT_LABEL_TO_TAG[label] === tagValue) return true;
      return false;
    }

    // Mirror of the `city` branch in `src/utils/jobFilters.ts#jobMatches`.
    // Note we compare a lower-cased «вся россия» here because we don't
    // have access to the original-case `NATIONWIDE_LOCATION` constant
    // on the client; both checks resolve the same set of rows.
    function jobMatchesCity(job, cityName) {
      if (!cityName) return true;
      const loc = String(job.location || '').toLowerCase();
      return loc.includes(cityName.toLowerCase()) || loc === 'вся россия';
    }

    function setStatus(text) {
      if (filterStatus) filterStatus.textContent = text || '';
    }

    async function applyServerFilters() {
      const city = cityFilter?.value || '';
      const transport = transportFilter?.value || '';
      if (!city && !transport) {
        // No filter — fall back to manual selection from localStorage.
        renderSelectedComparison();
        setStatus('');
        return;
      }
      setStatus('Загружаем подходящие вакансии…');
      const all = await ensureFullCatalog();
      const list = Array.isArray(all) ? all : [];
      const matched = list.filter((job) => jobMatchesCity(job, city) && jobMatchesTransport(job, transport));
      // Cap to 12 columns (UI limit) but show count of total matches.
      const display = matched.slice(0, 12);
      if (display.length === 0) {
        setStatus(`Нет вакансий по фильтру «${city || 'любой город'} / ${transport ? Object.keys(TRANSPORT_LABEL_TO_TAG).find(k => TRANSPORT_LABEL_TO_TAG[k] === transport) : 'любой транспорт'}»`);
        renderComparisonTable([]);
        renderCompanyLinks([]);
        return;
      }
      renderComparisonTable(display);
      renderCompanyLinks(display);
      setStatus(matched.length > display.length
        ? `Показано ${display.length} из ${matched.length} вакансий по фильтру`
        : `Показано ${display.length} вакансий по фильтру`);
    }

    // Wrap async applyServerFilters() so unhandled rejections (e.g. network
    // failure inside ensureFullCatalog, or any other throw) surface a
    // user-visible message instead of leaving the filter UI silently stuck.
    // Every event listener that triggers a filter run MUST go through this
    // wrapper — passing `applyServerFilters` directly to addEventListener
    // returns a rejected promise the runtime quietly discards.
    function safeApplyFilters() {
      applyServerFilters().catch((err) => {
        console.error('[compare] applyServerFilters failed:', err);
        setStatus('Ошибка загрузки — попробуйте обновить страницу');
      });
    }

    cityFilter?.addEventListener('change', safeApplyFilters);
    transportFilter?.addEventListener('change', safeApplyFilters);
    filterReset?.addEventListener('click', () => {
      if (cityFilter) cityFilter.value = '';
      if (transportFilter) transportFilter.value = '';
      safeApplyFilters();
    });

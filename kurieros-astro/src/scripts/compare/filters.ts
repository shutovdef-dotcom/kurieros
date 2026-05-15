// City + transport server-side filter mode for the /compare/ page (typed ESM).
//
// Replaces the former `filters.js` `?raw` fragment. Where that fragment
// closed over `ensureFullCatalog` / `renderComparisonTable` /
// `renderCompanyLinks` / `renderSelectedComparison`, this module receives
// them as typed constructor dependencies.
//
// DOM-side adapter for the predicate in `src/utils/jobFilters.ts`. This
// module runs on JSON catalog blobs fetched at runtime (not the build-time
// `GeneratedJob[]` array), so it can't directly import the TypeScript
// predicate — but the city-matching semantics MUST stay in sync with
// `jobFilters.ts` (`job.location.toLowerCase().includes(...)` plus the
// «Вся Россия» free pass). If you change one, change both.
//
// When the user picks city or transport, fetch the full catalog and render
// matching jobs (overrides the localStorage-driven manual selection mode).
//
// UI cap: 12 columns. We slice matched results to 12 for the visible grid
// but display the full match count in the status line so users know whether
// to narrow further.

import type { CatalogLoader } from './catalogLoader';
import type { CompareRenderer } from './render';
import type { CompareJob } from './types';

/** Max columns the comparison grid renders at once. */
const MAX_FILTER_COLUMNS = 12;
const NATIONWIDE_LOCATION = 'вся россия';

/** Russian transport-mode labels mapped to their `<select>` tag values. */
const TRANSPORT_LABEL_TO_TAG: Record<string, string> = {
  'Авто': 'auto',
  'Велосипед / самокат': 'bicycle',
  'Пешком': 'foot',
  'Удалённо / офис': 'remote',
};

/** Dependencies the filters module needs from the orchestration layer. */
interface FiltersDeps {
  catalog: CatalogLoader;
  renderer: CompareRenderer;
  /**
   * Re-renders the manual (localStorage-driven) comparison. Invoked when the
   * user clears both filters so the page falls back to manual mode.
   */
  renderSelectedComparison: () => void;
}

function jobMatchesTransport(job: CompareJob, tagValue: string): boolean {
  if (!tagValue) return true;
  const label = String(job.transport || '');
  return TRANSPORT_LABEL_TO_TAG[label] === tagValue;
}

// Mirror of the `city` branch in `src/utils/jobFilters.ts#jobMatches`.
// Note we compare a lower-cased «вся россия» here because we don't have
// access to the original-case `NATIONWIDE_LOCATION` constant on the client;
// both checks resolve the same set of rows.
function jobMatchesCity(job: CompareJob, cityName: string): boolean {
  if (!cityName) return true;
  const loc = String(job.location || '').toLowerCase();
  return loc.includes(cityName.toLowerCase()) || loc === NATIONWIDE_LOCATION;
}

/** Reverse-lookup a transport tag value back to its Russian label. */
function transportTagToLabel(tagValue: string): string | undefined {
  return Object.keys(TRANSPORT_LABEL_TO_TAG).find(
    (label) => TRANSPORT_LABEL_TO_TAG[label] === tagValue,
  );
}

/**
 * Wire the city/transport filter selects + reset button. Returns nothing —
 * the side effect is the attached event listeners.
 */
export function createFilters(deps: FiltersDeps): void {
  const { catalog, renderer, renderSelectedComparison } = deps;

  const cityFilter = document.getElementById(
    'compare-city-filter',
  ) as HTMLSelectElement | null;
  const transportFilter = document.getElementById(
    'compare-transport-filter',
  ) as HTMLSelectElement | null;
  const filterReset = document.getElementById('compare-filter-reset');
  const filterStatus = document.getElementById('compare-filters-status');

  function setStatus(text: string): void {
    if (filterStatus) filterStatus.textContent = text || '';
  }

  async function applyServerFilters(): Promise<void> {
    const city = cityFilter?.value || '';
    const transport = transportFilter?.value || '';
    if (!city && !transport) {
      // No filter — fall back to manual selection from localStorage.
      renderSelectedComparison();
      setStatus('');
      return;
    }
    setStatus('Загружаем подходящие вакансии…');
    const all = await catalog.ensureFullCatalog();
    const list = Array.isArray(all) ? all : [];
    const matched = list.filter(
      (job) => jobMatchesCity(job, city) && jobMatchesTransport(job, transport),
    );
    // Cap to 12 columns (UI limit) but show count of total matches.
    const display = matched.slice(0, MAX_FILTER_COLUMNS);
    if (display.length === 0) {
      const transportLabel = transport
        ? transportTagToLabel(transport)
        : 'любой транспорт';
      setStatus(
        `Нет вакансий по фильтру «${city || 'любой город'} / ${transportLabel}»`,
      );
      renderer.renderComparisonTable([]);
      renderer.renderCompanyLinks([]);
      return;
    }
    renderer.renderComparisonTable(display);
    renderer.renderCompanyLinks(display);
    setStatus(
      matched.length > display.length
        ? `Показано ${display.length} из ${matched.length} вакансий по фильтру`
        : `Показано ${display.length} вакансий по фильтру`,
    );
  }

  // Wrap async applyServerFilters() so unhandled rejections (e.g. network
  // failure inside ensureFullCatalog, or any other throw) surface a
  // user-visible message instead of leaving the filter UI silently stuck.
  // Every event listener that triggers a filter run MUST go through this
  // wrapper — passing `applyServerFilters` directly to addEventListener
  // returns a rejected promise the runtime quietly discards.
  function safeApplyFilters(): void {
    applyServerFilters().catch((err: unknown) => {
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
}

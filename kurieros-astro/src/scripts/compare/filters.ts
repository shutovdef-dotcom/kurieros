// City + transport server-side filter mode for the /compare/ page (typed ESM).
//
// Replaces the former `filters.js` `?raw` fragment. Where that fragment
// closed over `ensureFullCatalog` / `renderComparisonTable` /
// `renderSelectedComparison`, this module receives them as typed
// constructor dependencies.
//
// DOM-side adapter for the predicate in `src/utils/jobFilters.ts`. This
// module runs on JSON catalog blobs fetched at runtime (`CompareJob`
// objects), not the build-time `GeneratedJob[]` array — but the
// `string → string[]` city-key helpers are shape-agnostic, so we reuse
// them directly: `splitLocationKeys` from `jobFilters.ts` (it's
// job-filtering-specific) and the `normalizeCityKey` primitive from its
// single owner `src/utils/cities.ts` (audit ref v3 M3). Same exact
// comma-split, normalized, exact-match city semantics as `jobMatches`
// (H12 — «Дно» must not pull in «Видное»/«Медногорск»). One source of
// truth: there is no copy to keep in sync (audit ref v3 M1 + M3).
//
// When the user picks city or transport, fetch the full catalog and render
// matching jobs (overrides the localStorage-driven manual selection mode).
//
// UI cap: 12 columns. We slice matched results to 12 for the visible grid
// but display the full match count in the status line so users know whether
// to narrow further.

import { normalizeCityKey } from '../../utils/cities';
import { splitLocationKeys } from '../../utils/jobFilters';
import type { CatalogLoader } from './catalogLoader';
import type { CompareRenderer } from './render';
import type { CompareJob } from './types';

/** Max columns the comparison grid renders at once. */
const MAX_FILTER_COLUMNS = 12;
// Normalized key for the special «Вся Россия» row that's rendered on
// every city listing — pre-normalized via the shared helper so the
// comparison below is byte-identical to `jobFilters.ts#isNationwide`.
const NATIONWIDE_KEY = normalizeCityKey('Вся Россия');

/** Russian transport-mode labels mapped to their `<select>` tag values. */
const TRANSPORT_LABEL_TO_TAG: Record<string, string> = {
  'Авто': 'auto',
  'Велосипед / самокат': 'bicycle',
  'Пешком': 'foot',
  'Удалённо': 'remote',
  'Удалённо / офис': 'remote',
  'Офис': 'office',
  'Выездные услуги': 'service',
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

// The `city` branch of `src/utils/jobFilters.ts#jobMatches`, reused
// verbatim via the shared `normalizeCityKey` / `splitLocationKeys`
// helpers: split `job.location` on commas, normalize each part, and
// require an EXACT key match against the normalized selected city
// (H12). The legacy `loc.includes(city)` substring match is gone —
// it over-matched «Дно» into «Видное»/«Медногорск» and 60+ similar
// substring-collision city pairs. «Вся Россия» rows free-pass for
// any city query, exactly as `jobMatches`/`isNationwide` do.
function jobMatchesCity(job: CompareJob, cityName: string): boolean {
  const cityKey = normalizeCityKey(cityName);
  if (!cityKey) return true;
  const keys = splitLocationKeys(String(job.location || ''));
  const isNationwide = keys.length === 1 && keys[0] === NATIONWIDE_KEY;
  return isNationwide || keys.includes(cityKey);
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
      return;
    }
    renderer.renderComparisonTable(display);
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

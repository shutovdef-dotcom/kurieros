const COLUMN_CLASS_PREFIX = 'compare-grid--cols-';
const MAX_GRID_COLUMNS = 12;

function normalizeColumnCount(columnCount: number): number {
  if (!Number.isFinite(columnCount)) return 0;
  return Math.max(0, Math.min(Math.trunc(columnCount), MAX_GRID_COLUMNS));
}

export function setCompareGridColumnClass(
  grid: HTMLElement,
  columnCount: number,
): void {
  for (const className of Array.from(grid.classList)) {
    if (className.startsWith(COLUMN_CLASS_PREFIX)) {
      grid.classList.remove(className);
    }
  }

  grid.classList.add(`${COLUMN_CLASS_PREFIX}${normalizeColumnCount(columnCount)}`);
  grid.style.removeProperty('--cols');
  if (grid.getAttribute('style') === '') {
    grid.removeAttribute('style');
  }
}

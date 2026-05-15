// Shared browser-side DOM helpers for the /compare/ page modules.
//
// Previously these lived in the hand-written orchestration closure inside
// `compare.astro` (`applyScopedStyles`, `escapeHtml`, `parseSalaryValue`).
// Extracted into a typed module so the catalog loader, renderer, and
// filters can import them with compile-time-checked signatures instead of
// relying on implicit closure scope.

/**
 * Build a `applyScopedStyles` function bound to a single `data-astro-cid-*`
 * scope attribute.
 *
 * Astro scopes component CSS by stamping a unique `data-astro-cid-*`
 * attribute onto every element it renders. The compare modules generate
 * markup at runtime via `innerHTML`, so those fresh elements would miss the
 * scope (and the CSS) unless we re-stamp them. The scope attribute is read
 * once off the SSR `.compare-grid` element and reused for every re-render.
 *
 * If the grid has no scope attribute (theoretically possible if Astro stops
 * scoping the component), the returned function is a no-op — the markup
 * still renders, just unscoped.
 */
export function createScopedStyleApplier(scopeAttribute: string | null): (root: Element) => void {
  return (root: Element): void => {
    if (!scopeAttribute) return;
    root.querySelectorAll('*').forEach((element) => {
      element.setAttribute(scopeAttribute, '');
    });
  };
}

/**
 * Find the `data-astro-cid-*` scope attribute on an element, if present.
 * Returns `null` when the element carries no Astro scope.
 */
export function findScopeAttribute(element: Element): string | null {
  return (
    Array.from(element.getAttributeNames()).find((name) =>
      name.startsWith('data-astro-cid'),
    ) ?? null
  );
}

/**
 * XSS-safe text escaping for values interpolated into runtime-generated
 * `innerHTML`. Mirrors the escaping the original inline-script closure used.
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Parse a free-text salary string ("от 80 000 ₽") down to its leading
 * numeric value. Non-digit characters are stripped; an unparseable string
 * yields `0`.
 */
export function parseSalaryValue(salary: unknown): number {
  return Number(String(salary).replace(/[^\d]/g, '')) || 0;
}

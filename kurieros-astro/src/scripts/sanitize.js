// Audit H10 — XSS hardening for DOMParser-fetched markup.
//
// `JobGrid.astro` previously did `grid.innerHTML = newGrid.innerHTML`
// after `DOMParser.parseFromString(html, 'text/html')` to hot-swap the
// listing on city change. DOMParser neutralizes `<script>` (scripts in
// parsed documents are inert and do not execute when adopted/cloned),
// but it does NOT remove inline event-handler attributes such as
// `onerror`, `onload`, or SVG-only handlers like `onbegin`/`onend`. A
// CDN- or build-cache-poisoning attack on the static city HTML would
// otherwise deliver attacker-controlled handlers that execute in the
// victim's origin as soon as the cloned node enters the live document.
//
// `stripEventHandlers(node)` removes every attribute that starts with
// `on` from the node and all of its descendants — that covers every
// HTML/SVG event-handler attribute defined in the WHATWG spec without
// having to enumerate them (`onerror`, `onload`, `onmouseover`,
// `onclick`, `onpointerenter`, `onbegin`, `onend`, etc.).
//
// This module is the testable mirror of the helper inlined inside the
// `is:inline` `<script>` block in JobGrid.astro (Astro inline scripts
// can't import modules because they need `define:vars`-injected
// constants — the same dual-implementation pattern used for
// homeCity.js). Keep both implementations behaviourally identical;
// the regression tests in `tests/sanitize.test.ts` pin down the
// expected semantics.

/**
 * Remove every event-handler attribute (`on*`) from the given element
 * and all of its descendants. Mutates the node tree in place.
 *
 * Safe to call on detached nodes (e.g. nodes adopted out of a
 * DOMParser-created document via `cloneNode(true)`). The function
 * only relies on the standard `Element` surface — no Astro-specific
 * APIs — so it's portable across browser and test environments.
 *
 * `<template>` elements are special: their actual markup lives inside
 * a `content` `DocumentFragment` that `querySelectorAll` on the
 * template element does NOT traverse. The C2 «reveal more» feature
 * stores overflow `.job-card`s inside `<template
 * class="jobs-grid-overflow">`, and those cards get appended to the
 * live grid when the user reveals more — so a poisoned handler hiding
 * in a template fragment is a real (deferred) XSS vector. We therefore
 * descend into every template's content fragment too, at any nesting
 * depth, including when the passed-in `root` is itself a `<template>`.
 *
 * @param {Element | null | undefined} root - element to sanitize
 * @returns {void}
 */
export function stripEventHandlers(root) {
  sanitizeSubtree(root);
}

/**
 * Recursively strip `on*` attributes from `node`, its element
 * descendants, and the content fragments of any `<template>` reached
 * along the way. Internal worker for `stripEventHandlers`.
 *
 * `node` may be an `Element` or a `DocumentFragment` (a template's
 * `.content`). Fragments have no attributes of their own, so the
 * attribute strip is guarded by an `Element` capability check.
 *
 * @param {Element | DocumentFragment | null | undefined} node
 */
function sanitizeSubtree(node) {
  if (!node) return;

  // Strip handlers off the node itself (no-op for DocumentFragments,
  // which don't expose getAttributeNames).
  stripOnAttributes(node);

  // A `<template>` element keeps its parsed markup in a sibling
  // `.content` DocumentFragment that is invisible to its own
  // `querySelectorAll`. Recurse into it explicitly — this also covers
  // the case where `node` IS the template handed in as `root`.
  if (node.content && node.content.nodeType !== undefined) {
    sanitizeSubtree(node.content);
  }

  // Walk element descendants. `querySelectorAll('*')` returns a static
  // snapshot in document order — safe to iterate while we mutate
  // attributes. For each descendant we also recurse into any template
  // content it carries (handles arbitrarily nested templates).
  if (typeof node.querySelectorAll !== 'function') return;
  for (const child of node.querySelectorAll('*')) {
    stripOnAttributes(child);
    if (child && child.content && child.content.nodeType !== undefined) {
      sanitizeSubtree(child.content);
    }
  }
}

/**
 * Strip `on*` attributes from a single element. Internal helper.
 *
 * Uses `getAttributeNames()` (returns a snapshot array — safe to
 * iterate while mutating) so we don't have to enumerate the spec.
 * Silently ignores nodes without the attribute API (text nodes,
 * DocumentFragments) so callers can pass mixed node types.
 *
 * @param {Element | DocumentFragment} el
 */
function stripOnAttributes(el) {
  if (!el || typeof el.getAttributeNames !== 'function') return;
  const names = el.getAttributeNames();
  for (const name of names) {
    // Comparison is case-insensitive — HTML parses `OnError` the same
    // as `onerror`, and DOM attribute names are returned lowercased
    // for HTML elements but preserve case for SVG/XML. Belt-and-braces.
    if (name.length >= 2 && name.charAt(0).toLowerCase() === 'o' && name.charAt(1).toLowerCase() === 'n') {
      el.removeAttribute(name);
    }
  }
}

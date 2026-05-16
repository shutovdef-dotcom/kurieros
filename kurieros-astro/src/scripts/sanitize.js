// Audit H10 / v3 M15 — XSS hardening for DOMParser-fetched markup.
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
// `stripEventHandlers(node)` runs three passes over the node and all of
// its descendants (audit ref v3 M15):
//   1. removes every attribute that starts with `on` — covers every
//      HTML/SVG event-handler attribute in the WHATWG spec without
//      enumerating them (`onerror`, `onload`, `onclick`, `onbegin`, …);
//   2. strips dangerous-scheme URIs (`javascript:` / `data:` /
//      `vbscript:`) out of `href` / `src` / `xlink:href` / `formaction`
//      — DOMParser keeps these inert until adoption, then they fire on
//      click / navigation (subsumes audit ref v3 L13: `render.ts`'s
//      `escapeHtml` does not reject `javascript:`, but the sanitizer is
//      the correct layer to neutralize it);
//   3. removes active-content elements outright — `<script>`, `<style>`,
//      `<iframe>`, `<object>`, `<embed>`, `<link>`, `<meta>` — and
//      neutralizes a remote-URL `href` / `xlink:href` on `<use>` (an
//      SVG `<use>` can pull in an external document).
//
// This module is the testable mirror of the helper inlined inside the
// `is:inline` `<script>` block in JobGrid.astro (Astro inline scripts
// can't import modules because they need `define:vars`-injected
// constants — the same dual-implementation pattern used for
// homeCity.js). Keep both implementations behaviourally identical;
// the regression tests in `tests/sanitize.test.ts` pin down the
// expected semantics.

// Tag names removed outright from an adopted subtree. `<script>` is
// already inert post-DOMParser, but a CDN-poisoned response could also
// carry `<style>` (CSS exfil / clickjacking), framing elements
// (`<iframe>` / `<object>` / `<embed>`), or `<link>` / `<meta>`
// (external CSS, refresh-redirect) — none belong in a job-card subtree.
const DANGEROUS_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'IFRAME',
  'OBJECT',
  'EMBED',
  'LINK',
  'META',
]);

// Attributes that carry a URL the browser will fetch or navigate to.
const URL_ATTRIBUTES = ['href', 'src', 'xlink:href', 'formaction'];

// A URL whose scheme can execute script or smuggle a payload.
// `data:` is included because `data:text/html` in an iframe/object src
// runs in the embedding origin.
const DANGEROUS_URI_SCHEME = /^\s*(javascript|data|vbscript):/i;

// A remote (cross-document) reference: an absolute http(s) URL or a
// protocol-relative `//host/...`. A bare `#fragment` SVG <use> target
// is local and safe — only remote <use> refs are stripped.
const REMOTE_URL = /^\s*(https?:)?\/\//i;

/**
 * Remove event-handler attributes, dangerous-scheme URLs, and
 * active-content elements from the given element and all of its
 * descendants. Mutates the node tree in place.
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
 * Recursively sanitize `node`, its element descendants, and the content
 * fragments of any `<template>` reached along the way. Internal worker
 * for `stripEventHandlers`.
 *
 * `node` may be an `Element` or a `DocumentFragment` (a template's
 * `.content`). Fragments have no attributes of their own, so the
 * attribute strip is guarded by an `Element` capability check.
 *
 * @param {Element | DocumentFragment | null | undefined} node
 */
function sanitizeSubtree(node) {
  if (!node) return;

  // Sanitize the node itself (no-op for DocumentFragments, which don't
  // expose getAttributeNames). The root is never removed even if it is
  // a dangerous tag — callers (`swapGridContent`) only ever hand in a
  // whitelisted top-level grid child.
  sanitizeElement(node);

  // A `<template>` element keeps its parsed markup in a sibling
  // `.content` DocumentFragment that is invisible to its own
  // `querySelectorAll`. Recurse into it explicitly — this also covers
  // the case where `node` IS the template handed in as `root`.
  if (node.content && node.content.nodeType !== undefined) {
    sanitizeSubtree(node.content);
  }

  // Walk element descendants. `querySelectorAll('*')` returns a static
  // snapshot in document order — safe to iterate while we mutate
  // attributes and remove nodes. A dangerous descendant is removed
  // outright; everything else is sanitized in place. Descendants of a
  // removed element still appear later in the snapshot but are by then
  // detached, so sanitizing them is a harmless no-op.
  if (typeof node.querySelectorAll !== 'function') return;
  for (const child of node.querySelectorAll('*')) {
    if (isDangerousElement(child)) {
      removeElement(child);
      continue;
    }
    sanitizeElement(child);
    if (child && child.content && child.content.nodeType !== undefined) {
      sanitizeSubtree(child.content);
    }
  }
}

/**
 * Sanitize a single element: strip `on*` handlers and neutralize any
 * dangerous URL attributes. Internal helper.
 *
 * Silently ignores nodes without the attribute API (text nodes,
 * DocumentFragments) so callers can pass mixed node types.
 *
 * @param {Element | DocumentFragment} el
 */
function sanitizeElement(el) {
  stripOnAttributes(el);
  stripDangerousUrls(el);
}

/**
 * True if `el` is an active-content element that must be removed from
 * an adopted subtree (`<script>` / `<style>` / `<iframe>` / `<object>`
 * / `<embed>` / `<link>` / `<meta>`). Tag-name comparison is
 * case-insensitive; HTML parsers upper-case `tagName` for HTML
 * elements, but be defensive for XML/SVG-cased nodes.
 *
 * @param {Element} el
 * @returns {boolean}
 */
function isDangerousElement(el) {
  if (!el || typeof el.tagName !== 'string') return false;
  return DANGEROUS_TAGS.has(el.tagName.toUpperCase());
}

/**
 * Detach `el` from its parent. Prefers the modern `Element.remove()`
 * and falls back to `parentNode.removeChild` for older surfaces /
 * test mocks. No-op if the element is already detached.
 *
 * @param {Element} el
 */
function removeElement(el) {
  if (!el) return;
  if (typeof el.remove === 'function') {
    el.remove();
    return;
  }
  if (el.parentNode && typeof el.parentNode.removeChild === 'function') {
    el.parentNode.removeChild(el);
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
  // Comparison is case-insensitive — HTML parses `OnError` the same
  // as `onerror`, and DOM attribute names are returned lowercased
  // for HTML elements but preserve case for SVG/XML. Belt-and-braces.
  for (const name of el.getAttributeNames()) {
    if (name.length >= 2 && name.charAt(0).toLowerCase() === 'o' && name.charAt(1).toLowerCase() === 'n') {
      el.removeAttribute(name);
    }
  }
}

/**
 * Remove URL-bearing attributes whose value is a dangerous-scheme URI
 * (`javascript:` / `data:` / `vbscript:`), and strip a remote-URL
 * `href` / `xlink:href` off an SVG `<use>` element. Internal helper.
 *
 * Attribute-name lookup is case-insensitive (HTML lower-cases its
 * attribute names, SVG/XML preserve case — `xlink:href` may arrive as
 * `xlink:href` either way), so we scan `getAttributeNames()` rather
 * than calling `getAttribute('href')` directly.
 *
 * @param {Element | DocumentFragment} el
 */
function stripDangerousUrls(el) {
  if (
    !el ||
    typeof el.getAttributeNames !== 'function' ||
    typeof el.getAttribute !== 'function'
  ) {
    return;
  }
  const isUseElement =
    typeof el.tagName === 'string' && el.tagName.toUpperCase() === 'USE';
  for (const name of el.getAttributeNames()) {
    const lower = name.toLowerCase();
    if (!URL_ATTRIBUTES.includes(lower)) continue;
    const value = el.getAttribute(name);
    if (typeof value !== 'string') continue;
    // Any URL-bearing attribute with an executable scheme is stripped.
    if (DANGEROUS_URI_SCHEME.test(value)) {
      el.removeAttribute(name);
      continue;
    }
    // An SVG `<use>` whose href/xlink:href points at a remote document
    // can pull in attacker markup — local `#fragment` refs are kept.
    if (isUseElement && (lower === 'href' || lower === 'xlink:href') && REMOTE_URL.test(value)) {
      el.removeAttribute(name);
    }
  }
}

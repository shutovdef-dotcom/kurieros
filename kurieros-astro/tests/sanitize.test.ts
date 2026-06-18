import { describe, it, expect } from 'vitest';
import { stripEventHandlers } from '../src/scripts/sanitize.js';

// Audit H10 regression suite — pins down the contract of
// `stripEventHandlers`. The JobGrid controller imports this canonical
// module; if these tests fail, the city-swap hot path has regressed and
// a DOMParser-fetched response could ship attacker event handlers into
// the live document.
//
// Tests run in Node (no jsdom) — we model the small Element surface
// the helper actually uses (`getAttributeNames`, `hasAttribute`,
// `removeAttribute`, `querySelectorAll`). This keeps the suite
// dependency-free and matches the existing pattern in
// tests/homeCity.test.ts (which mocks Storage rather than booting a
// browser env).

// DocumentFragment.nodeType in the real DOM. The sanitizer uses
// `nodeType !== undefined` to distinguish a real `.content` fragment
// from accidental properties — so the mock must carry it.
const DOCUMENT_FRAGMENT_NODE = 11;

interface MockFragment {
	nodeType: number;
	children: MockElement[];
	querySelectorAll(selector: string): MockElement[];
}

interface MockElement {
	attributes: Record<string, string>;
	children: MockElement[];
	// Upper-cased tag name, mirroring `Element.tagName` for HTML
	// elements. `''` for the generic mocks that don't care about it.
	tagName: string;
	// Set when the element is attached under a parent — lets `remove()`
	// splice the node out, mirroring `Element.remove()`.
	parentNode?: MockElement | MockFragment;
	// Present only on mocked <template> elements — mirrors the real
	// HTMLTemplateElement.content DocumentFragment.
	content?: MockFragment;
	getAttributeNames(): string[];
	getAttribute(name: string): string | null;
	hasAttribute(name: string): boolean;
	removeAttribute(name: string): void;
	remove(): void;
	querySelectorAll(selector: string): MockElement[];
}

// Recursively flatten element descendants in document order — matches
// real `querySelectorAll('*')`. Note: a <template> element's light-DOM
// `children` is empty (its markup lives in `.content`), so a template
// contributes itself but NOT its content fragment here, exactly like
// the browser.
function descendantsOf(nodes: MockElement[]): MockElement[] {
	const out: MockElement[] = [];
	const walk = (list: MockElement[]) => {
		for (const n of list) {
			out.push(n);
			walk(n.children);
		}
	};
	walk(nodes);
	return out;
}

function mockElement(
	attributes: Record<string, string> = {},
	children: MockElement[] = [],
	tagName = '',
): MockElement {
	const el: MockElement = {
		attributes: { ...attributes },
		children,
		tagName: tagName.toUpperCase(),
		getAttributeNames() {
			return Object.keys(this.attributes);
		},
		getAttribute(name) {
			return Object.prototype.hasOwnProperty.call(this.attributes, name)
				? this.attributes[name]
				: null;
		},
		hasAttribute(name) {
			return Object.prototype.hasOwnProperty.call(this.attributes, name);
		},
		removeAttribute(name) {
			delete this.attributes[name];
		},
		remove() {
			// Splice self out of the parent's children, mirroring
			// `Element.remove()`. No-op when detached.
			const parent = this.parentNode;
			if (!parent) return;
			const idx = parent.children.indexOf(this);
			if (idx !== -1) parent.children.splice(idx, 1);
		},
		querySelectorAll(_selector) {
			// The helper always passes '*' — return the full descendant
			// tree in document order so the mock matches real DOM
			// behaviour for that selector.
			return descendantsOf(this.children);
		},
	};
	// Wire up parentNode on direct children so `remove()` works.
	for (const child of children) child.parentNode = el;
	return el;
}

// Build a mocked <template> element whose `.content` DocumentFragment
// holds the given nodes — matches how DOMParser places <template>
// markup into a separate fragment that the template element's own
// `querySelectorAll` cannot reach. The template element itself has no
// light-DOM `children` (empty array), faithful to the real DOM.
function mockTemplate(contentChildren: MockElement[]): MockElement {
	const tpl = mockElement({ class: 'jobs-grid-overflow' }, [], 'template');
	const fragment: MockFragment = {
		nodeType: DOCUMENT_FRAGMENT_NODE,
		children: contentChildren,
		querySelectorAll(_selector) {
			return descendantsOf(this.children);
		},
	};
	tpl.content = fragment;
	// Wire parentNode on the fragment's children so `remove()` (used by
	// the dangerous-element strip) can splice a node out of the fragment.
	for (const child of contentChildren) child.parentNode = fragment;
	return tpl;
}

describe('stripEventHandlers — audit H10 XSS hardening', () => {
	it('removes onerror from the root element', () => {
		const el = mockElement({ onerror: "alert('xss')", class: 'job-card' });

		stripEventHandlers(el as unknown as Element);

		expect(el.hasAttribute('onerror')).toBe(false);
		// Non-event attributes are preserved.
		expect(el.hasAttribute('class')).toBe(true);
		expect(el.attributes.class).toBe('job-card');
	});

	it('removes a broad set of HTML event handlers in one pass', () => {
		const el = mockElement({
			onclick: "x()",
			onmouseover: "y()",
			onfocus: "z()",
			onload: "w()",
			onerror: "v()",
			id: 'safe-id',
		});

		stripEventHandlers(el as unknown as Element);

		expect(el.hasAttribute('onclick')).toBe(false);
		expect(el.hasAttribute('onmouseover')).toBe(false);
		expect(el.hasAttribute('onfocus')).toBe(false);
		expect(el.hasAttribute('onload')).toBe(false);
		expect(el.hasAttribute('onerror')).toBe(false);
		// id is not an on* attribute → kept.
		expect(el.attributes.id).toBe('safe-id');
	});

	it('removes SVG-specific event handlers (onbegin, onend, onpointerenter)', () => {
		const el = mockElement({
			onbegin: "evil()",
			onend: "evil()",
			onpointerenter: "evil()",
			fill: '#000',
		});

		stripEventHandlers(el as unknown as Element);

		expect(el.hasAttribute('onbegin')).toBe(false);
		expect(el.hasAttribute('onend')).toBe(false);
		expect(el.hasAttribute('onpointerenter')).toBe(false);
		expect(el.attributes.fill).toBe('#000');
	});

	it('strips event handlers from descendants, not just the root', () => {
		const grandchild = mockElement({ onerror: "alert(1)", alt: 'kept' });
		const child = mockElement({ onclick: "alert(2)" }, [grandchild]);
		const root = mockElement({ class: 'job-card' }, [child]);

		stripEventHandlers(root as unknown as Element);

		expect(grandchild.hasAttribute('onerror')).toBe(false);
		expect(grandchild.attributes.alt).toBe('kept');
		expect(child.hasAttribute('onclick')).toBe(false);
		expect(root.attributes.class).toBe('job-card');
	});

	it('matches case-insensitively (OnError, ONCLICK)', () => {
		const el = mockElement({ OnError: "x()", ONCLICK: "y()", DataTags: 'a,b' });

		stripEventHandlers(el as unknown as Element);

		expect(el.hasAttribute('OnError')).toBe(false);
		expect(el.hasAttribute('ONCLICK')).toBe(false);
		// Non-event attributes preserved (case-insensitive check applies
		// only to the leading 'on' prefix — 'DataTags' starts with 'D').
		expect(el.attributes.DataTags).toBe('a,b');
	});

	it('does not strip benign attributes that merely begin with "o"', () => {
		const el = mockElement({
			open: 'true',
			optional: 'yes',
			'data-orient': 'h',
			class: 'detail',
		});

		stripEventHandlers(el as unknown as Element);

		expect(el.attributes.open).toBe('true');
		expect(el.attributes.optional).toBe('yes');
		expect(el.attributes['data-orient']).toBe('h');
		expect(el.attributes.class).toBe('detail');
	});

	it('is a no-op on null / undefined inputs', () => {
		// Should not throw — the helper guards against missing roots so
		// callers can pass `parsedDoc.querySelector(...)` without an
		// explicit null check.
		expect(() => stripEventHandlers(null)).not.toThrow();
		expect(() => stripEventHandlers(undefined)).not.toThrow();
	});

	it('skips elements that do not expose getAttributeNames', () => {
		// Defensive path — exotic nodes (e.g. CDATASection) that lack
		// the standard attribute surface must not crash the sanitizer.
		// Mirrors the real `Node.children` contract (always a defined
		// HTMLCollection) but omits `getAttributeNames` / `tagName` to
		// trigger the internal `typeof === 'function'` / `'string'`
		// guards in both the attribute strip and the dangerous-tag check.
		const exoticChild: MockElement = {
			attributes: {},
			children: [],
			// getAttributeNames / tagName intentionally absent.
			tagName: undefined as unknown as string,
			getAttributeNames: undefined as unknown as () => string[],
			getAttribute: undefined as unknown as (name: string) => string | null,
			hasAttribute: () => false,
			removeAttribute: () => undefined,
			remove: () => undefined,
			querySelectorAll: () => [],
		};
		const root = mockElement({ onclick: "x()" }, [exoticChild]);

		expect(() => stripEventHandlers(root as unknown as Element)).not.toThrow();
		// Real attribute stripping still happens on supported nodes.
		expect(root.hasAttribute('onclick')).toBe(false);
	});

	it('descends into <template> content fragments (C2 overflow cards)', () => {
		// The C2 «reveal more» feature stashes overflow .job-card nodes
		// inside <template class="jobs-grid-overflow">. DOMParser puts
		// that markup into the template's `.content` fragment, which a
		// plain querySelectorAll on the grid never reaches — so the
		// sanitizer must walk it explicitly.
		const hiddenCard = mockElement({ class: 'job-card', onerror: "stealCookies()" });
		const template = mockTemplate([hiddenCard]);
		const visibleCard = mockElement({ class: 'job-card' });
		const grid = mockElement({ id: 'jobs-grid' }, [visibleCard, template]);

		stripEventHandlers(grid as unknown as Element);

		expect(hiddenCard.hasAttribute('onerror')).toBe(false);
		expect(hiddenCard.attributes.class).toBe('job-card');
	});

	it('strips event handlers on the <template> element itself', () => {
		const template = mockTemplate([]);
		template.attributes.onload = "evil()";
		const grid = mockElement({ id: 'jobs-grid' }, [template]);

		stripEventHandlers(grid as unknown as Element);

		expect(template.hasAttribute('onload')).toBe(false);
		expect(template.attributes.class).toBe('jobs-grid-overflow');
	});

	it('sanitizes a <template>`s content when the template IS the root', () => {
		// Regression — `swapGridContent` calls `stripEventHandlers` on
		// each cloned top-level grid child, and the C2 overflow stash is
		// itself a top-level `<template>`. A template's own
		// `querySelectorAll('*')` returns nothing (its markup is in the
		// `.content` fragment), so an earlier version that only walked
		// template content for *descendants* left overflow cards
		// poisoned. They would then ship live attributes the moment
		// «reveal more» appended them to the grid.
		const hiddenCard = mockElement({ class: 'job-card', onerror: "stealCookies()" });
		const template = mockTemplate([hiddenCard]);

		stripEventHandlers(template as unknown as Element);

		expect(hiddenCard.hasAttribute('onerror')).toBe(false);
		expect(hiddenCard.attributes.class).toBe('job-card');
	});

	it('sanitizes event handlers in nested <template> content', () => {
		// Defence in depth — a poisoned handler buried inside a template
		// nested within another template must still be stripped.
		const deepCard = mockElement({ class: 'job-card', onclick: "evil()" });
		const innerTemplate = mockTemplate([deepCard]);
		const outerTemplate = mockTemplate([innerTemplate]);
		const grid = mockElement({ id: 'jobs-grid' }, [outerTemplate]);

		stripEventHandlers(grid as unknown as Element);

		expect(deepCard.hasAttribute('onclick')).toBe(false);
		expect(deepCard.attributes.class).toBe('job-card');
	});

	it('preserves attribute iteration safety when many on* handlers are present', () => {
		// Reproduces the subtle bug of mutating while iterating: if the
		// helper used `attributes` (a live NamedNodeMap in the real DOM)
		// instead of the snapshot from `getAttributeNames()`, some
		// handlers would be skipped. The mock returns a fresh array each
		// call, but ordering matters — assert ALL handlers are gone.
		const attrs: Record<string, string> = {};
		for (let i = 0; i < 20; i++) {
			attrs[`on${'abcdefghij'[i % 10]}${i}`] = `attack${i}()`;
		}
		attrs.title = 'kept';
		const el = mockElement(attrs);

		stripEventHandlers(el as unknown as Element);

		const remaining = el.getAttributeNames();
		expect(remaining).toEqual(['title']);
	});
});

// =====================================================================
// Audit v3 M15 — sanitizer extended beyond on* handlers.
//
// `stripEventHandlers` now also (1) strips dangerous-scheme URIs out of
// href / src / xlink:href / formaction (subsumes L13 — `render.ts`'s
// `escapeHtml` does not reject `javascript:`), (2) removes active-
// content elements (script/style/iframe/object/embed/link/meta), and
// (3) neutralizes a remote-URL href/xlink:href on an SVG `<use>`. The
// JobGrid controller import must keep using this implementation.
// =====================================================================
describe('stripEventHandlers — audit v3 M15: dangerous URIs', () => {
	it('strips a javascript: URI from an href', () => {
		const link = mockElement({ href: "javascript:alert(document.cookie)" }, [], 'a');

		stripEventHandlers(link as unknown as Element);

		expect(link.hasAttribute('href')).toBe(false);
	});

	it('strips a javascript: URI regardless of leading whitespace / case', () => {
		// HTML tolerates leading whitespace and mixed case in a URL
		// attribute — the scheme regex is anchored with `^\s*` + `i`.
		const link = mockElement({ href: "  JaVaScRiPt:evil()" }, [], 'a');

		stripEventHandlers(link as unknown as Element);

		expect(link.hasAttribute('href')).toBe(false);
	});

	it('strips a data: URI from a src attribute', () => {
		// `data:text/html` in a src runs in the embedding origin.
		const img = mockElement(
			{ src: "data:text/html,<script>alert(1)</script>" },
			[],
			'img',
		);

		stripEventHandlers(img as unknown as Element);

		expect(img.hasAttribute('src')).toBe(false);
	});

	it('strips a vbscript: URI from a formaction attribute', () => {
		const button = mockElement({ formaction: "vbscript:Evil" }, [], 'button');

		stripEventHandlers(button as unknown as Element);

		expect(button.hasAttribute('formaction')).toBe(false);
	});

	it('keeps a safe relative / absolute https href untouched', () => {
		const safe = mockElement({ href: '/rabota-kurerom-moskva/' }, [], 'a');
		const safeAbsolute = mockElement(
			{ href: 'https://kurerok.ru/v/ozon-courier-1/' },
			[],
			'a',
		);

		stripEventHandlers(safe as unknown as Element);
		stripEventHandlers(safeAbsolute as unknown as Element);

		expect(safe.attributes.href).toBe('/rabota-kurerom-moskva/');
		expect(safeAbsolute.attributes.href).toBe('https://kurerok.ru/v/ozon-courier-1/');
	});

	it('strips a dangerous URI from a descendant, not just the root', () => {
		const evilLink = mockElement({ href: "javascript:steal()" }, [], 'a');
		const card = mockElement({ class: 'job-card' }, [evilLink]);

		stripEventHandlers(card as unknown as Element);

		expect(evilLink.hasAttribute('href')).toBe(false);
	});

	it('strips a dangerous xlink:href value', () => {
		// SVG-namespaced href — must be matched case-insensitively by
		// attribute name and scheme.
		const node = mockElement(
			{ 'xlink:href': 'javascript:alert(1)' },
			[],
			'a',
		);

		stripEventHandlers(node as unknown as Element);

		expect(node.hasAttribute('xlink:href')).toBe(false);
	});
});

describe('stripEventHandlers — audit v3 M15: active-content elements', () => {
	it('removes an <iframe> from the adopted subtree', () => {
		const iframe = mockElement({ src: 'https://evil.example/' }, [], 'iframe');
		const card = mockElement({ class: 'job-card' }, [iframe]);

		stripEventHandlers(card as unknown as Element);

		expect(card.children).not.toContain(iframe);
		expect(card.querySelectorAll('*')).toEqual([]);
	});

	it('removes an <object> from the adopted subtree', () => {
		const obj = mockElement({ data: 'evil.swf' }, [], 'object');
		const card = mockElement({ class: 'job-card' }, [obj]);

		stripEventHandlers(card as unknown as Element);

		expect(card.children).not.toContain(obj);
	});

	it('removes a <style> element from the adopted subtree', () => {
		const style = mockElement({}, [], 'style');
		const card = mockElement({ class: 'job-card' }, [style]);

		stripEventHandlers(card as unknown as Element);

		expect(card.children).not.toContain(style);
	});

	it('removes <script>, <embed>, <link> and <meta> elements', () => {
		const script = mockElement({}, [], 'script');
		const embed = mockElement({}, [], 'embed');
		const link = mockElement({ rel: 'stylesheet' }, [], 'link');
		const meta = mockElement({ 'http-equiv': 'refresh' }, [], 'meta');
		const safeCard = mockElement({ class: 'job-card' });
		const grid = mockElement({ id: 'jobs-grid' }, [
			script,
			embed,
			link,
			meta,
			safeCard,
		]);

		stripEventHandlers(grid as unknown as Element);

		// All four active-content elements are gone…
		expect(grid.children).toEqual([safeCard]);
		// …and the benign job-card survives untouched.
		expect(safeCard.attributes.class).toBe('job-card');
	});

	it('matches dangerous tags case-insensitively', () => {
		// DOMParser upper-cases HTML tagName, but be defensive — the
		// helper upper-cases before the Set lookup.
		const lowerCaseTag = mockElement({}, [], 'iframe');
		lowerCaseTag.tagName = 'iframe'; // force lower-case, not normalized
		const card = mockElement({ class: 'job-card' }, [lowerCaseTag]);

		stripEventHandlers(card as unknown as Element);

		expect(card.children).not.toContain(lowerCaseTag);
	});

	it('removes a dangerous element nested deep inside the tree', () => {
		const script = mockElement({}, [], 'script');
		const inner = mockElement({ class: 'job-card-body' }, [script]);
		const card = mockElement({ class: 'job-card' }, [inner]);

		stripEventHandlers(card as unknown as Element);

		expect(inner.children).not.toContain(script);
		expect(card.children).toContain(inner);
	});

	it('removes a dangerous element hidden inside a <template> fragment', () => {
		// The C2 «reveal more» overflow stash is a <template>; a poisoned
		// <script> inside its content fragment must still be removed.
		const script = mockElement({}, [], 'script');
		const hiddenCard = mockElement({ class: 'job-card' });
		const template = mockTemplate([script, hiddenCard]);
		const grid = mockElement({ id: 'jobs-grid' }, [template]);

		stripEventHandlers(grid as unknown as Element);

		expect(template.content?.children).toEqual([hiddenCard]);
	});

	it('keeps a benign job-card subtree fully intact', () => {
		// No dangerous content — nothing should be removed or altered.
		const logo = mockElement({ src: '/logo.svg', alt: 'Ozon' }, [], 'img');
		const title = mockElement({ class: 'job-title' }, []);
		const card = mockElement({ class: 'job-card' }, [logo, title]);

		stripEventHandlers(card as unknown as Element);

		expect(card.children).toEqual([logo, title]);
		expect(logo.attributes.src).toBe('/logo.svg');
		expect(logo.attributes.alt).toBe('Ozon');
	});
});

describe('stripEventHandlers — audit v3 M15: SVG <use> references', () => {
	it('strips a remote href on an SVG <use> element', () => {
		// A `<use>` pointing at an external document can pull in
		// attacker-controlled markup.
		const use = mockElement(
			{ href: 'https://evil.example/sprite.svg#icon' },
			[],
			'use',
		);

		stripEventHandlers(use as unknown as Element);

		expect(use.hasAttribute('href')).toBe(false);
	});

	it('strips a remote xlink:href on an SVG <use> element', () => {
		const use = mockElement(
			{ 'xlink:href': 'https://evil.example/sprite.svg#icon' },
			[],
			'use',
		);

		stripEventHandlers(use as unknown as Element);

		expect(use.hasAttribute('xlink:href')).toBe(false);
	});

	it('strips a protocol-relative remote <use> href', () => {
		const use = mockElement({ href: '//evil.example/s.svg#i' }, [], 'use');

		stripEventHandlers(use as unknown as Element);

		expect(use.hasAttribute('href')).toBe(false);
	});

	it('keeps a local #fragment <use> href (the normal icon-sprite case)', () => {
		// In-document sprite references are how the site renders icons —
		// they must NOT be stripped.
		const use = mockElement({ href: '#icon-arrow' }, [], 'use');
		const useXlink = mockElement({ 'xlink:href': '#icon-star' }, [], 'use');

		stripEventHandlers(use as unknown as Element);
		stripEventHandlers(useXlink as unknown as Element);

		expect(use.attributes.href).toBe('#icon-arrow');
		expect(useXlink.attributes['xlink:href']).toBe('#icon-star');
	});

	it('still strips a javascript: <use> href even though it is not remote', () => {
		// The dangerous-scheme check fires before the remote-URL check,
		// so a `javascript:` <use> href is removed regardless.
		const use = mockElement({ href: 'javascript:evil()' }, [], 'use');

		stripEventHandlers(use as unknown as Element);

		expect(use.hasAttribute('href')).toBe(false);
	});

	it('does not strip a remote href on a non-<use> element', () => {
		// The remote-URL strip is scoped to `<use>` only — a normal
		// anchor to an external https page is legitimate.
		const link = mockElement({ href: 'https://kurerok.ru/' }, [], 'a');

		stripEventHandlers(link as unknown as Element);

		expect(link.attributes.href).toBe('https://kurerok.ru/');
	});
});

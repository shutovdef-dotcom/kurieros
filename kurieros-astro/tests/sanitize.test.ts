import { describe, it, expect } from 'vitest';
import { stripEventHandlers } from '../src/scripts/sanitize.js';

// Audit H10 regression suite — pins down the contract of
// `stripEventHandlers`. The inline twin inside JobGrid.astro must keep
// the same behaviour; if these tests fail, the city-swap hot path has
// regressed and a DOMParser-fetched response could ship attacker
// event handlers into the live document.
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
	// Present only on mocked <template> elements — mirrors the real
	// HTMLTemplateElement.content DocumentFragment.
	content?: MockFragment;
	getAttributeNames(): string[];
	hasAttribute(name: string): boolean;
	removeAttribute(name: string): void;
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

function mockElement(attributes: Record<string, string> = {}, children: MockElement[] = []): MockElement {
	const el: MockElement = {
		attributes: { ...attributes },
		children,
		getAttributeNames() {
			return Object.keys(this.attributes);
		},
		hasAttribute(name) {
			return Object.prototype.hasOwnProperty.call(this.attributes, name);
		},
		removeAttribute(name) {
			delete this.attributes[name];
		},
		querySelectorAll(_selector) {
			// The helper always passes '*' — return the full descendant
			// tree in document order so the mock matches real DOM
			// behaviour for that selector.
			return descendantsOf(this.children);
		},
	};
	return el;
}

// Build a mocked <template> element whose `.content` DocumentFragment
// holds the given nodes — matches how DOMParser places <template>
// markup into a separate fragment that the template element's own
// `querySelectorAll` cannot reach. The template element itself has no
// light-DOM `children` (empty array), faithful to the real DOM.
function mockTemplate(contentChildren: MockElement[]): MockElement {
	const tpl = mockElement({ class: 'jobs-grid-overflow' });
	tpl.content = {
		nodeType: DOCUMENT_FRAGMENT_NODE,
		children: contentChildren,
		querySelectorAll(_selector) {
			return descendantsOf(this.children);
		},
	};
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
		// HTMLCollection) but omits `getAttributeNames` to trigger the
		// internal `typeof === 'function'` guard.
		const exoticChild: MockElement = {
			attributes: {},
			children: [],
			// getAttributeNames intentionally omitted
			getAttributeNames: undefined as unknown as () => string[],
			hasAttribute: () => false,
			removeAttribute: () => undefined,
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

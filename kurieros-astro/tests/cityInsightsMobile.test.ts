/**
 * Mobile/responsive drift-guard for the merged city-insights hero block
 * (Z1.1 full merge). Same idea as `darkModeSelectors.test.ts`: read the
 * component's scoped CSS as text and fail if a future edit drops the rules
 * that keep the block usable at phone widths (~360–390px).
 *
 * Guards three invariants:
 *  1. Stat tiles use a FLUID `auto-fit` grid → they reflow to 1–2 columns
 *     on a narrow screen instead of overflowing a fixed multi-column track.
 *  2. The two-column shelf (rate table | neighbours) COLLAPSES to a single
 *     column inside a `max-width: 720px` media query.
 *  3. The rate table stays horizontally scrollable (`overflow-x: auto`) so a
 *     3-column table never bursts the hero panel on a phone.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const CSS = readFileSync(
	join(ROOT, '..', 'src', 'components', 'CityInsights.astro'),
	'utf8',
);

describe('CityInsights — mobile / responsive layout', () => {
	it('stat tiles reflow via an auto-fit grid (never a fixed column count)', () => {
		expect(CSS).toMatch(
			/\.ci-stats\s*\{[\s\S]*?grid-template-columns:\s*repeat\(\s*auto-fit/,
		);
	});

	it('collapses the two-column shelf to one column on phones (≤720px)', () => {
		const mediaBlock = CSS.match(
			/@media\s*\(max-width:\s*720px\)\s*\{([\s\S]*?\})\s*\}/,
		);
		expect(mediaBlock, 'expected a max-width:720px media query').not.toBeNull();
		expect(mediaBlock?.[1]).toMatch(
			/\.ci-shelf[\s\S]*?grid-template-columns:\s*1fr/,
		);
	});

	it('keeps the rate table horizontally scrollable so it never overflows the panel', () => {
		expect(CSS).toMatch(/\.ci-table-wrap\s*\{[\s\S]*?overflow-x:\s*auto/);
	});
});

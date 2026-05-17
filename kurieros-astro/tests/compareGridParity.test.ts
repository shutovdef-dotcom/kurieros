/**
 * Static-source drift-guard for the compare-grid remove-button twin.
 *
 * The /compare/ comparison grid is rendered from TWO hand-synced
 * templates: the SSR template `src/components/compare/CompareGrid.astro`
 * and the client-side runtime renderer `src/scripts/compare/render.ts`.
 * Neither imports the other, so a fix made in one copy does NOT reach the
 * other.
 *
 * The column remove-button is the load-bearing wiring point: the click
 * handler in `compareInit.ts` reads `data-job-id` to know which vacancy
 * to drop. The SSR template historically emitted `data-col-target`
 * instead — a dead attribute the handler never reads, so SSR-rendered
 * remove buttons silently did nothing until the first client re-render
 * (audit v4 MEDIUM-6).
 *
 * This file reads BOTH sources as text and asserts both emit `data-job-id`
 * on the `remove-col-btn` button and that neither still carries the
 * obsolete `data-col-target`. A future edit that reintroduces the drift
 * fails CI here.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const SSR_SOURCE = readFileSync(
  join(ROOT, '..', 'src', 'components', 'compare', 'CompareGrid.astro'),
  'utf8',
);
const RENDER_SOURCE = readFileSync(
  join(ROOT, '..', 'src', 'scripts', 'compare', 'render.ts'),
  'utf8',
);

/**
 * Match the `<button class="remove-col-btn" ...>` opening tag (single line
 * in both copies) so attribute assertions are scoped to that element.
 */
const extractRemoveButtonTag = (source: string): string => {
  const match = source.match(/<button class="remove-col-btn"[^>]*>/);
  return match ? match[0] : '';
};

describe('CompareGrid.astro <-> render.ts — remove-button attribute parity', () => {
  it('the SSR template emits a remove-col-btn button', () => {
    expect(extractRemoveButtonTag(SSR_SOURCE)).not.toBe('');
  });

  it('the runtime renderer emits a remove-col-btn button', () => {
    expect(extractRemoveButtonTag(RENDER_SOURCE)).not.toBe('');
  });

  it('the SSR remove-col-btn carries data-job-id (read by compareInit.ts)', () => {
    // If this fails: the SSR button lost the id the click handler reads,
    // so SSR-rendered remove buttons are inert until the first re-render.
    expect(extractRemoveButtonTag(SSR_SOURCE)).toMatch(/data-job-id/);
  });

  it('the runtime remove-col-btn carries data-job-id (read by compareInit.ts)', () => {
    expect(extractRemoveButtonTag(RENDER_SOURCE)).toMatch(/data-job-id/);
  });
});

describe('CompareGrid.astro <-> render.ts — obsolete data-col-target is gone', () => {
  it('the SSR template no longer contains data-col-target', () => {
    // `data-col-target` was the dead attribute the click handler never
    // read (audit v4 MEDIUM-6). It must not reappear in either copy.
    expect(SSR_SOURCE).not.toContain('data-col-target');
  });

  it('the runtime renderer no longer contains data-col-target', () => {
    expect(RENDER_SOURCE).not.toContain('data-col-target');
  });
});

/**
 * formatRub helper — audit M4 regression suite.
 *
 * Two helpers used to coexist:
 *   • src/data/sources/shared.ts: exported `formatRub` (no normalisation)
 *   • src/data/ozonOffers.ts: local `formatRub` with a broken regex that
 *     tried to strip narrow no-break space but used ASCII space in the
 *     character class — so it was a silent no-op.
 *
 * Result: Ozon salary text rendered identically to other partners (all
 * still containing NBSP / NNBSP), but the *intent* of the local copy was
 * to normalise the separator. Either way, every partner's monthly text
 * carried non-ASCII whitespace that doesn't reliably collapse in HTML
 * search indexes, clipboards, or screen readers.
 *
 * These tests pin down the canonical behaviour: `formatRub` MUST emit
 * ASCII spaces, regardless of which non-ASCII separator the runtime ICU
 * library chose for the `ru-RU` locale.
 */
import { describe, it, expect } from 'vitest';
import { formatRub } from '../src/data/sources/shared';

const NBSP = ' '; // U+00A0
const NNBSP = ' '; // U+202F

describe('formatRub — audit M4 regression suite', () => {
  it('formats a typical six-digit salary with regular ASCII spaces', () => {
    const result = formatRub(100_000);

    expect(result).toBe('100 000');
    expect(result).not.toContain(NBSP);
    expect(result).not.toContain(NNBSP);
  });

  it('formats zero without any thousands separator', () => {
    expect(formatRub(0)).toBe('0');
  });

  it('formats a one-thousand boundary (just-emits-separator)', () => {
    const result = formatRub(1_000);

    expect(result).toBe('1 000');
    expect(result).not.toContain(NBSP);
    expect(result).not.toContain(NNBSP);
  });

  it('formats a seven-digit number with multiple separators normalised', () => {
    const result = formatRub(9_999_999);

    expect(result).toBe('9 999 999');
    // Every non-ASCII separator must be replaced.
    expect(result.match(/[  ]/g)).toBeNull();
  });

  it('formats a negative number, preserving sign and normalising spaces', () => {
    const result = formatRub(-50_000);

    expect(result).not.toContain(NBSP);
    expect(result).not.toContain(NNBSP);
    expect(result).toContain('50 000');
  });

  it('returns a string (explicit return type)', () => {
    expect(typeof formatRub(1)).toBe('string');
  });

  it('is idempotent — passing the formatted output through again is a no-op for the separator', () => {
    const once = formatRub(123_456);
    // Re-formatting a number doesn't really apply, but the principle
    // is: there should be no NBSP left for a second pass to remove.
    expect(once.match(/[  ]/g)).toBeNull();
  });
});

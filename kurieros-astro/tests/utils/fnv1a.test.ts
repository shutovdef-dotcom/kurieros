import { describe, it, expect } from 'vitest';
import { fnv1a } from '../../src/utils/fnv1a';

describe('fnv1a', () => {
  it('returns the FNV-1a 32-bit offset basis (Math.abs of int32 cast) for empty input', () => {
    // FNV offset basis is 2166136261. `2166136261 | 0` becomes -2128831035,
    // and Math.abs(-2128831035) === 2128831035. The empty-input value is
    // therefore 2128831035. We pin this so a refactor that changes the
    // offset/prime constants trips the test.
    expect(fnv1a('')).toBe(2128831035);
  });

  it('produces deterministic output for the same input', () => {
    expect(fnv1a('hello')).toBe(fnv1a('hello'));
    expect(fnv1a('Москва')).toBe(fnv1a('Москва'));
  });

  it('produces a different hash for a different input', () => {
    expect(fnv1a('foo')).not.toBe(fnv1a('bar'));
    expect(fnv1a('abc')).not.toBe(fnv1a('abd'));
  });

  it('is order-sensitive', () => {
    expect(fnv1a('ab')).not.toBe(fnv1a('ba'));
  });

  it('returns a non-negative integer in the int32 range', () => {
    const inputs = ['', 'a', 'foo', 'Москва', 'ozon-courier-moskva-foot', '🦄'];
    for (const input of inputs) {
      const result = fnv1a(input);
      expect(Number.isInteger(result), `integer for "${input}"`).toBe(true);
      expect(result, `non-negative for "${input}"`).toBeGreaterThanOrEqual(0);
      expect(result, `< 2^31 for "${input}"`).toBeLessThan(2 ** 31);
    }
  });

  it('matches known canonical outputs (regression-pinned)', () => {
    // These pin the implementation: any change to the prime, offset basis,
    // or character coercion behaviour will trip the assertion.
    expect(fnv1a('foo')).toBe(1443660073);
    expect(fnv1a('hello')).toBe(1335831723);
    expect(fnv1a('abc')).toBe(440920331);
  });
});

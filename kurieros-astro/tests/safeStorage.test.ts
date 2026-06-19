import { describe, expect, it, vi } from 'vitest';
import { createSafeStorage } from '../src/scripts/safeStorage';

describe('createSafeStorage', () => {
  it('swallows get/set/remove failures and returns null on failed reads', () => {
    const throwingStorage = {
      getItem: vi.fn(() => {
        throw new DOMException('blocked', 'SecurityError');
      }),
      setItem: vi.fn(() => {
        throw new DOMException('blocked', 'SecurityError');
      }),
      removeItem: vi.fn(() => {
        throw new DOMException('blocked', 'SecurityError');
      }),
    };

    const storage = createSafeStorage(throwingStorage);

    expect(storage.get('compareList')).toBeNull();
    expect(() => storage.set('compareList', '[]')).not.toThrow();
    expect(() => storage.remove('compareList')).not.toThrow();
  });

  it('works with regular Storage-like objects', () => {
    const values = new Map<string, string>();
    const memoryStorage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    };

    const storage = createSafeStorage(memoryStorage);

    storage.set('site-lang', 'uz');
    expect(storage.get('site-lang')).toBe('uz');
    storage.remove('site-lang');
    expect(storage.get('site-lang')).toBeNull();
  });
});

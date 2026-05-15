import { describe, it, expect } from 'vitest';
import { cyrillicToLatin } from '../../src/utils/transliterate';

describe('cyrillicToLatin', () => {
  it('transliterates the Moscow city name', () => {
    expect(cyrillicToLatin('Москва')).toBe('moskva');
  });

  it('transliterates a multi-segment hyphenated name', () => {
    expect(cyrillicToLatin('Санкт-Петербург')).toBe('sankt-peterburg');
  });

  it('returns empty string for empty input', () => {
    expect(cyrillicToLatin('')).toBe('');
  });

  it('passes through ASCII letters and digits unchanged (lowercased)', () => {
    expect(cyrillicToLatin('Hello123')).toBe('hello123');
  });

  it('preserves spaces and punctuation', () => {
    expect(cyrillicToLatin('Нижний Новгород')).toBe('nizhniy novgorod');
  });

  it('handles every lowercase letter of the cyrillic alphabet', () => {
    // Single letters that should produce a unique latin token.
    const cases: Array<[string, string]> = [
      ['а', 'a'], ['б', 'b'], ['в', 'v'], ['г', 'g'], ['д', 'd'],
      ['е', 'e'], ['ё', 'e'], ['ж', 'zh'], ['з', 'z'], ['и', 'i'],
      ['й', 'y'], ['к', 'k'], ['л', 'l'], ['м', 'm'], ['н', 'n'],
      ['о', 'o'], ['п', 'p'], ['р', 'r'], ['с', 's'], ['т', 't'],
      ['у', 'u'], ['ф', 'f'], ['х', 'h'], ['ц', 'ts'], ['ч', 'ch'],
      ['ш', 'sh'], ['щ', 'sch'], ['ы', 'y'], ['э', 'e'], ['ю', 'yu'],
      ['я', 'ya'],
    ];
    for (const [cyr, lat] of cases) {
      expect(cyrillicToLatin(cyr), `${cyr} → ${lat}`).toBe(lat);
    }
  });

  it('strips the soft sign and hard sign (no latin counterpart)', () => {
    expect(cyrillicToLatin('ъ')).toBe('');
    expect(cyrillicToLatin('ь')).toBe('');
    expect(cyrillicToLatin('объект')).toBe('obekt');
  });

  it('lowercases uppercase cyrillic before transliteration', () => {
    expect(cyrillicToLatin('МОСКВА')).toBe('moskva');
    expect(cyrillicToLatin('Ёлка')).toBe('elka');
  });
});

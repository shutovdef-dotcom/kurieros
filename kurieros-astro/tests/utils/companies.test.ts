import { describe, it, expect } from 'vitest';
import { slugifyCompany } from '../../src/utils/companies';

describe('slugifyCompany', () => {
  it('returns the curated slug for Альфа-Банк', () => {
    // Curated COMPANY_SLUGS map is the source of truth — must stay stable
    // because the slug appears in /companies/<slug>/ URLs.
    expect(slugifyCompany('Альфа-Банк')).toBe('alfa-bank');
  });

  it('returns the curated slug for Яндекс Еда', () => {
    expect(slugifyCompany('Яндекс Еда')).toBe('yandex-eda');
  });

  it('returns the curated slug for Т-Банк', () => {
    expect(slugifyCompany('Т-Банк')).toBe('t-bank');
  });

  it('returns the curated slug for Купер (Сбермаркет)', () => {
    expect(slugifyCompany('Купер (Сбермаркет)')).toBe('kuper-sbermarket');
  });

  it('falls back to transliteration for an unknown company name', () => {
    // No entry in COMPANY_SLUGS — slug derives from cyrillicToLatin path.
    const slug = slugifyCompany('Новая Фирма');
    expect(slug).toMatch(/^[a-z0-9-]+$/);
    expect(slug.length).toBeGreaterThan(0);
    expect(slug.startsWith('-')).toBe(false);
    expect(slug.endsWith('-')).toBe(false);
  });

  it('produces deterministic output across multiple calls', () => {
    const a = slugifyCompany('Альфа-Банк');
    const b = slugifyCompany('Альфа-Банк');
    const c = slugifyCompany('Альфа-Банк');
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it('collapses repeated dashes for transliteration fallback', () => {
    const slug = slugifyCompany('  Тест    Кафе  ');
    expect(slug).not.toMatch(/--/);
  });
});

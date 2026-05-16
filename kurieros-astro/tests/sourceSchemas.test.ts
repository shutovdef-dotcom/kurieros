/**
 * Runtime-schema tests for the 5 partner JSON imports.
 *
 * Each block has two parts:
 *   1. PRODUCTION-DATA SANITY — parse the actual JSON the build ships
 *      with and assert it succeeds. Catches drift between hand-authored
 *      schemas and the scraper's output before the build silently
 *      starts emitting NaN salaries or undefined slugs.
 *   2. NEGATIVE FUZZ — feed deliberately malformed variants (missing
 *      required keys, wrong types, NaN) and assert the parse throws
 *      with a field-level error path.
 *
 * Audit ref: v2 H5 (HIGH, amplified by Phase 2 — "Never trust external
 * data … file content.")
 */

import { describe, it, expect } from 'vitest';

import kuperPayRatesSource from '../src/data/kuper-pay-rates.json';
import tBankVacanciesSource from '../src/data/tbank-vacancies.json';
import efinVacanciesSource from '../src/data/efin-vacancies.json';
import alfaBankVacanciesSource from '../src/data/alfa-bank-vacancies.json';
import burgerKingVacanciesSource from '../src/data/burger-king-vacancies.json';
import ozonVacanciesSource from '../src/data/ozon-vacancies.json';
import ozonFreshVacanciesSource from '../src/data/ozon-fresh-vacancies.json';

import { KuperPayRatesSchema } from '../src/data/sources/kuper';
import { TBankVacanciesSchema } from '../src/data/sources/tbank';
import { EfinVacanciesSchema } from '../src/data/sources/efin';
import { AlfaBankVacanciesSchema } from '../src/data/sources/alfa-bank';
import { BurgerKingVacanciesSchema } from '../src/data/sources/burger-king';
import { OzonSkladVacanciesSchema, OzonFreshVacanciesSchema } from '../src/data/ozonOffers';

// =====================================================================
// Helpers
// =====================================================================

/** Deep clone via JSON round-trip so each mutation is isolated. */
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** Assert that a Zod parse failure mentions the given field-path tail. */
const expectIssueAtPath = (error: unknown, expectedPathSuffix: ReadonlyArray<string | number>) => {
  const issues = (error as { issues?: ReadonlyArray<{ path: ReadonlyArray<string | number> }> }).issues;
  expect(issues, 'parse error must carry a zod issues[] array').toBeTruthy();
  expect(issues!.length).toBeGreaterThan(0);
  const tailLen = expectedPathSuffix.length;
  const matched = issues!.some((issue) => {
    const tail = issue.path.slice(-tailLen);
    return tail.length === tailLen && tail.every((segment, index) => segment === expectedPathSuffix[index]);
  });
  expect(matched, `expected an issue ending at path ${JSON.stringify(expectedPathSuffix)} — got ${JSON.stringify(issues)}`).toBe(true);
};

// =====================================================================
// Kuper (kuper-pay-rates.json)
// =====================================================================

describe('KuperPayRatesSchema', () => {
  it('parses the production JSON without throwing', () => {
    expect(() => KuperPayRatesSchema.parse(kuperPayRatesSource)).not.toThrow();
  });

  it('infers the same top-level keys as before', () => {
    const parsed = KuperPayRatesSchema.parse(kuperPayRatesSource);
    expect(parsed.sourceUrl).toMatch(/^https?:\/\//);
    expect(parsed.exportedAt).toBeTruthy();
    expect(Object.keys(parsed.footAndBikeShiftByCity).length).toBeGreaterThan(0);
    expect(Object.keys(parsed.autoShiftByCity).length).toBeGreaterThan(0);
    expect(Object.keys(parsed.packerShiftByCity).length).toBeGreaterThan(0);
  });

  it('accepts unknown extra top-level keys (e.g. telemetry like `counts`)', () => {
    const augmented = { ...clone(kuperPayRatesSource), extraTelemetry: { newKey: 42 } };
    expect(() => KuperPayRatesSchema.parse(augmented)).not.toThrow();
  });

  it('rejects a missing `footAndBikeShiftByCity`', () => {
    const malformed = clone(kuperPayRatesSource) as Partial<typeof kuperPayRatesSource>;
    delete malformed.footAndBikeShiftByCity;
    try {
      KuperPayRatesSchema.parse(malformed);
      throw new Error('parse should have thrown');
    } catch (error) {
      expectIssueAtPath(error, ['footAndBikeShiftByCity']);
    }
  });

  it('rejects NaN in a city shift rate', () => {
    const malformed = clone(kuperPayRatesSource) as typeof kuperPayRatesSource & {
      footAndBikeShiftByCity: Record<string, number>;
    };
    malformed.footAndBikeShiftByCity['Абакан'] = Number.NaN;
    try {
      KuperPayRatesSchema.parse(malformed);
      throw new Error('parse should have thrown for NaN rate');
    } catch (error) {
      expectIssueAtPath(error, ['footAndBikeShiftByCity', 'Абакан']);
    }
  });

  it('rejects a non-positive city shift rate (zero would yield 0 ₽/час)', () => {
    const malformed = clone(kuperPayRatesSource) as typeof kuperPayRatesSource & {
      footAndBikeShiftByCity: Record<string, number>;
    };
    malformed.footAndBikeShiftByCity['Абакан'] = 0;
    expect(() => KuperPayRatesSchema.parse(malformed)).toThrow();
  });
});

// =====================================================================
// T-Bank (tbank-vacancies.json)
// =====================================================================

describe('TBankVacanciesSchema', () => {
  it('parses the production JSON without throwing', () => {
    expect(() => TBankVacanciesSchema.parse(tBankVacanciesSource)).not.toThrow();
  });

  it('rejects a missing `operatorB2B` block', () => {
    const malformed = clone(tBankVacanciesSource) as Partial<typeof tBankVacanciesSource>;
    delete malformed.operatorB2B;
    try {
      TBankVacanciesSchema.parse(malformed);
      throw new Error('parse should have thrown');
    } catch (error) {
      expectIssueAtPath(error, ['operatorB2B']);
    }
  });

  it('rejects a non-numeric `incomeMinRub` in a representative offer', () => {
    const malformed = clone(tBankVacanciesSource);
    (malformed.representative.offers[0] as unknown as { incomeMinRub: unknown }).incomeMinRub =
      '70000' as unknown;
    try {
      TBankVacanciesSchema.parse(malformed);
      throw new Error('parse should have thrown for string incomeMinRub');
    } catch (error) {
      expectIssueAtPath(error, ['representative', 'offers', 0, 'incomeMinRub']);
    }
  });

  it('rejects an offer with empty city string', () => {
    const malformed = clone(tBankVacanciesSource);
    malformed.operatorB2B.offers[0].city = '';
    try {
      TBankVacanciesSchema.parse(malformed);
      throw new Error('parse should have thrown for empty city');
    } catch (error) {
      expectIssueAtPath(error, ['operatorB2B', 'offers', 0, 'city']);
    }
  });

  it('accepts an offer with missing optional income fields', () => {
    const augmented = clone(tBankVacanciesSource);
    augmented.operatorB2B.offers[0] = { city: 'Тестоград' } as typeof augmented.operatorB2B.offers[0];
    expect(() => TBankVacanciesSchema.parse(augmented)).not.toThrow();
  });
});

// =====================================================================
// Efin (efin-vacancies.json)
// =====================================================================

describe('EfinVacanciesSchema', () => {
  it('parses the production JSON without throwing', () => {
    expect(() => EfinVacanciesSchema.parse(efinVacanciesSource)).not.toThrow();
  });

  it('rejects an offer with unknown transport mode', () => {
    const malformed = clone(efinVacanciesSource);
    (malformed.offers[0] as unknown as { transport: string }).transport = 'helicopter';
    try {
      EfinVacanciesSchema.parse(malformed);
      throw new Error('parse should have thrown for unknown transport');
    } catch (error) {
      expectIssueAtPath(error, ['offers', 0, 'transport']);
    }
  });

  it('rejects a missing `monthlyFromRub` field', () => {
    const malformed = clone(efinVacanciesSource);
    delete (malformed.offers[0] as Partial<(typeof malformed.offers)[number]>).monthlyFromRub;
    try {
      EfinVacanciesSchema.parse(malformed);
      throw new Error('parse should have thrown for missing monthlyFromRub');
    } catch (error) {
      expectIssueAtPath(error, ['offers', 0, 'monthlyFromRub']);
    }
  });

  it('rejects NaN in `meetingFeeRub` (silent NaN would corrupt ₽/мес text)', () => {
    const malformed = clone(efinVacanciesSource);
    malformed.offers[0].meetingFeeRub = Number.NaN;
    try {
      EfinVacanciesSchema.parse(malformed);
      throw new Error('parse should have thrown for NaN meetingFeeRub');
    } catch (error) {
      expectIssueAtPath(error, ['offers', 0, 'meetingFeeRub']);
    }
  });
});

// =====================================================================
// Alfa-Bank (alfa-bank-vacancies.json)
// =====================================================================

describe('AlfaBankVacanciesSchema', () => {
  it('parses the production JSON without throwing', () => {
    expect(() => AlfaBankVacanciesSchema.parse(alfaBankVacanciesSource)).not.toThrow();
  });

  it('accepts unknown extra top-level keys (`auditRule`, `cities`, etc.)', () => {
    const augmented = { ...clone(alfaBankVacanciesSource), futureDiagnostic: { ok: true } };
    expect(() => AlfaBankVacanciesSchema.parse(augmented)).not.toThrow();
  });

  it('rejects an offer with unknown transport mode (e.g. `remote` is not valid for Alfa-Bank)', () => {
    const malformed = clone(alfaBankVacanciesSource);
    (malformed.offers[0] as unknown as { transport: string }).transport = 'remote';
    try {
      AlfaBankVacanciesSchema.parse(malformed);
      throw new Error('parse should have thrown for remote transport');
    } catch (error) {
      expectIssueAtPath(error, ['offers', 0, 'transport']);
    }
  });

  it('rejects a non-finite `monthlyFromRub`', () => {
    const malformed = clone(alfaBankVacanciesSource);
    malformed.offers[0].monthlyFromRub = Number.POSITIVE_INFINITY;
    try {
      AlfaBankVacanciesSchema.parse(malformed);
      throw new Error('parse should have thrown for Infinity monthlyFromRub');
    } catch (error) {
      expectIssueAtPath(error, ['offers', 0, 'monthlyFromRub']);
    }
  });

  it('rejects a non-positive `salaryMonthlyFromRub` global default', () => {
    const malformed = clone(alfaBankVacanciesSource);
    malformed.salaryMonthlyFromRub = 0;
    try {
      AlfaBankVacanciesSchema.parse(malformed);
      throw new Error('parse should have thrown for zero salaryMonthlyFromRub');
    } catch (error) {
      expectIssueAtPath(error, ['salaryMonthlyFromRub']);
    }
  });
});

// =====================================================================
// Burger King (burger-king-vacancies.json)
// =====================================================================

describe('BurgerKingVacanciesSchema', () => {
  it('parses the production JSON without throwing', () => {
    expect(() => BurgerKingVacanciesSchema.parse(burgerKingVacanciesSource)).not.toThrow();
  });

  it('rejects a missing `monthlyMin` field — would silently produce NaN salary text', () => {
    const malformed = clone(burgerKingVacanciesSource);
    delete (malformed.offers[0] as Partial<(typeof malformed.offers)[number]>).monthlyMin;
    try {
      BurgerKingVacanciesSchema.parse(malformed);
      throw new Error('parse should have thrown for missing monthlyMin');
    } catch (error) {
      expectIssueAtPath(error, ['offers', 0, 'monthlyMin']);
    }
  });

  it('rejects a non-boolean `isActive`', () => {
    const malformed = clone(burgerKingVacanciesSource);
    (malformed.offers[0] as unknown as { isActive: unknown }).isActive = 'true';
    try {
      BurgerKingVacanciesSchema.parse(malformed);
      throw new Error('parse should have thrown for stringified isActive');
    } catch (error) {
      expectIssueAtPath(error, ['offers', 0, 'isActive']);
    }
  });

  it('rejects a negative `hiringNeed` (count of vacancies cannot be negative)', () => {
    const malformed = clone(burgerKingVacanciesSource);
    malformed.offers[0].hiringNeed = -1;
    try {
      BurgerKingVacanciesSchema.parse(malformed);
      throw new Error('parse should have thrown for negative hiringNeed');
    } catch (error) {
      expectIssueAtPath(error, ['offers', 0, 'hiringNeed']);
    }
  });

  it('accepts an offer without optional `cityDistricts`', () => {
    const sample = clone(burgerKingVacanciesSource);
    // pick any city that doesn't already ship cityDistricts
    const noDistricts = sample.offers.find((o) => !('cityDistricts' in o));
    expect(noDistricts).toBeDefined();
    expect(() => BurgerKingVacanciesSchema.parse(sample)).not.toThrow();
  });
});

// =====================================================================
// Ozon sklad (ozon-vacancies.json)
// =====================================================================

describe('OzonSkladVacanciesSchema', () => {
  it('parses the production JSON without throwing', () => {
    expect(() => OzonSkladVacanciesSchema.parse(ozonVacanciesSource)).not.toThrow();
  });

  it('infers a non-empty catalogue with slug/label/cities per entry', () => {
    const parsed = OzonSkladVacanciesSchema.parse(ozonVacanciesSource);
    expect(parsed.length).toBeGreaterThan(0);
    for (const entry of parsed) {
      expect(entry.slug).toBeTruthy();
      expect(entry.label).toBeTruthy();
      expect(Array.isArray(entry.cities)).toBe(true);
    }
  });

  it('rejects an entry missing `slug`', () => {
    const malformed = clone(ozonVacanciesSource);
    delete (malformed[0] as Partial<(typeof malformed)[number]>).slug;
    try {
      OzonSkladVacanciesSchema.parse(malformed);
      throw new Error('parse should have thrown for missing slug');
    } catch (error) {
      expectIssueAtPath(error, [0, 'slug']);
    }
  });

  it('rejects a city whose `hireObjects` is not an array', () => {
    const malformed = clone(ozonVacanciesSource);
    (malformed[0].cities[0] as unknown as { hireObjects: unknown }).hireObjects =
      'not-an-array' as unknown;
    try {
      OzonSkladVacanciesSchema.parse(malformed);
      throw new Error('parse should have thrown for non-array hireObjects');
    } catch (error) {
      expectIssueAtPath(error, [0, 'cities', 0, 'hireObjects']);
    }
  });

  it('rejects a hire object missing its `uuid`', () => {
    const malformed = clone(ozonVacanciesSource);
    delete (malformed[0].cities[0].hireObjects[0] as Partial<
      (typeof malformed)[number]['cities'][number]['hireObjects'][number]
    >).uuid;
    try {
      OzonSkladVacanciesSchema.parse(malformed);
      throw new Error('parse should have thrown for missing hire-object uuid');
    } catch (error) {
      expectIssueAtPath(error, [0, 'cities', 0, 'hireObjects', 0, 'uuid']);
    }
  });
});

// =====================================================================
// Ozon Fresh (ozon-fresh-vacancies.json)
// =====================================================================

describe('OzonFreshVacanciesSchema', () => {
  it('parses the production JSON without throwing', () => {
    expect(() => OzonFreshVacanciesSchema.parse(ozonFreshVacanciesSource)).not.toThrow();
  });

  it('infers a non-empty catalogue with customer/vacancy/label/cities per entry', () => {
    const parsed = OzonFreshVacanciesSchema.parse(ozonFreshVacanciesSource);
    expect(parsed.length).toBeGreaterThan(0);
    for (const entry of parsed) {
      expect(entry.customer).toBeTruthy();
      expect(entry.vacancy).toBeTruthy();
      expect(Array.isArray(entry.cities)).toBe(true);
    }
  });

  it('rejects an entry missing the `customer` discriminator', () => {
    const malformed = clone(ozonFreshVacanciesSource);
    delete (malformed[0] as Partial<(typeof malformed)[number]>).customer;
    try {
      OzonFreshVacanciesSchema.parse(malformed);
      throw new Error('parse should have thrown for missing customer');
    } catch (error) {
      expectIssueAtPath(error, [0, 'customer']);
    }
  });

  it('rejects a numeric `cityID` (must be a string UUID)', () => {
    const malformed = clone(ozonFreshVacanciesSource);
    (malformed[0].cities[0] as unknown as { cityID: unknown }).cityID = 42 as unknown;
    try {
      OzonFreshVacanciesSchema.parse(malformed);
      throw new Error('parse should have thrown for numeric cityID');
    } catch (error) {
      expectIssueAtPath(error, [0, 'cities', 0, 'cityID']);
    }
  });
});

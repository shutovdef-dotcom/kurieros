/**
 * i18n pipeline integrity checks.
 *
 * The translation system is fragile because it has three loosely coupled layers:
 *   1. RU source clauses (src/data/i18n/ru-clauses.json) — produced by extract.
 *   2. Per-language translations (src/data/i18n/clauses/<lang>.json) — should
 *      contain a key for every clauseId in (1).
 *   3. Source→clauses index (src/data/i18n/source-to-clauses.json) — points
 *      every vacancy field to a list of clauseIds. Every referenced clauseId
 *      must exist in (1).
 *
 * If any of these drift apart, the runtime fragment loader silently shows the
 * RU fallback for affected fragments — invisible bug. These tests catch the
 * drift up front.
 *
 * Plus: every supported language must have a `vacancy-translations-source/<lang>.json`
 * file (legacy override layer) and a `clauses/<lang>.json` file (modern path).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { SUPPORTED_LANGUAGES } from '../src/data/translations';

const ROOT = dirname(fileURLToPath(import.meta.url));
const I18N_DIR = join(ROOT, '..', 'src', 'data', 'i18n');
const CLAUSES_DIR = join(I18N_DIR, 'clauses');
const VACANCY_TRANS_DIR = join(ROOT, '..', 'src', 'data', 'vacancy-translations-source');

const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8'));

const ruClauses = readJson<Record<string, string>>(join(I18N_DIR, 'ru-clauses.json'));
const sourceToClauses = readJson<
  Record<string, Record<string, unknown>>
>(join(I18N_DIR, 'source-to-clauses.json'));

// Recursively collect every clauseId leaf from the source-to-clauses tree.
// Leaves look like ['c_<hash>', '<terminator>'] where the first element is
// the clauseId. Branches are arrays-of-arrays-or-leaves.
const isLeaf = (value: unknown): value is [string, string] =>
  Array.isArray(value) &&
  value.length === 2 &&
  typeof value[0] === 'string' &&
  typeof value[1] === 'string' &&
  value[0].startsWith('c_');

const collectClauseIds = (node: unknown, out: Set<string>): void => {
  if (isLeaf(node)) {
    out.add(node[0]);
    return;
  }
  if (Array.isArray(node)) {
    for (const child of node) collectClauseIds(child, out);
    return;
  }
  if (node && typeof node === 'object') {
    for (const child of Object.values(node)) collectClauseIds(child, out);
  }
};

describe('i18n pipeline integrity', () => {
  it('every clauseId referenced in source-to-clauses.json exists in ru-clauses.json', () => {
    const referenced = new Set<string>();
    collectClauseIds(sourceToClauses, referenced);

    const missing: string[] = [];
    for (const clauseId of referenced) {
      if (!(clauseId in ruClauses)) missing.push(clauseId);
    }

    expect(missing, `Missing clause definitions: ${missing.slice(0, 5).join(', ')}`).toEqual([]);
  });

  it('non-RU clauses files only contain keys that exist in ru-clauses.json (no orphans)', () => {
    const ruKeys = new Set(Object.keys(ruClauses));
    const nonRu = SUPPORTED_LANGUAGES.filter((lang) => lang !== 'ru');

    for (const lang of nonRu) {
      const langPath = join(CLAUSES_DIR, `${lang}.json`);
      if (!existsSync(langPath)) continue; // covered by next test
      const langData = readJson<Record<string, string>>(langPath);
      const orphans = Object.keys(langData).filter((key) => !ruKeys.has(key));
      expect(orphans, `Orphan clauseIds in ${lang}.json: ${orphans.slice(0, 3).join(', ')}`).toEqual([]);
    }
  });

  it('every supported non-RU language has a clauses/<lang>.json file', () => {
    const missing: string[] = [];
    for (const lang of SUPPORTED_LANGUAGES) {
      if (lang === 'ru') continue;
      const langPath = join(CLAUSES_DIR, `${lang}.json`);
      if (!existsSync(langPath)) missing.push(lang);
    }
    expect(missing).toEqual([]);
  });

  it('every supported non-RU language has a vacancy-translations-source/<lang>.json file', () => {
    const missing: string[] = [];
    for (const lang of SUPPORTED_LANGUAGES) {
      if (lang === 'ru') continue;
      const langPath = join(VACANCY_TRANS_DIR, `${lang}.json`);
      if (!existsSync(langPath)) missing.push(lang);
    }
    expect(missing).toEqual([]);
  });

  it('every clause file is valid JSON with string values only', () => {
    const nonRu = SUPPORTED_LANGUAGES.filter((lang) => lang !== 'ru');
    for (const lang of nonRu) {
      const langPath = join(CLAUSES_DIR, `${lang}.json`);
      if (!existsSync(langPath)) continue;
      const data = readJson<Record<string, unknown>>(langPath);
      for (const [key, value] of Object.entries(data)) {
        expect(typeof value, `${lang}.json[${key}] is a string`).toBe('string');
      }
    }
  });

  it('every vacancy-translations-source file is valid JSON', () => {
    const nonRu = SUPPORTED_LANGUAGES.filter((lang) => lang !== 'ru');
    for (const lang of nonRu) {
      const langPath = join(VACANCY_TRANS_DIR, `${lang}.json`);
      if (!existsSync(langPath)) continue;
      // Just validate JSON parses. Per-vacancy structure is opaque to this test.
      expect(() => readJson(langPath), `${lang}.json parses`).not.toThrow();
    }
  });
});

/**
 * extract-clauses.ts
 *
 * Reads `vacancySources`, tokenizes Russian content fields into clauses,
 * hashes each clause to a stable content-based ID, and writes:
 *
 *   src/data/i18n/ru-clauses.json       — { c_<hash>: "<RU clause text>", … }
 *   src/data/i18n/source-to-clauses.json — for each (slug, field), the array
 *                                          of [clauseId, terminator] pairs
 *                                          needed to rebuild the original text.
 *
 * Tokenization rules:
 *   • shortDescription / description: split on  '. ' | '; ' | '\n'  — i.e.
 *     period or semicolon FOLLOWED BY whitespace, or a newline. This keeps
 *     brand names like "Я.Про" intact (no space after the period).
 *   • requirements / benefits / requiredDocuments: each array item is parsed
 *     the same way (a bullet may contain multiple clauses).
 *
 * For each clause we store the trailing terminator separately, so assembly
 * reproduces the original text byte-for-byte. Round-trip equivalence is
 * verified by `assemble-translations.ts` after assembling.
 *
 * Orphan clauses (present in ru-clauses.json but not referenced by any
 * source after a re-extract) are pruned from `ru-clauses.json` AND from
 * every `clauses/<lang>.json` automatically.
 */

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { vacancySources } from '../../src/data/vacancies';
import { SUPPORTED_LANGUAGES } from '../../src/data/translations';
import type { VacancySource } from '../../src/data/vacancyTypes';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const i18nDir = resolve(rootDir, 'src/data/i18n');
const clausesDir = resolve(i18nDir, 'clauses');

type Terminator = '.' | ';' | '';

/** A clause is a piece of text plus what terminated it in the source. */
type ParsedClause = { text: string; terminator: Terminator };

/**
 * Parse a string into clauses. Splits on "[.;] WHITESPACE" or newline.
 * Preserves "Я.Про"-style internal periods (period not followed by ws).
 */
function tokenizeText(input: string): ParsedClause[] {
  const text = input.replace(/\r\n/g, '\n');
  const clauses: ParsedClause[] = [];
  let buf = '';

  const flush = (terminator: Terminator) => {
    const trimmed = buf.trim();
    if (trimmed) {
      clauses.push({ text: trimmed, terminator });
    }
    buf = '';
  };

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1] ?? '';

    if ((c === '.' || c === ';') && (next === '' || /\s/.test(next))) {
      flush(c);
      // skip whitespace after terminator
      while (i + 1 < text.length && /\s/.test(text[i + 1])) i++;
    } else if (c === '\n') {
      flush('');
      while (i + 1 < text.length && /\s/.test(text[i + 1])) i++;
    } else {
      buf += c;
    }
  }
  flush('');

  return clauses;
}

/** 8-char hex from sha256 of the clause text. Stable + readable. */
function clauseId(text: string): string {
  return 'c_' + createHash('sha256').update(text, 'utf8').digest('hex').slice(0, 8);
}

type ClauseRef = [string, Terminator]; // [clauseId, terminator]

type SourceMapping = {
  shortDescription: ClauseRef[];
  description: ClauseRef[];
  requirements: ClauseRef[][];
  benefits: ClauseRef[][];
  requiredDocuments: ClauseRef[][];
};

type SourceToClauses = Record<string, SourceMapping>;

const ruClauses: Record<string, string> = {};
const sourceToClauses: SourceToClauses = {};

function registerString(value: string): ClauseRef[] {
  return tokenizeText(value).map(({ text, terminator }) => {
    const id = clauseId(text);
    if (!ruClauses[id]) ruClauses[id] = text;
    else if (ruClauses[id] !== text) {
      // hash collision — extraordinarily unlikely with sha256/8 but log it
      throw new Error(`Hash collision for ${id}: "${ruClauses[id]}" vs "${text}"`);
    }
    return [id, terminator];
  });
}

function registerArray(items: string[]): ClauseRef[][] {
  return items.map((item) => registerString(item));
}

function buildSourceMapping(source: VacancySource): SourceMapping {
  const content = source.content;
  return {
    shortDescription: registerString(content.shortDescription),
    description: registerString(content.description),
    requirements: registerArray(content.requirements),
    benefits: registerArray(content.benefits),
    requiredDocuments: registerArray(content.requiredDocuments),
  };
}

for (const source of vacancySources) {
  sourceToClauses[source.slug] = buildSourceMapping(source);
}

function sortByKey<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b))) as T;
}

// === Prune orphans from clauses/<lang>.json files ==========================
// Any clauseId not present in ruClauses after this extraction is no longer
// referenced and must be removed from each language dictionary too.
const activeIds = new Set(Object.keys(ruClauses));
let prunedTotal = 0;

await mkdir(clausesDir, { recursive: true });

for (const lang of SUPPORTED_LANGUAGES) {
  if (lang === 'ru') continue;
  const path = resolve(clausesDir, `${lang}.json`);
  if (!existsSync(path)) continue;
  const existing = JSON.parse(await readFile(path, 'utf8')) as Record<string, string>;
  const cleaned: Record<string, string> = {};
  let pruned = 0;
  for (const [id, value] of Object.entries(existing)) {
    if (activeIds.has(id)) cleaned[id] = value;
    else pruned++;
  }
  if (pruned > 0) {
    await writeFile(path, JSON.stringify(sortByKey(cleaned), null, 2) + '\n', 'utf8');
    prunedTotal += pruned;
    console.log(`  pruned ${pruned} orphans from clauses/${lang}.json`);
  }
}

// === Write outputs ==========================================================
await mkdir(i18nDir, { recursive: true });
await writeFile(
  resolve(i18nDir, 'ru-clauses.json'),
  JSON.stringify(sortByKey(ruClauses), null, 2) + '\n',
  'utf8',
);
await writeFile(
  resolve(i18nDir, 'source-to-clauses.json'),
  JSON.stringify(sortByKey(sourceToClauses), null, 2) + '\n',
  'utf8',
);

console.log(
  `Extracted ${Object.keys(ruClauses).length} unique RU clauses ` +
    `from ${vacancySources.length} sources` +
    (prunedTotal > 0 ? ` (pruned ${prunedTotal} orphan entries from lang files)` : ''),
);

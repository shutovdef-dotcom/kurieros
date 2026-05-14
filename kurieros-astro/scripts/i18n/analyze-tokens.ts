/**
 * analyze-tokens.ts
 *
 * Reads the freshly-extracted i18n source (ru-clauses + source-to-clauses)
 * and prints a deduplication report:
 *   - total clause occurrences across all sources
 *   - unique clauses
 *   - dedup ratio
 *   - top 15 most-reused clauses
 *
 * Exits non-zero if dedup ratio < 30% (cutoff agreed in plan v3 — below
 * that, clause-level tokenization isn't worth the round-trip complexity
 * and we'd fall back to string-level dedup).
 *
 * Usage:
 *   npm run i18n:extract       # produces i18n/ source files
 *   npm run i18n:analyze       # this script
 */

import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const i18nDir = resolve(rootDir, 'src/data/i18n');

const DEDUP_THRESHOLD = 0.3; // 30%

type Terminator = '.' | ';' | '';
type ClauseRef = [string, Terminator];
type SourceMapping = {
  shortDescription: ClauseRef[];
  description: ClauseRef[];
  requirements: ClauseRef[][];
  benefits: ClauseRef[][];
  requiredDocuments: ClauseRef[][];
};

const ruClauses = JSON.parse(
  await readFile(resolve(i18nDir, 'ru-clauses.json'), 'utf8'),
) as Record<string, string>;
const sourceToClauses = JSON.parse(
  await readFile(resolve(i18nDir, 'source-to-clauses.json'), 'utf8'),
) as Record<string, SourceMapping>;

// Count clause references across all sources and fields
const refCount = new Map<string, number>();
let total = 0;

const countRefs = (refs: ClauseRef[]) => {
  for (const [id] of refs) {
    refCount.set(id, (refCount.get(id) ?? 0) + 1);
    total += 1;
  }
};

const countNestedRefs = (refs: ClauseRef[][]) => {
  for (const bullet of refs) countRefs(bullet);
};

for (const mapping of Object.values(sourceToClauses)) {
  countRefs(mapping.shortDescription);
  countRefs(mapping.description);
  countNestedRefs(mapping.requirements);
  countNestedRefs(mapping.benefits);
  countNestedRefs(mapping.requiredDocuments);
}

const uniqueCount = Object.keys(ruClauses).length;
const dedupRatio = 1 - uniqueCount / total;

console.log('=== Clause-level dedup analysis ===');
console.log(`Total clause references:  ${total}`);
console.log(`Unique clauses:           ${uniqueCount}`);
console.log(`Duplicates:               ${total - uniqueCount}`);
console.log(`Dedup ratio:              ${(dedupRatio * 100).toFixed(1)}%`);
console.log();
console.log('=== Top 15 most-reused clauses ===');
const sorted = [...refCount.entries()].sort(([, a], [, b]) => b - a);
for (const [id, count] of sorted.slice(0, 15)) {
  const text = ruClauses[id] ?? '<missing>';
  const preview = text.length > 70 ? text.slice(0, 70) + '…' : text;
  console.log(`  ×${String(count).padStart(3)}  ${id}  "${preview}"`);
}
console.log();
console.log('=== Reuse frequency distribution ===');
const buckets = new Map<number, number>();
for (const c of refCount.values()) buckets.set(c, (buckets.get(c) ?? 0) + 1);
for (const [reuses, n] of [...buckets.entries()].sort(([a], [b]) => a - b)) {
  console.log(`  used ${reuses}×:  ${n} clauses`);
}
console.log();

if (dedupRatio < DEDUP_THRESHOLD) {
  console.error(
    `✗ Dedup ratio ${(dedupRatio * 100).toFixed(1)}% < ${DEDUP_THRESHOLD * 100}% threshold.`,
  );
  console.error('  Clause-level tokenization is not worth the complexity here.');
  console.error('  Consider falling back to string-level translation instead.');
  process.exit(1);
}

console.log(`✓ Dedup ratio passes ${DEDUP_THRESHOLD * 100}% threshold.`);
console.log(`  Translating ${uniqueCount} unique clauses × 11 langs = ${uniqueCount * 11} entries`);
console.log(`  (vs ${total * 11} without dedup — saves ${(total - uniqueCount) * 11} entries)`);

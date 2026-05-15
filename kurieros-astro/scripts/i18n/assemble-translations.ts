/**
 * assemble-translations.ts
 *
 * Reverse of `extract-clauses.ts`. Reads:
 *   src/data/i18n/ru-clauses.json
 *   src/data/i18n/source-to-clauses.json
 *   src/data/i18n/clauses/<lang>.json   (× 11 non-RU languages)
 *
 * For each (lang, source, field):
 *   - Walks the clause-ref list from source-to-clauses
 *   - Looks each clause up in clauses/<lang>.json; falls back to ru-clauses
 *     when missing (visible soft signal that the translation is incomplete)
 *   - Reassembles the original string using stored terminators
 *
 * Writes:
 *   src/data/vacancy-translations-source/<lang>.json   (× 11)
 *   — same shape consumed by jobs.ts:resolveLocalizedContent + the
 *     strict-validation step in generate-vacancy-translations.ts.
 *
 * Round-trip check: also reassembles RU using ru-clauses as the "translation"
 * source and compares to the live vacancySources content. Any divergence
 * means the tokenizer is lossy — exit 1 with the offending location.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { vacancySources } from '../../src/data/vacancies';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../../src/data/translations';
import type { VacancyContent } from '../../src/data/vacancyTypes';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const i18nDir = resolve(rootDir, 'src/data/i18n');
const clausesDir = resolve(i18nDir, 'clauses');
const outDir = resolve(rootDir, 'src/data/vacancy-translations-source');

type Terminator = '.' | ';' | '';
type ClauseRef = [string, Terminator];
type SourceMapping = {
  shortDescription: ClauseRef[];
  description: ClauseRef[];
  requirements: ClauseRef[][];
  benefits: ClauseRef[][];
  requiredDocuments: ClauseRef[][];
};

/**
 * Read+parse a JSON file with a clear, actionable error message on failure.
 * Without this, ENOENT bubbles up as a raw stack trace with no hint about
 * which prerequisite step the operator forgot to run.
 */
async function loadJsonOrThrow<T>(path: string, hint: string): Promise<T> {
  try {
    const content = await readFile(path, 'utf8');
    return JSON.parse(content) as T;
  } catch (err) {
    const isENoEnt =
      err instanceof Error &&
      'code' in err &&
      (err as NodeJS.ErrnoException).code === 'ENOENT';
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Failed to read ${path}.\n` +
        (isENoEnt ? `Hint: ${hint}\n` : '') +
        `Underlying error: ${detail}`,
    );
  }
}

const ruClauses = await loadJsonOrThrow<Record<string, string>>(
  resolve(i18nDir, 'ru-clauses.json'),
  "Run 'npm run i18n:extract' first to generate ru-clauses.json from src/data/vacancies.ts.",
);
const sourceToClauses = await loadJsonOrThrow<Record<string, SourceMapping>>(
  resolve(i18nDir, 'source-to-clauses.json'),
  "Run 'npm run i18n:extract' first to generate source-to-clauses.json from src/data/vacancies.ts.",
);

// Strict mode: when set, fail the build on partial-coverage warnings or
// missing-clause warnings. Use in CI to prevent silent data drift.
const STRICT_TRANSLATION_COVERAGE = process.env.STRICT_TRANSLATION_COVERAGE === '1';

// Tracks clause IDs that lookupClause cannot find in either the lang dict
// or the RU master. Indicates a partial-write or schema-drift bug in the
// extract step. We log a one-line warning per occurrence and a summary
// at the end.
const missingClauseIds = new Set<string>();

/**
 * Look up a clause in a language dict, falling back to RU if missing.
 *
 * If the id is missing from BOTH the lang dict AND ru-clauses.json, this is
 * a hard data-integrity bug (partial-write of ru-clauses.json or schema
 * drift in source-to-clauses.json). We warn loudly so the operator notices
 * instead of silently shipping shortened/empty assembled fields.
 */
function lookupClause(id: string, dict: Record<string, string>): string {
  if (dict[id] !== undefined) return dict[id];
  if (ruClauses[id] !== undefined) return ruClauses[id];
  if (!missingClauseIds.has(id)) {
    console.error(
      `lookupClause: clause id "${id}" missing from both lang dict and ru-clauses.json. Returning empty string.`,
    );
    missingClauseIds.add(id);
  }
  return '';
}

/** Reassemble a list of clause refs into a single string. */
function assembleString(refs: ClauseRef[], dict: Record<string, string>): string {
  return refs
    .map(([id, term]) => lookupClause(id, dict) + term)
    .join(' ')
    .trim();
}

/** Reassemble a list-of-bullets where each bullet is itself a clause-ref list. */
function assembleArray(refs: ClauseRef[][], dict: Record<string, string>): string[] {
  return refs.map((bullet) => assembleString(bullet, dict));
}

/**
 * Has this source got ANY translated clause in this lang dict?
 * Used to decide whether to emit a full assembled object or `{}` (full RU
 * fallback signal, identical to the old "stub awaiting translation" flag).
 */
function hasAnyTranslation(mapping: SourceMapping, dict: Record<string, string>): boolean {
  const all: ClauseRef[] = [
    ...mapping.shortDescription,
    ...mapping.description,
    ...mapping.requirements.flat(),
    ...mapping.benefits.flat(),
    ...mapping.requiredDocuments.flat(),
  ];
  return all.some(([id]) => dict[id] !== undefined);
}

// === Round-trip check (RU → assemble → RU should be identical) =============
const roundTripErrors: string[] = [];
for (const source of vacancySources) {
  const mapping = sourceToClauses[source.slug];
  if (!mapping) {
    roundTripErrors.push(`MISSING mapping for source ${source.slug}`);
    continue;
  }

  const reassembled: VacancyContent = {
    title: source.content.title,
    shortDescription: assembleString(mapping.shortDescription, ruClauses),
    description: assembleString(mapping.description, ruClauses),
    requirements: assembleArray(mapping.requirements, ruClauses),
    benefits: assembleArray(mapping.benefits, ruClauses),
    requiredDocuments: assembleArray(mapping.requiredDocuments, ruClauses),
    labels: source.content.labels,
    searchTags: source.content.searchTags,
  };

  const checkField = (field: keyof VacancyContent, expected: unknown, got: unknown) => {
    if (JSON.stringify(expected) !== JSON.stringify(got)) {
      roundTripErrors.push(
        `${source.slug}.${field} round-trip diff:\n` +
          `  EXPECTED: ${JSON.stringify(expected)}\n` +
          `  GOT:      ${JSON.stringify(got)}`,
      );
    }
  };
  checkField('shortDescription', source.content.shortDescription, reassembled.shortDescription);
  checkField('description', source.content.description, reassembled.description);
  checkField('requirements', source.content.requirements, reassembled.requirements);
  checkField('benefits', source.content.benefits, reassembled.benefits);
  checkField('requiredDocuments', source.content.requiredDocuments, reassembled.requiredDocuments);
}

if (roundTripErrors.length > 0) {
  console.error('=== Round-trip FAILED ===');
  console.error('Tokenization is lossy: rebuilt RU does not match original.');
  for (const err of roundTripErrors.slice(0, 20)) {
    console.error('  ✗ ' + err);
  }
  if (roundTripErrors.length > 20) {
    console.error(`  ... and ${roundTripErrors.length - 20} more`);
  }
  process.exit(1);
}

console.log(`✓ Round-trip OK (${vacancySources.length} sources rebuilt identically from clauses)`);

// === Generate vacancy-translations-source/<lang>.json ======================
const NON_RU_LANGS: readonly SupportedLanguage[] = SUPPORTED_LANGUAGES.filter((l) => l !== 'ru');

await mkdir(outDir, { recursive: true });

let totalAssembledFields = 0;
let totalEmptyStubs = 0;

/**
 * Per-source coverage: fraction of clause-IDs (across all assembled fields)
 * that are present in the lang dict (vs. falling back to RU). 0% means full
 * RU fallback (stub) — explicit and intentional. 100% means fully translated.
 * Anything in [1%, 50%] is the dangerous "partial translation" zone where
 * the source ships with mixed languages.
 */
type CoverageRow = {
  lang: SupportedLanguage;
  slug: string;
  translated: number;
  total: number;
  coverage: number;
};
const coverageStats: CoverageRow[] = [];

const collectClauseIds = (mapping: SourceMapping): string[] => [
  ...mapping.shortDescription.map(([id]) => id),
  ...mapping.description.map(([id]) => id),
  ...mapping.requirements.flat().map(([id]) => id),
  ...mapping.benefits.flat().map(([id]) => id),
  ...mapping.requiredDocuments.flat().map(([id]) => id),
];

for (const lang of NON_RU_LANGS) {
  const dictPath = resolve(clausesDir, `${lang}.json`);
  let dict: Record<string, string> = {};
  try {
    dict = JSON.parse(await readFile(dictPath, 'utf8')) as Record<string, string>;
  } catch {
    // missing file → treat as empty dict; all sources will fall back to RU
  }

  const out: Record<string, Partial<VacancyContent>> = {};
  for (const source of vacancySources) {
    const mapping = sourceToClauses[source.slug]!;
    const allIds = collectClauseIds(mapping);
    const total = allIds.length;
    const translated = allIds.reduce(
      (n, id) => (dict[id] !== undefined ? n + 1 : n),
      0,
    );
    const coverage = total > 0 ? translated / total : 0;
    coverageStats.push({ lang, slug: source.slug, translated, total, coverage });

    if (!hasAnyTranslation(mapping, dict)) {
      out[source.slug] = {};
      totalEmptyStubs += 1;
      continue;
    }
    out[source.slug] = {
      shortDescription: assembleString(mapping.shortDescription, dict),
      description: assembleString(mapping.description, dict),
      requirements: assembleArray(mapping.requirements, dict),
      benefits: assembleArray(mapping.benefits, dict),
      requiredDocuments: assembleArray(mapping.requiredDocuments, dict),
    };
    totalAssembledFields += 5;
  }

  // Sort by slug for stable diffs
  const sorted = Object.fromEntries(
    Object.entries(out).sort(([a], [b]) => a.localeCompare(b)),
  );
  await writeFile(
    resolve(outDir, `${lang}.json`),
    JSON.stringify(sorted, null, 2) + '\n',
    'utf8',
  );
}

console.log(
  `Assembled ${totalAssembledFields} translated fields ` +
    `(${totalEmptyStubs} stubs left as RU fallback) ` +
    `across ${NON_RU_LANGS.length} languages.`,
);

// === Per-source coverage summary ==========================================
// Buckets:
//   stub    — coverage 0%             (full RU fallback, intentional)
//   partial — coverage in (0%, 50%]   (dangerous: mixed-language output)
//   mid     — coverage in (50%, 100%) (acceptable but incomplete)
//   full    — coverage 100%
const PARTIAL_THRESHOLD = 0.5;
const stubRows = coverageStats.filter((r) => r.coverage === 0);
const partialRows = coverageStats.filter(
  (r) => r.coverage > 0 && r.coverage <= PARTIAL_THRESHOLD,
);
const midRows = coverageStats.filter(
  (r) => r.coverage > PARTIAL_THRESHOLD && r.coverage < 1,
);
const fullRows = coverageStats.filter((r) => r.coverage === 1);

console.log('\n=== Per-source coverage ===');
console.log(
  `  full=${fullRows.length}  mid=${midRows.length}  partial=${partialRows.length}  stub=${stubRows.length}  (total=${coverageStats.length})`,
);

// Print partial rows in full (these are the bad ones), then a sample of
// the rest sorted by lang+slug for spot-checking.
if (partialRows.length > 0) {
  console.log(`\n  Partial (coverage in (0%, ${PARTIAL_THRESHOLD * 100}%], DANGER):`);
  for (const r of partialRows.sort((a, b) => a.coverage - b.coverage)) {
    console.log(
      `    [${r.lang}] ${r.slug.padEnd(40)} ${(r.coverage * 100).toFixed(0).padStart(3)}%  ${r.translated}/${r.total}  partial`,
    );
  }
}

const sampleNonPartial = [...midRows, ...fullRows, ...stubRows]
  .sort((a, b) => (a.lang + a.slug).localeCompare(b.lang + b.slug))
  .slice(0, 8);
if (sampleNonPartial.length > 0) {
  console.log('\n  Sample (non-partial):');
  for (const r of sampleNonPartial) {
    const tag =
      r.coverage === 1 ? 'full' : r.coverage === 0 ? 'stub' : 'mid';
    console.log(
      `    [${r.lang}] ${r.slug.padEnd(40)} ${(r.coverage * 100).toFixed(0).padStart(3)}%  ${r.translated}/${r.total}  ${tag}`,
    );
  }
}

// === Missing-clause summary ===============================================
if (missingClauseIds.size > 0) {
  const sample = Array.from(missingClauseIds).slice(0, 5);
  console.error(
    `\nMissing-clause warning: ${missingClauseIds.size} unique clause id(s) missing from both lang dicts and ru-clauses.json.`,
  );
  console.error(`  Sample: ${sample.join(', ')}${missingClauseIds.size > 5 ? ', ...' : ''}`);
  console.error(
    "  Cause is usually a partial write of ru-clauses.json or stale source-to-clauses.json. Re-run 'npm run i18n:extract'.",
  );
}

// === Strict-mode enforcement ==============================================
if (STRICT_TRANSLATION_COVERAGE) {
  const strictFailures: string[] = [];
  if (partialRows.length > 0) {
    strictFailures.push(
      `${partialRows.length} source(s) have partial coverage in (0%, ${PARTIAL_THRESHOLD * 100}%]`,
    );
  }
  if (missingClauseIds.size > 0) {
    strictFailures.push(
      `${missingClauseIds.size} clause id(s) missing from both lang dicts and ru-clauses.json`,
    );
  }
  if (strictFailures.length > 0) {
    console.error(
      `\nSTRICT_TRANSLATION_COVERAGE=1 — failing build:\n  - ${strictFailures.join('\n  - ')}`,
    );
    process.exit(1);
  }
}

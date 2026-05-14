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

const ruClauses = JSON.parse(
  await readFile(resolve(i18nDir, 'ru-clauses.json'), 'utf8'),
) as Record<string, string>;
const sourceToClauses = JSON.parse(
  await readFile(resolve(i18nDir, 'source-to-clauses.json'), 'utf8'),
) as Record<string, SourceMapping>;

/** Look up a clause in a language dict, falling back to RU if missing. */
function lookupClause(id: string, dict: Record<string, string>): string {
  return dict[id] ?? ruClauses[id] ?? '';
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

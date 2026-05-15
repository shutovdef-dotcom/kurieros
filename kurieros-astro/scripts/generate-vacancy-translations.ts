import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildJobTranslationsBySource, vacancySources } from '../src/data/jobs';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../src/data/translations';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const publicOutputDir = resolve(rootDir, 'public/vacancy-translations');
const overridesDir = resolve(rootDir, 'src/data/vacancy-translations-source');

// === STRICT VALIDATION (Step 19) ===========================================
// Verify that every <lang>.json override file (uz, kk, …, zh) lists every
// VacancySource.slug as a key — even with an empty `{}` stub. This forces
// authors to be explicit about translation backlog and prevents silent
// gaps when a new vacancy is added without stubbing its translation slots.

const NON_RU_LANGS: readonly SupportedLanguage[] = SUPPORTED_LANGUAGES.filter(
  (lang) => lang !== 'ru',
);

const expectedSlugs = new Set(vacancySources.map((source) => source.slug));
const validationErrors: string[] = [];

for (const lang of NON_RU_LANGS) {
  const path = resolve(overridesDir, `${lang}.json`);
  let raw: string;
  try {
    raw = await readFile(path, 'utf8');
  } catch (err) {
    validationErrors.push(`MISSING override file: ${path}`);
    continue;
  }
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    validationErrors.push(`INVALID JSON in ${path}: ${msg}`);
    continue;
  }
  const presentSlugs = new Set(Object.keys(parsed));
  for (const slug of expectedSlugs) {
    if (!presentSlugs.has(slug)) {
      validationErrors.push(
        `MISSING slug "${slug}" in ${path} — add it as "${slug}": {} (empty stub) to mark as awaiting translation.`,
      );
    }
  }
  for (const extra of presentSlugs) {
    if (!expectedSlugs.has(extra)) {
      validationErrors.push(
        `UNKNOWN slug "${extra}" in ${path} — does not match any VacancySource. Remove or fix.`,
      );
    }
  }
}

if (validationErrors.length > 0) {
  console.error('=== vacancy-translations-source validation FAILED ===');
  for (const err of validationErrors) {
    console.error(`  ✗ ${err}`);
  }
  console.error('Strict slug coverage is required. Fix the issues above and re-run.');
  process.exit(1);
}

// === GENERATE PER-SOURCE FRAGMENTS (Step 16, TRANS-1) ======================
// Output layout:
//   <outputDir>/<lang>/<sourceSlug>.json   (one file per source × language)
// Old combined <lang>.json files are wiped beforehand.
//
// Compact format (M1): instead of duplicating identical fields across every
// entry of a source (typically 35/46 fields are byte-identical for all jobs
// from the same source × language — company name, requirements, benefits,
// docs, details_education, etc.), emit them ONCE in `defaults` and let the
// loader merge them into each entry at runtime:
//
//   { "defaults": { "company": "...", "req_0": "...", ... },
//     "entries":  { "100011": { "title": "...", "salary": "..." }, ... } }
//
// Loader reconstructs each entry as `{ ...defaults, ...entries[id] }` so
// downstream consumers see the same flat dict they always have.
// Yields ~70-90% raw JSON shrink on large fragments (Phase 2 measured 19,482
// KB → ~2,400 KB across a 16-fragment Moscow listing).

const translationsBySource = buildJobTranslationsBySource(vacancySources);

interface CompactFragment {
  defaults: Record<string, string>;
  entries: Record<string, Record<string, string>>;
}

/**
 * Compact a `{ jobId: { ...flatEntry } }` map into `{ defaults, entries }`.
 * A field becomes a default when ALL entries have it AND every entry's
 * value is identical. Otherwise it stays in `entries[jobId]`.
 *
 * For small fragments (1-2 entries) the compaction win is negligible but
 * still safe — we just promote every field to `defaults` since there is
 * no variance.
 */
const compactFragment = (
  jobs: Record<string, Record<string, string>>,
): CompactFragment => {
  const ids = Object.keys(jobs);
  if (ids.length === 0) {
    return { defaults: {}, entries: {} };
  }

  // Collect every field present in any entry, plus per-field {present-in-all,
  // unique-value} stats in a single pass.
  const fieldStats = new Map<
    string,
    { presenceCount: number; firstValue: string; allEqual: boolean }
  >();
  for (const id of ids) {
    const entry = jobs[id];
    for (const [key, value] of Object.entries(entry)) {
      const stat = fieldStats.get(key);
      if (!stat) {
        fieldStats.set(key, { presenceCount: 1, firstValue: value, allEqual: true });
      } else {
        stat.presenceCount += 1;
        if (stat.allEqual && stat.firstValue !== value) {
          stat.allEqual = false;
        }
      }
    }
  }

  const totalEntries = ids.length;
  const defaultKeys = new Set<string>();
  const defaults: Record<string, string> = {};
  for (const [key, stat] of fieldStats) {
    if (stat.presenceCount === totalEntries && stat.allEqual) {
      defaultKeys.add(key);
      defaults[key] = stat.firstValue;
    }
  }

  // Strip default keys from each entry — anything left is genuinely unique
  // (or absent from some entries, which is the same case from the consumer's
  // perspective: the merge `{...defaults, ...entries[id]}` still produces
  // the right shape).
  const entries: Record<string, Record<string, string>> = {};
  for (const id of ids) {
    const original = jobs[id];
    const stripped: Record<string, string> = {};
    for (const [key, value] of Object.entries(original)) {
      if (!defaultKeys.has(key)) {
        stripped[key] = value;
      }
    }
    entries[id] = stripped;
  }

  return { defaults, entries };
};

// Wipe output dir and recreate as empty (kills any stale combined
// <lang>.json or stale fragments from previous runs).
await rm(publicOutputDir, { recursive: true, force: true });
await mkdir(publicOutputDir, { recursive: true });

let fragmentCount = 0;
await Promise.all(
  SUPPORTED_LANGUAGES.map(async (language) => {
    const langPublicDir = resolve(publicOutputDir, language);
    await mkdir(langPublicDir, { recursive: true });

    const bySlug = translationsBySource[language] ?? {};
    await Promise.all(
      Object.entries(bySlug).map(async ([slug, jobs]) => {
        const compact = compactFragment(jobs as Record<string, Record<string, string>>);
        const body = `${JSON.stringify(compact)}\n`;
        await writeFile(resolve(langPublicDir, `${slug}.json`), body, 'utf8');
        fragmentCount += 1;
      }),
    );
  }),
);

console.log(
  `Generated ${fragmentCount} vacancy-translation fragments ` +
    `(${SUPPORTED_LANGUAGES.length} languages × ${vacancySources.length} sources, compact format).`,
);

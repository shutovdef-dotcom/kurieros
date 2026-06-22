import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildJobTranslationsBySource } from '../src/data/jobs';
import { vacancySources } from '../src/data/vacancies';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../src/data/translations';
import { buildRuntimeTranslationFragment } from '../src/utils/vacancyTranslationFragments';

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
// Compact delta format (M2): public fragments carry only fields that are both:
//   1. runtime-translated vacancy content (shortDescription, description,
//      req_*, ben_*, doc_*), and
//   2. different from the Russian DOM fallback already present in the page.
//
// Instead of duplicating identical translated fields across every entry of a
// source, emit them once in `defaults` and let the loader merge them into each
// entry at runtime:
//
//   { "defaults": { "company": "...", "req_0": "...", ... },
//     "entries":  { "100011": { "title": "...", "salary": "..." }, ... } }
//
// Repeated non-default field values are optionally dictionary-encoded in
// `dict`: `{ "details": ["..."], "entries": { "1": { "req_0": 0 } } }`.
// The loader reconstructs the same sparse per-job dictionaries before merging
// them into `translations[lang].vacancies`.

const translationsBySource = buildJobTranslationsBySource(vacancySources);
const russianBySource = translationsBySource.ru ?? {};

// Wipe output dir and recreate as empty (kills any stale combined
// <lang>.json or stale fragments from previous runs).
await rm(publicOutputDir, { recursive: true, force: true });
await mkdir(publicOutputDir, { recursive: true });

let fragmentCount = 0;
await Promise.all(
  NON_RU_LANGS.map(async (language) => {
    const langPublicDir = resolve(publicOutputDir, language);
    await mkdir(langPublicDir, { recursive: true });

    const bySlug = translationsBySource[language] ?? {};
    await Promise.all(
      Object.entries(bySlug).map(async ([slug, jobs]) => {
        const compact = buildRuntimeTranslationFragment(
          jobs,
          russianBySource[slug] ?? {},
        );
        const body = `${JSON.stringify(compact)}\n`;
        await writeFile(resolve(langPublicDir, `${slug}.json`), body, 'utf8');
        fragmentCount += 1;
      }),
    );
  }),
);

console.log(
  `Generated ${fragmentCount} vacancy-translation fragments ` +
    `(${NON_RU_LANGS.length} non-RU languages × ${vacancySources.length} sources, compact format).`,
);

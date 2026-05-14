import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildJobTranslationsBySource, vacancySources } from '../src/data/jobs';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../src/data/translations';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceOutputDir = resolve(rootDir, 'src/data/vacancy-translations');
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
    validationErrors.push(`INVALID JSON in ${path}: ${(err as Error).message}`);
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

const translationsBySource = buildJobTranslationsBySource(vacancySources);

// Wipe both output dirs and recreate as empty (kills any stale combined
// <lang>.json or stale fragments from previous runs).
await Promise.all([
  rm(sourceOutputDir, { recursive: true, force: true }),
  rm(publicOutputDir, { recursive: true, force: true }),
]);
await Promise.all([
  mkdir(sourceOutputDir, { recursive: true }),
  mkdir(publicOutputDir, { recursive: true }),
]);

let fragmentCount = 0;
await Promise.all(
  SUPPORTED_LANGUAGES.map(async (language) => {
    const langSourceDir = resolve(sourceOutputDir, language);
    const langPublicDir = resolve(publicOutputDir, language);
    await Promise.all([
      mkdir(langSourceDir, { recursive: true }),
      mkdir(langPublicDir, { recursive: true }),
    ]);

    const bySlug = translationsBySource[language] ?? {};
    await Promise.all(
      Object.entries(bySlug).map(async ([slug, jobs]) => {
        const body = `${JSON.stringify(jobs, null, 2)}\n`;
        await Promise.all([
          writeFile(resolve(langSourceDir, `${slug}.json`), body, 'utf8'),
          writeFile(resolve(langPublicDir, `${slug}.json`), body, 'utf8'),
        ]);
        fragmentCount += 1;
      }),
    );
  }),
);

console.log(
  `Generated ${fragmentCount} vacancy-translation fragments ` +
    `(${SUPPORTED_LANGUAGES.length} languages × ${vacancySources.length} sources).`,
);

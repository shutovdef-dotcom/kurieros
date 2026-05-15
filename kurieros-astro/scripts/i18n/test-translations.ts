/**
 * test-translations.ts
 *
 * Quality gate for translations. Two layers:
 *
 *   HARD CHECKS (per-clause × per-lang) — every violation fails the build:
 *     1. Placeholders preserved: every `{city}` / `{cityPrep}` in RU appears
 *        in the translation the same number of times.
 *     2. Abbreviations preserved: a fixed whitelist of Russian terms
 *        (РФ, ЕАЭС, СНГ, СНИЛС, ИНН, СТС, ПТС, ТК, ГПХ, ИП, РВП, ВНЖ).
 *        If present in RU, must be present in translation.
 *     3. Brands preserved: a fixed whitelist of brand names (Купер, Я.Про,
 *        Ozon, Ozon fresh, Бургер Кинг, Альфа-Банк, Т-Банк, Efin, Яндекс Еда).
 *     4. Numbers preserved: every digit-token in RU appears in translation.
 *     5. Length sanity: translation length ratio in [0.3×, 4×] of RU length.
 *     6. No empty translations after trim().
 *     7. No Cyrillic leakage in non-Cyrillic targets (vi, zh, hi): no run of
 *        4+ Cyrillic letters that aren't part of the abbreviations/brands
 *        whitelist.
 *
 *   SOFT SAMPLE (10 random vacancy × lang) — emits per-sample translation
 *     coverage and a self-graded score. Threshold: ≥9 of 10 must be
 *     "acceptable" (score ≥ 1). Below that, exit 1.
 */

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { vacancySources } from '../../src/data/vacancies';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../../src/data/translations';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const i18nDir = resolve(rootDir, 'src/data/i18n');
const clausesDir = resolve(i18nDir, 'clauses');

const ABBREVIATIONS = [
  'РФ', 'ЕАЭС', 'СНГ', 'СНИЛС', 'ИНН', 'СТС', 'ПТС', 'ТК', 'ГПХ', 'ИП', 'РВП', 'ВНЖ',
] as const;

/**
 * Brand variants: each brand has a canonical Russian form (used in RU
 * sources) plus accepted Latin transliterations for languages that don't
 * use Cyrillic script (uz, hy, az, hi, vi, zh). Test passes if ANY one
 * of the variants is present in the translation.
 */
const BRAND_VARIANTS: Record<string, string[]> = {
  'Купер': ['Купер', 'Kuper'],
  'Я.Про': ['Я.Про', 'Ya.Pro', 'Yа.Pro'],
  'Ozon fresh': ['Ozon fresh'],
  'Ozon': ['Ozon'],
  'Бургер Кинг': ['Бургер Кинг', 'Burger King'],
  'Альфа-Банк': ['Альфа-Банк', 'Alfa-Bank', 'Alpha Bank', 'Alfa Bank'],
  'Т-Банк': ['Т-Банк', 'T-Bank', 'T-Банк'],
  'Efin': ['Efin'],
  'Яндекс Еда': ['Яндекс Еда', 'Yandex Eda', 'Yandex Eats'],
};

/**
 * Cyrillic-script targets vs non-Cyrillic-script targets. The leakage
 * check (rule 7) only applies to non-Cyrillic targets, where any run of
 * 4+ Cyrillic letters is suspicious unless it's a known brand/abbreviation.
 * Modern Uzbek uses Latin script, so it's in the non-Cyrillic group.
 */
const NON_CYRILLIC_TARGETS: ReadonlySet<SupportedLanguage> = new Set([
  'uz', 'hy', 'az', 'hi', 'vi', 'zh',
]);

/**
 * Cyrillic tokens we tolerate in non-Cyrillic-target translations even
 * if their RU form leaks through (brand names, government-service names,
 * Russian-only terms with no clean Latin form).
 */
const ALLOWED_CYRILLIC_RUNS = new Set<string>([
  ...ABBREVIATIONS,
  ...Object.values(BRAND_VARIANTS).flat().flatMap((v) => v.split(/[\s\-.]+/)).filter(Boolean),
  'Госуслуги', 'Лавка', 'Плюс', 'Академия', 'Альфа', 'Банк', 'Бургер', 'Кинг',
  'Купер', 'Яндекс', 'Еда', 'Про',
]);

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

const langDicts: Partial<Record<SupportedLanguage, Record<string, string>>> = {};
for (const lang of SUPPORTED_LANGUAGES) {
  if (lang === 'ru') continue;
  try {
    langDicts[lang] = JSON.parse(
      await readFile(resolve(clausesDir, `${lang}.json`), 'utf8'),
    ) as Record<string, string>;
  } catch {
    langDicts[lang] = {};
  }
}

// === HARD CHECKS ===========================================================
type Failure = { lang: string; clauseId: string; rule: string; detail: string };
const failures: Failure[] = [];

const countPlaceholder = (s: string, ph: string): number => {
  let n = 0;
  let i = 0;
  while ((i = s.indexOf(ph, i)) !== -1) {
    n++;
    i += ph.length;
  }
  return n;
};

const extractDigitTokens = (s: string): string[] =>
  Array.from(s.matchAll(/\d+/g)).map((m) => m[0]);

const detectCyrillicLeakage = (s: string): string[] => {
  const runs = Array.from(s.matchAll(/[А-Яа-яЁё]{4,}/g)).map((m) => m[0]);
  return runs.filter((run) => !ALLOWED_CYRILLIC_RUNS.has(run));
};

for (const lang of Object.keys(langDicts) as SupportedLanguage[]) {
  const dict = langDicts[lang]!;
  for (const [id, translation] of Object.entries(dict)) {
    const ru = ruClauses[id];
    if (!ru) {
      failures.push({
        lang, clauseId: id, rule: 'orphan',
        detail: 'translation exists for clause id not in ru-clauses.json',
      });
      continue;
    }

    for (const ph of ['{city}', '{cityPrep}']) {
      const inRu = countPlaceholder(ru, ph);
      const inTr = countPlaceholder(translation, ph);
      if (inRu !== inTr) {
        failures.push({
          lang, clauseId: id, rule: `placeholder ${ph}`,
          detail: `RU has ${inRu}, translation has ${inTr}`,
        });
      }
    }

    for (const abbr of ABBREVIATIONS) {
      if (ru.includes(abbr) && !translation.includes(abbr)) {
        failures.push({
          lang, clauseId: id, rule: `abbreviation ${abbr}`,
          detail: 'present in RU, missing in translation',
        });
      }
    }

    for (const [canonical, variants] of Object.entries(BRAND_VARIANTS)) {
      if (ru.includes(canonical)) {
        const found = variants.some((v) => translation.includes(v));
        if (!found) {
          failures.push({
            lang, clauseId: id, rule: `brand ${canonical}`,
            detail: `present in RU, no variant found in translation (accepted: ${variants.join(', ')})`,
          });
        }
      }
    }

    const ruDigits = extractDigitTokens(ru);
    const trDigits = new Set(extractDigitTokens(translation));
    for (const d of ruDigits) {
      if (!trDigits.has(d)) {
        failures.push({
          lang, clauseId: id, rule: 'number',
          detail: `RU has number "${d}" missing from translation`,
        });
      }
    }

    // Length sanity: char-density-aware bounds. Chinese (zh) Han characters
    // pack ~3-4× more semantic content per character than Cyrillic, so its
    // natural length floor is much lower. Other languages stay at [0.3, 4.0].
    const [minRatio, maxRatio] = lang === 'zh' ? [0.12, 4.0] : [0.3, 4.0];
    const ratio = translation.length / Math.max(1, ru.length);
    if (ratio < minRatio || ratio > maxRatio) {
      failures.push({
        lang, clauseId: id, rule: 'length',
        detail: `ratio ${ratio.toFixed(2)} outside [${minRatio}, ${maxRatio}] (RU=${ru.length} ch, tr=${translation.length} ch)`,
      });
    }

    if (translation.trim() === '') {
      failures.push({
        lang, clauseId: id, rule: 'empty',
        detail: 'translation is empty after trim',
      });
    }

    if (NON_CYRILLIC_TARGETS.has(lang)) {
      const leaks = detectCyrillicLeakage(translation);
      if (leaks.length > 0) {
        failures.push({
          lang, clauseId: id, rule: 'cyrillic-leakage',
          detail: `unexpected Cyrillic words: ${leaks.slice(0, 3).join(', ')}`,
        });
      }
    }
  }
}

console.log('=== HARD CHECKS ===');
if (failures.length === 0) {
  console.log('✓ All translated clauses pass hard checks');
} else {
  console.log(`✗ ${failures.length} hard-check violation(s):`);
  for (const f of failures.slice(0, 30)) {
    const ruText = (ruClauses[f.clauseId] ?? '').slice(0, 60);
    const trText = (langDicts[f.lang as SupportedLanguage]?.[f.clauseId] ?? '').slice(0, 60);
    console.log(`  ✗ [${f.lang}] ${f.clauseId} ${f.rule}: ${f.detail}`);
    console.log(`      RU: "${ruText}"`);
    console.log(`      TR: "${trText}"`);
  }
  if (failures.length > 30) {
    console.log(`  ... and ${failures.length - 30} more`);
  }
}

// === SOFT SAMPLE (10 random vacancy × lang) ================================
console.log('\n=== SOFT SAMPLE (10 random vacancy × lang) ===');

function clauseId(text: string): string {
  return 'c_' + createHash('sha256').update(text, 'utf8').digest('hex').slice(0, 8);
}

function tokenize(s: string): string[] {
  return s.split(/(?<=[.;])\s+|\n+/)
    .map((x) => x.trim().replace(/[.;]+$/, ''))
    .filter(Boolean);
}

function pickSamples(seed: number, count: number): Array<{ slug: string; lang: SupportedLanguage }> {
  const langs = SUPPORTED_LANGUAGES.filter((l) => l !== 'ru') as SupportedLanguage[];
  const all: Array<{ slug: string; lang: SupportedLanguage }> = [];
  for (const source of vacancySources) {
    for (const lang of langs) all.push({ slug: source.slug, lang });
  }
  let s = seed | 0;
  const rng = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const shuffled = [...all];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

const samples = pickSamples(42, 10);
let acceptableCount = 0;

for (let idx = 0; idx < samples.length; idx++) {
  const { slug, lang } = samples[idx];
  const dict = langDicts[lang] ?? {};
  const source = vacancySources.find((s) => s.slug === slug)!;

  let translated = 0;
  let total = 0;
  const allClauses = [
    ...tokenize(source.content.shortDescription),
    ...tokenize(source.content.description),
    ...source.content.requirements.flatMap(tokenize),
    ...source.content.benefits.flatMap(tokenize),
    ...source.content.requiredDocuments.flatMap(tokenize),
  ];
  for (const ru of allClauses) {
    total += 1;
    if (dict[clauseId(ru)]) translated += 1;
  }

  const coverage = total > 0 ? translated / total : 0;
  const score = coverage < 0.1 ? 0 : coverage < 0.9 ? 1 : 2;
  if (score >= 1) acceptableCount += 1;

  console.log(
    `  #${(idx + 1).toString().padStart(2)}  ${lang.padEnd(2)}  ${slug.padEnd(35)}  ` +
      `${String(translated).padStart(3)}/${String(total).padStart(3)} clauses (${(coverage * 100).toFixed(0)}%)  score=${score}`,
  );
}

console.log(`\nAcceptable samples: ${acceptableCount}/10  (threshold: ≥9)`);

let exitCode = 0;
if (failures.length > 0) {
  console.error('\n✗ Hard checks failed.');
  exitCode = 1;
}
if (acceptableCount < 9) {
  console.error(`✗ Only ${acceptableCount}/10 samples acceptable (need ≥9).`);
  exitCode = 1;
}

if (exitCode === 0) {
  console.log('\n✓ All translation tests passed.');
} else {
  process.exit(exitCode);
}

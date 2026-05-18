#!/usr/bin/env tsx
/**
 * validate-translation-keys.ts
 *
 * Build-time guard that every `data-t` key referenced in any `.astro`
 * template resolves to a real entry in `translations.ru` (the shell-UI
 * dictionary). Catches typos that would otherwise silently fall back to
 * the inline RU text in the template — invisible until somebody actually
 * flips a language switcher and notices the missing key.
 *
 * Two extraction passes (audit v5 M9):
 *   1. STATIC `data-t="key"` — a plain double-quoted attribute.
 *   2. DYNAMIC `data-t={...}` — an expression attribute. Every plain
 *      string literal (`'…'` / `"…"`) found inside the braces is pulled
 *      out and validated, so a key emitted via
 *      `data-t={cond ? 'jobgrid.empty_title' : undefined}` is checked
 *      too. Pass 2 deliberately ignores backtick template literals
 *      (`data-t={`vacancies.${id}.title`}`) and bare identifiers
 *      (`data-t={fact.labelKey}`): those are computed per render and
 *      cannot be resolved to a single static key.
 *
 * Skipped category (intentionally not validated):
 *   - `vacancies.*` keys: runtime fragments hydrated from
 *     /vacancy-translations/<lang>/<slug>.json by BaseLayout, not part
 *     of the shell-UI dict.
 *
 * Wired into `npm run generate:data` after `i18n:test`. Exits non-zero
 * with a list of missing keys so the build fails fast.
 */
import { readFile } from 'node:fs/promises';
import { glob } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { translations } from '../src/data/translations';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const srcGlob = 'src/**/*.astro';

/** Pass 1 — static `data-t="key"` attributes. */
const DATA_T_STATIC_REGEX = /data-t="([^"${}]+)"/g;

/** Pass 2 — dynamic `data-t={ … }` expression attributes. */
const DATA_T_DYNAMIC_REGEX = /data-t=\{([^}]*)\}/g;

/**
 * Plain string literals — single- or double-quoted — inside an
 * expression. Backtick template literals are intentionally NOT matched:
 * they interpolate per render and cannot be resolved to a static key.
 */
const STRING_LITERAL_REGEX = /'([^'\n]*)'|"([^"\n]*)"/g;

/**
 * Extract every plain string-literal key from a dynamic `data-t={...}`
 * expression body. `data-t={cond ? 'a.b' : 'c.d'}` yields `['a.b','c.d']`;
 * `data-t={fact.labelKey}` (a bare identifier) yields `[]`.
 */
const extractDynamicKeys = (expression: string): string[] => {
  const keys: string[] = [];
  for (const match of expression.matchAll(STRING_LITERAL_REGEX)) {
    const literal = match[1] ?? match[2];
    // A real translation key is a dotted path of word chars; skip empty
    // strings and anything that is plainly not a key (e.g. a CSS class
    // accidentally sitting in the expression).
    if (literal && /^[\w.-]+$/.test(literal)) {
      keys.push(literal);
    }
  }
  return keys;
};

const resolveKey = (obj: unknown, path: string): unknown =>
  path
    .split('.')
    .reduce<unknown>(
      (acc, segment) =>
        acc != null && typeof acc === 'object'
          ? (acc as Record<string, unknown>)[segment]
          : undefined,
      obj,
    );

const main = async () => {
  const collected = new Map<string, Set<string>>();

  const record = (key: string, file: string): void => {
    const where = collected.get(key) ?? new Set<string>();
    where.add(file);
    collected.set(key, where);
  };

  for await (const file of glob(srcGlob, { cwd: rootDir })) {
    const absolutePath = resolve(rootDir, file);
    const content = await readFile(absolutePath, 'utf8');

    // Pass 1 — static `data-t="key"`.
    for (const match of content.matchAll(DATA_T_STATIC_REGEX)) {
      record(match[1], file);
    }

    // Pass 2 — dynamic `data-t={...}`: validate every plain string
    // literal inside the expression (audit v5 M9).
    for (const match of content.matchAll(DATA_T_DYNAMIC_REGEX)) {
      for (const key of extractDynamicKeys(match[1])) {
        record(key, file);
      }
    }
  }

  const missing: Array<{ key: string; files: string[] }> = [];
  for (const [key, files] of collected) {
    if (key.startsWith('vacancies.')) continue;
    if (resolveKey(translations.ru, key) === undefined) {
      missing.push({ key, files: [...files].sort() });
    }
  }

  if (missing.length > 0) {
    console.error(
      `\n[i18n:validate-keys] FAIL: ${missing.length} data-t keys are not present in translations.ru:`,
    );
    for (const { key, files } of missing.sort((a, b) => a.key.localeCompare(b.key))) {
      console.error(`  - ${key}`);
      for (const file of files) console.error(`      ${file}`);
    }
    console.error(
      `\nFix: add the key to src/data/translations/base.ts (or the matching per-feature file)\n` +
        `with the same RU text the template currently shows as fallback.\n`,
    );
    process.exit(1);
  }

  console.log(
    `[i18n:validate-keys] OK — all ${collected.size} data-t keys ` +
      `(static + dynamic) resolve in translations.ru.`,
  );
};

await main();

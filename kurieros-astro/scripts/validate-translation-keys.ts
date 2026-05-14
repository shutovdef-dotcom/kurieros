#!/usr/bin/env tsx
/**
 * validate-translation-keys.ts
 *
 * Build-time guard that every static `data-t="key"` referenced in any
 * `.astro` template resolves to a real entry in `translations.ru` (the
 * shell-UI dictionary). Catches typos that would otherwise silently fall
 * back to the inline RU text in the template — invisible until somebody
 * actually flips a language switcher and notices the missing key.
 *
 * Skipped categories (intentionally not validated):
 *   - `vacancies.*` keys: runtime fragments hydrated from
 *     /vacancy-translations/<lang>/<slug>.json by BaseLayout, not part
 *     of the shell-UI dict.
 *   - Dynamic `data-t={...}` (template literal) attrs: not matched by
 *     this scanner because keys are computed per render.
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

const DATA_T_REGEX = /data-t="([^"${}]+)"/g;

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

  for await (const file of glob(srcGlob, { cwd: rootDir })) {
    const absolutePath = resolve(rootDir, file);
    const content = await readFile(absolutePath, 'utf8');
    for (const match of content.matchAll(DATA_T_REGEX)) {
      const key = match[1];
      const where = collected.get(key) ?? new Set<string>();
      where.add(file);
      collected.set(key, where);
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
    `[i18n:validate-keys] OK — all ${collected.size} static data-t keys resolve in translations.ru.`,
  );
};

await main();

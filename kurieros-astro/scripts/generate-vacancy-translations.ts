import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildJobTranslations, vacancySources } from '../src/data/jobs';
import { SUPPORTED_LANGUAGES } from '../src/data/translations';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceOutputDir = resolve(rootDir, 'src/data/vacancy-translations');
const publicOutputDir = resolve(rootDir, 'public/vacancy-translations');
const translations = buildJobTranslations(vacancySources);

await Promise.all([
  mkdir(sourceOutputDir, { recursive: true }),
  mkdir(publicOutputDir, { recursive: true }),
]);

await Promise.all(
  SUPPORTED_LANGUAGES.map((language) =>
    Promise.all([
      writeFile(
        resolve(sourceOutputDir, `${language}.json`),
        `${JSON.stringify(translations[language] ?? {}, null, 2)}\n`,
        'utf8',
      ),
      writeFile(
        resolve(publicOutputDir, `${language}.json`),
        `${JSON.stringify(translations[language] ?? {}, null, 2)}\n`,
        'utf8',
      ),
    ]),
  ),
);

console.log(`Generated vacancy translations for ${SUPPORTED_LANGUAGES.length} languages.`);

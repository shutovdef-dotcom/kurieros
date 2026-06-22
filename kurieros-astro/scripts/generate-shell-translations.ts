import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { translations } from '../src/data/translations';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = resolve(rootDir, 'public', 'i18n');
const outputPath = resolve(outputDir, 'shell.json');

mkdirSync(outputDir, { recursive: true });
writeFileSync(
  outputPath,
  `${JSON.stringify({ ru: translations.ru }).replace(/</g, '\\u003c')}\n`,
);

console.log(`Wrote ${outputPath}`);

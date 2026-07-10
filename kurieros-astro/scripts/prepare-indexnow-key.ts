#!/usr/bin/env tsx
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const key = process.env.INDEXNOW_KEY;
if (!key || !/^[A-Za-z0-9-]{8,128}$/.test(key)) {
  throw new Error('INDEXNOW_KEY must be 8–128 letters, digits, or dashes.');
}

const outputPath = resolve(process.cwd(), 'public', `${key}.txt`);
await mkdir(resolve(process.cwd(), 'public'), { recursive: true });
await writeFile(outputPath, `${key}\n`, 'utf8');
console.log('✓ Prepared the IndexNow ownership key file for this deployment artifact.');

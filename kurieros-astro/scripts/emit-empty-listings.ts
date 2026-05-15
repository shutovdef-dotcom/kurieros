#!/usr/bin/env tsx
/**
 * Emits `public/empty-listings.json` — the cached list of full URLs that
 * @astrojs/sitemap should EXCLUDE because the underlying `/rabota-kurerom-{slug}/`
 * pages match zero active vacancies (thin-content protection).
 *
 * This script exists to decouple `astro.config.mjs` from the data layer.
 * Previously, the config imported `getEmptyListingUrls` directly, which
 * transitively pulled in `src/data/jobs.ts` and the 11 generated
 * `vacancy-translations-source/<lang>.json` files. That made `astro build`
 * and `astro dev` hard-fail with cryptic ENOENT errors when those JSONs
 * weren't present, instead of a clear "run npm run generate:data first".
 *
 * Now: `generate:data` runs this script as its final step, writing the
 * URL list to `public/empty-listings.json`. `astro.config.mjs` just reads
 * that JSON (synchronously, at module load) — no data-layer imports.
 *
 * Honors `SITE_URL` env var so the cached URLs match what astro.config
 * computes for `site` (default: `https://kurerok.ru`).
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getEmptyListingUrls } from '../src/utils/listingSlugs';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = resolve(rootDir, 'public/empty-listings.json');

const site = process.env.SITE_URL || 'https://kurerok.ru';

const urlSet = getEmptyListingUrls(site);
const urls = Array.from(urlSet).sort();

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, JSON.stringify(urls, null, 2) + '\n', 'utf8');

console.log(`✓ Wrote ${outputPath} (${urls.length} URLs, site=${site})`);

import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const site = process.env.SITE_URL || 'https://kurerok.ru';
const base = process.env.SITE_BASE || '/';

// Single timestamp captured ONCE at config load (not per-page during SSG).
// Astro evaluates each page's frontmatter independently across the 5793-page
// build; using `Date.now()` inside a layout produced a different `?v=` for
// every page, defeating the `force-cache` strategy (cross-page navigation
// kept missing the cache because URLs differed). Threading the value through
// `vite.define` gives every page the same compile-time constant — a redeploy
// still mints a fresh stamp (config re-evaluates), but in-build navigations
// reuse the same cached fragments. See PR #134 + follow-up fix.
const buildTimestamp = String(Date.now());

// Load the pre-computed list of `/rabota-kurerom-{slug}/` URLs that resolve
// to ZERO active vacancies. We exclude them from the sitemap (they also get
// `<meta name="robots" content="noindex, follow">` at the page level — see
// src/pages/[slug].astro). Avoids thin-content penalties from Google for
// Jobs and Yandex.
//
// PRIOR ART (M10): we used to import `getEmptyListingUrls` from
// `./src/utils/listingSlugs.ts`, which transitively pulled `src/data/jobs.ts`
// and the 11 generated `vacancy-translations-source/<lang>.json` files. That
// made `astro build` and `astro dev` hard-fail with cryptic ENOENT errors
// when those JSONs weren't present. Now `npm run generate:data` writes
// `public/empty-listings.json` (see scripts/emit-empty-listings.ts) and we
// just read it here — sync, no data-layer imports, fast cold start.
const __dirname = dirname(fileURLToPath(import.meta.url));
const emptyListingsPath = resolve(__dirname, 'public/empty-listings.json');

// Read failure handling (audit v3 M11): a *missing* file (ENOENT) is an
// acceptable degradation in local `astro dev` — warn and continue with an
// empty exclusion list. But a parse error (corrupt JSON) is a real bug,
// and so is ANY failure in a production/CI build — silently shipping
// thin-content `/rabota-kurerom-*/` pages into the sitemap is worse than
// a hard failure. In those cases re-throw so the build fails loudly.
let emptyListings = [];
try {
  emptyListings = JSON.parse(readFileSync(emptyListingsPath, 'utf8'));
} catch (err) {
  const isMissingFile = err && err.code === 'ENOENT';
  const isProductionBuild = Boolean(process.env.CI) || import.meta.env.PROD;
  if (!isMissingFile || isProductionBuild) {
    console.error(
      `\n✗ Failed to read ${emptyListingsPath}.\n` +
      `   ${isMissingFile ? 'File is missing' : 'File is unreadable or corrupt'} ` +
      `and this is a ${isProductionBuild ? 'production/CI' : 'parse-error'} build.\n` +
      `   Hint: Run 'npm run generate:data' before 'astro build'.\n`
    );
    throw err;
  }
  console.warn(
    `\n⚠️  ${emptyListingsPath} not found.\n` +
    `   Hint: Run 'npm run generate:data' before 'astro dev'.\n` +
    `   Continuing with empty exclusion list (sitemap may include URLs that should be excluded).\n`
  );
}
const emptyListingUrls = new Set(emptyListings);

export default defineConfig({
  site,
  base,
  output: 'static',
  compressHTML: true,

  build: {
    format: 'directory',
    inlineStylesheets: 'never'
  },

  vite: {
    build: {
      assetsInlineLimit: 0,
    },
    define: {
      __BUILD_TIMESTAMP__: JSON.stringify(buildTimestamp),
    },
  },

  trailingSlash: 'always',
  integrations: [
    sitemap({
      filter: (page) =>
        !page.includes('/designs/') &&
        !page.includes('/owner/') &&
        !page.includes('/admin/') &&
        !page.includes('/api/grid/') &&
        !page.includes('/api/grid-batch/') &&
        !page.includes('/api/company-vacancies/') &&
        !page.endsWith('.md') &&
        !page.match(/\/blog\/$/) &&
        !emptyListingUrls.has(page),
      changefreq: 'daily',
      lastmod: new Date(),
      // Split the ~5 460-URL catalogue (88 fresh Ozon offers added
      // in #50 pushed the total above 2 chunks of 2 500) into ~6
      // chunks of ≤1 000 URLs each — keeps every chunked sitemap
      // under ~350 KB so GSC / Yandex Webmaster can fetch and
      // re-process it on a single pass. The 17:00 МСК report flagged
      // the previous 915 KB sitemap as the likely root cause of the
      // «GSC Pages stuck 4 days» symptom (chunks larger than ~600 KB
      // tend to back-pressure Google's URL-inspection pipeline).
      entryLimit: 1000,
      serialize(item) {
        const url = item.url;
        const siteBase = site.replace(/\/$/, '');

        // Decision A: explicit priority overrides for the 8 new flywheel URLs.
        // Closed Set — no substring matching — so only these exact URLs are
        // matched; existing pages' priorities are never altered accidentally.
        const HUB_URLS = new Set([
          `${siteBase}/rabota-peshim-kurerom/`,
          `${siteBase}/rabota-avtokurerom/`,
          `${siteBase}/rabota-velokurerom/`,
          `${siteBase}/podrabotka-kurerom/`,
        ]);
        const GUIDE_URLS = new Set([
          `${siteBase}/skolko-zarabatyvaet-kurer/`,
          `${siteBase}/kak-stat-kurerom/`,
          `${siteBase}/usloviya-raboty-kurerom/`,
        ]);
        const OTZYVY_URL = `${siteBase}/otzyvy/`;

        if (HUB_URLS.has(url)) {
          return { ...item, priority: 0.8, changefreq: 'daily' };
        }
        if (GUIDE_URLS.has(url)) {
          return { ...item, priority: 0.7, changefreq: 'weekly' };
        }
        if (url === OTZYVY_URL) {
          return { ...item, priority: 0.6, changefreq: 'weekly' };
        }

        if (url === 'https://kurerok.ru/' || url.endsWith('://kurerok.ru/')) {
          return { ...item, priority: 1.0, changefreq: 'daily' };
        }
        if (url.includes('/v/')) {
          return { ...item, priority: 0.8, changefreq: 'daily' };
        }
        if (url.includes('/rabota-kurerom-')) {
          return { ...item, priority: 0.7, changefreq: 'daily' };
        }
        if (url.includes('/companies/')) {
          return { ...item, priority: 0.6, changefreq: 'weekly' };
        }
        if (url.includes('/guide/')) {
          return { ...item, priority: 0.6, changefreq: 'weekly' };
        }
        if (url.includes('/blog/')) {
          return { ...item, priority: 0.5, changefreq: 'weekly' };
        }
        if (url.includes('/cities/') || url.includes('/compare/') || url.includes('/calculator/')) {
          return { ...item, priority: 0.5, changefreq: 'weekly' };
        }
        return { ...item, priority: 0.3, changefreq: 'monthly' };
      }
    })
  ]
});

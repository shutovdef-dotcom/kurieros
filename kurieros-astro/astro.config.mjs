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
const vacancyIndexabilityPath = resolve(__dirname, 'src/generated/vacancy-indexability.json');
const companyIndexabilityPath = resolve(__dirname, 'public/company-indexability.json');
const sitemapFreshnessPath = resolve(__dirname, 'src/generated/sitemap-freshness.json');
const blogReleaseManifestPath = resolve(__dirname, 'src/generated/blog-release-manifest.json');
const isRealDateOnly = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};
const isRealIsoTimestamp = (value) =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
  !Number.isNaN(Date.parse(value));

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

let vacancyNoindexUrls = [];
try {
  const vacancyIndexability = JSON.parse(readFileSync(vacancyIndexabilityPath, 'utf8'));
  const siteBase = site.replace(/\/$/, '');
  vacancyNoindexUrls = Array.isArray(vacancyIndexability.noindexPaths)
    ? vacancyIndexability.noindexPaths.map((path) => `${siteBase}${path}`)
    : [];
} catch (err) {
  const isMissingFile = err && err.code === 'ENOENT';
  const isProductionBuild = Boolean(process.env.CI) || import.meta.env.PROD;
  if (!isMissingFile || isProductionBuild) {
    console.error(
      `\n✗ Failed to read ${vacancyIndexabilityPath}.\n` +
      `   ${isMissingFile ? 'File is missing' : 'File is unreadable or corrupt'} ` +
      `and this is a ${isProductionBuild ? 'production/CI' : 'parse-error'} build.\n` +
      `   Hint: Run 'npm run generate:data' before 'astro build'.\n`
    );
    throw err;
  }
  console.warn(
    `\n⚠️  ${vacancyIndexabilityPath} not found.\n` +
    `   Hint: Run 'npm run generate:data' before 'astro dev'.\n` +
    `   Continuing with empty vacancy noindex list.\n`
  );
}
const vacancyNoindexUrlSet = new Set(vacancyNoindexUrls);

let companyNoindexUrls = [];
try {
  const companyIndexability = JSON.parse(readFileSync(companyIndexabilityPath, 'utf8'));
  companyNoindexUrls = Array.isArray(companyIndexability.noindexUrls)
    ? companyIndexability.noindexUrls
    : [];
} catch (err) {
  const isMissingFile = err && err.code === 'ENOENT';
  const isProductionBuild = Boolean(process.env.CI) || import.meta.env.PROD;
  if (!isMissingFile || isProductionBuild) {
    console.error(
      `\n✗ Failed to read ${companyIndexabilityPath}.\n` +
      `   ${isMissingFile ? 'File is missing' : 'File is unreadable or corrupt'} ` +
      `and this is a ${isProductionBuild ? 'production/CI' : 'parse-error'} build.\n` +
      `   Hint: Run 'npm run generate:data' before 'astro build'.\n`
    );
    throw err;
  }
  console.warn(
    `\n⚠️  ${companyIndexabilityPath} not found.\n` +
    `   Hint: Run 'npm run generate:data' before 'astro dev'.\n` +
    `   Continuing with empty company noindex list.\n`
  );
}
const companyNoindexUrlSet = new Set(companyNoindexUrls);

let sitemapFreshnessEntries = {};
try {
  const sitemapFreshness = JSON.parse(readFileSync(sitemapFreshnessPath, 'utf8'));
  const entries = sitemapFreshness?.entries;
  if (
    sitemapFreshness?.schemaVersion !== 1 ||
    !entries ||
    typeof entries !== 'object' ||
    Array.isArray(entries) ||
    Object.entries(entries).some(
      ([path, date]) =>
        !path.startsWith('/') ||
        !path.endsWith('/') ||
        !isRealDateOnly(date),
    )
  ) {
    throw new Error('Invalid sitemap freshness manifest shape');
  }
  sitemapFreshnessEntries = entries;
} catch (err) {
  const isMissingFile = err && err.code === 'ENOENT';
  const isProductionBuild = Boolean(process.env.CI) || import.meta.env.PROD;
  if (!isMissingFile || isProductionBuild) {
    console.error(
      `\n✗ Failed to read ${sitemapFreshnessPath}.\n` +
      `   ${isMissingFile ? 'File is missing' : 'File is unreadable or corrupt'} ` +
      `and this is a ${isProductionBuild ? 'production/CI' : 'parse-error'} build.\n` +
      `   Hint: Run 'npm run emit:sitemap-freshness' before 'astro build'.\n`
    );
    throw err;
  }
  console.warn(
    `\n⚠️  ${sitemapFreshnessPath} not found.\n` +
    `   Hint: Run 'npm run emit:sitemap-freshness' before 'astro dev'.\n` +
    `   Continuing without sitemap lastmod values.\n`
  );
}

// Blog drafts are deliberately present in the repository well before their
// release slot. The sitemap must look only at the explicit release manifest,
// never at the content collection or at a nominal calendar date.
let hasPublishedBlog = false;
try {
  const blogReleaseManifest = JSON.parse(readFileSync(blogReleaseManifestPath, 'utf8'));
  const releases = blogReleaseManifest?.releases;
  const isValidRelease = (release, index) =>
    release &&
    release.sequence === index + 1 &&
    typeof release.slug === 'string' &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(release.slug) &&
    isRealIsoTimestamp(release.releasedAt) &&
    isRealIsoTimestamp(release.firstPublishedAt) &&
    (release.modifiedAt === undefined || isRealIsoTimestamp(release.modifiedAt));

  if (
    blogReleaseManifest?.schemaVersion !== 1 ||
    blogReleaseManifest?.timezone !== 'Europe/Moscow' ||
    !Array.isArray(releases) ||
    !releases.every(isValidRelease)
  ) {
    throw new Error('Invalid blog release manifest shape');
  }
  hasPublishedBlog = releases.length > 0;
} catch (err) {
  const isMissingFile = err && err.code === 'ENOENT';
  const isProductionBuild = Boolean(process.env.CI) || import.meta.env.PROD;
  if (!isMissingFile || isProductionBuild) {
    console.error(
      `\n✗ Failed to read ${blogReleaseManifestPath}.\n` +
      `   ${isMissingFile ? 'File is missing' : 'File is unreadable or corrupt'} ` +
      `and this is a ${isProductionBuild ? 'production/CI' : 'parse-error'} build.\n` +
      `   Hint: Run 'npm run emit:blog-release-manifest' before 'astro build'.\n`,
    );
    throw err;
  }
  console.warn(
    `\n⚠️  ${blogReleaseManifestPath} not found.\n` +
    `   Hint: Run 'npm run emit:blog-release-manifest' before 'astro dev'.\n` +
    `   Continuing with an unpublished blog.\n`,
  );
}

const pathnameOf = (url) => new URL(url).pathname;
const isCommercialHubPath = (pathname) =>
  [
    '/rabota-peshim-kurerom/',
    '/rabota-avtokurerom/',
    '/rabota-velokurerom/',
    '/podrabotka-kurerom/',
  ].includes(pathname);
const canonicalizedListingPaths = new Set([
  '/rabota-kurerom-peshkom/',
  '/rabota-kurerom-na-avto/',
  '/rabota-kurerom-na-velosipede/',
  '/rabota-kurerom-podrabotka/',
  '/rabota-kurerom-kuper/',
  '/rabota-kurerom-ozon/',
  '/rabota-kurerom-samokat/',
]);
const sitemapChunks = {
  vacancies: (item) => pathnameOf(item.url).startsWith('/v/') ? item : undefined,
  listings: (item) => {
    const pathname = pathnameOf(item.url);
    return pathname.startsWith('/rabota-kurerom-') ? item : undefined;
  },
  hubs: (item) => isCommercialHubPath(pathnameOf(item.url)) ? item : undefined,
  companies: (item) => pathnameOf(item.url).startsWith('/companies/') ? item : undefined,
  metro: (item) => pathnameOf(item.url).startsWith('/metro/') ? item : undefined,
  guides: (item) => {
    const pathname = pathnameOf(item.url);
    return pathname.startsWith('/guide/') ||
      [
        '/skolko-zarabatyvaet-kurer/',
        '/kak-stat-kurerom/',
        '/usloviya-raboty-kurerom/',
        '/otzyvy/',
      ].includes(pathname)
      ? item
      : undefined;
  },
  blog: (item) => {
    const pathname = pathnameOf(item.url);
    return pathname === '/blog/' || pathname.startsWith('/blog/') ? item : undefined;
  },
};

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
        !page.includes('/apply/') &&
        !page.includes('/api/grid/') &&
        !page.includes('/api/grid-batch/') &&
        !page.includes('/api/company-vacancies/') &&
        !page.includes('/api/') &&
        !page.endsWith('.md') &&
        !page.endsWith('.xml') &&
        (hasPublishedBlog || !page.match(/\/blog\/$/)) &&
        !emptyListingUrls.has(page) &&
        !vacancyNoindexUrlSet.has(page) &&
        !companyNoindexUrlSet.has(page) &&
        !canonicalizedListingPaths.has(pathnameOf(page)),
      changefreq: 'daily',
      // Split the ~5 460-URL catalogue (88 fresh Ozon offers added
      // in #50 pushed the total above 2 chunks of 2 500) into ~6
      // chunks of ≤1 000 URLs each — keeps every chunked sitemap
      // under ~350 KB so GSC / Yandex Webmaster can fetch and
      // re-process it on a single pass. The 17:00 МСК report flagged
      // the previous 915 KB sitemap as the likely root cause of the
      // «GSC Pages stuck 4 days» symptom (chunks larger than ~600 KB
      // tend to back-pressure Google's URL-inspection pipeline).
      entryLimit: 1000,
      chunks: sitemapChunks,
      serialize(item) {
        const url = item.url;
        const siteBase = site.replace(/\/$/, '');
        const contentUpdatedAt = sitemapFreshnessEntries[pathnameOf(url)];
        const serializedItem = contentUpdatedAt
          ? { ...item, lastmod: contentUpdatedAt }
          : item;

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
          return { ...serializedItem, priority: 0.8, changefreq: 'daily' };
        }
        if (GUIDE_URLS.has(url)) {
          return { ...serializedItem, priority: 0.7, changefreq: 'weekly' };
        }
        if (url === OTZYVY_URL) {
          return { ...serializedItem, priority: 0.6, changefreq: 'weekly' };
        }

        if (url === 'https://kurerok.ru/' || url.endsWith('://kurerok.ru/')) {
          return { ...serializedItem, priority: 1.0, changefreq: 'daily' };
        }
        if (url.includes('/v/')) {
          return { ...serializedItem, priority: 0.8, changefreq: 'daily' };
        }
        if (url.includes('/rabota-kurerom-')) {
          return { ...serializedItem, priority: 0.7, changefreq: 'daily' };
        }
        if (url.includes('/companies/')) {
          return { ...serializedItem, priority: 0.6, changefreq: 'weekly' };
        }
        if (url.includes('/guide/')) {
          return { ...serializedItem, priority: 0.6, changefreq: 'weekly' };
        }
        if (url.includes('/blog/')) {
          return { ...serializedItem, priority: 0.5, changefreq: 'weekly' };
        }
        if (url.includes('/cities/') || url.includes('/compare/') || url.includes('/calculator/')) {
          return { ...serializedItem, priority: 0.5, changefreq: 'weekly' };
        }
        return { ...serializedItem, priority: 0.3, changefreq: 'monthly' };
      }
    })
  ]
});

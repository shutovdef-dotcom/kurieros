import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { getEmptyListingUrls } from './src/utils/listingSlugs';

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

// Pre-compute the set of `/rabota-kurerom-{slug}/` URLs that resolve
// to ZERO active vacancies. We exclude them from the sitemap (they
// also get `<meta name="robots" content="noindex, follow">` at the
// page level — see src/pages/[slug].astro). Avoids thin-content
// penalties from Google for Jobs and Yandex.
const emptyListingUrls = getEmptyListingUrls(site);

export default defineConfig({
  site,
  base,
  output: 'static',
  compressHTML: true,

  build: {
    format: 'directory',
    inlineStylesheets: 'always'
  },

  vite: {
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

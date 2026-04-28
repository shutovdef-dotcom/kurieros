import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { getEmptyListingUrls } from './src/utils/listingSlugs';

const site = process.env.SITE_URL || 'https://kurerok.ru';
const base = process.env.SITE_BASE || '/';

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

  trailingSlash: 'always',
  integrations: [
    sitemap({
      filter: (page) =>
        !page.includes('/designs/') &&
        !page.includes('/owner/') &&
        !emptyListingUrls.has(page),
      changefreq: 'daily',
      lastmod: new Date(),
      // Split the ~5 370-URL catalogue into ~3 chunks so each chunked
      // sitemap stays small and quick for GSC / Yandex to fetch and
      // re-process — mitigates the «no referring sitemaps detected»
      // GSC URL-inspection symptom on individual vacancy URLs.
      entryLimit: 2500,
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

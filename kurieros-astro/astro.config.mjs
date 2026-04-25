import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const site = process.env.SITE_URL || 'https://kurerok.ru';
const base = process.env.SITE_BASE || '/';

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
      filter: (page) => !page.includes('/designs/') && !page.includes('/owner/'),
      changefreq: 'daily',
      lastmod: new Date(),
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

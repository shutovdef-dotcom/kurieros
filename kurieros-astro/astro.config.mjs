import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const site = process.env.SITE_URL || 'https://kyrieros.ru';
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
      filter: (page) => !page.includes('/designs/') && !page.includes('/owner/')
    })
  ]
});

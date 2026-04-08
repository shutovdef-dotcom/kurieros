import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://shutovdef-dotcom.github.io',
  base: '/kurieros',
  output: 'static',
  compressHTML: true,

  build: {
    format: 'directory',
    inlineStylesheets: 'always'
  },

  trailingSlash: 'always',
  integrations: [sitemap()]
});

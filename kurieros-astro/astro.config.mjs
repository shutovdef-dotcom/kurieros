import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://shutovdef-dotcom.github.io',
  base: '/kurieros',
  output: 'static',
  compressHTML: true,
  build: {
    format: 'directory', // This ensures clean URLs like /rabota-kurerom-moskva/
    inlineStylesheets: 'always'
  },
  trailingSlash: 'always'
});

import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://kurieros.ru',
  output: 'static',
  compressHTML: true,
  build: {
    format: 'directory', // This ensures clean URLs like /rabota-kurerom-moskva/
    inlineStylesheets: 'always'
  },
  trailingSlash: 'always'
});

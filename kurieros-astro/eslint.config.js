import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import astroPlugin from 'eslint-plugin-astro';
import astroParser from 'astro-eslint-parser';

const MAX_LINES_PER_FILE = 800;
const MAX_LINES_OPTIONS = {
  max: MAX_LINES_PER_FILE,
  skipBlankLines: true,
  skipComments: true,
};

export default [
  // Ignore generated, vendored, and dist directories
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '.astro/**',
      'public/vacancy-translations/**',
      // Generated translation dictionaries
      'src/data/i18n/clauses/**',
      'src/data/vacancy-translations-source/**',
      'src/data/i18n/ru-clauses.json',
      'src/data/i18n/source-to-clauses.json',
      // Data tables (long by nature, exempt from max-lines)
      'src/data/cities-dataset.ts',
      'src/data/ozonOffers.ts',
      // Noindex design lab pages intentionally keep several visual variants
      // in one file for side-by-side review.
      'src/pages/designs/**',
      // Vendored or large data JSONs
      'src/data/*.json',
      'tests/fixtures/**',
    ],
  },
  // TypeScript / JavaScript files
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.mjs'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      'max-lines': ['error', MAX_LINES_OPTIONS],
    },
  },
  // Astro components
  {
    files: ['**/*.astro'],
    languageOptions: {
      parser: astroParser,
      parserOptions: {
        parser: '@typescript-eslint/parser',
        extraFileExtensions: ['.astro'],
      },
    },
    plugins: {
      astro: astroPlugin,
    },
    rules: {
      'max-lines': ['error', MAX_LINES_OPTIONS],
    },
  },
  // Tests can be longer than production code (snapshot fixtures, etc.)
  {
    files: ['tests/**', '**/*.test.ts'],
    rules: {
      'max-lines': 'off',
    },
  },
];

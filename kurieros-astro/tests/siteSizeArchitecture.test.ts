import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(ROOT, '..');

const readProjectFile = (path: string): string =>
  readFileSync(join(PROJECT_ROOT, path), 'utf8');

describe('site-size architecture source guards', () => {
  it('generates shared shell translations as part of every data generation pass', () => {
    const packageJson = JSON.parse(readProjectFile('package.json')) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.['generate:shell-translations']).toBe(
      'tsx scripts/generate-shell-translations.ts',
    );
    expect(packageJson.scripts?.['generate:data']).toContain('npm:generate:shell-translations');
    expect(packageJson.scripts?.prebuild).toBe('npm run generate:data');
    expect(packageJson.scripts?.predev).toBe('npm run generate:data');
  });

  it('keeps host speed comparison available with a non-blocking Timeweb estimate', () => {
    const packageJson = JSON.parse(readProjectFile('package.json')) as {
      scripts?: Record<string, string>;
    };
    const source = readProjectFile('scripts/perf/compare-host-speed.mjs');

    expect(packageJson.scripts?.['perf:compare-hosts']).toBe(
      'node scripts/perf/compare-host-speed.mjs',
    );
    expect(source).toContain('https://kurerok.ru');
    expect(source).toContain('http://127.0.0.1:4323');
    expect(source).toContain("target: 'timeweb-estimate'");
    expect(source).toContain('TIMEWEB_TTFB_MS');
    expect(source).toContain('TIMEWEB_BANDWIDTH_MBPS');
    expect(source).toContain('TIMEWEB_COMPRESSION_RATIO');
    expect(source).toContain("row.target === 'local' && !row.summary?.ok");
  });

  it('keeps BaseLayout i18n config small and URL-driven', () => {
    const source = readProjectFile('src/layouts/BaseLayout.astro');

    expect(source).toMatch(
      /import\s+\{\s*SUPPORTED_LANGUAGES\s*\}\s+from\s+['"]\.\.\/data\/translations['"]/,
    );
    expect(source).not.toMatch(/\btranslations\s+as\b/);
    expect(source).not.toMatch(/import\s+\{[^}]*\btranslations\b[^}]*\}\s+from\s+['"]\.\.\/data\/translations['"]/);

    expect(source).toContain("const shellTranslationsUrl = '/i18n/shell.json';");
    expect(source).toContain("const vacancyTranslationsBase = '/vacancy-translations';");
    expect(source).toContain('shellTranslationsVersion: vacancyTranslationsVersion');
    expect(source).toContain('vacancyTranslationsVersion');
    expect(source).not.toMatch(/\btranslations,\s*\}\)\.replace/);
  });

  it('loads theme and owner analytics mute as shared bootstrap files', () => {
    const source = readProjectFile('src/layouts/BaseLayout.astro');

    expect(source).toContain('<script is:inline src="/bootstrap/theme-init.js"></script>');
    expect(source).toContain('<script is:inline src="/bootstrap/owner-mute.js"></script>');
    expect(source).not.toContain('document.body.dataset.colorMode = initialColorMode');
    expect(source).not.toContain("localStorage.setItem('kurerok-owner-mute'");
  });

  it('lazy-loads shell translations once, with build-versioned cache keys', () => {
    const source = readProjectFile('src/scripts/i18nRuntime.js');

    expect(source).toContain('let shellTranslationsPromise = null;');
    expect(source).toContain('function mergeShellTranslations(payload)');
    expect(source).toContain('async function ensureShellTranslations()');
    expect(source).toContain('shellTranslationsVersion');
    expect(source).toContain('fetch(url, { cache: \'force-cache\' })');
    expect(source).toContain('kurieros:shell-translations-load-failed');
    expect(source).toContain('await ensureShellTranslations();');
  });

  it('writes only Russian shell UI translations and escapes script-breaking text', () => {
    const source = readProjectFile('scripts/generate-shell-translations.ts');

    expect(source).toContain("const outputPath = resolve(outputDir, 'shell.json');");
    expect(source).toContain('JSON.stringify({ ru: translations.ru })');
    expect(source).toContain(".replace(/</g, '\\\\u003c')");
    expect(source).not.toContain('SUPPORTED_LANGUAGES');
  });
});

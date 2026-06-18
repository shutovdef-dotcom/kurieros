import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const readProjectFile = (path: string): string =>
  readFileSync(join(ROOT, path), 'utf8');

describe('code health gates', () => {
  it('enforces the documented 80% coverage floor in Vitest config', () => {
    const config = readProjectFile('vitest.config.ts');

    for (const metric of ['branches', 'functions', 'lines', 'statements']) {
      expect(config, `${metric} coverage threshold`).toContain(`${metric}: 80`);
    }
  });

  it('keeps a single pre-release verification entrypoint wired', () => {
    const packageJson = JSON.parse(readProjectFile('package.json')) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts.check).toContain('npm run lint');
    expect(packageJson.scripts.check).toContain('npm run typecheck');
    expect(packageJson.scripts.check).toContain('npm run test:coverage');
    expect(packageJson.scripts.check).toContain('npm run check:worker');
    expect(packageJson.scripts['check:perf']).toContain('bench:city-neighbours');
    expect(packageJson.scripts['check:release']).toContain('npm run build');
    expect(packageJson.scripts['check:release']).toContain('npm run check');
    expect(packageJson.scripts['check:release']).toContain('npm run check:perf');
    expect(packageJson.scripts['check:release']).toContain('git diff --check');
  });

  it('keeps max-lines exceptions explicit and narrow', () => {
    const jobGrid = readProjectFile('src/components/JobGrid.astro');
    const jobGridController = readProjectFile('src/scripts/jobGridController.js');
    const baseLayout = readProjectFile('src/layouts/BaseLayout.astro');
    const i18nRuntime = readProjectFile('src/scripts/i18nRuntime.js');
    const regionDetector = readProjectFile('src/scripts/regionDetector.js');

    expect(jobGrid).not.toContain('eslint-disable max-lines');
    expect(jobGrid).toContain("import '../scripts/jobGridController.js'");
    expect(jobGridController).toContain('kurieros:city-selected');
    expect(jobGridController).toContain('revealMoreJobs');
    expect(baseLayout).not.toContain('eslint-disable max-lines');
    expect(baseLayout.split(/\r?\n/).length).toBeLessThan(450);
    expect(baseLayout).toContain("import '../scripts/i18nRuntime.js'");
    expect(baseLayout).toContain("import '../scripts/regionDetector.js'");
    expect(baseLayout).not.toContain('https://ipapi.co/json/');
    expect(baseLayout).not.toContain('window.kurieros_i18n =');
    expect(i18nRuntime).toContain('window.kurieros_i18n =');
    expect(i18nRuntime).toContain('kurieros:fragment-load-failed');
    expect(i18nRuntime).toContain('kurieros:lang-change');
    expect(regionDetector).toContain('window.kurieros_user = data');
    expect(regionDetector).toContain('kurieros:region-detected');
  });
});

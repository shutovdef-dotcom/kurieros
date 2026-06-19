import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  auditDist,
  checkBudgets,
  formatBytes,
} from '../scripts/dist-size-audit.mjs';

const tmpRoots: string[] = [];

function makeDistFixture() {
  const root = mkdtempSync(join(tmpdir(), 'kurieros-dist-audit-'));
  tmpRoots.push(root);

  mkdirSync(join(root, 'v', 'sample-vacancy'), { recursive: true });
  mkdirSync(join(root, 'api', 'grid-batch', 'listing', '2'), { recursive: true });
  mkdirSync(join(root, 'vacancy-translations', 'uz'), { recursive: true });
  mkdirSync(join(root, '_astro'), { recursive: true });

  const repeatedController = "window.__sampleController = (window.__sampleController || 0) + 1;";
  const vacancyHtml = `<!doctype html>
    <html>
      <head>
        <script type="application/ld+json">{"@type":"JobPosting"}</script>
        <script id="kurieros-i18n-config" type="application/json">{"lang":"ru"}</script>
        <script>${repeatedController}</script>
        <style>.inline { color: red; }</style>
      </head>
      <body>Vacancy</body>
    </html>`;
  const listingHtml = `<!doctype html><div><script>${repeatedController}</script>Listing</div>`;

  writeFileSync(join(root, 'v', 'sample-vacancy', 'index.html'), vacancyHtml);
  writeFileSync(join(root, 'api', 'grid-batch', 'listing', '2', 'index.html'), listingHtml);
  writeFileSync(join(root, 'vacancy-translations', 'uz', 'sample.json'), '{"defaults":{},"entries":{}}');
  writeFileSync(join(root, '_astro', 'app.abc123.js'), 'console.log("shared");');

  return { root, repeatedController };
}

afterEach(() => {
  while (tmpRoots.length > 0) {
    const root = tmpRoots.pop();
    if (root) rmSync(root, { recursive: true, force: true });
  }
});

describe('dist-size audit', () => {
  it('separates executable inline JS from inline JSON data and JSON-LD', () => {
    const { root, repeatedController } = makeDistFixture();
    const report = auditDist(root);
    const repeatedControllerBytes = Buffer.byteLength(repeatedController);

    expect(report.html.count).toBe(2);
    expect(report.groups.vacancyPages.count).toBe(1);
    expect(report.groups.apiGridBatch.count).toBe(1);
    expect(report.groups.vacancyTranslations.bytes).toBeGreaterThan(0);
    const topLevel = report.topLevel as Record<string, number>;
    expect(topLevel.v).toBeGreaterThan(0);
    expect(topLevel.api).toBeGreaterThan(0);
    expect(topLevel['_astro']).toBeGreaterThan(0);

    expect(report.html.executableInlineScriptBytes).toBe(repeatedControllerBytes * 2);
    expect(report.html.inlineJsonBytes).toBe(Buffer.byteLength('{"lang":"ru"}'));
    expect(report.html.jsonLdBytes).toBe(Buffer.byteLength('{"@type":"JobPosting"}'));
    expect(report.inlineExecutableDuplicates.repeatedBytes).toBe(repeatedControllerBytes * 2);
    expect(report.inlineExecutableDuplicates.duplicateWasteBytes).toBe(repeatedControllerBytes);
  });

  it('checks explicit budgets and reports all failing paths', () => {
    const { root } = makeDistFixture();
    const report = auditDist(root);
    const budget = {
      totalBytes: 1,
      topLevelBytes: {
        v: 1,
        'api/grid-batch': 1,
      },
      html: {
        executableInlineScriptBytes: 1,
        inlineJsonBytes: 1,
      },
    };

    const result = checkBudgets(report, budget);

    expect(result.ok).toBe(false);
    expect(result.failures.map((failure) => failure.path)).toEqual([
      'totalBytes',
      'topLevel.v',
      'topLevel.api/grid-batch',
      'html.executableInlineScriptBytes',
      'html.inlineJsonBytes',
    ]);
  });

  it('formats bytes for human-readable release logs', () => {
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1024 * 1024)).toBe('1.0 MB');
  });
});

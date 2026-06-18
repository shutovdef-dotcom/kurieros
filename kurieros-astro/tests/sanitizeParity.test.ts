/**
 * Static-source guard for JobGrid sanitizer wiring.
 *
 * The JobGrid controller used to carry a hand-copied sanitizer twin while
 * it lived as an inline Astro script. Now that the controller is a bundled
 * module, it must import the single canonical implementation from
 * `src/scripts/sanitize.js`.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const CONTROLLER_SOURCE = readFileSync(
  join(ROOT, '..', 'src', 'scripts', 'jobGridController.js'),
  'utf8',
);

describe('JobGrid controller sanitizer wiring', () => {
  it('imports the canonical sanitizer module', () => {
    expect(CONTROLLER_SOURCE).toContain(
      "import { stripEventHandlers } from './sanitize.js';",
    );
  });

  it('does not reintroduce a copied sanitizer implementation', () => {
    expect(CONTROLLER_SOURCE).not.toContain('const DANGEROUS_TAGS');
    expect(CONTROLLER_SOURCE).not.toContain('const URL_ATTRIBUTES');
    expect(CONTROLLER_SOURCE).not.toContain('function sanitizeSubtree');
    expect(CONTROLLER_SOURCE).not.toContain('function stripDangerousUrls');
  });

  it('still sanitizes every fetched or templated card before insertion', () => {
    expect(CONTROLLER_SOURCE).toContain('stripEventHandlers(cloned)');
    expect(CONTROLLER_SOURCE.match(/stripEventHandlers\(cloned\)/g) ?? [])
      .toHaveLength(3);
  });
});

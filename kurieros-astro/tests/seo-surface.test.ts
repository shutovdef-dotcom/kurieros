import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(ROOT, '..');

describe('SEO surface contracts', () => {
  it('keeps markdown guide mirrors out of the primary search index', () => {
    const routeSource = readFileSync(
      join(PROJECT_ROOT, 'src', 'pages', 'guide', '[topic].md.ts'),
      'utf8',
    );

    expect(routeSource).toContain("'X-Robots-Tag': 'noindex, follow'");
  });
});

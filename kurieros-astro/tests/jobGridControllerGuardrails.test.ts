import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(join(ROOT, 'src', 'scripts', 'jobGridController.js'), 'utf8');

describe('jobGridController guardrails', () => {
  it('binds compare buttons idempotently after dynamic grid updates', () => {
    expect(source).toContain('data-compare-bound');
    expect(source).toContain("btn.dataset.compareBound = 'true'");
  });

  it('does not require a full-page data-available-job-ids blob to normalize compare state', () => {
    expect(source).not.toContain('availableJobIds');
    expect(source).not.toContain('availableJobIdSet');
    expect(source).toContain('normalizeCompareList');
  });

  it('re-applies current i18n after city swaps and reveal-more inserts', () => {
    expect(source).toContain('ensureVacancyTranslations');
    expect(source).toContain('applyTranslations');
    expect(source).toContain('refreshDynamicGrid');
  });

  it('surfaces batch load failures instead of silently filtering a partial grid', () => {
    expect(source).toContain('batch-fetch-error');
    expect(source).toContain('showBatchFetchError');
    expect(source).toContain('overflowLoadFailed');
  });
});

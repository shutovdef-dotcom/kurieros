import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const workflowPath = join(repositoryRoot, '.github', 'workflows', 'google-indexing.yml');
const workflow = readFileSync(workflowPath, 'utf8');

test('persists a same-Moscow-date success lock before a delayed schedule can submit again', () => {
  const restoreIndex = workflow.indexOf('actions/cache/restore@v4');
  const duplicateIndex = workflow.indexOf('Skip duplicate successful carousel for the same Moscow date');
  const submitIndex = workflow.indexOf('Submit 200 live JobPosting URLs to Google');
  const saveIndex = workflow.indexOf('actions/cache/save@v4');

  assert.ok(restoreIndex >= 0, 'workflow must restore a date-scoped success cache');
  assert.ok(restoreIndex < duplicateIndex, 'cache lookup must happen before duplicate detection');
  assert.match(workflow, /key:\s*google-indexing-success-\$\{\{ steps\.params\.outputs\.date \}\}/);
  assert.match(workflow, /lookup-only:\s*true/);
  assert.match(workflow, /CACHE_HIT:\s*\$\{\{ steps\.success-cache\.outputs\.cache-hit \}\}/);
  assert.match(workflow, /if \[ "\$CACHE_HIT" = "true" \]; then[\s\S]*?echo "skip=true"/);
  assert.ok(saveIndex > submitIndex, 'success cache must only be saved after the submit step');
  assert.match(workflow, /if:\s*success\(\) && steps\.duplicate\.outputs\.skip != 'true'/);
});

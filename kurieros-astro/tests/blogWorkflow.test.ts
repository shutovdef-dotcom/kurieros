import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const workflowPath = join(projectRoot, '..', '.github', 'workflows', 'deploy-timeweb.yml');
const workflowText = readFileSync(workflowPath, 'utf8');
const workflow = parse(workflowText) as {
  on?: { schedule?: Array<{ cron?: string }> };
  jobs?: Record<string, unknown>;
};

describe('scheduled blog release workflow', () => {
  it('is syntactically parseable and wakes at the documented Moscow release window', () => {
    expect(workflow.on?.schedule).toEqual([{ cron: '5 6 * * *' }]);
    expect(workflow.jobs).toHaveProperty('build');
    expect(workflow.jobs).toHaveProperty('record-blog-release');
  });

  it('is disabled by default and requires both explicit release switches', () => {
    expect(workflowText).toContain("vars.BLOG_SCHEDULE_ENABLED == 'true'");
    expect(workflowText).toContain("vars.CONTENT_SCHEDULE_PAUSED == 'false'");
    expect(workflowText).toContain('CONTENT_SCHEDULE_PAUSED=false');
  });

  it('reconciles a production manifest and records a ledger only after deployment', () => {
    expect(workflowText).toContain('sync-production-manifest');
    expect(workflowText).toContain("needs.deploy.result == 'success'");
    expect(workflowText).toContain('src/data/blog-release-ledger.json');
    expect(workflowText).toContain("[blog-ledger]");
    expect(workflowText).toContain('always() && github.event_name == \'schedule\'');
  });

  it('only wires Yandex-compatible IndexNow for one deployed URL, never Google Indexing API', () => {
    expect(workflowText).toContain('npm run indexnow:submit -- "https://kurerok.ru/blog/');
    expect(workflowText).toContain("vars.BLOG_INDEXNOW_ENABLED == 'true'");
    expect(workflowText).not.toMatch(/indexing\.googleapis\.com|google.*indexing.*api/i);
  });
});

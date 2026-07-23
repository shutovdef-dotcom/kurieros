import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const workflowPath = join(projectRoot, '..', '.github', 'workflows', 'deploy-timeweb.yml');
const legacyPagesWorkflowPath = join(projectRoot, '..', '.github', 'workflows', 'deploy.yml');
const manifestEmitterPath = join(projectRoot, 'scripts', 'emit-blog-release-manifest.ts');
const workflowText = readFileSync(workflowPath, 'utf8');
const manifestEmitterText = readFileSync(manifestEmitterPath, 'utf8');
const workflow = parse(workflowText) as {
  on?: { schedule?: Array<{ cron?: string }> };
  jobs?: Record<string, unknown>;
};

describe('scheduled blog release workflow', () => {
  it('is syntactically parseable and wakes at the documented Moscow release windows', () => {
    expect(workflow.on?.schedule).toEqual([{ cron: '5 6,9,12,15 * * *' }]);
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
    expect(workflowText).toContain('npm run seo:audit');
    expect(workflowText).toContain('BLOG_RELEASE_EXPECTED_CANDIDATE_JSON');
    expect(workflowText).toContain('--allow-missing-remote-if-local-empty');
  });

  it('only wires Yandex-compatible IndexNow for one deployed URL, never Google Indexing API', () => {
    expect(workflowText).toContain('npm run indexnow:submit -- "https://kurerok.ru/blog/');
    expect(workflowText).toContain("vars.BLOG_INDEXNOW_ENABLED == 'true'");
    expect(workflowText).not.toMatch(/indexing\.googleapis\.com|google.*indexing.*api/i);
  });

  it('does not leave a second GitHub Pages deploy or bulk IndexNow path able to bypass the cursor', () => {
    expect(existsSync(legacyPagesWorkflowPath)).toBe(false);
    expect(workflowText).not.toMatch(/urlList:\s*\(/);
  });

  it('only accepts a transient candidate in the scheduled build context and requires archive-safe production deployment', () => {
    expect(manifestEmitterText).toContain("BLOG_RELEASE_ALLOW_CANDIDATE !== 'true'");
    expect(workflowText).toContain('BLOG_RELEASE_ALLOW_CANDIDATE');
    expect(workflowText).toContain("TIMEWEB_DEPLOY_METHOD\" = 'archive'");
    expect(workflowText).toContain("TIMEWEB_DEPLOY_METHOD\" = 'ssh-archive'");
    expect(workflowText).toContain('--blog-release-stamp-old');
    expect(workflowText).toContain('--blog-release-stamp-slug');
    expect(workflowText).toContain('name: timeweb-production');
  });
});

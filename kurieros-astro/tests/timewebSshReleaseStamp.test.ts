import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const deployScript = readFileSync(join(projectRoot, 'scripts', 'timeweb-ssh-archive-deploy.sh'), 'utf8');

describe('Timeweb SSH blog release timestamp stamping', () => {
  it('accepts a paired, validated release reservation and stamps staging before promotion', () => {
    expect(deployScript).toContain('--blog-release-stamp-old');
    expect(deployScript).toContain('--blog-release-stamp-slug');
    expect(deployScript).toContain('Invalid --blog-release-stamp-old ISO timestamp');
    expect(deployScript).toContain('tar -xzf "$REMOTE_ARCHIVE" -C "$REMOTE_STAGING"');
    expect(deployScript.indexOf('tar -xzf "$REMOTE_ARCHIVE" -C "$REMOTE_STAGING"'))
      .toBeLessThan(deployScript.indexOf('Stamped blog publication at'));
    expect(deployScript.indexOf('Stamped blog publication at'))
      .toBeLessThan(deployScript.indexOf('find "$REMOTE_ROOT" -mindepth 1 -maxdepth 1'));
  });

  it('updates every time-bearing public representation and rejects an unfinished provisional timestamp', () => {
    expect(deployScript).toContain('api/blog-release-manifest.json');
    expect(deployScript).toContain('blog/$BLOG_RELEASE_STAMP_SLUG/index.html');
    expect(deployScript).toContain('blog/rss.xml');
    expect(deployScript).toContain('Provisional blog timestamp remained after production stamp');
    expect(deployScript).toContain('TZ=Europe/Moscow');
  });
});

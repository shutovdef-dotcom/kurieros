#!/usr/bin/env tsx
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import calendarJson from '../src/data/blog-calendar.json';
import { BLOG_RELEASE_EVIDENCE } from '../src/utils/blogReleaseEvidence';
import { BLOG_SOURCE_REGISTRY } from '../src/utils/blogSourceRegistry';
import {
  createBlogReleaseCandidate,
  planVerifiedBlogRelease,
  type BlogReleaseSourceBrief,
} from '../src/utils/blogReleaseOrchestrator';
import { buildBlogReleaseManifest } from '../src/utils/blogReleaseManifest';
import {
  isSameBlogReleaseReservation,
  reconcileBlogReleaseLedgers,
  validateBlogReleaseLedger,
  type BlogReleaseLedger,
  type BlogReleaseRecord,
} from '../src/utils/blogRelease';
import type { BlogCalendarContentContract } from '../src/utils/blogContent';
import { loadBlogContentDocuments } from './blog-content';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ledgerPath = resolve(rootDir, 'src/data/blog-release-ledger.json');
const manifestPath = resolve(rootDir, 'src/generated/blog-release-manifest.json');
const contentDirectory = resolve(rootDir, 'src/content/blog');
const candidatePath = process.env.BLOG_RELEASE_CANDIDATE_PATH
  ? resolve(process.cwd(), process.env.BLOG_RELEASE_CANDIDATE_PATH)
  : resolve(rootDir, 'src/generated/blog-release-candidate.json');

type CalendarEntry = BlogCalendarContentContract & {
  nominalPublishAt: string;
  sourceGate?: { required: boolean; kind?: string };
  researchGate?: { required: boolean; minimumEvidence?: string };
};

const calendar = calendarJson.entries as CalendarEntry[];
const sourceBriefs = BLOG_SOURCE_REGISTRY.articleSources as BlogReleaseSourceBrief[];
const readJson = async <T>(path: string): Promise<T> => JSON.parse(await readFile(path, 'utf8')) as T;
const writeJson = async (path: string, value: unknown): Promise<void> => {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const args = process.argv.slice(2);
const command = args.find((value) => !value.startsWith('--')) ?? 'plan';
const option = (name: string): string | undefined => {
  const prefix = `--${name}=`;
  return args.find((value) => value.startsWith(prefix))?.slice(prefix.length);
};
const hasFlag = (name: string): boolean => args.includes(`--${name}`);

const requireNow = (): string => {
  const value = option('now') ?? process.env.BLOG_RELEASE_NOW;
  if (!value) {
    throw new Error('Set --now=<ISO timestamp> or BLOG_RELEASE_NOW; the release tool never reads the clock itself.');
  }
  return value;
};

const writeGithubOutput = async (values: Record<string, string>): Promise<void> => {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) return;
  await writeFile(outputPath, Object.entries(values).map(([key, value]) => `${key}=${value}\n`).join(''), { flag: 'a' });
};

const printPlan = (result: ReturnType<typeof planVerifiedBlogRelease>): void => {
  console.log(JSON.stringify({
    audit: { ok: result.audit.ok, issues: result.audit.issues },
    evidenceReasonsBySlug: result.evidenceReasonsBySlug,
    plan: result.plan,
  }, null, 2));
};

const plan = async () => {
  const now = requireNow();
  const documents = await loadBlogContentDocuments(contentDirectory);
  const ledger = await readJson<BlogReleaseLedger>(ledgerPath);
  return planVerifiedBlogRelease({
    calendar,
    sourceBriefs,
    documents,
    evidence: BLOG_RELEASE_EVIDENCE,
    ledger,
    now,
    scheduleEnabled: process.env.BLOG_SCHEDULE_ENABLED === 'true',
    // Default paused is fail-closed. Only a literal false opens the switch.
    paused: process.env.CONTENT_SCHEDULE_PAUSED !== 'false',
  });
};

const prepare = async () => {
  const now = requireNow();
  const result = await plan();
  if (!result.audit.ok) {
    printPlan(result);
    throw new Error('Blog editorial corpus is invalid; refusing to prepare a release candidate.');
  }
  if (!result.plan.eligible) {
    printPlan(result);
    await writeGithubOutput({
      has_candidate: 'false',
      reason: result.plan.reasons.join(','),
    });
    return;
  }

  const deploySha = option('deploy-sha') ?? process.env.BLOG_RELEASE_DEPLOY_SHA ?? process.env.GITHUB_SHA;
  if (!deploySha) {
    throw new Error('Set --deploy-sha=<commit SHA>, BLOG_RELEASE_DEPLOY_SHA or GITHUB_SHA.');
  }
  const candidate = createBlogReleaseCandidate(result, now, deploySha);
  // Validate it against the durable cursor before touching a candidate file.
  const ledger = await readJson<BlogReleaseLedger>(ledgerPath);
  buildBlogReleaseManifest(calendar, ledger, candidate);
  await writeJson(candidatePath, { schemaVersion: 1, preparedAt: now, release: candidate });
  console.log(`✓ Prepared exactly one blog release candidate: ${candidate.sequence} ${candidate.slug}`);
  await writeGithubOutput({
    has_candidate: 'true',
    slug: candidate.slug,
    sequence: String(candidate.sequence),
    candidate_path: candidatePath,
    candidate_json: JSON.stringify(candidate),
    released_at: candidate.releasedAt,
  });
};

const syncProductionManifest = async () => {
  const remoteUrl = option('remote-manifest-url') ?? process.env.BLOG_RELEASE_REMOTE_MANIFEST_URL;
  if (!remoteUrl) {
    throw new Error('Set --remote-manifest-url=<https URL> or BLOG_RELEASE_REMOTE_MANIFEST_URL.');
  }
  const remote = new URL(remoteUrl);
  if (remote.protocol !== 'https:') {
    throw new Error('Production manifest URL must use HTTPS.');
  }
  const localLedger = await readJson<BlogReleaseLedger>(ledgerPath);
  const response = await fetch(remote, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) {
    if (
      response.status === 404 &&
      hasFlag('allow-missing-remote-if-local-empty') &&
      localLedger.releases.length === 0
    ) {
      console.log('✓ Production manifest is not present yet; local empty ledger is the trusted base state.');
      await writeGithubOutput({ recovered: 'false', production_manifest_missing: 'true' });
      return;
    }
    throw new Error(`Production manifest request failed: HTTP ${response.status}`);
  }
  const remoteLedger = await response.json() as BlogReleaseLedger;
  const reconciliation = reconcileBlogReleaseLedgers(calendar, localLedger, remoteLedger);
  if (!reconciliation.ok) {
    throw new Error(`Production manifest reconciliation failed: ${reconciliation.reason}`);
  }

  if (reconciliation.mode === 'remote_ahead_by_one') {
    const expectedRaw = option('expected-release-json') ?? process.env.BLOG_RELEASE_EXPECTED_CANDIDATE_JSON;
    if (!expectedRaw) {
      throw new Error(
        'Production is one release ahead of the ledger. Automatic recovery requires the exact trusted pre-deploy candidate.',
      );
    }
    let expectedRelease: BlogReleaseRecord;
    try {
      expectedRelease = JSON.parse(expectedRaw) as BlogReleaseRecord;
    } catch {
      throw new Error('Expected blog release candidate must be valid JSON.');
    }
    const expectedValidation = validateBlogReleaseLedger(calendar, {
      ...localLedger,
      releases: [...localLedger.releases, expectedRelease],
    });
    if (!expectedValidation.ok) {
      throw new Error(`Expected blog release candidate is invalid: ${expectedValidation.errors.join(', ')}`);
    }
    if (!reconciliation.releaseToRecover || !isSameBlogReleaseReservation(
      reconciliation.releaseToRecover,
      expectedRelease,
    )) {
      throw new Error('Production release does not match the trusted pre-deploy reservation.');
    }
    await writeJson(ledgerPath, remoteLedger);
    const manifest = buildBlogReleaseManifest(calendar, remoteLedger);
    await writeJson(manifestPath, manifest);
    console.log(`✓ Recovered one successful production release: ${reconciliation.releaseToRecover?.slug}`);
    await writeGithubOutput({ recovered: 'true', recovered_slug: reconciliation.releaseToRecover?.slug ?? '' });
  } else {
    console.log('✓ Production manifest and durable ledger are equal.');
    await writeGithubOutput({ recovered: 'false' });
  }
};

const discardCandidate = async () => {
  await rm(candidatePath, { force: true });
  console.log('✓ Removed transient blog release candidate.');
};

switch (command) {
  case 'plan': {
    printPlan(await plan());
    break;
  }
  case 'prepare': {
    await prepare();
    break;
  }
  case 'sync-production-manifest': {
    await syncProductionManifest();
    break;
  }
  case 'discard-candidate': {
    await discardCandidate();
    break;
  }
  default:
    throw new Error(`Unknown blog release command: ${command}`);
}

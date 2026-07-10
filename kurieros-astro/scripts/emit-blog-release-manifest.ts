#!/usr/bin/env tsx
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import calendarJson from '../src/data/blog-calendar.json';
import { assertReleasedBlogContentIntegrity } from '../src/utils/blogReleaseIntegrity';
import { buildBlogReleaseManifest } from '../src/utils/blogReleaseManifest';
import type {
  BlogCalendarEntry,
  BlogReleaseLedger,
  BlogReleaseRecord,
} from '../src/utils/blogRelease';
import { loadBlogContentDocuments } from './blog-content';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ledgerPath = resolve(rootDir, 'src/data/blog-release-ledger.json');
const outputPath = resolve(rootDir, 'src/generated/blog-release-manifest.json');
const candidatePath = process.env.BLOG_RELEASE_CANDIDATE_PATH
  ? resolve(process.cwd(), process.env.BLOG_RELEASE_CANDIDATE_PATH)
  : resolve(rootDir, 'src/generated/blog-release-candidate.json');

const readJson = async <T>(path: string): Promise<T> => JSON.parse(await readFile(path, 'utf8')) as T;

const ledger = await readJson<BlogReleaseLedger>(ledgerPath);
const calendar = calendarJson.entries as BlogCalendarEntry[];

let candidate: BlogReleaseRecord | undefined;
try {
  const candidateEnvelope = await readJson<{ schemaVersion?: unknown; release?: unknown }>(candidatePath);
  if (candidateEnvelope.schemaVersion !== 1 || !candidateEnvelope.release || typeof candidateEnvelope.release !== 'object') {
    throw new Error('candidate must have schemaVersion 1 and a release object');
  }
  if (process.env.BLOG_RELEASE_ALLOW_CANDIDATE !== 'true') {
    throw new Error(
      'Transient blog release candidate exists, but BLOG_RELEASE_ALLOW_CANDIDATE is not true. Refusing to expose it in a regular build.',
    );
  }
  candidate = candidateEnvelope.release as BlogReleaseRecord;
  console.log(`✓ Including transient blog candidate: ${candidate.slug}`);
} catch (error) {
  const isMissing = (error as NodeJS.ErrnoException).code === 'ENOENT';
  if (!isMissing) throw error;
}

const manifest = buildBlogReleaseManifest(calendar, ledger, candidate);
const documents = await loadBlogContentDocuments(resolve(rootDir, 'src/content/blog'));
assertReleasedBlogContentIntegrity({ releases: manifest.releases }, documents);
const nextContent = `${JSON.stringify(manifest, null, 2)}\n`;
const previousContent = await readFile(outputPath, 'utf8').catch(() => null);

if (previousContent === nextContent) {
  console.log(`✓ Blog release manifest unchanged: ${manifest.releases.length} published releases`);
} else {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, nextContent, 'utf8');
  console.log(`✓ Wrote blog release manifest: ${manifest.releases.length} published releases`);
}

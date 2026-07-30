#!/usr/bin/env tsx
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vacancyIndexability from '../src/generated/vacancy-indexability.json';
import { detailJobs } from '../src/data/jobs';
import { INFO_GUIDES } from '../src/utils/infoGuides';
import { knowledgeBaseData, TOPIC_META } from '../src/utils/knowledge';
import {
  BLOG_RELEASE_MANIFEST,
  getSitemapDateForBlogRelease,
} from '../src/utils/blogManifest';
import {
  buildSitemapFreshnessManifest,
  type SitemapFreshnessSource,
} from '../src/utils/sitemapFreshness';
import { getVacancyCanonicalPath } from '../src/utils/vacancyUrl';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = resolve(rootDir, 'src/generated/sitemap-freshness.json');
const indexableVacancyPaths = new Set(vacancyIndexability.indexablePaths);
const currentMoscowDate = (): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
const vacancySitemapLastmodDate =
  process.env.VACANCY_SITEMAP_LASTMOD_DATE ??
  process.env.JOBPOSTING_FRESHNESS_DATE ??
  currentMoscowDate();
const vacancyPaths = detailJobs
  .map((job) => getVacancyCanonicalPath(job))
  .filter((path) => indexableVacancyPaths.has(path))
  .sort();
const releasedBlogSources: SitemapFreshnessSource[] = [
  ...(BLOG_RELEASE_MANIFEST.releases.length > 0
    ? [{
        id: 'blog:index',
        contentUpdatedAt: getSitemapDateForBlogRelease(BLOG_RELEASE_MANIFEST.releases.at(-1)!),
        paths: ['/blog/'],
      }]
    : []),
  ...BLOG_RELEASE_MANIFEST.releases.map((release) => ({
    id: `blog:${release.slug}`,
    contentUpdatedAt: getSitemapDateForBlogRelease(release),
    paths: [`/blog/${release.slug}/`],
  })),
];

// Vacancy detail pages are intentionally refreshed daily during the Google
// Jobs recovery: their template, JobPosting `validThrough`, `dateModified`,
// visible CTA state and indexability policy are build-time content signals.
// Non-vacancy aggregate pages still need their own explicit content dates.
const sources: SitemapFreshnessSource[] = [
  {
    id: 'knowledge-base:index',
    contentUpdatedAt: knowledgeBaseData.generated,
    paths: ['/guide/'],
  },
  ...Object.entries(TOPIC_META).map(([topicName, topic]) => ({
    id: `knowledge-base:${topicName}`,
    contentUpdatedAt: topic.contentUpdatedAt ?? knowledgeBaseData.generated,
    paths: [`/guide/${topic.slug}/`],
  })),
  ...Object.values(INFO_GUIDES).map((guide) => ({
    id: `info-guide:${guide.key}`,
    contentUpdatedAt: guide.modifiedDate,
    paths: [`/${guide.slug}/`],
  })),
  ...(vacancyPaths.length > 0
    ? [{
        id: `vacancies:google-jobs-restore:${vacancySitemapLastmodDate}`,
        contentUpdatedAt: vacancySitemapLastmodDate,
        paths: vacancyPaths,
      }]
    : []),
  ...releasedBlogSources,
];

const manifest = buildSitemapFreshnessManifest(sources);
const nextContent = `${JSON.stringify(manifest, null, 2)}\n`;
const previousContent = await readFile(outputPath, 'utf8').catch(() => null);

if (previousContent === nextContent) {
  console.log(
    `✓ Sitemap freshness unchanged: ${Object.keys(manifest.entries).length} dated URLs`,
  );
} else {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, nextContent, 'utf8');
  console.log(
    `✓ Wrote sitemap freshness: ${Object.keys(manifest.entries).length} dated URLs`,
  );
}

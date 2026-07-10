#!/usr/bin/env tsx
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vacancyIndexability from '../src/generated/vacancy-indexability.json';
import { detailJobs } from '../src/data/jobs';
import { INFO_GUIDES } from '../src/utils/infoGuides';
import { knowledgeBaseData, TOPIC_META } from '../src/utils/knowledge';
import {
  buildSitemapFreshnessManifest,
  type SitemapFreshnessSource,
} from '../src/utils/sitemapFreshness';
import { getVacancyCanonicalPath } from '../src/utils/vacancyUrl';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = resolve(rootDir, 'src/generated/sitemap-freshness.json');
const indexableVacancyPaths = new Set(vacancyIndexability.indexablePaths);
const vacancyPathsByContentDate = new Map<string, string[]>();

for (const job of detailJobs) {
  if (!job.contentUpdatedAt) continue;
  const path = getVacancyCanonicalPath(job);
  if (!indexableVacancyPaths.has(path)) continue;
  const contentDate = job.contentUpdatedAt.slice(0, 10);
  const paths = vacancyPathsByContentDate.get(contentDate) ?? [];
  vacancyPathsByContentDate.set(contentDate, [...paths, path]);
}

// Only sources with an explicit content-change date belong here. Vacancy
// pages join the manifest only after their source exposes contentUpdatedAt;
// city, metro and aggregate pages remain absent until every rendered input
// can provide the same truthful signal.
const sources: SitemapFreshnessSource[] = [
  {
    id: 'knowledge-base',
    contentUpdatedAt: knowledgeBaseData.generated,
    paths: [
      '/guide/',
      ...Object.values(TOPIC_META).map((topic) => `/guide/${topic.slug}/`),
    ],
  },
  ...Object.values(INFO_GUIDES).map((guide) => ({
    id: `info-guide:${guide.key}`,
    contentUpdatedAt: guide.modifiedDate,
    paths: [`/${guide.slug}/`],
  })),
  ...[...vacancyPathsByContentDate.entries()].map(([contentUpdatedAt, paths]) => ({
    id: `vacancies:${contentUpdatedAt}`,
    contentUpdatedAt,
    paths,
  })),
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

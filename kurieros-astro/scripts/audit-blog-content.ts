#!/usr/bin/env tsx
import { resolve } from 'node:path';
import calendar from '../src/data/blog-calendar.json';
import { BLOG_SOURCE_REGISTRY } from '../src/utils/blogSourceRegistry';
import {
  auditBlogContentCorpus,
  type BlogCalendarContentContract,
} from '../src/utils/blogContent';
import { loadBlogContentDocuments } from './blog-content';

const contentDirectory = resolve(import.meta.dirname, '../src/content/blog');
const documents = await loadBlogContentDocuments(contentDirectory);
const audit = auditBlogContentCorpus(
  calendar.entries as BlogCalendarContentContract[],
  BLOG_SOURCE_REGISTRY.articleSources,
  documents,
);

if (!audit.ok) {
  for (const issue of audit.issues) {
    console.error(`✗ ${issue.slug}: ${issue.code} — ${issue.detail}`);
  }
  process.exitCode = 1;
} else {
  console.log(`✓ Blog corpus passes editorial contract: ${documents.length} materials`);
}

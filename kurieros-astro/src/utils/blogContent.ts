import { createHash } from 'node:crypto';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';

const ISO_DATE = z.iso.date();

export const BlogContentFrontmatterSchema = z.object({
  title: z.string().min(20).max(120),
  description: z.string().min(70).max(180),
  author: z.literal('КурьерОк'),
  type: z.enum(['rewrite', 'new', 'research']),
  status: z.enum(['ready', 'blocked']),
  primaryIntent: z.string().min(3),
  pillarHref: z.string().regex(/^\/[\w/-]*\/$/),
  commercialHref: z.string().regex(/^\/[\w/-]*\/$/).optional(),
  sourceIds: z.array(z.string().min(1)).min(1),
  checkedAt: ISO_DATE,
  relatedSlugs: z.array(z.string().regex(/^[a-z0-9-]+$/)).default([]),
  researchGate: z.enum(['none', 'internal-dataset', 'interviews']).default('none'),
});

export type BlogContentFrontmatter = z.infer<typeof BlogContentFrontmatterSchema>;

export type BlogContentDocument = {
  slug: string;
  frontmatter: BlogContentFrontmatter;
  body: string;
  contentSha256: string;
  wordCount: number;
  headingCount: number;
};

export type BlogCalendarContentContract = {
  sequence: number;
  slug: string;
  title: string;
  type: BlogContentFrontmatter['type'];
  primaryIntent: string;
  pillarHref: string;
  commercialHref?: string;
};

export type BlogSourceContentContract = {
  slug: string;
  sourceIds: string[];
  requiresInternalDataset: boolean;
};

export type BlogContentAuditIssue = {
  slug: string;
  code:
    | 'missing_document'
    | 'unexpected_document'
    | 'duplicate_document'
    | 'calendar_metadata_mismatch'
    | 'source_ids_mismatch'
    | 'research_gate_mismatch'
    | 'too_short'
    | 'too_few_headings';
  detail: string;
};

export type BlogContentAudit = {
  ok: boolean;
  issues: BlogContentAuditIssue[];
  documentsBySlug: Map<string, BlogContentDocument>;
};

const countWords = (body: string): number =>
  (body.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? []).length;

const countHeadings = (body: string): number =>
  (body.match(/^#{2,3}\s+\S+/gmu) ?? []).length;

/** Parses only normal Astro Markdown frontmatter; malformed input never gets a fallback. */
export const parseBlogContentDocument = (slug: string, markdown: string): BlogContentDocument => {
  const parts = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!parts) {
    throw new Error(`Blog markdown ${slug} must contain a YAML frontmatter block`);
  }

  const frontmatter = BlogContentFrontmatterSchema.parse(parseYaml(parts[1]));
  const body = parts[2].trim();
  return {
    slug,
    frontmatter,
    body,
    contentSha256: createHash('sha256').update(markdown, 'utf8').digest('hex'),
    wordCount: countWords(body),
    headingCount: countHeadings(body),
  };
};

const sameStringList = (left: readonly string[], right: readonly string[]): boolean =>
  left.length === right.length && left.every((value, index) => value === right[index]);

/**
 * Checks the durable editorial contract, not runtime release eligibility.
 * Source freshness and internal-dataset evidence belong to the release gate,
 * because a previously good article can become stale before its slot.
 */
export const auditBlogContentCorpus = (
  calendar: readonly BlogCalendarContentContract[],
  sourceBriefs: readonly BlogSourceContentContract[],
  documents: readonly BlogContentDocument[],
): BlogContentAudit => {
  const issues: BlogContentAuditIssue[] = [];
  const documentsBySlug = new Map<string, BlogContentDocument>();
  const calendarBySlug = new Map(calendar.map((entry) => [entry.slug, entry]));
  const sourcesBySlug = new Map(sourceBriefs.map((brief) => [brief.slug, brief]));

  for (const document of documents) {
    if (documentsBySlug.has(document.slug)) {
      issues.push({ slug: document.slug, code: 'duplicate_document', detail: 'more than one Markdown document' });
      continue;
    }
    documentsBySlug.set(document.slug, document);
    if (!calendarBySlug.has(document.slug)) {
      issues.push({ slug: document.slug, code: 'unexpected_document', detail: 'not present in the publication calendar' });
    }
  }

  for (const entry of calendar) {
    const document = documentsBySlug.get(entry.slug);
    if (!document) {
      issues.push({ slug: entry.slug, code: 'missing_document', detail: 'planned brief has no Markdown document' });
      continue;
    }

    const metadataMatches =
      document.frontmatter.title === entry.title &&
      document.frontmatter.type === entry.type &&
      document.frontmatter.primaryIntent === entry.primaryIntent &&
      document.frontmatter.pillarHref === entry.pillarHref &&
      document.frontmatter.commercialHref === entry.commercialHref;
    if (!metadataMatches) {
      issues.push({ slug: entry.slug, code: 'calendar_metadata_mismatch', detail: 'frontmatter diverges from the calendar brief' });
    }

    const sourceBrief = sourcesBySlug.get(entry.slug);
    if (!sourceBrief || !sameStringList(document.frontmatter.sourceIds, sourceBrief.sourceIds)) {
      issues.push({ slug: entry.slug, code: 'source_ids_mismatch', detail: 'frontmatter does not match its source registry brief' });
    }

    const expectedResearchGate = sourceBrief?.requiresInternalDataset ? 'internal-dataset' : 'none';
    if (document.frontmatter.researchGate !== expectedResearchGate) {
      issues.push({ slug: entry.slug, code: 'research_gate_mismatch', detail: `expected ${expectedResearchGate}` });
    }
    if (document.wordCount < 650) {
      issues.push({ slug: entry.slug, code: 'too_short', detail: `${document.wordCount} words; minimum is 650` });
    }
    if (document.headingCount < 3) {
      issues.push({ slug: entry.slug, code: 'too_few_headings', detail: `${document.headingCount} headings; minimum is 3` });
    }
  }

  return { ok: issues.length === 0, issues, documentsBySlug };
};

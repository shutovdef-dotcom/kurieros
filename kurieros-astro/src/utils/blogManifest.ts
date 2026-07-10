import { z } from 'zod';
import manifestData from '../generated/blog-release-manifest.json';

const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/;
const SHA256 = /^[a-f0-9]{64}$/;
const DEPLOY_SHA = /^[a-f0-9]{7,64}$/;

const isIsoTimestamp = (value: string): boolean =>
  ISO_TIMESTAMP.test(value) && !Number.isNaN(Date.parse(value));

/**
 * The generated manifest is the only publication surface consumed by Astro
 * routes. Draft markdown may exist in the repository, but it must never be
 * discoverable until a matching ledger record has been written after a
 * successful release.
 */
export const BlogReleaseRecordSchema = z.object({
  sequence: z.number().int().positive(),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  releasedAt: z.string().refine(isIsoTimestamp, 'releasedAt must be an ISO timestamp'),
  firstPublishedAt: z.string().refine(isIsoTimestamp, 'firstPublishedAt must be an ISO timestamp'),
  sourceCheckedAt: z.string().refine(isIsoTimestamp, 'sourceCheckedAt must be an ISO timestamp'),
  modifiedAt: z.string().refine(isIsoTimestamp, 'modifiedAt must be an ISO timestamp').optional(),
  revision: z.number().int().positive(),
  contentSha256: z.string().regex(SHA256),
  deploySha: z.string().regex(DEPLOY_SHA),
  historicalPublicationEvidence: z.object({
    source: z.string().min(1),
    verifiedAt: z.string().refine(isIsoTimestamp, 'evidence verifiedAt must be an ISO timestamp'),
    reference: z.string().min(1),
  }).optional(),
});

export const BlogReleaseManifestSchema = z.object({
  schemaVersion: z.literal(1),
  timezone: z.literal('Europe/Moscow'),
  generatedAt: z.string().refine(isIsoTimestamp, 'generatedAt must be an ISO timestamp').nullable(),
  releases: z.array(BlogReleaseRecordSchema),
});

export type BlogReleaseRecord = z.infer<typeof BlogReleaseRecordSchema>;
export type BlogReleaseManifest = z.infer<typeof BlogReleaseManifestSchema>;

const assertManifestIntegrity = (manifest: BlogReleaseManifest): BlogReleaseManifest => {
  const sequences = manifest.releases.map((release) => release.sequence);
  const slugs = manifest.releases.map((release) => release.slug);

  if (new Set(sequences).size !== sequences.length || new Set(slugs).size !== slugs.length) {
    throw new Error('Blog release manifest contains duplicate releases');
  }

  for (const [index, release] of manifest.releases.entries()) {
    if (release.sequence !== index + 1) {
      throw new Error('Blog release manifest must be a strict release prefix');
    }
    const firstPublishedAt = new Date(release.firstPublishedAt).getTime();
    const releasedAt = new Date(release.releasedAt).getTime();
    if (firstPublishedAt > releasedAt) {
      throw new Error(`Blog release ${release.slug} has a publication date after its release`);
    }
    if (firstPublishedAt < releasedAt && !release.historicalPublicationEvidence) {
      throw new Error(`Blog release ${release.slug} retains an earlier publication date without evidence`);
    }
    if (new Date(release.sourceCheckedAt).getTime() >= releasedAt) {
      throw new Error(`Blog release ${release.slug} has source evidence that is not earlier than publication`);
    }
    if (
      release.modifiedAt &&
      new Date(release.modifiedAt).getTime() < new Date(release.firstPublishedAt).getTime()
    ) {
      throw new Error(`Blog release ${release.slug} has a modification date before publication`);
    }
  }

  return manifest;
};

export const BLOG_RELEASE_MANIFEST = assertManifestIntegrity(
  BlogReleaseManifestSchema.parse(manifestData),
);

export const hasPublishedBlog = BLOG_RELEASE_MANIFEST.releases.length > 0;

export const blogReleaseBySlug = new Map(
  BLOG_RELEASE_MANIFEST.releases.map((release) => [release.slug, release]),
);

export const getPublishedBlogRelease = (slug: string): BlogReleaseRecord | undefined =>
  blogReleaseBySlug.get(slug);

export const getSitemapDateForBlogRelease = (release: BlogReleaseRecord): string =>
  (release.modifiedAt ?? release.firstPublishedAt).slice(0, 10);

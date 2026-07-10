import { z } from 'zod';
import evidenceJson from '../data/blog-release-evidence.json';

const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;
const SHA256 = /^[a-f0-9]{64}$/;

const isIsoInstant = (value: string): boolean =>
  ISO_INSTANT.test(value) && !Number.isNaN(Date.parse(value));

const BlogResearchDatasetEvidenceSchema = z.object({
  id: z.string().regex(/^kurerok-[a-z0-9-]+$/),
  generatedAt: z.string().refine(isIsoInstant, 'generatedAt must be an ISO timestamp'),
  snapshotSha256: z.string().regex(SHA256),
  methodology: z.string().min(20),
});

const BlogReleaseEvidenceEntrySchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  sourceIds: z.array(z.string().min(1)).min(1),
  checkedAt: z.string().refine(isIsoInstant, 'checkedAt must be an ISO timestamp'),
  evidenceReference: z.string().min(5),
  researchDataset: BlogResearchDatasetEvidenceSchema.optional(),
});

export const BlogReleaseEvidenceSchema = z.object({
  schemaVersion: z.literal(1),
  sourceMaxAgeDays: z.number().int().min(1).max(90),
  entries: z.array(BlogReleaseEvidenceEntrySchema),
}).superRefine((evidence, ctx) => {
  const slugs = new Set<string>();
  evidence.entries.forEach((entry, index) => {
    if (slugs.has(entry.slug)) {
      ctx.addIssue({
        code: 'custom',
        path: ['entries', index, 'slug'],
        message: `Duplicate release evidence for ${entry.slug}`,
      });
    }
    slugs.add(entry.slug);
  });
});

export type BlogReleaseEvidence = z.infer<typeof BlogReleaseEvidenceSchema>;
export type BlogReleaseEvidenceEntry = z.infer<typeof BlogReleaseEvidenceEntrySchema>;

/**
 * This is deliberately separate from the research source registry. Registry
 * dates describe planning research; each published URL needs a new, dated
 * evidence entry immediately before its actual release.
 */
export const BLOG_RELEASE_EVIDENCE = BlogReleaseEvidenceSchema.parse(evidenceJson);

const sameStringSet = (left: readonly string[], right: readonly string[]): boolean =>
  left.length === right.length &&
  [...left].sort().every((value, index) => value === [...right].sort()[index]);

export type BlogEvidenceGateInput = {
  slug: string;
  sourceIds: readonly string[];
  requiresInternalDataset: boolean;
  internalDatasetId?: string;
  now: string;
  evidence: BlogReleaseEvidence;
};

export type BlogEvidenceGate = {
  sourceGatePassed: boolean;
  researchGatePassed: boolean;
  reasons: string[];
};

export const evaluateBlogEvidenceGate = ({
  slug,
  sourceIds,
  requiresInternalDataset,
  internalDatasetId,
  now,
  evidence,
}: BlogEvidenceGateInput): BlogEvidenceGate => {
  const nowAt = new Date(now).getTime();
  if (!isIsoInstant(now) || Number.isNaN(nowAt)) {
    throw new Error('Blog evidence gate requires an explicit ISO now timestamp');
  }

  const entry = evidence.entries.find((item) => item.slug === slug);
  const reasons: string[] = [];
  const maxAgeMs = evidence.sourceMaxAgeDays * 24 * 60 * 60 * 1000;
  const checkedAt = entry ? new Date(entry.checkedAt).getTime() : Number.NaN;
  const sourceGatePassed = Boolean(
    entry &&
    sameStringSet(entry.sourceIds, sourceIds) &&
    checkedAt <= nowAt &&
    nowAt - checkedAt <= maxAgeMs,
  );

  if (!entry) reasons.push('missing_release_evidence');
  else if (!sameStringSet(entry.sourceIds, sourceIds)) reasons.push('evidence_source_ids_mismatch');
  else if (checkedAt > nowAt) reasons.push('evidence_checked_in_future');
  else if (nowAt - checkedAt > maxAgeMs) reasons.push('release_evidence_stale');

  const researchGatePassed = !requiresInternalDataset || Boolean(
    entry?.researchDataset &&
    entry.researchDataset.id === internalDatasetId &&
    new Date(entry.researchDataset.generatedAt).getTime() <= nowAt,
  );
  if (requiresInternalDataset && !researchGatePassed) {
    reasons.push('missing_or_invalid_internal_dataset_evidence');
  }

  return { sourceGatePassed, researchGatePassed, reasons };
};

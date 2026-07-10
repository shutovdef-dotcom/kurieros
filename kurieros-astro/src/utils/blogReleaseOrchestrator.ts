import {
  auditBlogContentCorpus,
  type BlogCalendarContentContract,
  type BlogContentAudit,
  type BlogContentDocument,
  type BlogSourceContentContract,
} from './blogContent';
import {
  evaluateBlogEvidenceGate,
  type BlogReleaseEvidence,
} from './blogReleaseEvidence';
import { blogPrimarySourceById } from './blogSourceRegistry';
import {
  planNextBlogRelease,
  type BlogCalendarEntry,
  type BlogReleaseLedger,
  type BlogReleasePlan,
  type BlogReleaseReadiness,
  type BlogReleaseRecord,
} from './blogRelease';

export type BlogReleaseSourceBrief = BlogSourceContentContract & {
  internalDataset?: { id: string };
};

export type BlogReleaseOrchestrationInput = {
  calendar: readonly (BlogCalendarEntry & BlogCalendarContentContract)[];
  sourceBriefs: readonly BlogReleaseSourceBrief[];
  documents: readonly BlogContentDocument[];
  evidence: BlogReleaseEvidence;
  ledger: BlogReleaseLedger;
  now: string;
  scheduleEnabled: boolean;
  paused: boolean;
  minReadyBuffer?: number;
};

export type BlogReleaseOrchestration = {
  audit: BlogContentAudit;
  readinessBySlug: Record<string, BlogReleaseReadiness>;
  evidenceReasonsBySlug: Record<string, string[]>;
  plan: BlogReleasePlan;
};

/**
 * Turns durable editorial/source evidence into the narrow input accepted by
 * the cursor engine. It deliberately cannot make a draft eligible merely
 * because its nominal date is due.
 */
export const planVerifiedBlogRelease = ({
  calendar,
  sourceBriefs,
  documents,
  evidence,
  ledger,
  now,
  scheduleEnabled,
  paused,
  minReadyBuffer,
}: BlogReleaseOrchestrationInput): BlogReleaseOrchestration => {
  const audit = auditBlogContentCorpus(calendar, sourceBriefs, documents);
  const documentsBySlug = audit.documentsBySlug;
  const sourceBriefsBySlug = new Map(sourceBriefs.map((brief) => [brief.slug, brief]));
  const readinessBySlug: Record<string, BlogReleaseReadiness> = {};
  const evidenceReasonsBySlug: Record<string, string[]> = {};

  for (const entry of calendar) {
    const document = documentsBySlug.get(entry.slug);
    const sourceBrief = sourceBriefsBySlug.get(entry.slug);
    if (!document || !sourceBrief) {
      readinessBySlug[entry.slug] = { status: 'blocked', qualityGatePassed: false };
      evidenceReasonsBySlug[entry.slug] = ['missing_editorial_contract'];
      continue;
    }

    const evidenceGate = evaluateBlogEvidenceGate({
      slug: entry.slug,
      sourceIds: document.frontmatter.sourceIds,
      requiresInternalDataset: sourceBrief.requiresInternalDataset,
      internalDatasetId: sourceBrief.internalDataset?.id,
      now,
      evidence,
    });
    const restrictedSourceIds = document.frontmatter.sourceIds.filter((sourceId) => {
      const source = blogPrimarySourceById.get(sourceId);
      return source?.citationVisibility === 'internal';
    });
    readinessBySlug[entry.slug] = {
      status: document.frontmatter.status,
      contentSha256: document.contentSha256,
      sourceGatePassed: evidenceGate.sourceGatePassed && restrictedSourceIds.length === 0,
      researchGatePassed: evidenceGate.researchGatePassed,
      // A missing later draft, duplicate, or metadata mismatch makes the
      // entire planned corpus unsafe to release from automatically.
      qualityGatePassed: audit.ok,
    };
    evidenceReasonsBySlug[entry.slug] = [
      ...evidenceGate.reasons,
      ...restrictedSourceIds.map((sourceId) => `source_not_publicly_citable:${sourceId}`),
    ];
  }

  return {
    audit,
    readinessBySlug,
    evidenceReasonsBySlug,
    plan: planNextBlogRelease({
      calendar,
      ledger,
      readinessBySlug,
      now,
      scheduleEnabled,
      paused,
      minReadyBuffer,
    }),
  };
};

export const createBlogReleaseCandidate = (
  orchestration: Pick<BlogReleaseOrchestration, 'plan' | 'readinessBySlug'>,
  releasedAt: string,
  deploySha: string,
): BlogReleaseRecord => {
  const candidate = orchestration.plan.candidate;
  if (!orchestration.plan.eligible || !candidate) {
    throw new Error(`Cannot create blog release candidate: ${orchestration.plan.reasons.join(', ')}`);
  }
  const readiness = orchestration.readinessBySlug[candidate.slug];
  if (!readiness?.contentSha256) {
    throw new Error(`Cannot create blog release candidate: missing content SHA for ${candidate.slug}`);
  }

  return {
    sequence: candidate.sequence,
    slug: candidate.slug,
    releasedAt,
    firstPublishedAt: releasedAt,
    revision: 1,
    contentSha256: readiness.contentSha256,
    deploySha,
  };
};

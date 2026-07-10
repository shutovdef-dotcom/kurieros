import {
  auditBlogContentCorpus,
  type BlogCalendarContentContract,
  type BlogContentAudit,
  type BlogContentDocument,
  type BlogSourceContentContract,
} from './blogContent';
import {
  evaluateBlogEvidenceGate,
  type BlogReleaseEvidenceEntry,
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
  evidenceBySlug: Record<string, BlogReleaseEvidenceEntry | undefined>;
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
  const evidenceBySlug = Object.fromEntries(
    evidence.entries.map((entry) => [entry.slug, entry]),
  ) as Record<string, BlogReleaseEvidenceEntry | undefined>;

  for (const entry of calendar) {
    const document = documentsBySlug.get(entry.slug);
    const sourceBrief = sourceBriefsBySlug.get(entry.slug);
    if (!document || !sourceBrief) {
      readinessBySlug[entry.slug] = { status: 'blocked', qualityGatePassed: false };
      evidenceReasonsBySlug[entry.slug] = ['missing_editorial_contract'];
      continue;
    }

    // The source registry is the authoritative description of evidence
    // requirements. A typo or downgrade in the calendar must stop the cursor,
    // never make an internal-dataset article publishable without its dataset.
    const gateContractReasons: string[] = [];
    if (entry.sourceGate?.required === false) {
      gateContractReasons.push('calendar_source_gate_disabled');
    }
    if (Boolean(entry.researchGate?.required) !== sourceBrief.requiresInternalDataset) {
      gateContractReasons.push('calendar_registry_research_gate_mismatch');
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
      status: gateContractReasons.length === 0 ? document.frontmatter.status : 'blocked',
      contentSha256: document.contentSha256,
      sourceGatePassed: evidenceGate.sourceGatePassed && restrictedSourceIds.length === 0,
      researchGatePassed: evidenceGate.researchGatePassed,
      // A missing later draft, duplicate, or metadata mismatch makes the
      // entire planned corpus unsafe to release from automatically.
      qualityGatePassed: audit.ok && gateContractReasons.length === 0,
    };
    evidenceReasonsBySlug[entry.slug] = [
      ...evidenceGate.reasons,
      ...restrictedSourceIds.map((sourceId) => `source_not_publicly_citable:${sourceId}`),
      ...gateContractReasons,
    ];
  }

  return {
    audit,
    readinessBySlug,
    evidenceReasonsBySlug,
    evidenceBySlug,
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
  orchestration: Pick<BlogReleaseOrchestration, 'plan' | 'readinessBySlug' | 'evidenceBySlug'>,
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
  const evidence = orchestration.evidenceBySlug[candidate.slug];
  if (!evidence) {
    throw new Error(`Cannot create blog release candidate: missing source evidence for ${candidate.slug}`);
  }

  // This record is an uncommitted reservation. The SSH deploy replaces its
  // timestamp in staging immediately before public promotion; only the
  // stamped production record is written back to the durable ledger.
  return {
    sequence: candidate.sequence,
    slug: candidate.slug,
    releasedAt,
    firstPublishedAt: releasedAt,
    sourceCheckedAt: evidence.checkedAt,
    revision: 1,
    contentSha256: readiness.contentSha256,
    deploySha,
  };
};

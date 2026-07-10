import { describe, expect, it } from 'vitest';
import {
  evaluateBlogEvidenceGate,
  type BlogReleaseEvidence,
} from '../src/utils/blogReleaseEvidence';

const evidence = (entries: BlogReleaseEvidence['entries']): BlogReleaseEvidence => ({
  schemaVersion: 1,
  sourceMaxAgeDays: 30,
  entries,
});

const input = {
  slug: 'test-article',
  sourceIds: ['official-source'],
  requiresInternalDataset: false,
  now: '2026-08-03T09:10:00+03:00',
};

describe('blog release evidence gate', () => {
  it('does not mistake the source registry for current release evidence', () => {
    expect(evaluateBlogEvidenceGate({ ...input, evidence: evidence([]) })).toEqual({
      sourceGatePassed: false,
      researchGatePassed: true,
      reasons: ['missing_release_evidence'],
    });
  });

  it('requires a fresh exact source check for the specific release', () => {
    expect(evaluateBlogEvidenceGate({
      ...input,
      evidence: evidence([{
        slug: 'test-article',
        sourceIds: ['official-source'],
        checkedAt: '2026-08-02T10:00:00+03:00',
        evidenceReference: 'review-log/test-article-2026-08-02',
      }]),
    })).toMatchObject({ sourceGatePassed: true, researchGatePassed: true, reasons: [] });

    expect(evaluateBlogEvidenceGate({
      ...input,
      evidence: evidence([{
        slug: 'test-article',
        sourceIds: ['official-source'],
        checkedAt: '2026-06-01T10:00:00+03:00',
        evidenceReference: 'review-log/obsolete',
      }]),
    })).toMatchObject({ sourceGatePassed: false, reasons: ['release_evidence_stale'] });
  });

  it('requires a named, dated, hashed internal dataset for research', () => {
    const baseEvidence = {
      slug: 'test-article',
      sourceIds: ['official-source'],
      checkedAt: '2026-08-02T10:00:00+03:00',
      evidenceReference: 'review-log/test-article-2026-08-02',
    };
    expect(evaluateBlogEvidenceGate({
      ...input,
      requiresInternalDataset: true,
      internalDatasetId: 'kurerok-vacancy-snapshot',
      evidence: evidence([baseEvidence]),
    })).toMatchObject({ researchGatePassed: false });

    expect(evaluateBlogEvidenceGate({
      ...input,
      requiresInternalDataset: true,
      internalDatasetId: 'kurerok-vacancy-snapshot',
      evidence: evidence([{
        ...baseEvidence,
        researchDataset: {
          id: 'kurerok-vacancy-snapshot',
          generatedAt: '2026-08-02T11:00:00+03:00',
          snapshotSha256: 'a'.repeat(64),
          methodology: 'Fixed role, city and source fields before aggregation.',
        },
      }]),
    })).toMatchObject({ sourceGatePassed: true, researchGatePassed: true, reasons: [] });
  });
});

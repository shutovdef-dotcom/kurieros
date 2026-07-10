import { describe, expect, it } from 'vitest';
import {
  getBlogReleaseReadiness,
  getEffectiveBlogReleaseDueAt,
  planNextBlogRelease,
  reconcileBlogReleaseLedgers,
  validateBlogReleaseLedger,
  type BlogCalendarEntry,
  type BlogReleaseLedger,
  type BlogReleaseReadiness,
} from '../src/utils/blogRelease';

const sha = (seed: string) => seed.padEnd(64, seed[0] ?? '0').slice(0, 64);

const entry = (sequence: number, overrides: Partial<BlogCalendarEntry> = {}): BlogCalendarEntry => ({
  sequence,
  slug: `article-${sequence}`,
  nominalPublishAt: `2026-08-${String(sequence * 2 + 1).padStart(2, '0')}T09:00:00+03:00`,
  sourceGate: { required: true, kind: 'standard' },
  researchGate: { required: false },
  ...overrides,
});

const calendar = (count: number): BlogCalendarEntry[] =>
  Array.from({ length: count }, (_, index) => entry(index + 1));

const readiness = (
  entries: readonly BlogCalendarEntry[],
  overrides: Record<string, Partial<BlogReleaseReadiness>> = {},
): Record<string, BlogReleaseReadiness> =>
  Object.fromEntries(
    entries.map((item) => [
      item.slug,
      {
        status: 'ready',
        contentSha256: sha(String(item.sequence)),
        sourceGatePassed: true,
        researchGatePassed: true,
        qualityGatePassed: true,
        ...overrides[item.slug],
      },
    ]),
  );

const emptyLedger = (): BlogReleaseLedger => ({
  schemaVersion: 1,
  timezone: 'Europe/Moscow',
  releases: [],
});

const ledgerWithFirstRelease = (): BlogReleaseLedger => ({
  ...emptyLedger(),
  releases: [
    {
      sequence: 1,
      slug: 'article-1',
      releasedAt: '2026-08-03T09:05:00+03:00',
      datePublished: '2026-08-03T09:05:00+03:00',
      revision: 1,
      contentSha256: sha('1'),
      deploySha: 'abc1234',
    },
  ],
});

describe('blog release ledger validation', () => {
  it('accepts an explicit, strict prefix of the marked calendar', () => {
    expect(validateBlogReleaseLedger(calendar(3), ledgerWithFirstRelease())).toEqual({
      ok: true,
      errors: [],
    });
  });

  it('rejects a skipped sequence instead of silently advancing the cursor', () => {
    const ledger = ledgerWithFirstRelease();
    ledger.releases[0] = { ...ledger.releases[0]!, sequence: 2, slug: 'article-2' };

    expect(validateBlogReleaseLedger(calendar(3), ledger)).toMatchObject({
      ok: false,
      errors: ['release_not_strict_prefix'],
    });
  });

  it('does not invent a release or publication date from the nominal slot', () => {
    const ledger = ledgerWithFirstRelease();
    const {
      releasedAt: _releasedAt,
      datePublished: _datePublished,
      ...withoutExplicitDates
    } = ledger.releases[0]!;
    ledger.releases[0] = withoutExplicitDates as typeof ledger.releases[number];

    expect(validateBlogReleaseLedger(calendar(3), ledger)).toMatchObject({
      ok: false,
      errors: expect.arrayContaining([
        'missing_released_at',
        'missing_date_published',
      ]),
    });
  });

  it('rejects invalid hashes, deploy evidence and impossible modified dates', () => {
    const ledger = ledgerWithFirstRelease();
    ledger.releases[0] = {
      ...ledger.releases[0]!,
      contentSha256: 'not-a-sha',
      deploySha: '',
      dateModified: '2026-08-02T09:05:00+03:00',
    };

    expect(validateBlogReleaseLedger(calendar(3), ledger)).toMatchObject({
      ok: false,
      errors: expect.arrayContaining([
        'invalid_content_sha256',
        'missing_deploy_sha',
        'date_modified_before_date_published',
      ]),
    });
  });
});

describe('blog release timing and gates', () => {
  it('uses the later of the nominal slot and the last actual release plus 48 hours', () => {
    const next = entry(2, { nominalPublishAt: '2026-08-05T09:00:00+03:00' });

    expect(
      getEffectiveBlogReleaseDueAt(next, {
        releasedAt: '2026-08-04T12:00:00.000Z',
      }),
    ).toBe('2026-08-06T12:00:00.000Z');
    expect(getEffectiveBlogReleaseDueAt(next)).toBe('2026-08-05T06:00:00.000Z');
  });

  it('requires all content, source, research and quality evidence before a release', () => {
    const researchEntry = entry(1, {
      researchGate: { required: true, minimumEvidence: '12 verified records' },
    });

    expect(
      getBlogReleaseReadiness(researchEntry, {
        status: 'ready',
        contentSha256: sha('1'),
        sourceGatePassed: false,
        researchGatePassed: false,
        qualityGatePassed: false,
      }),
    ).toEqual({
      ready: false,
      reasons: [
        'source_gate_not_passed',
        'research_gate_not_passed',
        'quality_gate_not_passed',
      ],
    });
  });

  it('requires a SHA-256 content fingerprint even when all other gates pass', () => {
    expect(
      getBlogReleaseReadiness(entry(1), {
        status: 'ready',
        sourceGatePassed: true,
        researchGatePassed: true,
        qualityGatePassed: true,
      }),
    ).toEqual({ ready: false, reasons: ['missing_content_sha256'] });
  });

  it('honours the disabled and pause switches before selecting a candidate', () => {
    const entries = calendar(12);
    const input = {
      calendar: entries,
      ledger: emptyLedger(),
      readinessBySlug: readiness(entries),
      now: '2026-08-10T12:00:00+03:00',
    };

    expect(planNextBlogRelease({ ...input, scheduleEnabled: false, paused: false })).toMatchObject({
      eligible: false,
      reasons: ['schedule_disabled'],
      candidate: undefined,
    });
    expect(planNextBlogRelease({ ...input, scheduleEnabled: true, paused: true })).toMatchObject({
      eligible: false,
      reasons: ['schedule_paused'],
      candidate: undefined,
    });
  });

  it('selects exactly the next due article, never catches up a later one', () => {
    const entries = calendar(13);
    const result = planNextBlogRelease({
      calendar: entries,
      ledger: emptyLedger(),
      readinessBySlug: readiness(entries),
      now: '2026-08-31T12:00:00+03:00',
      scheduleEnabled: true,
      paused: false,
    });

    expect(result).toMatchObject({
      eligible: true,
      candidate: {
        sequence: 1,
        slug: 'article-1',
        effectiveDueAt: '2026-08-01T06:00:00.000Z',
      },
      readyBuffer: 12,
      requiredReadyBuffer: 12,
    });
    expect(result.candidate).not.toHaveProperty('releasedAt');
  });

  it('stops when the next 12 ready articles are not consecutive', () => {
    const entries = calendar(13);
    const result = planNextBlogRelease({
      calendar: entries,
      ledger: emptyLedger(),
      readinessBySlug: readiness(entries, {
        'article-12': { contentSha256: undefined },
      }),
      now: '2026-08-31T12:00:00+03:00',
      scheduleEnabled: true,
      paused: false,
    });

    expect(result).toMatchObject({
      eligible: false,
      reasons: ['ready_buffer_too_short'],
      readyBuffer: 11,
      requiredReadyBuffer: 12,
    });
  });

  it('uses the smaller remaining tail as the ready-buffer requirement', () => {
    const entries = calendar(3);
    const result = planNextBlogRelease({
      calendar: entries,
      ledger: ledgerWithFirstRelease(),
      readinessBySlug: readiness(entries),
      now: '2026-08-10T12:00:00+03:00',
      scheduleEnabled: true,
      paused: false,
    });

    expect(result).toMatchObject({
      eligible: true,
      candidate: { sequence: 2, slug: 'article-2' },
      readyBuffer: 2,
      requiredReadyBuffer: 2,
    });
  });

  it('defers the next scheduled candidate after an actual delayed release', () => {
    const entries = calendar(12);
    const result = planNextBlogRelease({
      calendar: entries,
      ledger: ledgerWithFirstRelease(),
      readinessBySlug: readiness(entries),
      now: '2026-08-05T12:00:00+03:00',
      scheduleEnabled: true,
      paused: false,
    });

    expect(result).toMatchObject({
      eligible: false,
      reasons: ['not_due'],
      candidate: {
        sequence: 2,
        effectiveDueAt: '2026-08-05T06:05:00.000Z',
      },
    });
  });
});

describe('production manifest reconciliation', () => {
  it('accepts equal strict ledgers', () => {
    const local = ledgerWithFirstRelease();

    expect(reconcileBlogReleaseLedgers(calendar(3), local, structuredClone(local))).toEqual({
      ok: true,
      mode: 'equal',
      releaseToRecover: undefined,
    });
  });

  it('accepts only a remote ledger that is exactly one valid release ahead', () => {
    const local = ledgerWithFirstRelease();
    const remote = structuredClone(local);
    remote.releases.push({
      sequence: 2,
      slug: 'article-2',
      releasedAt: '2026-08-05T09:02:00+03:00',
      datePublished: '2026-08-05T09:02:00+03:00',
      revision: 1,
      contentSha256: sha('2'),
      deploySha: 'def5678',
    });

    expect(reconcileBlogReleaseLedgers(calendar(3), local, remote)).toMatchObject({
      ok: true,
      mode: 'remote_ahead_by_one',
      releaseToRecover: { sequence: 2, slug: 'article-2' },
    });
  });

  it('rejects a remote ledger that is behind, divergent, or more than one release ahead', () => {
    const local = ledgerWithFirstRelease();
    const remoteAheadTwo = structuredClone(local);
    remoteAheadTwo.releases.push(
      {
        sequence: 2,
        slug: 'article-2',
        releasedAt: '2026-08-05T09:02:00+03:00',
        datePublished: '2026-08-05T09:02:00+03:00',
        revision: 1,
        contentSha256: sha('2'),
        deploySha: 'def5678',
      },
      {
        sequence: 3,
        slug: 'article-3',
        releasedAt: '2026-08-07T09:02:00+03:00',
        datePublished: '2026-08-07T09:02:00+03:00',
        revision: 1,
        contentSha256: sha('3'),
        deploySha: 'ghi9012',
      },
    );
    const divergent = structuredClone(local);
    divergent.releases[0] = { ...divergent.releases[0]!, deploySha: 'different' };

    expect(reconcileBlogReleaseLedgers(calendar(3), local, emptyLedger())).toMatchObject({
      ok: false,
      mode: 'invalid',
      reason: 'remote_behind_local',
    });
    expect(reconcileBlogReleaseLedgers(calendar(3), local, remoteAheadTwo)).toMatchObject({
      ok: false,
      mode: 'invalid',
      reason: 'remote_more_than_one_ahead',
    });
    expect(reconcileBlogReleaseLedgers(calendar(3), local, divergent)).toMatchObject({
      ok: false,
      mode: 'invalid',
      reason: 'ledger_divergence',
    });
  });
});

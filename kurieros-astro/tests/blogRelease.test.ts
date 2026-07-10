import { describe, expect, it } from 'vitest';
import {
  getBlogReleaseReadiness,
  getEffectiveBlogReleaseDueAt,
  isSameBlogReleaseReservation,
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
      firstPublishedAt: '2026-08-03T09:05:00+03:00',
      sourceCheckedAt: '2026-08-03T09:00:00+03:00',
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
      firstPublishedAt: _firstPublishedAt,
      ...withoutExplicitDates
    } = ledger.releases[0]!;
    ledger.releases[0] = withoutExplicitDates as typeof ledger.releases[number];

    expect(validateBlogReleaseLedger(calendar(3), ledger)).toMatchObject({
      ok: false,
      errors: expect.arrayContaining([
        'missing_released_at',
        'missing_first_published_at',
      ]),
    });
  });

  it('requires source evidence that was checked before the release itself', () => {
    const ledger = ledgerWithFirstRelease();
    ledger.releases[0] = {
      ...ledger.releases[0]!,
      sourceCheckedAt: '2026-08-03T09:05:00+03:00',
    };

    expect(validateBlogReleaseLedger(calendar(3), ledger)).toMatchObject({
      ok: false,
      errors: ['source_checked_after_release'],
    });
  });

  it('rejects invalid hashes, deploy evidence and impossible modified dates', () => {
    const ledger = ledgerWithFirstRelease();
    ledger.releases[0] = {
      ...ledger.releases[0]!,
      contentSha256: 'not-a-sha',
      deploySha: '',
      modifiedAt: '2026-08-02T09:05:00+03:00',
    };

    expect(validateBlogReleaseLedger(calendar(3), ledger)).toMatchObject({
      ok: false,
      errors: expect.arrayContaining([
        'invalid_content_sha256',
        'missing_deploy_sha',
        'modified_at_before_first_published_at',
      ]),
    });
  });

  it('allows a retained historical first-publication date only with explicit evidence', () => {
    const ledger = ledgerWithFirstRelease();
    ledger.releases[0] = {
      ...ledger.releases[0]!,
      firstPublishedAt: '2026-04-05T09:00:00+03:00',
    };

    expect(validateBlogReleaseLedger(calendar(3), ledger)).toMatchObject({
      ok: false,
      errors: ['missing_historical_publication_evidence'],
    });

    ledger.releases[0] = {
      ...ledger.releases[0]!,
      historicalPublicationEvidence: {
        source: 'Google Search Console URL history',
        verifiedAt: '2026-07-10T12:00:00+03:00',
        reference: 'gsc-url-inspection-export-2026-07-10',
      },
    };
    expect(validateBlogReleaseLedger(calendar(3), ledger)).toEqual({ ok: true, errors: [] });
  });

  it('rejects releases earlier than their nominal slot or the preceding 48-hour window', () => {
    const earlyFirst = ledgerWithFirstRelease();
    earlyFirst.releases[0] = {
      ...earlyFirst.releases[0]!,
      releasedAt: '2026-08-03T08:59:00+03:00',
      firstPublishedAt: '2026-08-03T08:59:00+03:00',
      sourceCheckedAt: '2026-08-03T08:58:00+03:00',
    };
    const earlySecond = ledgerWithFirstRelease();
    earlySecond.releases.push({
      sequence: 2,
      slug: 'article-2',
      releasedAt: '2026-08-05T09:04:00+03:00',
      firstPublishedAt: '2026-08-05T09:04:00+03:00',
      sourceCheckedAt: '2026-08-05T09:00:00+03:00',
      revision: 1,
      contentSha256: sha('2'),
      deploySha: 'def5678',
    });

    expect(validateBlogReleaseLedger(calendar(3), earlyFirst)).toMatchObject({
      ok: false,
      errors: ['released_before_nominal_slot'],
    });
    expect(validateBlogReleaseLedger(calendar(3), earlySecond)).toMatchObject({
      ok: false,
      errors: ['released_before_previous_release_window'],
    });
  });

  it('fails closed on malformed calendar and ledger envelopes', () => {
    const brokenLedger = {
      schemaVersion: 2,
      timezone: '',
      releases: null,
    } as unknown as BlogReleaseLedger;

    expect(validateBlogReleaseLedger([entry(2)], brokenLedger)).toMatchObject({
      ok: false,
      errors: expect.arrayContaining([
        'invalid_calendar',
        'invalid_ledger_schema_version',
        'invalid_ledger_timezone',
        'invalid_ledger_releases',
      ]),
    });
  });
});

describe('blog release reservations', () => {
  it('compares immutable deployment evidence while allowing the production stamper to set the final timestamp', () => {
    const reservation = ledgerWithFirstRelease().releases[0]!;
    const stamped = {
      ...reservation,
      releasedAt: '2026-08-03T06:09:42Z',
      firstPublishedAt: '2026-08-03T06:09:42Z',
    };

    expect(isSameBlogReleaseReservation(reservation, stamped)).toBe(true);
    expect(isSameBlogReleaseReservation(reservation, {
      ...stamped,
      contentSha256: sha('tampered'),
    })).toBe(false);
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

  it('does not let a calendar entry disable the universal primary-source gate', () => {
    expect(
      getBlogReleaseReadiness(
        entry(1, {
          sourceGate: { required: false },
          researchGate: { required: false },
        }),
        {
          status: 'ready',
          contentSha256: sha('1'),
          qualityGatePassed: true,
        },
      ),
    ).toEqual({ ready: false, reasons: ['source_gate_not_passed'] });
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
        effectiveDueAt: '2026-08-03T06:00:00.000Z',
      },
      readyBuffer: 13,
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
      now: '2026-08-05T08:00:00+03:00',
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

  it('reports a complete queue and refuses malformed local cursor state', () => {
    const one = [entry(1)];
    const complete = planNextBlogRelease({
      calendar: one,
      ledger: ledgerWithFirstRelease(),
      readinessBySlug: readiness(one),
      now: '2026-08-10T12:00:00+03:00',
      scheduleEnabled: true,
      paused: false,
    });
    const malformed = planNextBlogRelease({
      calendar: one,
      ledger: { ...emptyLedger(), schemaVersion: 2 } as unknown as BlogReleaseLedger,
      readinessBySlug: readiness(one),
      now: '2026-08-10T12:00:00+03:00',
      scheduleEnabled: true,
      paused: false,
    });

    expect(complete).toMatchObject({ eligible: false, reasons: ['queue_complete'] });
    expect(malformed).toMatchObject({
      eligible: false,
      reasons: ['ledger_invalid'],
      ledgerErrors: ['invalid_ledger_schema_version'],
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
      releasedAt: '2026-08-05T09:06:00+03:00',
      firstPublishedAt: '2026-08-05T09:06:00+03:00',
      sourceCheckedAt: '2026-08-05T09:00:00+03:00',
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
        releasedAt: '2026-08-05T09:06:00+03:00',
        firstPublishedAt: '2026-08-05T09:06:00+03:00',
        sourceCheckedAt: '2026-08-05T09:00:00+03:00',
        revision: 1,
        contentSha256: sha('2'),
        deploySha: 'def5678',
      },
      {
        sequence: 3,
        slug: 'article-3',
        releasedAt: '2026-08-07T09:06:00+03:00',
        firstPublishedAt: '2026-08-07T09:06:00+03:00',
        sourceCheckedAt: '2026-08-07T09:00:00+03:00',
        revision: 1,
        contentSha256: sha('3'),
        deploySha: 'fed9012',
      },
    );
    const divergent = structuredClone(local);
    divergent.releases[0] = { ...divergent.releases[0]!, deploySha: 'deadbee' };

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

  it('fails closed when either side of reconciliation is malformed', () => {
    const local = ledgerWithFirstRelease();
    const malformed = { ...emptyLedger(), schemaVersion: 2 } as unknown as BlogReleaseLedger;

    expect(reconcileBlogReleaseLedgers(calendar(3), malformed, local)).toMatchObject({
      ok: false,
      mode: 'invalid',
      reason: 'invalid_local_ledger',
    });
    expect(reconcileBlogReleaseLedgers(calendar(3), local, malformed)).toMatchObject({
      ok: false,
      mode: 'invalid',
      reason: 'invalid_remote_ledger',
    });
  });
});

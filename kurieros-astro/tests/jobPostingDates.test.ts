import { describe, expect, it } from 'vitest';
import { resolveJobPostingDates } from '../src/utils/jobPostingDates';

describe('resolveJobPostingDates', () => {
  it('uses the content snapshot date as a mass-restore publication fallback', () => {
    const dates = resolveJobPostingDates({
      updatedAt: '2026-04-17',
      now: new Date('2026-06-24T10:00:00.000Z'),
    });

    expect(dates).toEqual({
      datePosted: '2026-04-17T00:00:00.000Z',
      validThrough: '2026-08-23T10:00:00.000Z',
    });
  });

  it('prefers an explicit original publication date and preserves a real deadline', () => {
    const dates = resolveJobPostingDates({
      postedAt: '2026-04-10',
      updatedAt: '2026-04-17',
      validThrough: '2026-07-31T23:59:59.000Z',
      now: new Date('2026-06-24T10:00:00.000Z'),
    });

    expect(dates).toEqual({
      datePosted: '2026-04-10T00:00:00.000Z',
      validThrough: '2026-07-31T23:59:59.000Z',
    });
  });

  it('falls back to the build date but never emits an invalid or expired deadline', () => {
    const missing = resolveJobPostingDates({
      now: new Date('2026-06-24T10:00:00.000Z'),
    });
    const invalid = resolveJobPostingDates({
      updatedAt: 'not-a-date',
      validThrough: 'also-not-a-date',
      now: new Date('2027-01-01T00:00:00.000Z'),
    });

    expect(missing).toEqual({
      datePosted: '2026-06-24T10:00:00.000Z',
      validThrough: '2026-08-23T10:00:00.000Z',
    });
    expect(invalid).toEqual({
      datePosted: '2027-01-01T00:00:00.000Z',
      validThrough: '2027-03-02T00:00:00.000Z',
    });
  });
});

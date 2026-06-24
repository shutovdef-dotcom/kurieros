import { describe, expect, it } from 'vitest';
import { resolveJobPostingDates } from '../src/utils/jobPostingDates';

describe('resolveJobPostingDates', () => {
  it('keeps an active evergreen vacancy valid even when source updatedAt is old', () => {
    const dates = resolveJobPostingDates({
      updatedAt: '2026-04-17',
      now: new Date('2026-06-24T10:00:00.000Z'),
    });

    expect(dates.datePosted).toBe('2026-04-17T00:00:00.000Z');
    expect(dates.validThrough).toBe('2026-08-23T23:59:59.000Z');
    expect(new Date(dates.validThrough).getTime()).toBeGreaterThan(
      new Date('2026-06-24T10:00:00.000Z').getTime(),
    );
  });

  it('falls back to the build date when source updatedAt is missing or invalid', () => {
    const dates = resolveJobPostingDates({
      updatedAt: 'not-a-date',
      now: new Date('2026-06-24T10:00:00.000Z'),
    });

    expect(dates.datePosted).toBe('2026-06-24T10:00:00.000Z');
    expect(dates.validThrough).toBe('2026-08-23T23:59:59.000Z');
  });
});

import {
  validateBlogReleaseLedger,
  type BlogCalendarEntry,
  type BlogReleaseLedger,
  type BlogReleaseRecord,
} from './blogRelease';

export type BlogReleaseManifest = {
  schemaVersion: 1;
  timezone: 'Europe/Moscow';
  /** Stable release evidence, not the wall-clock time of an arbitrary build. */
  generatedAt: string | null;
  releases: BlogReleaseRecord[];
};

/**
 * Produces the static-publication manifest from durable ledger state. A
 * transient candidate may be included for the one deployment that introduces
 * it, but it still has to validate as the immediate next strict ledger row.
 */
export const buildBlogReleaseManifest = (
  calendar: readonly BlogCalendarEntry[],
  ledger: BlogReleaseLedger,
  candidate?: BlogReleaseRecord,
): BlogReleaseManifest => {
  const effectiveLedger: BlogReleaseLedger = {
    ...ledger,
    releases: candidate ? [...ledger.releases, candidate] : [...ledger.releases],
  };
  const validation = validateBlogReleaseLedger(calendar, effectiveLedger);
  if (!validation.ok) {
    throw new Error(`Cannot emit blog release manifest: ${validation.errors.join(', ')}`);
  }

  const latestRelease = effectiveLedger.releases.at(-1);
  return {
    schemaVersion: 1,
    timezone: 'Europe/Moscow',
    // A regular rebuild must not manufacture a new freshness timestamp. The
    // last actual release is the only meaningful manifest-generation fact.
    generatedAt: latestRelease?.releasedAt ?? null,
    releases: effectiveLedger.releases,
  };
};

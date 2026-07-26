const MIN_READY_BUFFER = 12;
const RELEASE_CADENCE_WINDOW_MS = 24 * 60 * 60 * 1000;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const DEPLOY_SHA_PATTERN = /^[a-f0-9]{7,64}$/;
const ISO_INSTANT_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

export type BlogCalendarEntry = {
  sequence: number;
  slug: string;
  nominalPublishAt: string;
  sourceGate?: {
    required: boolean;
    kind?: string;
  };
  researchGate?: {
    required: boolean;
    minimumEvidence?: string;
  };
};

export type BlogReleaseReadiness = {
  status: 'ready' | 'blocked';
  contentSha256?: string;
  sourceGatePassed?: boolean;
  researchGatePassed?: boolean;
  qualityGatePassed?: boolean;
};

export type BlogHistoricalPublicationEvidence = {
  source: string;
  verifiedAt: string;
  reference: string;
};

export type BlogReleaseRecord = {
  sequence: number;
  slug: string;
  /**
   * The timestamp at which this revision was promoted to production. A
   * transient build candidate carries a provisional value only; the SSH
   * production deploy stamps the final value before publishing it.
   */
  releasedAt: string;
  /** The verified first-publication timestamp rendered as datePublished. */
  firstPublishedAt: string;
  /** Fresh source-evidence snapshot checked immediately before this release. */
  sourceCheckedAt: string;
  /** Present only after a substantive revision. */
  modifiedAt?: string;
  revision: number;
  contentSha256: string;
  deploySha: string;
  /** Required when a retained first-publication date predates this release. */
  historicalPublicationEvidence?: BlogHistoricalPublicationEvidence;
};

export type BlogReleaseLedger = {
  schemaVersion: 1;
  timezone: string;
  releases: BlogReleaseRecord[];
};

export type BlogLedgerValidationError =
  | 'invalid_calendar'
  | 'invalid_ledger_schema_version'
  | 'invalid_ledger_timezone'
  | 'invalid_ledger_releases'
  | 'release_exceeds_calendar'
  | 'release_not_strict_prefix'
  | 'missing_released_at'
  | 'invalid_released_at'
  | 'released_before_nominal_slot'
  | 'released_before_previous_release_window'
  | 'missing_first_published_at'
  | 'invalid_first_published_at'
  | 'first_published_after_released_at'
  | 'missing_source_checked_at'
  | 'invalid_source_checked_at'
  | 'source_checked_after_release'
  | 'missing_historical_publication_evidence'
  | 'invalid_historical_publication_evidence'
  | 'invalid_modified_at'
  | 'modified_at_before_first_published_at'
  | 'invalid_revision'
  | 'missing_content_sha256'
  | 'invalid_content_sha256'
  | 'missing_deploy_sha'
  | 'invalid_deploy_sha';

export type BlogLedgerValidation = {
  ok: boolean;
  errors: BlogLedgerValidationError[];
};

export type BlogReleaseReadinessReason =
  | 'missing_readiness'
  | 'content_not_ready'
  | 'missing_content_sha256'
  | 'invalid_content_sha256'
  | 'source_gate_not_passed'
  | 'research_gate_not_passed'
  | 'quality_gate_not_passed';

export type BlogReleaseReadinessDecision = {
  ready: boolean;
  reasons: BlogReleaseReadinessReason[];
};

export type BlogReleasePlanReason =
  | 'ledger_invalid'
  | 'schedule_disabled'
  | 'schedule_paused'
  | 'queue_complete'
  | 'ready_buffer_too_short'
  | 'not_due';

export type BlogReleaseCandidate = {
  sequence: number;
  slug: string;
  nominalPublishAt: string;
  effectiveDueAt: string;
};

export type BlogReleasePlan = {
  eligible: boolean;
  reasons: BlogReleasePlanReason[];
  candidate: BlogReleaseCandidate | undefined;
  readyBuffer: number;
  requiredReadyBuffer: number;
  ledgerErrors: BlogLedgerValidationError[];
};

export type BlogReleasePlanInput = {
  calendar: readonly BlogCalendarEntry[];
  ledger: BlogReleaseLedger;
  readinessBySlug: Readonly<Record<string, BlogReleaseReadiness | undefined>>;
  /** Explicit build time. The engine never reads the clock on its own. */
  now: string;
  scheduleEnabled: boolean;
  paused: boolean;
  minReadyBuffer?: number;
};

export type BlogReleaseReconciliationReason =
  | 'invalid_local_ledger'
  | 'invalid_remote_ledger'
  | 'remote_behind_local'
  | 'remote_more_than_one_ahead'
  | 'ledger_divergence';

export type BlogReleaseReconciliation =
  | {
      ok: true;
      mode: 'equal' | 'remote_ahead_by_one' | 'local_ahead_revision';
      releaseToRecover: BlogReleaseRecord | undefined;
    }
  | {
      ok: false;
      mode: 'invalid';
      reason: BlogReleaseReconciliationReason;
      localErrors?: BlogLedgerValidationError[];
      remoteErrors?: BlogLedgerValidationError[];
      releaseToRecover: undefined;
    };

const unique = <T>(values: readonly T[]): T[] => [...new Set(values)];

const parseInstant = (value: unknown): Date | undefined => {
  if (typeof value !== 'string' || !ISO_INSTANT_PATTERN.test(value)) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const requiredInstantError = (
  value: unknown,
  missing: BlogLedgerValidationError,
  invalid: BlogLedgerValidationError,
  errors: BlogLedgerValidationError[],
): Date | undefined => {
  if (value === undefined || value === null || value === '') {
    errors.push(missing);
    return undefined;
  }
  const date = parseInstant(value);
  if (!date) errors.push(invalid);
  return date;
};

const isValidCalendar = (calendar: readonly BlogCalendarEntry[]): boolean => {
  const slugs = new Set<string>();
  return calendar.every((entry, index) => {
    if (
      !entry ||
      entry.sequence !== index + 1 ||
      typeof entry.slug !== 'string' ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.slug) ||
      !parseInstant(entry.nominalPublishAt) ||
      slugs.has(entry.slug)
    ) {
      return false;
    }
    slugs.add(entry.slug);
    return true;
  });
};

const isHistoricalEvidenceValid = (
  evidence: BlogHistoricalPublicationEvidence | undefined,
): boolean =>
  Boolean(
    evidence &&
      typeof evidence.source === 'string' &&
      evidence.source.trim() &&
      typeof evidence.reference === 'string' &&
      evidence.reference.trim() &&
      parseInstant(evidence.verifiedAt),
  );

/**
 * Validates that released rows are a contiguous prefix of the calendar. It
 * deliberately never fills dates from a nominal slot or from the current time.
 */
export const validateBlogReleaseLedger = (
  calendar: readonly BlogCalendarEntry[],
  ledger: BlogReleaseLedger,
): BlogLedgerValidation => {
  const errors: BlogLedgerValidationError[] = [];
  if (!isValidCalendar(calendar)) errors.push('invalid_calendar');

  if (!ledger || ledger.schemaVersion !== 1) {
    errors.push('invalid_ledger_schema_version');
  }
  if (!ledger || typeof ledger.timezone !== 'string' || !ledger.timezone.trim()) {
    errors.push('invalid_ledger_timezone');
  }
  if (!ledger || !Array.isArray(ledger.releases)) {
    errors.push('invalid_ledger_releases');
    return { ok: false, errors: unique(errors) };
  }

  let previousReleasedAt: Date | undefined;
  for (const [index, release] of ledger.releases.entries()) {
    const expected = calendar[index];
    if (!expected) {
      errors.push('release_exceeds_calendar');
    } else if (release?.sequence !== expected.sequence || release?.slug !== expected.slug) {
      errors.push('release_not_strict_prefix');
    }

    const releasedAt = requiredInstantError(
      release?.releasedAt,
      'missing_released_at',
      'invalid_released_at',
      errors,
    );
    const firstPublishedAt = requiredInstantError(
      release?.firstPublishedAt,
      'missing_first_published_at',
      'invalid_first_published_at',
      errors,
    );
    const sourceCheckedAt = requiredInstantError(
      release?.sourceCheckedAt,
      'missing_source_checked_at',
      'invalid_source_checked_at',
      errors,
    );
    const nominalAt = expected ? parseInstant(expected.nominalPublishAt) : undefined;
    if (releasedAt && nominalAt && releasedAt.getTime() < nominalAt.getTime()) {
      errors.push('released_before_nominal_slot');
    }
    if (
      releasedAt &&
      previousReleasedAt &&
      releasedAt.getTime() < previousReleasedAt.getTime() + RELEASE_CADENCE_WINDOW_MS
    ) {
      errors.push('released_before_previous_release_window');
    }
    if (releasedAt) previousReleasedAt = releasedAt;
    if (releasedAt && firstPublishedAt) {
      if (firstPublishedAt.getTime() > releasedAt.getTime()) {
        errors.push('first_published_after_released_at');
      }
      if (
        firstPublishedAt.getTime() < releasedAt.getTime() &&
        !isHistoricalEvidenceValid(release?.historicalPublicationEvidence)
      ) {
        errors.push('missing_historical_publication_evidence');
      }
    }
    if (releasedAt && sourceCheckedAt && sourceCheckedAt.getTime() >= releasedAt.getTime()) {
      errors.push('source_checked_after_release');
    }

    if (release?.historicalPublicationEvidence && !isHistoricalEvidenceValid(release.historicalPublicationEvidence)) {
      errors.push('invalid_historical_publication_evidence');
    }

    if (release?.modifiedAt !== undefined && release.modifiedAt !== null && release.modifiedAt !== '') {
      const modifiedAt = parseInstant(release.modifiedAt);
      if (!modifiedAt) {
        errors.push('invalid_modified_at');
      } else if (firstPublishedAt && modifiedAt.getTime() < firstPublishedAt.getTime()) {
        errors.push('modified_at_before_first_published_at');
      }
    }

    if (!Number.isInteger(release?.revision) || (release?.revision ?? 0) < 1) {
      errors.push('invalid_revision');
    }
    if (!release?.contentSha256) {
      errors.push('missing_content_sha256');
    } else if (!SHA256_PATTERN.test(release.contentSha256)) {
      errors.push('invalid_content_sha256');
    }
    if (!release?.deploySha) {
      errors.push('missing_deploy_sha');
    } else if (!DEPLOY_SHA_PATTERN.test(release.deploySha)) {
      errors.push('invalid_deploy_sha');
    }
  }

  const uniqueErrors = unique(errors);
  return { ok: uniqueErrors.length === 0, errors: uniqueErrors };
};

/**
 * Returns a scheduling moment only. It is never a publication timestamp and
 * cannot be used as a fallback for ledger dates.
 */
export const getEffectiveBlogReleaseDueAt = (
  entry: Pick<BlogCalendarEntry, 'nominalPublishAt'>,
  lastRelease?: Pick<BlogReleaseRecord, 'releasedAt'>,
): string => {
  const nominal = parseInstant(entry.nominalPublishAt);
  if (!nominal) throw new Error('nominalPublishAt must be an ISO timestamp with timezone');

  const minimumAfterLastRelease = lastRelease
    ? parseInstant(lastRelease.releasedAt)
    : undefined;
  if (lastRelease && !minimumAfterLastRelease) {
    throw new Error('last release must have an ISO releasedAt timestamp with timezone');
  }

  const dueAt = Math.max(
    nominal.getTime(),
    minimumAfterLastRelease
      ? minimumAfterLastRelease.getTime() + RELEASE_CADENCE_WINDOW_MS
      : Number.NEGATIVE_INFINITY,
  );
  return new Date(dueAt).toISOString();
};

/**
 * Fail-closed release readiness. A missing source gate is treated as required
 * so integrations cannot accidentally publish an unverified article.
 */
export const getBlogReleaseReadiness = (
  entry: BlogCalendarEntry,
  readiness: BlogReleaseReadiness | undefined,
): BlogReleaseReadinessDecision => {
  if (!readiness) return { ready: false, reasons: ['missing_readiness'] };

  const reasons: BlogReleaseReadinessReason[] = [];
  if (readiness.status !== 'ready') reasons.push('content_not_ready');
  if (!readiness.contentSha256) reasons.push('missing_content_sha256');
  else if (!SHA256_PATTERN.test(readiness.contentSha256)) reasons.push('invalid_content_sha256');
  // Every public article has a primary-source registry entry and release
  // evidence. A calendar typo must never opt it out of that universal gate.
  if (readiness.sourceGatePassed !== true) {
    reasons.push('source_gate_not_passed');
  }
  if (entry.researchGate?.required === true && readiness.researchGatePassed !== true) {
    reasons.push('research_gate_not_passed');
  }
  if (readiness.qualityGatePassed !== true) reasons.push('quality_gate_not_passed');

  return { ready: reasons.length === 0, reasons };
};

const getReadyBuffer = (
  calendar: readonly BlogCalendarEntry[],
  startIndex: number,
  readinessBySlug: Readonly<Record<string, BlogReleaseReadiness | undefined>>,
): number => {
  let ready = 0;
  for (const entry of calendar.slice(startIndex)) {
    if (!getBlogReleaseReadiness(entry, readinessBySlug[entry.slug]).ready) break;
    ready += 1;
  }
  return ready;
};

const resolveMinReadyBuffer = (value: number | undefined): number => {
  if (value === undefined) return MIN_READY_BUFFER;
  if (!Number.isInteger(value) || value < 1) {
    throw new Error('minReadyBuffer must be a positive integer');
  }
  return value;
};

/**
 * Chooses at most one next item. It does not mutate a ledger or manufacture a
 * release time; a deployment must record the actual result separately.
 */
export const planNextBlogRelease = ({
  calendar,
  ledger,
  readinessBySlug,
  now,
  scheduleEnabled,
  paused,
  minReadyBuffer,
}: BlogReleasePlanInput): BlogReleasePlan => {
  const ledgerValidation = validateBlogReleaseLedger(calendar, ledger);
  const base = {
    candidate: undefined,
    readyBuffer: 0,
    requiredReadyBuffer: 0,
    ledgerErrors: ledgerValidation.errors,
  } satisfies Pick<BlogReleasePlan, 'candidate' | 'readyBuffer' | 'requiredReadyBuffer' | 'ledgerErrors'>;

  if (!ledgerValidation.ok) {
    return { eligible: false, reasons: ['ledger_invalid'], ...base };
  }
  if (!scheduleEnabled) {
    return { eligible: false, reasons: ['schedule_disabled'], ...base };
  }
  if (paused) {
    return { eligible: false, reasons: ['schedule_paused'], ...base };
  }

  const nextIndex = ledger.releases.length;
  const next = calendar[nextIndex];
  if (!next) {
    return { eligible: false, reasons: ['queue_complete'], ...base };
  }

  const nowAt = parseInstant(now);
  if (!nowAt) throw new Error('now must be an ISO timestamp with timezone');
  const lastRelease = ledger.releases.at(-1);
  const effectiveDueAt = getEffectiveBlogReleaseDueAt(next, lastRelease);
  const candidate: BlogReleaseCandidate = {
    sequence: next.sequence,
    slug: next.slug,
    nominalPublishAt: next.nominalPublishAt,
    effectiveDueAt,
  };
  const requiredReadyBuffer = Math.min(
    resolveMinReadyBuffer(minReadyBuffer),
    calendar.length - nextIndex,
  );
  const readyBuffer = getReadyBuffer(calendar, nextIndex, readinessBySlug);
  const candidateBase = {
    candidate,
    readyBuffer,
    requiredReadyBuffer,
    ledgerErrors: ledgerValidation.errors,
  };

  if (readyBuffer < requiredReadyBuffer) {
    return { eligible: false, reasons: ['ready_buffer_too_short'], ...candidateBase };
  }
  if (nowAt.getTime() < new Date(effectiveDueAt).getTime()) {
    return { eligible: false, reasons: ['not_due'], ...candidateBase };
  }
  return { eligible: true, reasons: [], ...candidateBase };
};

export const getBlogReleaseRecordFingerprint = (record: BlogReleaseRecord): string =>
  JSON.stringify({
    sequence: record.sequence,
    slug: record.slug,
    releasedAt: record.releasedAt,
    firstPublishedAt: record.firstPublishedAt,
    sourceCheckedAt: record.sourceCheckedAt,
    modifiedAt: record.modifiedAt,
    revision: record.revision,
    contentSha256: record.contentSha256,
    deploySha: record.deploySha,
    historicalPublicationEvidence: record.historicalPublicationEvidence
      ? {
          source: record.historicalPublicationEvidence.source,
          verifiedAt: record.historicalPublicationEvidence.verifiedAt,
          reference: record.historicalPublicationEvidence.reference,
        }
      : undefined,
  });

const hasStrictRecordPrefix = (
  prefix: readonly BlogReleaseRecord[],
  full: readonly BlogReleaseRecord[],
): boolean =>
  prefix.length <= full.length &&
  prefix.every((record, index) =>
    getBlogReleaseRecordFingerprint(record) === getBlogReleaseRecordFingerprint(full[index]!),
  );

/**
 * The production deploy stamps the publication timestamp immediately before
 * promotion. These fields are intentionally excluded from the reservation
 * comparison; all editorial and deployment identity fields must still match.
 */
export const isSameBlogReleaseReservation = (
  expected: BlogReleaseRecord,
  observed: BlogReleaseRecord,
): boolean =>
  expected.sequence === observed.sequence &&
  expected.slug === observed.slug &&
  expected.revision === observed.revision &&
  expected.contentSha256 === observed.contentSha256 &&
  expected.deploySha === observed.deploySha &&
  expected.sourceCheckedAt === observed.sourceCheckedAt &&
  JSON.stringify(expected.historicalPublicationEvidence ?? null) ===
    JSON.stringify(observed.historicalPublicationEvidence ?? null);

const isLocalRevisionOfRemoteRelease = (
  local: BlogReleaseRecord,
  remote: BlogReleaseRecord,
): boolean =>
  local.sequence === remote.sequence &&
  local.slug === remote.slug &&
  local.releasedAt === remote.releasedAt &&
  local.firstPublishedAt === remote.firstPublishedAt &&
  local.sourceCheckedAt === remote.sourceCheckedAt &&
  local.deploySha === remote.deploySha &&
  local.revision > remote.revision &&
  Boolean(local.modifiedAt) &&
  local.contentSha256 !== remote.contentSha256 &&
  JSON.stringify(local.historicalPublicationEvidence ?? null) ===
    JSON.stringify(remote.historicalPublicationEvidence ?? null);

/**
 * Reconciles version-controlled ledger state with the deployed manifest. The
 * recoverable states are a production manifest exactly one valid release ahead
 * of the local ledger, or a local content revision of the latest already
 * published release. Other divergences still stop the pipeline.
 */
export const reconcileBlogReleaseLedgers = (
  calendar: readonly BlogCalendarEntry[],
  local: BlogReleaseLedger,
  remote: BlogReleaseLedger,
): BlogReleaseReconciliation => {
  const localValidation = validateBlogReleaseLedger(calendar, local);
  if (!localValidation.ok) {
    return {
      ok: false,
      mode: 'invalid',
      reason: 'invalid_local_ledger',
      localErrors: localValidation.errors,
      releaseToRecover: undefined,
    };
  }
  const remoteValidation = validateBlogReleaseLedger(calendar, remote);
  if (!remoteValidation.ok) {
    return {
      ok: false,
      mode: 'invalid',
      reason: 'invalid_remote_ledger',
      remoteErrors: remoteValidation.errors,
      releaseToRecover: undefined,
    };
  }

  if (remote.releases.length < local.releases.length) {
    return {
      ok: false,
      mode: 'invalid',
      reason: 'remote_behind_local',
      releaseToRecover: undefined,
    };
  }
  if (remote.releases.length > local.releases.length + 1) {
    return {
      ok: false,
      mode: 'invalid',
      reason: 'remote_more_than_one_ahead',
      releaseToRecover: undefined,
    };
  }
  if (remote.releases.length === local.releases.length) {
    const localLast = local.releases.at(-1);
    const remoteLast = remote.releases.at(-1);
    const localPrefix = local.releases.slice(0, -1);
    const remotePrefix = remote.releases.slice(0, -1);
    if (
      localLast &&
      remoteLast &&
      hasStrictRecordPrefix(localPrefix, remotePrefix) &&
      isLocalRevisionOfRemoteRelease(localLast, remoteLast)
    ) {
      return { ok: true, mode: 'local_ahead_revision', releaseToRecover: undefined };
    }
  }
  if (!hasStrictRecordPrefix(local.releases, remote.releases)) {
    return {
      ok: false,
      mode: 'invalid',
      reason: 'ledger_divergence',
      releaseToRecover: undefined,
    };
  }
  if (remote.releases.length === local.releases.length) {
    return { ok: true, mode: 'equal', releaseToRecover: undefined };
  }
  return {
    ok: true,
    mode: 'remote_ahead_by_one',
    releaseToRecover: remote.releases.at(-1),
  };
};

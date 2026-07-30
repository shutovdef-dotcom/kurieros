type ResolveJobPostingDatesInput = {
  /** Original publication date when the source exposes it. */
  postedAt?: string | null;
  /**
   * Content snapshot date. In the aggressive Google Jobs restore mode this is
   * allowed as a datePosted fallback so every active vacancy detail page can
   * carry complete JobPosting markup.
   */
  updatedAt?: string | null;
  /**
   * Real source deadline when the source exposes one. Expired or invalid
   * values are never emitted for active pages; they fall back to the rolling
   * restore deadline.
   */
  validThrough?: string | null;
  /**
   * Build/freshness date used for the aggressive restore fallback and for the
   * rolling active vacancy deadline.
   */
  now?: Date;
};

type ResolvedJobPostingDates = {
  datePosted?: string;
  validThrough?: string;
};

const parseValidDate = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const addDays = (date: Date, days: number): Date => {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

export const resolveJobPostingDates = ({
  postedAt,
  updatedAt,
  validThrough,
  now = new Date(),
}: ResolveJobPostingDatesInput): ResolvedJobPostingDates => {
  const restoreFreshnessDate = Number.isNaN(now.getTime()) ? new Date() : now;
  const sourcePublicationDate =
    parseValidDate(postedAt) ??
    parseValidDate(updatedAt) ??
    restoreFreshnessDate;
  const sourceDeadline = parseValidDate(validThrough);
  const rollingDeadline = addDays(restoreFreshnessDate, 60);
  const safeDeadline =
    sourceDeadline && sourceDeadline.getTime() > restoreFreshnessDate.getTime()
      ? sourceDeadline
      : rollingDeadline;

  return {
    datePosted: sourcePublicationDate.toISOString(),
    validThrough: safeDeadline.toISOString(),
  };
};

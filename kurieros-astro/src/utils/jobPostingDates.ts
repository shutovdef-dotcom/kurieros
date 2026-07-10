type ResolveJobPostingDatesInput = {
  /** Original publication date when the source exposes it. */
  postedAt?: string | null;
  /** Legacy content date. Retained for callers but never used as datePosted. */
  updatedAt?: string | null;
  /** Real source deadline. Omitted when the source does not expose one. */
  validThrough?: string | null;
  /**
   * Retained for backwards-compatible callers and deterministic regression
   * tests. It must never influence structured-data dates.
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

export const resolveJobPostingDates = ({
  postedAt,
  validThrough,
}: ResolveJobPostingDatesInput): ResolvedJobPostingDates => {
  const sourcePublicationDate = parseValidDate(postedAt);
  const sourceDeadline = parseValidDate(validThrough);

  return {
    ...(sourcePublicationDate
      ? { datePosted: sourcePublicationDate.toISOString() }
      : {}),
    ...(sourceDeadline ? { validThrough: sourceDeadline.toISOString() } : {}),
  };
};

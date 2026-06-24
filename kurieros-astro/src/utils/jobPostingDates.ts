const DEFAULT_VALIDITY_DAYS = 60;

type ResolveJobPostingDatesInput = {
  updatedAt?: string | null;
  now?: Date;
  validityDays?: number;
};

type ResolvedJobPostingDates = {
  datePosted: string;
  validThrough: string;
};

const parseValidDate = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const resolveNow = (now: Date | undefined): Date => {
  if (!now || Number.isNaN(now.getTime())) return new Date();
  return now;
};

const resolveValidityDays = (validityDays: number | undefined): number => {
  if (!Number.isFinite(validityDays) || !validityDays || validityDays < 1) {
    return DEFAULT_VALIDITY_DAYS;
  }
  return Math.floor(validityDays);
};

const buildUtcEndOfDayPlusDays = (base: Date, days: number): Date => {
  const result = new Date(Date.UTC(
    base.getUTCFullYear(),
    base.getUTCMonth(),
    base.getUTCDate(),
  ));
  result.setUTCDate(result.getUTCDate() + days);
  result.setUTCHours(23, 59, 59, 0);
  return result;
};

export const resolveJobPostingDates = ({
  updatedAt,
  now,
  validityDays,
}: ResolveJobPostingDatesInput): ResolvedJobPostingDates => {
  const generatedAt = resolveNow(now);
  const sourceDate = parseValidDate(updatedAt);
  const datePosted = sourceDate ?? generatedAt;
  const validityBase =
    sourceDate && sourceDate.getTime() > generatedAt.getTime()
      ? sourceDate
      : generatedAt;

  return {
    datePosted: datePosted.toISOString(),
    validThrough: buildUtcEndOfDayPlusDays(
      validityBase,
      resolveValidityDays(validityDays),
    ).toISOString(),
  };
};

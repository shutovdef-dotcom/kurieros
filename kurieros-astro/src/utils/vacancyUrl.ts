type VacancyUrlJob = {
  slug: string;
  detailSlug?: string;
  detailAnchor?: string;
};

const normalizeAnchor = (anchor?: string): string => {
  if (!anchor) return '';
  return anchor.startsWith('#') ? anchor : `#${anchor}`;
};

export const getVacancyDetailSlug = (job: VacancyUrlJob): string =>
  job.detailSlug ?? job.slug;

export const getVacancyCanonicalPath = (job: VacancyUrlJob): string =>
  `/v/${getVacancyDetailSlug(job)}/`;

export const getVacancyDetailPath = (job: VacancyUrlJob): string =>
  `${getVacancyCanonicalPath(job)}${normalizeAnchor(job.detailAnchor)}`;

export const getVacancyCanonicalUrl = (
  job: VacancyUrlJob,
  siteUrl?: string | URL,
): string => new URL(getVacancyCanonicalPath(job), siteUrl ?? 'https://kurerok.ru').toString();

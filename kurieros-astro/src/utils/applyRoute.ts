type ApplyRouteJob = {
  slug: string;
  applyLink?: string;
};

const LEAD_FORM_PREFIX = 'lead-form:';
const APPLY_PAGE_PATH = '/apply/';

export const isLeadFormApplyLink = (applyLink: string | undefined): boolean =>
  typeof applyLink === 'string' && applyLink.startsWith(LEAD_FORM_PREFIX);

export const isExternalApplyLink = (applyLink: string | undefined): boolean => {
  if (!applyLink || isLeadFormApplyLink(applyLink)) return false;
  try {
    const url = new URL(applyLink);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
};

export const getApplyPagePath = (job: Pick<ApplyRouteJob, 'slug'>): string =>
  `${APPLY_PAGE_PATH}?job=${encodeURIComponent(job.slug)}`;

export const getApplyHref = (
  job: ApplyRouteJob,
  fallbackHref = '#',
): string => (isExternalApplyLink(job.applyLink) ? getApplyPagePath(job) : fallbackHref);

export const getApplyPartnerDomain = (job: Pick<ApplyRouteJob, 'applyLink'>): string => {
  if (!isExternalApplyLink(job.applyLink)) return '';
  try {
    return new URL(job.applyLink ?? '').hostname;
  } catch {
    return '';
  }
};

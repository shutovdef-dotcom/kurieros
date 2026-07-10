import type { GeneratedJob } from '../data/vacancyTypes';
import type { JobLike } from './companies';

export type JobCardViewModel = Pick<
  GeneratedJob,
  | 'id'
  | 'slug'
  | 'detailSlug'
  | 'detailAnchor'
  | 'sourceSlug'
  | 'title'
  | 'company'
  | 'companyLogo'
  | 'salary'
  | 'currency'
  | 'location'
  | 'tags'
  | 'labels'
  | 'applyLink'
  | 'shortDescription'
  | 'transport'
  | 'isHot'
  | 'ozonLeadForm'
  | 'sourceCheckedAt'
  | 'applyVerifiedAt'
  | 'applyFlowVerified'
> & {
  details: Pick<GeneratedJob['details'], 'schedule' | 'education' | 'payment_freq' | 'employment_type'>;
};

export type CompanyVacancyCardViewModel = Pick<
  JobLike,
  'slug' | 'detailSlug' | 'detailAnchor' | 'title' | 'salary' | 'location' | 'shortDescription'
> & {
  labels: string[];
};

type CompanyVacancyCardSource = JobLike & {
  labels?: unknown;
};

export const toJobCardViewModel = (job: GeneratedJob): JobCardViewModel => ({
  id: job.id,
  slug: job.slug,
  detailSlug: job.detailSlug,
  detailAnchor: job.detailAnchor,
  sourceSlug: job.sourceSlug,
  title: job.title,
  company: job.company,
  companyLogo: job.companyLogo,
  salary: job.salary,
  currency: job.currency,
  location: job.location,
  tags: job.tags,
  labels: job.labels,
  applyLink: job.applyLink,
  shortDescription: job.shortDescription,
  transport: job.transport,
  isHot: job.isHot,
  ozonLeadForm: job.ozonLeadForm,
  sourceCheckedAt: job.sourceCheckedAt,
  applyVerifiedAt: job.applyVerifiedAt,
  applyFlowVerified: job.applyFlowVerified,
  details: {
    schedule: job.details.schedule,
    education: job.details.education,
    payment_freq: job.details.payment_freq,
    employment_type: job.details.employment_type,
  },
});

export const toCompanyVacancyCardViewModel = (
  job: CompanyVacancyCardSource,
): CompanyVacancyCardViewModel => ({
  slug: job.slug,
  detailSlug: job.detailSlug,
  detailAnchor: job.detailAnchor,
  title: job.title,
  salary: job.salary,
  location: job.location,
  shortDescription: job.shortDescription,
  labels: Array.isArray(job.labels) ? job.labels.filter((label): label is string => typeof label === 'string') : [],
});

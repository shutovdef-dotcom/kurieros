import type { GeneratedJob, VacancySubjectVariant } from '../data/vacancyTypes';
import { isExternalApplyLink } from './applyRoute';

export type ApplyManifest = {
  version: 1;
  targets: Record<string, string>;
};

const buildVariantEntry = (
  job: GeneratedJob,
  variant: VacancySubjectVariant,
): readonly [string, string] | null => {
  if (!isExternalApplyLink(variant.applyLink)) return null;
  return [`${job.slug}--${variant.id}`, variant.applyLink ?? ''];
};

export const buildApplyManifest = (jobs: GeneratedJob[]): ApplyManifest => {
  const targetsBySlug = new Map<string, string>();

  for (const job of jobs) {
    if (isExternalApplyLink(job.applyLink) && !targetsBySlug.has(job.slug)) {
      targetsBySlug.set(job.slug, job.applyLink);
    }

    for (const variant of job.subjectVariants ?? []) {
      const variantEntry = buildVariantEntry(job, variant);
      if (variantEntry && !targetsBySlug.has(variantEntry[0])) {
        targetsBySlug.set(variantEntry[0], variantEntry[1]);
      }
    }
  }

  return {
    version: 1,
    targets: Object.fromEntries(Array.from(targetsBySlug.entries()).sort(([a], [b]) => a.localeCompare(b))),
  };
};

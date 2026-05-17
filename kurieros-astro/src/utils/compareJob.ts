// Shared projection from a generated job to the slim `CompareJob` shape
// the /compare/ page renders.
//
// Two surfaces need this exact projection:
//   - `src/pages/compare.astro` — SSR-renders the 4 preselected jobs.
//   - `src/pages/api/compare-jobs.json.ts` — serves the full catalogue
//     the client lazy-loads.
// They previously each carried a byte-identical hand-synced copy of
// `mapCompareJob` plus the 3 label helpers (audit v3 NEW-2 / M19). A
// field added to one and forgotten in the other would render for the 4
// inline jobs but blank for every job the user adds via the filter.
// One owner here removes that drift class.
//
// `mapCompareJob`'s return type is annotated `CompareJob` (the runtime
// interface in `src/scripts/compare/types.ts`) so any divergence between
// this projection and the interface is a compile error.

import type { GeneratedJob } from '../data/vacancyTypes';
import type { CompareJob } from '../scripts/compare/types';
import { slugifyCompany } from './companies';

const TRANSPORT_LABELS: Record<string, string> = {
  auto: 'Авто',
  bicycle: 'Велосипед / самокат',
  foot: 'Пешком',
  remote: 'Удалённо / офис',
};

/** Human-readable transport label from a job's tag list (first match wins). */
const getTransportLabel = (tags: string[]): string => {
  const tag = tags.find((t) => t in TRANSPORT_LABELS);
  return tag ? TRANSPORT_LABELS[tag] : 'Смешанный формат';
};

/** Human-readable label for who provides the transport. */
const getTransportProvisionLabel = (
  provision: 'own' | 'company' | 'not_required',
): string => {
  if (provision === 'company') return 'Компания выдает транспортное средство';
  if (provision === 'not_required') return 'Транспорт не требуется';
  return 'Нужно своё транспортное средство';
};

/** Normalize a free-form OS requirement string to one of the 3 displayed values. */
const normalizeOsRequirement = (value?: string): string => {
  const normalized = String(value ?? '').trim().toLowerCase();
  const hasAndroid = /android|андроид/.test(normalized);
  const hasIos = /(?:^|[^a-z])ios(?:[^a-z]|$)|iphone|ipad|айос|айфон/.test(normalized);
  if (hasAndroid && hasIos) return 'Android или iOS';
  if (hasIos) return 'iOS';
  if (hasAndroid) return 'Android';
  return 'Android или iOS';
};

/** Project a generated job down to the slim `CompareJob` the comparison grid renders. */
export const mapCompareJob = (job: GeneratedJob): CompareJob => {
  const companySlug = slugifyCompany(job.company);
  return {
    id: job.id,
    slug: job.slug,
    title: job.title,
    company: job.company,
    companyLogo: job.companyLogo,
    companySlug,
    salary: job.salary,
    location: job.location,
    transport: getTransportLabel(job.tags),
    transport_provision: getTransportProvisionLabel(job.transportProvision),
    contract: job.details.employment_type,
    citizenship: job.details.citizenship,
    payout: job.details.payment_freq,
    bonus: job.benefits[0] || 'Условия уточняются при отклике',
    age: job.details.age,
    os: normalizeOsRequirement(job.details.os),
    link: `/v/${job.slug}/`,
  };
};

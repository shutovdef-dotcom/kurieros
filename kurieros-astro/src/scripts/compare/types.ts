// Shared types for the /compare/ page client-side modules.
//
// These modules ship to the browser as a bundled ES module (see
// `compareInit.ts`). They run on two data sources with the SAME shape:
//   - the 4 preselected jobs inlined into the page via a
//     `<script type="application/json">` tag (server-rendered in
//     `compare.astro`), and
//   - the full catalog fetched lazily from `/api/v1/compare-jobs.json`.
//
// `CompareJob` is the single slim-job shape produced by the `mapCompareJob`
// projection in `src/utils/compareJob.ts` (audit fix M19 — it used to be a
// hand-synced copy in `compare.astro` frontmatter). That one projection
// feeds `src/pages/api/v1/compare-jobs.json.ts#GET`, the SSR `CompareGrid.astro`,
// and these client modules — all consume the same record. `mapCompareJob`'s
// return type is annotated `CompareJob`, so any drift from this interface is
// a compile error.

/** A single comparable vacancy, projected down to the fields the grid shows. */
export interface CompareJob {
  id: number;
  slug: string;
  title: string;
  company: string;
  companyLogo: string | null;
  companySlug: string;
  salary: string;
  location: string;
  transport: string;
  transport_provision: string;
  contract: string;
  citizenship: string;
  payout: string;
  bonus: string;
  age: string;
  os: string;
  link: string;
}

/**
 * Keys of `CompareJob` that hold a plain string and are therefore safe to
 * render as a feature-row value. Excludes `id` (number) and `companyLogo`
 * (nullable) so `feature.key` indexing into a job stays type-safe.
 */
export type CompareFeatureKey = Exclude<keyof CompareJob, 'id' | 'companyLogo'>;

/** A single feature row in the comparison table (label + which job field it reads). */
export interface Feature {
  key: CompareFeatureKey;
  name: string;
}

/**
 * Server data handed to `initComparePage`. Serialized into a
 * `<script type="application/json">` tag in `compare.astro` and parsed
 * back by the bundled module on `DOMContentLoaded`.
 */
export interface CompareData {
  /** The 4 preselected jobs already rendered into the SSR grid. */
  compareJobs: CompareJob[];
  /** Feature-row definitions (label + job field key). */
  features: Feature[];
  /** Total count of active vacancies — drives the empty-state copy. */
  totalCompareJobs: number;
}

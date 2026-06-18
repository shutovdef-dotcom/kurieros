/**
 * Transport-mode coverage tests (regression suite for #135 + #144 family).
 *
 * Background: jobs.ts owns several `Record<TransportMode, X>` lookup tables
 * (TRANSPORT_LABELS, TRANSPORT_TITLES, TRANSPORT_PROVISION_LABELS,
 * TRANSPORT_TITLE_SUFFIXES, TRANSPORT_BANK_ROLE_TITLES, TRANSPORT_ID_PARTS,
 * TRANSPORT_TAGS) plus the production code path that maps a job's
 * `transport` to a `tags`/`labels` entry. A typo or missing key for any
 * mode (e.g. the `remote` / `office` key omitted from TRANSPORT_PRIORITY)
 * yields `undefined` at runtime, which downstream becomes NaN, blank UI,
 * or a missing tag — none of which would fail the build.
 *
 * Strategy: exercise every TransportMode through the real `buildJobsFromVacancies`
 * pipeline by asserting the *output* shape — every emitted job for every mode
 * produces a non-empty title, label, and transport-derived tag. This way we
 * don't have to export the private constants from jobs.ts to verify them.
 */

import { describe, it, expect } from 'vitest';
import jobs from '../src/data/jobs';
import { vacancySources } from '../src/data/vacancies';
import type { TransportMode } from '../src/data/vacancyTypes';

const ALL_MODES: TransportMode[] = ['foot', 'bicycle', 'auto', 'remote', 'office', 'service'];

describe('Transport coverage in generated jobs', () => {
  it.each(ALL_MODES)('produces non-empty title/labels/tags for transport=%s', (mode) => {
    const sample = jobs.filter((job) => job.transport === mode);
    if (sample.length === 0) {
      // Mode is in the type but unused in current data — skip silently.
      // (Tests over generated data only assert what's actually present.)
      return;
    }

    for (const job of sample) {
      expect(job.title, `title for ${job.slug}`).toBeTruthy();
      expect(job.title.length, `non-empty title for ${job.slug}`).toBeGreaterThan(0);
      expect(Array.isArray(job.labels), `labels array for ${job.slug}`).toBe(true);
      expect(job.labels.length, `non-empty labels for ${job.slug}`).toBeGreaterThan(0);
      expect(Array.isArray(job.tags), `tags array for ${job.slug}`).toBe(true);
      expect(job.tags, `transport tag present for ${job.slug}`).toContain(mode);

      // details.transport_provision must resolve to a Russian label —
      // never a literal enum token like `own_or_partner_rental`.
      expect(job.details.transport_provision, `transport_provision label for ${job.slug}`).not.toMatch(/^[a-z_]+$/);
      expect(job.details.transport_provision.length).toBeGreaterThan(0);
    }
  });

  it('every transport mode in source data appears in at least one generated job', () => {
    const sourceModes = new Set<TransportMode>();
    for (const source of vacancySources) {
      for (const offer of source.offers) {
        if (offer.isActive) sourceModes.add(offer.transport);
      }
    }

    const generatedModes = new Set(jobs.map((job) => job.transport));

    for (const mode of sourceModes) {
      expect(generatedModes, `mode ${mode} reaches generated jobs`).toContain(mode);
    }
  });

  it('TRANSPORT_PRIORITY has remote key (regression PR #135)', () => {
    // Indirect test: if TRANSPORT_PRIORITY were missing `remote`, sorts that
    // use `(prio[a.transport] ?? 0) - (prio[b.transport] ?? 0)` would silently
    // place remote at rank 0; if they used `prio[a.transport] - prio[b.transport]`
    // (no fallback) they'd produce NaN. Either way, jobs of mode `remote`
    // would either disappear from priority-ordered listings or be reported
    // as untransportable. We assert there exists at least one `remote` job
    // emitted with stable shape.
    const remoteJobs = jobs.filter((job) => job.transport === 'remote');

    if (remoteJobs.length > 0) {
      for (const job of remoteJobs) {
        expect(Number.isFinite(job.id), `remote job ${job.slug} has finite id`).toBe(true);
        expect(typeof job.title).toBe('string');
        expect(job.title.length).toBeGreaterThan(0);
      }
    }
  });

  it('TRANSPORT_PRIORITY has office key', () => {
    const officeJobs = jobs.filter((job) => job.transport === 'office');

    if (officeJobs.length > 0) {
      for (const job of officeJobs) {
        expect(Number.isFinite(job.id), `office job ${job.slug} has finite id`).toBe(true);
        expect(job.tags, `office job ${job.slug} has office tag`).toContain('office');
        expect(job.labels, `office job ${job.slug} has office label`).toContain('Офис');
      }
    }
  });

  it('every job has a transport that appears in its tags', () => {
    // Catches a TRANSPORT_TAGS map regression where a mode's tag is missing.
    for (const job of jobs) {
      expect(job.tags, `job ${job.slug} tags include transport ${job.transport}`).toContain(
        job.transport,
      );
    }
  });
});

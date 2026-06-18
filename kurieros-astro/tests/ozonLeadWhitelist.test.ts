import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import jobsData from '../src/data/jobs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const readProjectFile = (path: string): string =>
  readFileSync(join(ROOT, path), 'utf8');

const whitelistSource = readProjectFile('workers/ozon-lead/src/whitelist.js');

const getWhitelistSlug = (meta: NonNullable<(typeof jobsData)[number]['ozonLeadForm']>): string =>
  meta.customer === 'express' ? `${meta.customer}:${meta.vacancy}` : meta.vacancy;

describe('Ozon lead Worker whitelist parity', () => {
  it('allows every lead-form Ozon tuple emitted by generated jobs', () => {
    const leadFormJobs = jobsData.filter((job) =>
      job.applyLink === 'lead-form:ozon' && job.ozonLeadForm,
    );

    expect(leadFormJobs.length, 'lead-form Ozon jobs in generated catalog').toBeGreaterThan(0);

    for (const job of leadFormJobs) {
      const meta = job.ozonLeadForm;
      if (!meta) {
        throw new Error(`missing ozonLeadForm metadata for ${job.slug}`);
      }
      const whitelistSlug = getWhitelistSlug(meta);
      const tuple = `${whitelistSlug}|${meta.cityID}|${meta.hireObjectUUID}`;

      expect(whitelistSource, `ALLOWED_VACANCIES missing ${whitelistSlug} for ${job.slug}`)
        .toContain(JSON.stringify(whitelistSlug));
      expect(whitelistSource, `ALLOWED_TUPLES missing ${tuple} for ${job.slug}`)
        .toContain(JSON.stringify(tuple));
    }
  });
});

import { describe, expect, it } from 'vitest';
import vacancyIndexability from '../src/generated/vacancy-indexability.json';
import { detailJobs } from '../src/data/jobs';
import { getVacancyIndexability } from '../src/utils/vacancyIndexability';
import { getVacancyCanonicalPath } from '../src/utils/vacancyUrl';

const getJob = (slug: string) => {
  const job = detailJobs.find((item) => item.slug === slug);
  if (!job) throw new Error(`Missing test vacancy: ${slug}`);
  return job;
};

describe('getVacancyIndexability', () => {
  it('indexes all active Moscow, Saint Petersburg, and Kazan vacancy pages', () => {
    const topCityJobs = detailJobs.filter((job) =>
      ['Москва', 'Санкт-Петербург', 'Казань'].includes(job.location),
    );

    expect(topCityJobs.length).toBeGreaterThan(0);
    expect(topCityJobs.every((job) => getVacancyIndexability(job).indexable)).toBe(true);
  });

  it('keeps locally-scored detail pages indexable outside the top-city allowlist', () => {
    const decision = getVacancyIndexability(getJob('kuper-foot-courier-olenegorsk-foot'));

    expect(decision).toEqual({
      indexable: true,
      robots: 'index, follow',
      reason: 'local_score',
    });
  });

  it('keeps formerly low-demand duplicate-style detail pages indexable for Google restore', () => {
    const decision = getVacancyIndexability(getJob('efin-bank-representative-chudovo-auto'));

    expect(decision).toEqual({
      indexable: true,
      robots: 'index, follow',
      reason: 'google_full_restore',
    });
  });

  it('keeps the generated indexability manifest in sync with current detail jobs', () => {
    const generatedPaths = new Set([
      ...vacancyIndexability.indexablePaths,
      ...vacancyIndexability.noindexPaths,
    ]);
    const currentPaths = new Set(detailJobs.map((job) => getVacancyCanonicalPath(job)));

    expect(generatedPaths).toEqual(currentPaths);
    expect(vacancyIndexability.summary.totalVacancyPages).toBe(currentPaths.size);
    expect(vacancyIndexability.summary.indexableVacancyPages).toBe(currentPaths.size);
    expect(vacancyIndexability.summary.noindexVacancyPages).toBe(0);
  });
});

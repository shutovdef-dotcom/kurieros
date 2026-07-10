import { describe, expect, it } from 'vitest';
import { detailJobs } from '../src/data/jobs';
import { getVacancyTitleOverride } from '../src/data/seoExperimentCohorts';

describe('search CTR experiment cohorts', () => {
  it('uses current source facts for the Horugvino treatment title and address', () => {
    const job = detailJobs.find(
      (item) => item.slug === 'ozon-goods-handler-horugvino-foot',
    );

    expect(job).toBeDefined();
    expect(job?.salary).toBe('от 65 000 ₽/мес');
    expect(job?.details.schedule).toContain('2/2');
    expect(job?.ozonLeadForm?.hireObjectLabel).toBe('д. Хоругвино, 32/2');
    expect(getVacancyTitleOverride(job!.slug)).toBe(
      'Работа на складе Ozon в Хоругвино — от 65 000 ₽, график 2/2',
    );
  });

  it('does not alter the Kemerovo guardrail cohort', () => {
    expect(
      getVacancyTitleOverride('ozon-goods-handler-kemerovo-foot'),
    ).toBeUndefined();
  });
});

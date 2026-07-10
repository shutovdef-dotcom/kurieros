import { describe, expect, it } from 'vitest';
import { detailJobs } from '../src/data/jobs';
import { vacancySources } from '../src/data/vacancies';
import { getJobPostingRoleTitle } from '../src/data/jobPostingRoleTitles';

describe('source-backed JobPosting role titles', () => {
  it('has an explicit role-only title for every vacancy source and transport', () => {
    for (const source of vacancySources) {
      for (const offer of source.offers) {
        const roleTitle = getJobPostingRoleTitle(source.slug, offer.transport);

        expect(roleTitle, `${source.slug}:${offer.transport}`).toBeTruthy();
        expect(roleTitle, `${source.slug}:${offer.transport}`).not.toMatch(
          /\{city|\b(?:Ozon|Купер|Самокат|Яндекс|Т-Банк|Альфа-Банк|₽)\b/i,
        );
      }
    }
  });

  it('propagates the role title to every detail job and keeps it visible in the heading', () => {
    expect(detailJobs.length).toBeGreaterThan(0);

    for (const job of detailJobs) {
      expect(job.roleTitle, job.slug).toBeTruthy();
      expect(job.title.toLocaleLowerCase('ru-RU'), job.slug).toContain(
        job.roleTitle!.toLocaleLowerCase('ru-RU'),
      );
    }
  });
});

import { describe, expect, it } from 'vitest';
import {
  getJobsForListingSlug,
  getListingBatchKey,
  getListingBatchStaticPaths,
  getListingBatchUrl,
} from '../src/utils/listingBatches';

const idsFor = (listingSlug: string): number[] =>
  getJobsForListingSlug(listingSlug).map((job) => job.id);

describe('listing batch canonical keys', () => {
  it.each([
    [
      'podrabotka-kurerom',
      [
        'rabota-kurerom-podrabotka',
        'rabota-kurerom-na-vyhodnye',
        'rabota-kurerom-zhenshchine',
        'rabota-kurerom-vecherom',
        'rabota-kurerom-nochyu',
        'rabota-kurerom-svobodny-grafik',
      ],
    ],
    ['rabota-avtokurerom', ['rabota-kurerom-na-avto']],
    ['rabota-velokurerom', ['rabota-kurerom-na-velosipede', 'rabota-kurerom-na-samokate']],
    ['rabota-peshim-kurerom', ['rabota-kurerom-peshkom']],
    ['rabota-kurerom-dlya-studentov', ['rabota-kurerom-16-let']],
  ])('maps %s aliases to one batch key and identical job order', (canonical, aliases) => {
    const expectedIds = idsFor(canonical);

    expect(getListingBatchKey(canonical)).toBe(canonical);
    expect(expectedIds.length).toBeGreaterThan(24);

    for (const alias of aliases) {
      expect(getListingBatchKey(alias)).toBe(canonical);
      expect(idsFor(alias)).toEqual(expectedIds);
      expect(getListingBatchUrl(alias, 2)).toBe(`/api/grid-batch/${canonical}/2/`);
    }
  });

  it('emits only one static batch tree per canonical batch key', () => {
    const paths = getListingBatchStaticPaths();
    const pathKeys = new Set(paths.map((path) => path.params.listingSlug));

    expect(pathKeys.has('podrabotka-kurerom')).toBe(true);
    expect(pathKeys.has('rabota-kurerom-podrabotka')).toBe(false);
    expect(pathKeys.has('rabota-kurerom-vecherom')).toBe(false);
    expect(pathKeys.has('rabota-kurerom-nochyu')).toBe(false);
    expect(pathKeys.has('rabota-avtokurerom')).toBe(true);
    expect(pathKeys.has('rabota-kurerom-na-avto')).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { EXPECTED_METRO_STATION_COUNTS } from '../src/data/metroStations';
import {
  assertMetroStationCounts,
  getMetroStationBySlug,
  getMetroStationsByCity,
  metroStations,
} from '../src/utils/metroStations';
import { getJobsForListingSlug, getListingBatchStaticPaths } from '../src/utils/listingBatches';

describe('metro station dataset', () => {
  it('keeps the expected Moscow and Saint Petersburg station counts', () => {
    assertMetroStationCounts();

    expect(getMetroStationsByCity('moskva')).toHaveLength(
      EXPECTED_METRO_STATION_COUNTS.moskva,
    );
    expect(getMetroStationsByCity('sankt-peterburg')).toHaveLength(
      EXPECTED_METRO_STATION_COUNTS['sankt-peterburg'],
    );
  });

  it('has unique station slugs inside each metro city namespace', () => {
    for (const citySlug of ['moskva', 'sankt-peterburg'] as const) {
      const stations = getMetroStationsByCity(citySlug);
      const slugs = stations.map((station) => station.stationSlug);
      expect(new Set(slugs).size, citySlug).toBe(slugs.length);
    }
  });

  it('resolves representative metro station pages', () => {
    expect(getMetroStationBySlug('moskva', 'sokol')).toMatchObject({
      stationName: 'Сокол',
      href: '/metro/moskva/sokol/',
    });
    expect(getMetroStationBySlug('sankt-peterburg', 'devyatkino')).toMatchObject({
      stationName: 'Девяткино',
      href: '/metro/sankt-peterburg/devyatkino/',
    });
  });

  it('wires metro listings into the shared grid batch system', () => {
    const station = getMetroStationBySlug('moskva', 'sokol');
    if (!station) throw new Error('Missing metro station test fixture');

    const jobs = getJobsForListingSlug(station.listingSlug);
    expect(jobs.length).toBeGreaterThan(24);
    expect(jobs.every((job) => job.location === 'Москва')).toBe(true);

    const batchPaths = getListingBatchStaticPaths();
    expect(batchPaths).toContainEqual({
      params: { listingSlug: station.listingSlug, page: '2' },
    });
  });

  it('creates one metro page per station entry', () => {
    expect(metroStations.length).toBe(
      EXPECTED_METRO_STATION_COUNTS.moskva +
        EXPECTED_METRO_STATION_COUNTS['sankt-peterburg'],
    );
  });
});

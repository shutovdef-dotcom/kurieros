import { describe, expect, it } from 'vitest';
import { EXPECTED_METRO_STATION_COUNTS } from '../src/data/metroStations';
import {
  assertMetroStationCounts,
  getMetroStationBySlug,
  getMetroStationsByCity,
  metroStations,
} from '../src/utils/metroStations';
import { getListingBatchStaticPaths } from '../src/utils/listingBatches';

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

  it('does not generate duplicate grid-batch fragments for metro station pages', () => {
    const station = getMetroStationBySlug('moskva', 'sokol');
    if (!station) throw new Error('Missing metro station test fixture');

    const batchPaths = getListingBatchStaticPaths();
    expect(batchPaths).not.toContainEqual({
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

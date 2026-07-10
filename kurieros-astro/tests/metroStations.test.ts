import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { EXPECTED_METRO_STATION_COUNTS } from '../src/data/metroStations';
import {
  METRO_LOCAL_OFFER_EVIDENCE,
  METRO_QUALITY_PILOT,
  METRO_STATION_QUALITY_METADATA,
  type MetroLocalOfferEvidence,
} from '../src/data/metroQualityPilot';
import {
  assertMetroStationCounts,
  getMetroStationBySlug,
  getRelatedMetroStations,
  getMetroStationsByCity,
  metroStations,
  partitionMetroOffersForStation,
} from '../src/utils/metroStations';
import { getListingBatchStaticPaths } from '../src/utils/listingBatches';

const metroPageSource = readFileSync(
  new URL('../src/pages/metro/[metroCity]/[stationSlug].astro', import.meta.url),
  'utf8',
);

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

  it('attaches source-backed line topology without inventing missing coordinates', () => {
    const station = getMetroStationBySlug('moskva', 'sokol');
    if (!station) throw new Error('Missing metro station test fixture');

    expect(station.qualityMetadata).toMatchObject({
      lineTopology: [
        {
          lineName: 'Замоскворецкая линия',
          adjacentStationSlugs: ['aeroport', 'voykovskaya'],
        },
      ],
      sources: [
        {
          fields: ['line', 'topology'],
          verifiedAt: '2026-07-10',
        },
      ],
    });
    expect(station.qualityMetadata?.sources[0]?.url).toMatch(/^https:\/\//);
    expect(station.qualityMetadata?.coordinates).toBeUndefined();
  });

  it('keeps every topology edge inside the same real city dataset', () => {
    for (const metadata of METRO_STATION_QUALITY_METADATA) {
      const station = getMetroStationBySlug(metadata.citySlug, metadata.stationSlug);
      expect(station, `${metadata.citySlug}/${metadata.stationSlug}`).toBeDefined();

      for (const line of metadata.lineTopology) {
        expect(station?.lineNames).toContain(line.lineName);
        for (const adjacentStationSlug of line.adjacentStationSlugs) {
          expect(
            getMetroStationBySlug(metadata.citySlug, adjacentStationSlug),
            `${metadata.citySlug}/${metadata.stationSlug} -> ${adjacentStationSlug}`,
          ).toBeDefined();
        }
      }
    }
  });

  it('selects related stations from explicit topology rather than alphabetical array order', () => {
    const station = getMetroStationBySlug('moskva', 'sokol');
    if (!station) throw new Error('Missing metro station test fixture');

    expect(getRelatedMetroStations(station).map((item) => item.stationSlug)).toEqual([
      'aeroport',
      'voykovskaya',
    ]);
  });

  it('separates verified station-local offers from the city fallback', () => {
    const station = getMetroStationBySlug('moskva', 'sokol');
    if (!station) throw new Error('Missing metro station test fixture');
    const jobs = [{ slug: 'verified-offer' }, { slug: 'city-only-offer' }] as const;
    const evidence: MetroLocalOfferEvidence[] = [
      {
        citySlug: 'moskva',
        stationSlug: 'sokol',
        jobSlug: 'verified-offer',
        workplaceAddress: 'Ленинградский проспект, 75',
        sourceUrl: 'https://example.test/employer/verified-offer',
        verifiedAt: '2026-07-10',
        relation: { kind: 'walk-distance', distanceMeters: 650 },
      },
    ];

    const result = partitionMetroOffersForStation(station, jobs, evidence);

    expect(result.verifiedLocalOffers.map((job) => job.slug)).toEqual(['verified-offer']);
    expect(result.cityFallbackOffers.map((job) => job.slug)).toEqual(['city-only-offer']);
    expect(jobs.map((job) => job.slug)).toEqual(['verified-offer', 'city-only-offer']);
  });

  it('does not upgrade an offer to local without a positive measured relation', () => {
    const station = getMetroStationBySlug('moskva', 'sokol');
    if (!station) throw new Error('Missing metro station test fixture');
    const jobs = [{ slug: 'unsupported-offer' }] as const;
    const incompleteEvidence = [
      {
        citySlug: 'moskva',
        stationSlug: 'sokol',
        jobSlug: 'unsupported-offer',
        workplaceAddress: 'Москва',
        sourceUrl: 'https://example.test/employer/unsupported-offer',
        verifiedAt: '2026-07-10',
        relation: { kind: 'walk-distance', distanceMeters: 0 },
      },
    ] as MetroLocalOfferEvidence[];

    const result = partitionMetroOffersForStation(station, jobs, incompleteEvidence);

    expect(result.verifiedLocalOffers).toEqual([]);
    expect(result.cityFallbackOffers).toEqual(jobs);
  });

  it('freezes expansion with a ten-page treatment/control manifest and no noindex batch', () => {
    expect(METRO_QUALITY_PILOT.status).toBe('frozen');
    expect(METRO_QUALITY_PILOT.policy).toMatchObject({
      allowNewPages: false,
      minimumObservationDays: 28,
      weakPageIndexability: 'unchanged',
      noindexDecision: 'deferred',
    });
    expect(METRO_QUALITY_PILOT.pages).toHaveLength(10);
    expect(METRO_QUALITY_PILOT.pages.filter((page) => page.cohort === 'treatment')).toHaveLength(5);
    expect(METRO_QUALITY_PILOT.pages.filter((page) => page.cohort === 'control')).toHaveLength(5);
    expect(new Set(METRO_QUALITY_PILOT.pages.map((page) => page.href)).size).toBe(10);
    expect(METRO_QUALITY_PILOT.pages.every((page) => page.indexability === 'unchanged')).toBe(true);
    expect(METRO_LOCAL_OFFER_EVIDENCE).toEqual([]);
  });

  it('separates the sitewide accuracy correction from the five-page treatment', () => {
    expect(METRO_QUALITY_PILOT.policy).toMatchObject({
      accuracyBaselineScope: 'all-existing-pages',
      treatmentPageCount: 5,
      controlPageCount: 5,
    });
    expect(METRO_QUALITY_PILOT.policy.treatmentOnlyFeatures).toEqual(
      expect.arrayContaining(['source-backed-topology-links']),
    );
    expect(metroPageSource).toContain('data-metro-accuracy-scope="sitewide"');
    expect(metroPageSource).toContain('data-metro-pilot-cohort={pilotPage?.cohort}');
    expect(metroPageSource).toContain('isMetroTreatment && relatedStations.length > 0');
  });

  it('labels city fallback honestly and keeps JobPosting off metro pages', () => {
    expect(metroPageSource).toContain('partitionMetroOffersForStation');
    expect(metroPageSource).toContain('Городские вакансии без привязки к станции');
    expect(metroPageSource).toContain('getRelatedMetroStations');
    expect(metroPageSource).not.toMatch(/рядом/ui);
    expect(metroPageSource).not.toContain("'@type': 'JobPosting'");
    expect(metroPageSource).not.toContain('currentStationIndex');
  });
});

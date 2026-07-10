import type { MetroCitySlug } from './metroStations';

export type MetroCoordinate = {
  latitude: number;
  longitude: number;
};

export type MetroMetadataField =
  | 'line'
  | 'topology'
  | 'district'
  | 'coordinates';

export type MetroMetadataSource = {
  fields: MetroMetadataField[];
  url: string;
  verifiedAt: string;
};

export type MetroLineTopology = {
  lineName: string;
  adjacentStationSlugs: string[];
};

export type MetroStationQualityMetadata = {
  citySlug: MetroCitySlug;
  stationSlug: string;
  lineTopology: MetroLineTopology[];
  districtName?: string;
  coordinates?: MetroCoordinate;
  sources: MetroMetadataSource[];
};

const MOSCOW_STATION_DIRECTORY =
  'https://mosmetro.ru/passengers/information/stations';
const VERIFIED_AT = '2026-07-10';

/**
 * Deliberately small, source-backed overlay for the ten-page quality pilot.
 * The source directory owns line and interchange/topology facts. Optional
 * district/coordinate fields stay absent unless a field-specific source was
 * checked; absence is preferable to inferred geography.
 */
export const METRO_STATION_QUALITY_METADATA = [
  {
    citySlug: 'moskva',
    stationSlug: 'marina-roscha',
    lineTopology: [
      {
        lineName: 'Большая кольцевая линия',
        adjacentStationSlugs: ['rizhskaya', 'savelovskaya'],
      },
      {
        lineName: 'Люблинско-Дмитровская линия',
        adjacentStationSlugs: ['dostoevskaya', 'butyrskaya'],
      },
    ],
    districtName: 'Марьина Роща',
    sources: [
      {
        fields: ['line', 'topology'],
        url: MOSCOW_STATION_DIRECTORY,
        verifiedAt: VERIFIED_AT,
      },
      {
        fields: ['district'],
        url: 'https://dk.mos.ru/map/svao/130/',
        verifiedAt: VERIFIED_AT,
      },
    ],
  },
  {
    citySlug: 'moskva',
    stationSlug: 'dostoevskaya',
    lineTopology: [
      {
        lineName: 'Люблинско-Дмитровская линия',
        adjacentStationSlugs: ['trubnaya', 'marina-roscha'],
      },
    ],
    sources: [
      {
        fields: ['line', 'topology'],
        url: MOSCOW_STATION_DIRECTORY,
        verifiedAt: VERIFIED_AT,
      },
    ],
  },
  {
    citySlug: 'moskva',
    stationSlug: 'lermontovskiy-prospekt',
    lineTopology: [
      {
        lineName: 'Таганско-Краснопресненская линия',
        adjacentStationSlugs: ['vyhino', 'zhulebino'],
      },
    ],
    sources: [
      {
        fields: ['line', 'topology'],
        url: MOSCOW_STATION_DIRECTORY,
        verifiedAt: VERIFIED_AT,
      },
    ],
  },
  {
    citySlug: 'moskva',
    stationSlug: 'vyhino',
    lineTopology: [
      {
        lineName: 'Таганско-Краснопресненская линия',
        adjacentStationSlugs: ['ryazanskiy-prospekt', 'lermontovskiy-prospekt'],
      },
    ],
    sources: [
      {
        fields: ['line', 'topology'],
        url: MOSCOW_STATION_DIRECTORY,
        verifiedAt: VERIFIED_AT,
      },
    ],
  },
  {
    citySlug: 'moskva',
    stationSlug: 'solntsevo',
    lineTopology: [
      {
        lineName: 'Солнцевская линия',
        adjacentStationSlugs: ['govorovo', 'borovskoe-shosse'],
      },
    ],
    sources: [
      {
        fields: ['line', 'topology'],
        url: MOSCOW_STATION_DIRECTORY,
        verifiedAt: VERIFIED_AT,
      },
    ],
  },
  {
    citySlug: 'moskva',
    stationSlug: 'govorovo',
    lineTopology: [
      {
        lineName: 'Солнцевская линия',
        adjacentStationSlugs: ['ozernaya', 'solntsevo'],
      },
    ],
    sources: [
      {
        fields: ['line', 'topology'],
        url: MOSCOW_STATION_DIRECTORY,
        verifiedAt: VERIFIED_AT,
      },
    ],
  },
  {
    citySlug: 'moskva',
    stationSlug: 'yugo-zapadnaya',
    lineTopology: [
      {
        lineName: 'Сокольническая линия',
        adjacentStationSlugs: ['prospekt-vernadskogo', 'troparevo'],
      },
    ],
    sources: [
      {
        fields: ['line', 'topology'],
        url: MOSCOW_STATION_DIRECTORY,
        verifiedAt: VERIFIED_AT,
      },
    ],
  },
  {
    citySlug: 'moskva',
    stationSlug: 'prospekt-vernadskogo',
    lineTopology: [
      {
        lineName: 'Большая кольцевая линия',
        adjacentStationSlugs: ['novatorskaya', 'michurinskiy-prospekt'],
      },
      {
        lineName: 'Сокольническая линия',
        adjacentStationSlugs: ['universitet', 'yugo-zapadnaya'],
      },
    ],
    sources: [
      {
        fields: ['line', 'topology'],
        url: MOSCOW_STATION_DIRECTORY,
        verifiedAt: VERIFIED_AT,
      },
    ],
  },
  {
    citySlug: 'moskva',
    stationSlug: 'sokol',
    lineTopology: [
      {
        lineName: 'Замоскворецкая линия',
        adjacentStationSlugs: ['aeroport', 'voykovskaya'],
      },
    ],
    sources: [
      {
        fields: ['line', 'topology'],
        url: MOSCOW_STATION_DIRECTORY,
        verifiedAt: VERIFIED_AT,
      },
    ],
  },
  {
    citySlug: 'moskva',
    stationSlug: 'aeroport',
    lineTopology: [
      {
        lineName: 'Замоскворецкая линия',
        adjacentStationSlugs: ['dinamo', 'sokol'],
      },
    ],
    sources: [
      {
        fields: ['line', 'topology'],
        url: MOSCOW_STATION_DIRECTORY,
        verifiedAt: VERIFIED_AT,
      },
    ],
  },
] satisfies MetroStationQualityMetadata[];

export type MetroLocalOfferRelation =
  | { kind: 'walk-distance'; distanceMeters: number }
  | { kind: 'public-transit'; durationMinutes: number };

export type MetroLocalOfferEvidence = {
  citySlug: MetroCitySlug;
  stationSlug: string;
  jobSlug: string;
  workplaceAddress: string;
  workplaceCoordinates?: MetroCoordinate;
  sourceUrl: string;
  verifiedAt: string;
  relation: MetroLocalOfferRelation;
};

/**
 * No production offer currently has complete station-local evidence. Keeping
 * this ledger explicit and empty makes every current card a city fallback;
 * entries may be added only after address plus measured distance/transit proof.
 */
export const METRO_LOCAL_OFFER_EVIDENCE: readonly MetroLocalOfferEvidence[] = [];

export type MetroPilotCohort = 'treatment' | 'control';

export type MetroPilotPage = {
  citySlug: MetroCitySlug;
  stationSlug: string;
  href: string;
  cohort: MetroPilotCohort;
  matchedPair: string;
  selectionReason: 'planned-demand' | 'representative-route' | 'matched-line-control';
  indexability: 'unchanged';
};

const pilotPage = (
  stationSlug: string,
  cohort: MetroPilotCohort,
  matchedPair: string,
  selectionReason: MetroPilotPage['selectionReason'],
): MetroPilotPage => ({
  citySlug: 'moskva',
  stationSlug,
  href: `/metro/moskva/${stationSlug}/`,
  cohort,
  matchedPair,
  selectionReason,
  indexability: 'unchanged',
});

export const METRO_QUALITY_PILOT = {
  id: 'metro-quality-2026-07',
  status: 'frozen' as const,
  frozenAt: VERIFIED_AT,
  policy: {
    allowNewPages: false,
    minimumObservationDays: 28,
    weakPageIndexability: 'unchanged' as const,
    noindexDecision: 'deferred' as const,
    maxNoindexBatchShare: 0.05,
    expansionRequires: [
      'source-backed-local-offers',
      'fixed-cohort-search-console-export',
      'appeared-not-below-removed',
    ] as const,
  },
  pages: [
    pilotPage('marina-roscha', 'treatment', 'ldl-central', 'planned-demand'),
    pilotPage('dostoevskaya', 'control', 'ldl-central', 'matched-line-control'),
    pilotPage('lermontovskiy-prospekt', 'treatment', 'tkl-east', 'planned-demand'),
    pilotPage('vyhino', 'control', 'tkl-east', 'matched-line-control'),
    pilotPage('solntsevo', 'treatment', 'solntsevo-west', 'planned-demand'),
    pilotPage('govorovo', 'control', 'solntsevo-west', 'matched-line-control'),
    pilotPage('yugo-zapadnaya', 'treatment', 'sokolniki-southwest', 'planned-demand'),
    pilotPage(
      'prospekt-vernadskogo',
      'control',
      'sokolniki-southwest',
      'matched-line-control',
    ),
    pilotPage('sokol', 'treatment', 'zamoskvoretskaya-north', 'representative-route'),
    pilotPage('aeroport', 'control', 'zamoskvoretskaya-north', 'matched-line-control'),
  ],
};

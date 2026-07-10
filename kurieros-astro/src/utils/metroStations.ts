import {
  EXPECTED_METRO_STATION_COUNTS,
  METRO_CITY_SEEDS,
  type MetroCitySlug,
} from '../data/metroStations';
import {
  METRO_LOCAL_OFFER_EVIDENCE,
  METRO_STATION_QUALITY_METADATA,
  type MetroLocalOfferEvidence,
  type MetroStationQualityMetadata,
} from '../data/metroQualityPilot';
import { slugifyCity } from './cities';

export type { MetroCitySlug };

export type MetroStation = {
  citySlug: MetroCitySlug;
  cityName: string;
  cityPrepositional: string;
  cityHref: string;
  jobsCityName: string;
  stationName: string;
  stationSlug: string;
  lineNames: string[];
  qualityMetadata?: MetroStationQualityMetadata;
  href: string;
  listingSlug: string;
};

const getMetroStationKey = (citySlug: string, stationSlug: string): string =>
  `${citySlug}/${stationSlug}`;

const qualityMetadataByStation = new Map(
  METRO_STATION_QUALITY_METADATA.map((metadata) => [
    getMetroStationKey(metadata.citySlug, metadata.stationSlug),
    metadata,
  ]),
);

const cloneQualityMetadata = (
  metadata: MetroStationQualityMetadata | undefined,
): MetroStationQualityMetadata | undefined =>
  metadata
    ? {
        ...metadata,
        lineTopology: metadata.lineTopology.map((line) => ({
          ...line,
          adjacentStationSlugs: [...line.adjacentStationSlugs],
        })),
        coordinates: metadata.coordinates ? { ...metadata.coordinates } : undefined,
        sources: metadata.sources.map((source) => ({
          ...source,
          fields: [...source.fields],
        })),
      }
    : undefined;

export const getMetroStationHref = (
  citySlug: MetroCitySlug | string,
  stationSlug: string,
): string => `/metro/${citySlug}/${stationSlug}/`;

export const getMetroStationListingSlug = (
  citySlug: MetroCitySlug | string,
  stationSlug: string,
): string => `metro-${citySlug}-${stationSlug}`;

export const metroStations: MetroStation[] = METRO_CITY_SEEDS.flatMap((city) =>
  city.stations.map((station) => {
    const stationSlug = slugifyCity(station.name);
    const qualityMetadata = qualityMetadataByStation.get(
      getMetroStationKey(city.citySlug, stationSlug),
    );
    return {
      citySlug: city.citySlug,
      cityName: city.cityName,
      cityPrepositional: city.cityPrepositional,
      cityHref: city.cityHref,
      jobsCityName: city.jobsCityName,
      stationName: station.name,
      stationSlug,
      lineNames: [...station.lineNames],
      qualityMetadata: cloneQualityMetadata(qualityMetadata),
      href: getMetroStationHref(city.citySlug, stationSlug),
      listingSlug: getMetroStationListingSlug(city.citySlug, stationSlug),
    };
  }),
);

export const getMetroStationBySlug = (
  citySlug: string,
  stationSlug: string,
): MetroStation | undefined =>
  metroStations.find(
    (station) =>
      station.citySlug === citySlug && station.stationSlug === stationSlug,
  );

export const getMetroStationsByCity = (citySlug: MetroCitySlug): MetroStation[] =>
  metroStations.filter((station) => station.citySlug === citySlug);

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

const getCoordinateDistanceMeters = (
  origin: NonNullable<MetroStationQualityMetadata['coordinates']>,
  destination: NonNullable<MetroStationQualityMetadata['coordinates']>,
): number => {
  const earthRadiusMeters = 6_371_000;
  const latitudeDelta = toRadians(destination.latitude - origin.latitude);
  const longitudeDelta = toRadians(destination.longitude - origin.longitude);
  const originLatitude = toRadians(origin.latitude);
  const destinationLatitude = toRadians(destination.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(originLatitude) *
      Math.cos(destinationLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 2 * earthRadiusMeters * Math.asin(Math.sqrt(haversine));
};

/**
 * Related stations must have an explicit topology edge or sourced coordinates.
 * There is intentionally no array-order fallback: the seed list is alphabetical,
 * so treating neighbouring entries as geography would create false local claims.
 */
export const getRelatedMetroStations = (
  station: MetroStation,
  limit = 12,
): MetroStation[] => {
  if (limit <= 0) return [];

  const seen = new Set<string>([station.stationSlug]);
  const topologyRelated: MetroStation[] = [];
  for (const line of station.qualityMetadata?.lineTopology ?? []) {
    for (const adjacentStationSlug of line.adjacentStationSlugs) {
      if (seen.has(adjacentStationSlug)) continue;
      const adjacentStation = getMetroStationBySlug(
        station.citySlug,
        adjacentStationSlug,
      );
      if (!adjacentStation) continue;
      seen.add(adjacentStationSlug);
      topologyRelated.push(adjacentStation);
    }
  }

  const originCoordinates = station.qualityMetadata?.coordinates;
  const distanceRelated = originCoordinates
    ? getMetroStationsByCity(station.citySlug)
        .filter(
          (candidate) =>
            !seen.has(candidate.stationSlug) &&
            candidate.qualityMetadata?.coordinates !== undefined,
        )
        .map((candidate) => ({
          station: candidate,
          distanceMeters: getCoordinateDistanceMeters(
            originCoordinates,
            candidate.qualityMetadata!.coordinates!,
          ),
        }))
        .sort((left, right) => left.distanceMeters - right.distanceMeters)
        .map(({ station: candidate }) => candidate)
    : [];

  return [...topologyRelated, ...distanceRelated].slice(0, limit);
};

type MetroOfferReference = {
  slug: string;
};

const hasAbsoluteHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
};

const hasPositiveRelation = (evidence: MetroLocalOfferEvidence): boolean =>
  evidence.relation.kind === 'walk-distance'
    ? Number.isFinite(evidence.relation.distanceMeters) &&
      evidence.relation.distanceMeters > 0
    : Number.isFinite(evidence.relation.durationMinutes) &&
      evidence.relation.durationMinutes > 0;

const isCompleteLocalOfferEvidence = (
  evidence: MetroLocalOfferEvidence,
): boolean =>
  evidence.workplaceAddress.trim().length > 0 &&
  hasAbsoluteHttpUrl(evidence.sourceUrl) &&
  Number.isFinite(Date.parse(evidence.verifiedAt)) &&
  hasPositiveRelation(evidence) &&
  (!evidence.workplaceCoordinates ||
    (Number.isFinite(evidence.workplaceCoordinates.latitude) &&
      Number.isFinite(evidence.workplaceCoordinates.longitude)));

/**
 * Only an explicit evidence-ledger match may enter the station-local group.
 * Every other city job remains visible as a separately labelled city fallback.
 */
export const partitionMetroOffersForStation = <T extends MetroOfferReference>(
  station: MetroStation,
  offers: readonly T[],
  evidenceLedger: readonly MetroLocalOfferEvidence[] = METRO_LOCAL_OFFER_EVIDENCE,
): { verifiedLocalOffers: T[]; cityFallbackOffers: T[] } => {
  const verifiedJobSlugs = new Set(
    evidenceLedger
      .filter(
        (evidence) =>
          evidence.citySlug === station.citySlug &&
          evidence.stationSlug === station.stationSlug &&
          isCompleteLocalOfferEvidence(evidence),
      )
      .map((evidence) => evidence.jobSlug),
  );

  return {
    verifiedLocalOffers: offers.filter((offer) => verifiedJobSlugs.has(offer.slug)),
    cityFallbackOffers: offers.filter((offer) => !verifiedJobSlugs.has(offer.slug)),
  };
};

export const getMetroStationCounts = (): Record<MetroCitySlug, number> => ({
  moskva: getMetroStationsByCity('moskva').length,
  'sankt-peterburg': getMetroStationsByCity('sankt-peterburg').length,
});

export const assertMetroStationCounts = (): void => {
  const actual = getMetroStationCounts();
  for (const [citySlug, expectedCount] of Object.entries(EXPECTED_METRO_STATION_COUNTS)) {
    if (actual[citySlug as MetroCitySlug] !== expectedCount) {
      throw new Error(
        `Metro station count drift for ${citySlug}: expected ${expectedCount}, got ${
          actual[citySlug as MetroCitySlug]
        }`,
      );
    }
  }
};

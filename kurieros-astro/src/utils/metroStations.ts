import {
  EXPECTED_METRO_STATION_COUNTS,
  METRO_CITY_SEEDS,
  type MetroCitySlug,
} from '../data/metroStations';
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
  href: string;
  listingSlug: string;
};

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
    return {
      citySlug: city.citySlug,
      cityName: city.cityName,
      cityPrepositional: city.cityPrepositional,
      cityHref: city.cityHref,
      jobsCityName: city.jobsCityName,
      stationName: station.name,
      stationSlug,
      lineNames: [...station.lineNames],
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

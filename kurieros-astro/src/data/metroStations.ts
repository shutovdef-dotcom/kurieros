import metroCitySeeds from './metroStations.json';

export type MetroCitySlug = 'moskva' | 'sankt-peterburg';

export type MetroStationSource = 'mosmetro-official' | 'wikipedia-spb-stations';

export type MetroStationSeed = {
  name: string;
  lineNames: string[];
};

export type MetroCitySeed = {
  citySlug: MetroCitySlug;
  cityName: string;
  cityPrepositional: string;
  cityHref: string;
  jobsCityName: string;
  source: MetroStationSource;
  sourceUrl: string;
  stations: MetroStationSeed[];
};

export const METRO_CITY_SEEDS = metroCitySeeds as MetroCitySeed[];

export const EXPECTED_METRO_STATION_COUNTS: Record<MetroCitySlug, number> = {
  moskva: 239,
  'sankt-peterburg': 73,
};

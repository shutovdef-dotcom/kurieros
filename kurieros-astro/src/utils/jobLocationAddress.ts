import { getCityRegion } from '../data/cityRegions';

export type JobPostalAddress = {
  '@type': 'PostalAddress';
  addressLocality: string;
  addressRegion?: string;
  addressCountry: 'RU';
};

/**
 * Build the city-level `PostalAddress` for a vacancy.
 *
 * We do not know real per-vacancy street addresses. Emitting invented
 * streets or postal codes makes thousands of JobPosting items look more
 * precise than they are, so the structured data stays at city + real region.
 */
export const buildJobLocationAddress = (city: string): JobPostalAddress => {
  const region = getCityRegion(city);
  return {
    '@type': 'PostalAddress',
    addressLocality: city,
    ...(region ? { addressRegion: region } : {}),
    addressCountry: 'RU',
  };
};

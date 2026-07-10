import { describe, expect, it } from 'vitest';
import { buildJobLocationAddress } from '../src/utils/jobLocationAddress';

describe('buildJobLocationAddress', () => {
  it('emits only honest city-level address data for a known city', () => {
    const addr = buildJobLocationAddress('Казань');

    expect(addr).toEqual({
      '@type': 'PostalAddress',
      addressLocality: 'Казань',
      addressRegion: 'Республика Татарстан',
      addressCountry: 'RU',
    });
  });

  it('does not fabricate streetAddress or postalCode', () => {
    const addr = buildJobLocationAddress('Москва');

    expect(addr).not.toHaveProperty('streetAddress');
    expect(addr).not.toHaveProperty('postalCode');
  });

  it('preserves a source-backed workplace address when explicitly supplied', () => {
    const addr = buildJobLocationAddress('Москва', 'д. Хоругвино, д. 35/2');

    expect(addr).toMatchObject({
      addressLocality: 'Москва',
      addressRegion: 'Москва',
      streetAddress: 'д. Хоругвино, д. 35/2',
      addressCountry: 'RU',
    });
    expect(addr).not.toHaveProperty('postalCode');
  });

  it('omits addressRegion when the city is absent from geo data', () => {
    const addr = buildJobLocationAddress('Несуществоград');

    expect(addr).toEqual({
      '@type': 'PostalAddress',
      addressLocality: 'Несуществоград',
      addressCountry: 'RU',
    });
  });

  it('normalizes short republic names to official forms', () => {
    expect(buildJobLocationAddress('Воркута').addressRegion).toBe(
      'Республика Коми',
    );
  });
});

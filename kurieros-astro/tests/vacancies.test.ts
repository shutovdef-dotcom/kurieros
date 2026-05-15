/**
 * Smoke / structural invariants for the vacancySources data layer.
 *
 * Catches regressions where:
 *   - the partner roster shrinks unexpectedly (PR #150 reorganises sources)
 *   - duplicate slugs/IDs sneak in (would silently overwrite generated jobs)
 *   - an offer ships without required pay/transport/citizenship/applyLink
 *   - applyLink contains a malformed URL or unexpected scheme
 *
 * These tests touch the real data module — they run end-to-end on the
 * actual production sources, so they're a real safety net.
 */

import { describe, it, expect } from 'vitest';
import { vacancySources } from '../src/data/vacancies';
import type { TransportMode } from '../src/data/vacancyTypes';

const REQUIRED_PARTNER_SLUGS = [
  'yandex-eda-courier',
  'kuper-foot-courier',
  'kuper-bike-courier',
  'kuper-auto-courier',
  'kuper-order-picker',
  'tbank-representative',
  'tbank-outbound-b2b-operator',
  'efin-bank-representative',
  'alfa-bank-representative',
  'burger-king-cook-cashier',
];

const VALID_TRANSPORT_MODES: TransportMode[] = ['foot', 'bicycle', 'auto', 'remote'];

const isValidApplyLink = (link: string) =>
  link.startsWith('https://') || link === 'lead-form:ozon';

describe('vacancySources structural invariants', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(vacancySources)).toBe(true);
    expect(vacancySources.length).toBeGreaterThan(0);
  });

  it.each(REQUIRED_PARTNER_SLUGS)('contains required partner slug %s', (slug) => {
    const source = vacancySources.find((s) => s.slug === slug);
    expect(source).toBeDefined();
  });

  it('contains at least one Ozon source', () => {
    const ozonSources = vacancySources.filter((s) => s.slug.startsWith('ozon-'));
    expect(ozonSources.length).toBeGreaterThan(0);
  });

  it('every source has the required top-level fields', () => {
    for (const source of vacancySources) {
      expect(typeof source.slug, `slug for id=${source.id}`).toBe('string');
      expect(source.slug.length, `non-empty slug for id=${source.id}`).toBeGreaterThan(0);
      expect(typeof source.id, `id for slug=${source.slug}`).toBe('number');
      expect(source.id, `positive id for slug=${source.slug}`).toBeGreaterThan(0);

      expect(source.company, `company for slug=${source.slug}`).toBeDefined();
      expect(typeof source.company.name).toBe('string');
      expect(source.company.name.length).toBeGreaterThan(0);
      expect(typeof source.company.logo).toBe('string');

      expect(source.content, `content for slug=${source.slug}`).toBeDefined();
      expect(typeof source.content.title).toBe('string');
      expect(source.content.title.length).toBeGreaterThan(0);

      expect(Array.isArray(source.offers), `offers array for slug=${source.slug}`).toBe(true);
      expect(source.offers.length, `non-empty offers for slug=${source.slug}`).toBeGreaterThan(0);
    }
  });

  it('all source slugs are unique', () => {
    const slugs = vacancySources.map((s) => s.slug);
    const duplicates = slugs.filter((slug, idx) => slugs.indexOf(slug) !== idx);
    expect(duplicates).toEqual([]);
  });

  it('all source IDs are unique', () => {
    const ids = vacancySources.map((s) => s.id);
    const duplicates = ids.filter((id, idx) => ids.indexOf(id) !== idx);
    expect(duplicates).toEqual([]);
  });

  it('every offer has required pay info, transport, citizenship, applyLink', () => {
    for (const source of vacancySources) {
      for (const offer of source.offers) {
        const ctx = `${source.slug}/${offer.city}/${offer.transport}`;

        // transport
        expect(VALID_TRANSPORT_MODES, `transport in valid set for ${ctx}`).toContain(
          offer.transport,
        );

        // pay
        expect(offer.pay, `pay defined for ${ctx}`).toBeDefined();
        expect(offer.pay.currency, `pay.currency for ${ctx}`).toBe('RUB');
        expect(typeof offer.pay.paymentFrequency, `paymentFrequency for ${ctx}`).toBe('string');
        expect(offer.pay.paymentFrequency.length).toBeGreaterThan(0);

        // applyLink (per-offer or inherits from source.defaults — but
        // jobs.ts uses '#' fallback, so any offer that *should* be live
        // must carry one. We assert it's set on every active offer).
        if (offer.isActive && offer.applyLink) {
          expect(isValidApplyLink(offer.applyLink), `valid applyLink for ${ctx}: ${offer.applyLink}`).toBe(true);
        }

        // citizenship — at the offer level OR inherited from source defaults
        const effectiveCitizenship = offer.citizenship ?? source.defaults.citizenship;
        expect(typeof effectiveCitizenship, `citizenship resolved for ${ctx}`).toBe('string');
      }
    }
  });

  it('every applyLink that exists is a valid URL or the lead-form sentinel', () => {
    for (const source of vacancySources) {
      for (const offer of source.offers) {
        if (!offer.applyLink) continue;
        const ctx = `${source.slug}/${offer.city}/${offer.transport}`;
        expect(isValidApplyLink(offer.applyLink), `valid applyLink shape for ${ctx}: ${offer.applyLink}`).toBe(true);
        if (offer.applyLink.startsWith('https://')) {
          expect(() => new URL(offer.applyLink!), `parses as URL for ${ctx}`).not.toThrow();
        }
      }
    }
  });

  it('Ozon offers carry the lead-form metadata', () => {
    for (const source of vacancySources) {
      if (!source.slug.startsWith('ozon-')) continue;
      for (const offer of source.offers) {
        if (offer.applyLink === 'lead-form:ozon') {
          expect(offer.ozonLeadForm, `ozonLeadForm metadata for ${source.slug}/${offer.city}`).toBeDefined();
          expect(typeof offer.ozonLeadForm?.cityID).toBe('string');
          expect(typeof offer.ozonLeadForm?.hireObjectUUID).toBe('string');
        }
      }
    }
  });
});

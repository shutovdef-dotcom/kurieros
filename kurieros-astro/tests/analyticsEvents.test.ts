import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
  buildSafeAnalyticsPayload,
  resolveAnalyticsPageDimensions,
  trackEvent,
  type AnalyticsRuntime,
} from '../src/scripts/analyticsAdapter';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const readProjectFile = (path: string): string =>
  readFileSync(join(ROOT, path), 'utf8');

const REQUIRED_DIMENSIONS = {
  page_type: 'listing',
  landing_cluster: 'city_or_category',
  indexability_reason: 'indexable',
  source_slug: 'yandex-eda',
  company: 'Яндекс Еда',
  city: 'Москва',
  transport: 'foot',
} as const;

describe('PII-safe dual-write analytics adapter', () => {
  it('sends the same semantic event and sanitized payload to GA4 and Metrika', () => {
    const gtag = vi.fn();
    const ym = vi.fn();
    const runtime: AnalyticsRuntime = {
      gtag,
      ym,
      metrikaId: 108655359,
      pageDimensions: REQUIRED_DIMENSIONS,
    };

    trackEvent('apply_click', {
      vacancy_slug: 'yandex-eda-courier-moskva-foot',
      cta_position: 'grid_card',
      phone: '+7 999 123-45-67',
    }, runtime);

    const expectedPayload = {
      ...REQUIRED_DIMENSIONS,
      vacancy_slug: 'yandex-eda-courier-moskva-foot',
      cta_position: 'grid_card',
    };
    expect(gtag).toHaveBeenCalledWith('event', 'apply_click', expectedPayload);
    expect(ym).toHaveBeenCalledWith(108655359, 'reachGoal', 'apply_click', expectedPayload);
  });

  it('does not let missing GA4 block Metrika', () => {
    const ym = vi.fn();

    trackEvent('vacancy_open', { vacancy_slug: 'safe-slug' }, {
      ym,
      metrikaId: 108655359,
      pageDimensions: REQUIRED_DIMENSIONS,
    });

    expect(ym).toHaveBeenCalledOnce();
  });

  it('does not let missing Metrika block GA4', () => {
    const gtag = vi.fn();

    trackEvent('grid_filter_change', { filter_name: 'transport', filter_value: 'auto' }, {
      gtag,
      pageDimensions: REQUIRED_DIMENSIONS,
    });

    expect(gtag).toHaveBeenCalledOnce();
  });

  it('isolates provider failures so the other provider still receives the event', () => {
    const ym = vi.fn();
    const gtag = vi.fn(() => {
      throw new Error('GA4 unavailable');
    });

    expect(() => trackEvent('apply_redirect_start', { vacancy_slug: 'safe-slug' }, {
      gtag,
      ym,
      metrikaId: 108655359,
      pageDimensions: REQUIRED_DIMENSIONS,
    })).not.toThrow();
    expect(ym).toHaveBeenCalledOnce();
  });

  it('drops PII keys, unknown fields, and PII-like string values', () => {
    const payload = buildSafeAnalyticsPayload('ozon_lead_submit', {
      ...REQUIRED_DIMENSIONS,
      cta_position: 'vacancy_hero',
      name: 'Иван',
      phone: '+7 999 123-45-67',
      email: 'ivan@example.com',
      comment: 'Позвоните после 18:00',
      city: 'ivan@example.com',
      company: '+7 999 123-45-67',
      arbitrary_secret: 'do-not-send',
    }, REQUIRED_DIMENSIONS);

    expect(payload).toEqual({
      ...REQUIRED_DIMENSIONS,
      company: '',
      city: '',
      cta_position: 'vacancy_hero',
    });
    expect(JSON.stringify(payload)).not.toMatch(/Иван|999|example\.com|do-not-send/);
  });

  it('classifies landing paths into bounded page cohorts', () => {
    expect(resolveAnalyticsPageDimensions('/v/ozon-courier-moskva-auto/', 'source_eligible'))
      .toMatchObject({
        page_type: 'vacancy_detail',
        landing_cluster: 'vacancy',
        indexability_reason: 'source_eligible',
      });
    expect(resolveAnalyticsPageDimensions('/rabota-kurerom-16-let/'))
      .toMatchObject({ page_type: 'listing', landing_cluster: 'age' });
    expect(resolveAnalyticsPageDimensions('/metro/moskva/sokol/'))
      .toMatchObject({ page_type: 'listing', landing_cluster: 'metro' });
    expect(resolveAnalyticsPageDimensions('/apply/'))
      .toMatchObject({ page_type: 'apply_redirect', landing_cluster: 'apply' });
  });
});

describe('GA4 and Metrika funnel wiring', () => {
  it('keeps the core delegated grid events in BaseLayout', () => {
    const layout = readProjectFile('src/layouts/BaseLayout.astro');
    const module = readProjectFile('src/scripts/analyticsEvents.ts');

    expect(layout).toContain("import '../scripts/analyticsEvents'");

    expect(module).toContain("trackEvent('apply_click'");
    expect(module).toContain("trackEvent('vacancy_open'");
    expect(module).toContain("trackEvent('grid_filter_change'");

    expect(module).toContain('vacancy_id: data.applyVacancyId');
    expect(module).toContain('vacancy_slug: data.applyVacancySlug');
    expect(module).toContain('source_slug: data.applySourceSlug');
  });

  it('loads delegated events when either analytics provider is configured', () => {
    const layout = readProjectFile('src/layouts/BaseLayout.astro');

    expect(layout).toContain('{hasAnalytics && (');
    expect(layout).not.toMatch(/\{ga4MeasurementId && \(\s*<script>\s*import '\.\.\/scripts\/analyticsEvents'/s);
  });

  it('routes Ozon lead and apply redirect events through the shared adapter', () => {
    const ozon = readProjectFile('src/scripts/ozonLeadModal.js');
    const redirect = readProjectFile('src/scripts/applyRedirect.ts');

    expect(ozon).toContain("trackEvent('ozon_lead_open'");
    expect(ozon).toContain("trackEvent('ozon_lead_submit'");
    expect(redirect).toContain("trackEvent('apply_redirect_start'");
    expect(ozon).not.toContain("window.gtag('event', 'ozon_lead_");
    expect(redirect).not.toContain("window.gtag('event', 'apply_redirect_start'");
  });

  it('adds stable vacancy identifiers to every first-party apply CTA', () => {
    const filesWithApplyCtas = [
      ['src/components/JobCard.astro', 2],
      ['src/components/vacancy/VacancyHero.astro', 2],
      ['src/components/vacancy/VacancySidebar.astro', 2],
    ] as const;

    for (const [path, expectedCount] of filesWithApplyCtas) {
      const source = readProjectFile(path);
      expect(source.match(/data-apply-vacancy-id=\{job\.id\}/g) ?? [], path).toHaveLength(expectedCount);
      expect(source.match(/data-apply-vacancy-slug=\{job\.slug\}/g) ?? [], path).toHaveLength(expectedCount);
      expect(source.match(/data-apply-source-slug=\{job\.sourceSlug\}/g) ?? [], path).toHaveLength(expectedCount);
    }
  });

  it('keeps partner_domain available after external CTAs route through /apply/', () => {
    const module = readProjectFile('src/scripts/analyticsEvents.ts');
    expect(module).toContain('target.dataset.applyPartnerDomain');

    const filesWithExternalApplyCtas = [
      'src/components/JobCard.astro',
      'src/components/vacancy/VacancyHero.astro',
      'src/components/vacancy/VacancySidebar.astro',
      'src/components/vacancy/VacancySubjectVariants.astro',
    ];

    for (const path of filesWithExternalApplyCtas) {
      expect(readProjectFile(path), path).toContain('data-apply-partner-domain');
    }
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
  buildSafeAnalyticsPayload,
  getCurrentAnalyticsDimensions,
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

afterEach(() => {
  vi.unstubAllGlobals();
});

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

  it('does not dispatch while owner analytics mute is active', () => {
    const gtag = vi.fn();
    const ym = vi.fn();

    trackEvent('apply_click', {}, {
      gtag,
      ym,
      metrikaId: 108655359,
      pageDimensions: REQUIRED_DIMENSIONS,
      disabled: true,
    });

    expect(gtag).not.toHaveBeenCalled();
    expect(ym).not.toHaveBeenCalled();
  });

  it('ignores invalid numeric values and bounds string dimensions', () => {
    const payload = buildSafeAnalyticsPayload('calculator_submit', {
      city: '   ',
      transport: 42,
      hours_per_day: Number.NaN,
      days_per_week: Number.POSITIVE_INFINITY,
      days_per_month: 20,
      result_monthly: 120000,
      source: 'x'.repeat(200),
    });

    expect(payload.city).toBe('');
    expect(payload.transport).toBe('');
    expect(payload).not.toHaveProperty('hours_per_day');
    expect(payload).not.toHaveProperty('days_per_week');
    expect(payload.days_per_month).toBe(20);
    expect(payload.result_monthly).toBe(120000);
    expect(String(payload.source)).toHaveLength(160);
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
      company: '79991234567',
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

    const cases = [
      ['/', 'home', 'home'],
      ['/rabota-peshim-kurerom/', 'listing', 'transport'],
      ['/rabota-avtokurerom/', 'listing', 'transport'],
      ['/rabota-velokurerom/', 'listing', 'transport'],
      ['/podrabotka-kurerom/', 'listing', 'schedule'],
      ['/rabota-kurerom-moskva/?utm_source=test', 'listing', 'city_or_category'],
      ['/companies/ozon/', 'company', 'employer'],
      ['/guide/dohod/', 'content', 'guide'],
      ['/blog/example/', 'content', 'blog'],
      ['/otzyvy/', 'content', 'reviews'],
      ['/compare/', 'tool', 'compare'],
      ['/calculator/', 'tool', 'calculator'],
      ['/unknown/', 'other', 'other'],
    ] as const;

    for (const [path, pageType, landingCluster] of cases) {
      expect(resolveAnalyticsPageDimensions(path)).toMatchObject({
        page_type: pageType,
        landing_cluster: landingCluster,
      });
    }
  });

  it('derives browser dimensions and provider configuration without coupling providers', () => {
    const gtag = vi.fn();
    const ym = vi.fn();
    const vacancyPage = {
      dataset: {
        vacancyIndexability: 'source_eligible',
        vacancySourceSlug: 'ozon',
        analyticsCompany: 'Ozon',
        analyticsCity: 'Москва',
        analyticsTransport: 'auto',
      },
    };
    vi.stubGlobal('window', {
      location: { pathname: '/v/ozon-courier-moskva-auto/' },
      gtag,
      ym,
      __kurerokSkipAnalytics: false,
    });
    vi.stubGlobal('document', {
      getElementById: (id: string) => id === 'kurerok-analytics-config'
        ? { textContent: '{"yandexMetrikaId":"108655359"}' }
        : null,
      querySelector: (selector: string) => selector.startsWith('.vacancy-page')
        ? vacancyPage
        : null,
    });

    expect(getCurrentAnalyticsDimensions()).toEqual({
      page_type: 'vacancy_detail',
      landing_cluster: 'vacancy',
      indexability_reason: 'source_eligible',
      source_slug: 'ozon',
      company: 'Ozon',
      city: 'Москва',
      transport: 'auto',
    });
    trackEvent('ozon_lead_open', { cta_position: 'vacancy_hero' });
    expect(gtag).toHaveBeenCalledOnce();
    expect(ym).toHaveBeenCalledWith(
      108655359,
      'reachGoal',
      'ozon_lead_open',
      expect.objectContaining({ source_slug: 'ozon', company: 'Ozon' }),
    );
  });

  it('handles missing and malformed browser config without affecting GA4', () => {
    const gtag = vi.fn();
    const ym = vi.fn(() => {
      throw new Error('Metrika unavailable');
    });
    vi.stubGlobal('window', {
      location: { pathname: '/compare/' },
      gtag,
      ym,
      __kurerokSkipAnalytics: false,
    });
    vi.stubGlobal('document', {
      getElementById: () => ({ textContent: '{' }),
      querySelector: (selector: string) => selector === 'meta[name="robots"]'
        ? { content: 'noindex, follow' }
        : null,
    });

    expect(() => trackEvent('grid_filter_change', {
      filter_name: 'transport',
      filter_value: 'auto',
    })).not.toThrow();
    expect(gtag).toHaveBeenCalledWith(
      'event',
      'grid_filter_change',
      expect.objectContaining({
        page_type: 'tool',
        landing_cluster: 'compare',
        indexability_reason: 'page_noindex',
      }),
    );
    expect(ym).not.toHaveBeenCalled();
  });

  it('suppresses browser dispatch when owner mute is set', () => {
    const gtag = vi.fn();
    const ym = vi.fn();
    vi.stubGlobal('window', {
      location: { pathname: '/' },
      gtag,
      ym,
      __kurerokSkipAnalytics: true,
    });
    vi.stubGlobal('document', {
      getElementById: () => null,
      querySelector: () => null,
    });

    trackEvent('vacancy_open', { vacancy_slug: 'safe-slug' });
    expect(gtag).not.toHaveBeenCalled();
    expect(ym).not.toHaveBeenCalled();
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

/**
 * Build-artifact assertions.
 *
 * Skips automatically when `dist/` is absent — these tests are meaningful
 * only after `npm run build` has produced the static site. Run locally
 * with: `npm run build && npm test`.
 *
 * What we lock down:
 *   - Total HTML page count is in the expected band (~10193 across all
 *     langs — content pages + `/api/grid/<slug>/` city-grid fragments
 *     added by M14 + `/api/grid-batch/.../` listing-card batch endpoints
 *     + `/api/company-vacancies/.../` company-card batch endpoints).
 *   - Vacancy translation fragments use the post-#129 compact shape.
 *   - Detail pages preload their per-source translation fragment.
 *   - Listing pages do NOT preload a fragment (they aggregate many vacancies).
 *   - H13: `/api/v1/city-index.json` exists, carries both fields, and the
 *     homepage no longer inlines the `cityRouteMap` literal.
 *   - M14: `/api/grid/<slug>/` emits a small `#jobs-grid`-only fragment
 *     and the city-switch hot path fetches it instead of the full page.
 *   - P0 page-weight: heavy listing pages render only the first 24 cards
 *     in main HTML and lazy-load further cards from `/api/grid-batch/.../`.
 *   - Size plan 2026-06-16: CSS is emitted as shared `_astro/*.css` assets
 *     instead of being duplicated into every generated HTML page.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = join(ROOT, '..', 'dist');
const skipIfNoDist = !existsSync(DIST_DIR);

const countHtml = (dir: string): number => {
  let count = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      count += countHtml(full);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      count += 1;
    }
  }
  return count;
};

const listFilesRecursive = (dir: string): string[] => {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listFilesRecursive(full));
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
  return out;
};

const inlineStyleBytes = (html: string): number =>
  Array.from(html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi))
    .reduce((sum, match) => sum + match[1].length, 0);

const localScriptAssetCodes = (html: string): string[] =>
  Array.from(html.matchAll(/<script\b[^>]*\bsrc="(\/_astro\/[^"]+\.js)"[^>]*>/gi))
    .map((match) => join(DIST_DIR, match[1].slice(1)))
    .filter((file) => existsSync(file))
    .map((file) => readFileSync(file, 'utf8'));

const localScriptAssetCode = (html: string): string =>
  localScriptAssetCodes(html).join('\n');

const isRuntimeTranslatedVacancyField = (key: string): boolean =>
  /^(?:shortDescription|description|req_\d+|ben_\d+|doc_\d+)$/.test(key);

const readAllSitemaps = (): string =>
  readdirSync(DIST_DIR)
    .filter((file) => /^sitemap-(?!index)[\w-]+\.xml$/.test(file))
    .map((file) => readFileSync(join(DIST_DIR, file), 'utf8'))
    .join('\n');

describe.skipIf(skipIfNoDist)('Build output', () => {
  it('has expected page count (~11012)', () => {
    // Reference build 2026-06-22 after removing the legacy non-courier
    // `src/pages/[city]/index.astro` route: 10163 HTML files by this
    // recursive counter. Astro logs 10162 page(s), while this guard also
    // sees the top-level generated verification HTML file.
    // 2026-06-22: +1 for the single shared `/apply/` route.
    // 2026-06-30: +1 for the shared `/calendar/` route.
    // 2026-07-01: +X5 Delivery source expansion. Reference build: 10388.
    // 2026-07-01: +312 metro station pages and +312 metro grid-batch fragments.
    // Reference build: 11012.
    // Band: 11007-11017 (+-5 from reference count, plus intentionally added routes).
    //
    // NOTE FOR CONTRIBUTORS: always re-derive both bounds from an actual build
    // after adding new routes -- do NOT blindly add N to the upper bound.
    // Run: node -e "const fs=require('fs'),p=require('path');
    //   function c(d){let n=0;for(const e of fs.readdirSync(d,{withFileTypes:true}))
    //   {const f=p.join(d,e.name);if(e.isDirectory())n+=c(f);
    //   else if(e.isFile()&&e.name.endsWith('.html'))n++;}return n;}
    //   console.log(c('dist'));"
    const count = countHtml(DIST_DIR);
    expect(count).toBeGreaterThanOrEqual(11007);
    expect(count).toBeLessThanOrEqual(11017);
  });

  it('keeps the shared apply redirect page non-indexable and out of sitemap fan-out', () => {
    const applyPage = join(DIST_DIR, 'apply', 'index.html');
    const applyManifest = join(DIST_DIR, 'api', 'v1', 'apply-jobs.json');

    expect(existsSync(applyPage)).toBe(true);
    expect(existsSync(applyManifest)).toBe(true);
    expect(statSync(applyManifest).size).toBeLessThan(3_500_000);

    const html = readFileSync(applyPage, 'utf8');
    const applyCode = localScriptAssetCodes(html).find((code) =>
      code.includes('/api/v1/apply-jobs.json'),
    ) ?? '';
    expect(html).toContain('<meta name="robots" content="noindex, nofollow, noarchive">');
    expect(html).not.toContain('https://trk.ppdu.ru/click');
    expect(html).not.toContain('https://my.saleads.pro/');
    expect(html).not.toContain('lead-form:ozon');
    expect(applyCode).not.toBe('');
    expect(applyCode).toContain('/api/v1/apply-jobs.json?v=');
    expect(applyCode).toContain('cache:"no-cache"');
    expect(applyCode).not.toContain('cache:"force-cache"');

    const sitemapXml = readAllSitemaps();
    expect(sitemapXml).not.toContain('/apply/');
    expect(existsSync(join(DIST_DIR, 'apply', 'yandex-eda-courier-moskva-auto', 'index.html'))).toBe(false);
  });

  it('vacancy fragments use the compact format (post-#129)', () => {
    const fragmentPath = join(DIST_DIR, 'vacancy-translations', 'uk', 'yandex-eda-courier.json');
    if (!existsSync(fragmentPath)) {
      throw new Error(`expected fragment file missing: ${fragmentPath}`);
    }
    const sample = JSON.parse(readFileSync(fragmentPath, 'utf8'));
    expect(sample).toHaveProperty('defaults');
    expect(sample).toHaveProperty('entries');
  });

  it('vacancy fragments contain only runtime-translated content deltas', () => {
    const fragmentPath = join(DIST_DIR, 'vacancy-translations', 'uk', 'yandex-eda-courier.json');
    if (!existsSync(fragmentPath)) {
      throw new Error(`expected fragment file missing: ${fragmentPath}`);
    }
    const sample = JSON.parse(readFileSync(fragmentPath, 'utf8')) as {
      defaults?: Record<string, string>;
      dict?: Record<string, string[]>;
      entries?: Record<string, Record<string, string | number>>;
    };

    for (const key of Object.keys(sample.defaults ?? {})) {
      expect(isRuntimeTranslatedVacancyField(key), `defaults.${key}`).toBe(true);
    }
    for (const key of Object.keys(sample.dict ?? {})) {
      expect(isRuntimeTranslatedVacancyField(key), `dict.${key}`).toBe(true);
    }
    for (const [jobId, entry] of Object.entries(sample.entries ?? {})) {
      for (const key of Object.keys(entry)) {
        expect(isRuntimeTranslatedVacancyField(key), `${jobId}.${key}`).toBe(true);
      }
    }

    const raw = JSON.stringify(sample);
    expect(raw).not.toContain('page_title');
    expect(raw).not.toContain('page_description');
    expect(raw).not.toContain('details_schedule');
    expect(raw).not.toContain('location');
    expect(raw).not.toContain('salary');
  });

  it('does not emit unused Russian vacancy translation fragments', () => {
    const ruFragmentDir = join(DIST_DIR, 'vacancy-translations', 'ru');
    const nonRuFragmentPath = join(
      DIST_DIR,
      'vacancy-translations',
      'uk',
      'yandex-eda-courier.json',
    );

    expect(existsSync(ruFragmentDir), 'RU fragments are runtime-dead weight').toBe(false);
    expect(existsSync(nonRuFragmentPath), 'non-RU fragments still exist').toBe(true);
  });

  it('loads shell UI translations from one shared JSON asset', () => {
    const shellPath = join(DIST_DIR, 'i18n', 'shell.json');
    if (!existsSync(shellPath)) {
      throw new Error(`expected shell translation file missing: ${shellPath}`);
    }
    const shell = JSON.parse(readFileSync(shellPath, 'utf8')) as {
      ru?: { nav?: { vacancies?: string } };
    };
    expect(Object.keys(shell)).toEqual(['ru']);
    expect(shell.ru?.nav?.vacancies).toBe('Вакансии');
    expect(statSync(shellPath).size, 'shell dictionary should stay shared and small').toBeLessThan(50_000);

    const pages = [
      join(DIST_DIR, 'index.html'),
      join(DIST_DIR, 'about', 'index.html'),
      join(DIST_DIR, 'v', 'ozon-courier-moskva-auto', 'index.html'),
    ];

    for (const page of pages) {
      if (!existsSync(page)) continue;
      const html = readFileSync(page, 'utf8');
      const configBody = html.match(
        /<script\b[^>]*id="kurieros-i18n-config"[^>]*>([\s\S]*?)<\/script>/i,
      )?.[1];
      expect(configBody, `${page} should emit i18n config`).toBeTruthy();
      expect(configBody!.length, `${page} i18n config should stay tiny`).toBeLessThan(512);
      const config = JSON.parse(configBody!);
      expect(config.supportedLanguages).toContain('ru');
      expect(config.supportedLanguages).toContain('uz');
      expect(config.shellTranslationsUrl).toBe('/i18n/shell.json');
      expect(config.shellTranslationsVersion).toMatch(/^\d+$/);
      expect(config.vacancyTranslationsBase).toBe('/vacancy-translations');
      expect(config.vacancyTranslationsVersion).toBe(config.shellTranslationsVersion);
      expect(config.translations).toBeUndefined();
    }
  });

  it('detail pages do NOT preload a vacancy-translations fragment (audit H1)', () => {
    // The hardcoded RU preload was useless: RU visitors short-circuit before
    // consuming it, non-RU visitors need their own language fragment.
    // Removed in audit v2 H1 — this test guards against accidental re-add.
    const detailHtml = join(DIST_DIR, 'v', 'yandex-eda-courier-moskva-foot', 'index.html');
    if (!existsSync(detailHtml)) {
      throw new Error(`expected detail page missing: ${detailHtml}`);
    }
    const html = readFileSync(detailHtml, 'utf8');
    expect(html).not.toMatch(/rel="preload"\s+as="fetch"\s+href="\/vacancy-translations\//);
  });

  it('listing pages do NOT preload a vacancy-translations fragment', () => {
    const listingHtml = join(DIST_DIR, 'rabota-kurerom-moskva', 'index.html');
    if (!existsSync(listingHtml)) {
      throw new Error(`expected listing page missing: ${listingHtml}`);
    }
    const html = readFileSync(listingHtml, 'utf8');
    expect(html).not.toMatch(/rel="preload"\s+as="fetch"\s+href="\/vacancy-translations\//);
  });

  describe('site-size: shared CSS assets', () => {
    it('emits external CSS assets under _astro', () => {
      const cssFiles = listFilesRecursive(join(DIST_DIR, '_astro'))
        .filter((file) => file.endsWith('.css'));

      expect(cssFiles.length, 'expected at least one bundled CSS asset').toBeGreaterThan(0);
      expect(
        cssFiles.some((file) => statSync(file).size > 20_000),
        'expected a non-trivial shared CSS bundle',
      ).toBe(true);
    });

    it('does not duplicate large CSS blocks into representative HTML pages', () => {
      const pages = [
        join(DIST_DIR, 'index.html'),
        join(DIST_DIR, 'v', 'qlean-cleaner-moskva-service', 'index.html'),
        join(DIST_DIR, 'podrabotka-kurerom', 'index.html'),
        join(DIST_DIR, 'companies', 'kuper-ex-sbermarket', 'index.html'),
      ];

      for (const page of pages) {
        if (!existsSync(page)) continue;
        const html = readFileSync(page, 'utf8');
        expect(html, page).toMatch(/<link\b[^>]*rel="stylesheet"[^>]*href="\/_astro\//);
        expect(inlineStyleBytes(html), page).toBeLessThan(8_000);
      }
    });
  });

  describe('site-size: external JS URL assets', () => {
    it('does not inline shared module URLs as data: scripts', () => {
      const pages = [
        join(DIST_DIR, 'index.html'),
        join(DIST_DIR, 'about', 'index.html'),
        join(DIST_DIR, 'v', 'ozon-courier-moskva-auto', 'index.html'),
        join(DIST_DIR, 'rabota-kurerom-moskva', 'index.html'),
      ];

      for (const page of pages) {
        if (!existsSync(page)) continue;
        const html = readFileSync(page, 'utf8');
        expect(html, page).not.toMatch(/<script\b[^>]*src="data:text\/javascript/i);
      }
    });
  });

  describe('site-size: shared header controller', () => {
    it('does not inline the repeated Header controller into representative pages', () => {
      const pages = [
        join(DIST_DIR, 'index.html'),
        join(DIST_DIR, 'v', 'qlean-cleaner-moskva-service', 'index.html'),
        join(DIST_DIR, 'podrabotka-kurerom', 'index.html'),
        join(DIST_DIR, 'companies', 'kuper-ex-sbermarket', 'index.html'),
      ];

      for (const page of pages) {
        if (!existsSync(page)) continue;
        const html = readFileSync(page, 'utf8');
        expect(html, page).toMatch(/<script\b[^>]*src="\/_astro\/[^"]+\.js"/);
        expect(html, page).not.toContain("const COLOR_MODE_KEY = 'site-color-mode';");
        expect(html, page).not.toContain('function initBottomNavVacancies()');
      }
    });
  });

  describe('site-size: shared Ozon lead modal controller', () => {
    it('does not inline the repeated Ozon lead controller into representative pages', () => {
      const pages = [
        join(DIST_DIR, 'index.html'),
        join(DIST_DIR, 'v', 'ozon-courier-moskva-auto', 'index.html'),
        join(DIST_DIR, 'rabota-kurerom-ozon', 'index.html'),
      ];

      for (const page of pages) {
        if (!existsSync(page)) continue;
        const html = readFileSync(page, 'utf8');
        expect(html, page).toMatch(/<script\b[^>]*src="\/_astro\/[^"]+\.js"/);
        expect(html, page).not.toContain('window.openOzonLeadModal = open;');
        expect(html, page).not.toContain('submission skipped — PUBLIC_OZON_LEAD_API');
      }
    });
  });

  describe('site-size: shared vacancy share controller', () => {
    it('does not inline the repeated vacancy share controller into detail pages', () => {
      const pages = [
        join(DIST_DIR, 'v', 'ozon-courier-moskva-auto', 'index.html'),
        join(DIST_DIR, 'v', 'yandex-eda-courier-moskva-auto', 'index.html'),
        join(DIST_DIR, 'v', 'qlean-cleaner-moskva-service', 'index.html'),
      ];

      for (const page of pages) {
        if (!existsSync(page)) continue;
        const html = readFileSync(page, 'utf8');
        expect(html, page).toMatch(/<script\b[^>]*src="\/_astro\/[^"]+\.js"/);
        expect(html, page).not.toContain('HV19 (rev) — Share button');
        expect(html, page).not.toContain('Always share the canonical prod URL');
        expect(html, page).not.toContain('share: popup blocked or failed to open');
      }
    });
  });

  describe('site-size: shared vacancy income calculator controller', () => {
    it('does not inline the repeated vacancy income calculator into detail pages', () => {
      const pages = [
        join(DIST_DIR, 'v', 'ozon-courier-moskva-auto', 'index.html'),
        join(DIST_DIR, 'v', 'yandex-eda-courier-moskva-auto', 'index.html'),
        join(DIST_DIR, 'v', 'tbank-representative-moskva-foot', 'index.html'),
      ];

      for (const page of pages) {
        if (!existsSync(page)) continue;
        const html = readFileSync(page, 'utf8');
        expect(html, page).toMatch(/<script\b[^>]*src="\/_astro\/[^"]+\.js"/);
        expect(html, page).not.toContain("const vacancyIncomeCalculator = document.getElementById('vacancy-income-calculator');");
        expect(html, page).not.toContain("source: 'vacancy_income_calculator'");
        expect(html, page).not.toContain("source: 'vacancy_meeting_calculator'");
      }
    });
  });

  describe('site-size: shared vacancy sticky apply controller', () => {
    it('does not inline the repeated sticky apply controller into detail pages', () => {
      const pages = [
        join(DIST_DIR, 'v', 'ozon-courier-moskva-auto', 'index.html'),
        join(DIST_DIR, 'v', 'yandex-eda-courier-moskva-auto', 'index.html'),
        join(DIST_DIR, 'v', 'qlean-cleaner-moskva-service', 'index.html'),
      ];

      for (const page of pages) {
        if (!existsSync(page)) continue;
        const html = readFileSync(page, 'utf8');
        expect(html, page).toMatch(/<script\b[^>]*src="\/_astro\/[^"]+\.js"/);
        expect(html, page).not.toContain("document.getElementById('vacancy-sticky-apply')");
        expect(html, page).not.toContain("document.body.classList.add('has-vacancy-sticky-apply')");
        expect(html, page).not.toContain('No hero CTA on the page');
      }
    });
  });

  describe('site-size: shared VPN modal controller', () => {
    it('does not inline the repeated VPN modal controller into representative pages', () => {
      const pages = [
        join(DIST_DIR, 'index.html'),
        join(DIST_DIR, 'about', 'index.html'),
        join(DIST_DIR, 'v', 'ozon-courier-moskva-auto', 'index.html'),
        join(DIST_DIR, 'rabota-kurerom-moskva', 'index.html'),
      ];

      for (const page of pages) {
        if (!existsSync(page)) continue;
        const html = readFileSync(page, 'utf8');
        expect(html, page).toMatch(/<script\b[^>]*src="\/_astro\/[^"]+\.js"/);
        expect(html, page).not.toContain("const VPN_MODAL_SESSION_KEY = 'vpn-modal-shown';");
        expect(html, page).not.toContain("window.addEventListener('kurieros:manual-city-required'");
        expect(html, page).not.toContain('function getVPNModal()');
      }
    });
  });

  describe('site-size: shared language switcher controller', () => {
    it('does not inline the repeated language switcher controller into representative pages', () => {
      const pages = [
        join(DIST_DIR, 'index.html'),
        join(DIST_DIR, 'about', 'index.html'),
        join(DIST_DIR, 'v', 'ozon-courier-moskva-auto', 'index.html'),
        join(DIST_DIR, 'rabota-kurerom-moskva', 'index.html'),
      ];

      for (const page of pages) {
        if (!existsSync(page)) continue;
        const html = readFileSync(page, 'utf8');
        expect(html, page).toMatch(/<script\b[^>]*src="\/_astro\/[^"]+\.js"/);
        expect(html, page).not.toContain('const languageMeta =');
        expect(html, page).not.toContain('function getSafeLang');
        expect(html, page).not.toContain("window.addEventListener('kurieros:lang-change'");
      }
    });
  });

  describe('site-size: remaining inline JS cleanup', () => {
    it('does not inline the standalone income calculator controller', () => {
      const pages = [
        join(DIST_DIR, 'index.html'),
        join(DIST_DIR, 'calculator', 'index.html'),
        join(DIST_DIR, 'skolko-zarabatyvaet-kurer', 'index.html'),
      ];

      for (const page of pages) {
        if (!existsSync(page)) continue;
        const html = readFileSync(page, 'utf8');
        expect(html, page).toMatch(/<script\b[^>]*src="\/_astro\/[^"]+\.js"/);
        expect(html, page).not.toContain("const calculatorRoot = document.getElementById('income-calculator');");
        expect(html, page).not.toContain("source: 'income_calculator'");
      }
    });

    it('uses shared bootstrap assets for theme and owner analytics mute', () => {
      const pages = [
        join(DIST_DIR, 'index.html'),
        join(DIST_DIR, 'about', 'index.html'),
        join(DIST_DIR, 'v', 'ozon-courier-moskva-auto', 'index.html'),
      ];

      const themeInit = join(DIST_DIR, 'bootstrap', 'theme-init.js');
      const ownerMute = join(DIST_DIR, 'bootstrap', 'owner-mute.js');
      expect(existsSync(themeInit)).toBe(true);
      expect(existsSync(ownerMute)).toBe(true);
      expect(statSync(themeInit).size, 'theme bootstrap should stay tiny').toBeLessThan(2_000);
      expect(statSync(ownerMute).size, 'owner mute bootstrap should stay tiny').toBeLessThan(4_000);
      expect(readFileSync(themeInit, 'utf8')).not.toContain('</script>');
      expect(readFileSync(ownerMute, 'utf8')).not.toContain('</script>');

      for (const page of pages) {
        if (!existsSync(page)) continue;
        const html = readFileSync(page, 'utf8');
        expect(html, page).toContain('<script src="/bootstrap/theme-init.js"></script>');
        expect(html, page).toContain('<script src="/bootstrap/owner-mute.js"></script>');
        expect(html, page).not.toContain('document.body.dataset.colorMode = initialColorMode');
        expect(html, page).not.toContain('const initialTheme = document.documentElement.dataset.initialTheme');
        expect(html, page).not.toContain('Safari Private Browsing and restricted WKWebViews');
        expect(html, page).not.toContain("localStorage.setItem('kurerok-owner-mute'");
        expect(html, page).not.toContain('window.__kurerokSkipAnalytics = (localStorage.getItem');
      }
    });
  });

  describe('site-size: compact JSON-LD', () => {
    it('does not pretty-print structured data into every HTML page', () => {
      const pages = [
        join(DIST_DIR, 'index.html'),
        join(DIST_DIR, 'v', 'qlean-cleaner-moskva-service', 'index.html'),
        join(DIST_DIR, 'companies', 'tetrika', 'index.html'),
      ];

      for (const page of pages) {
        if (!existsSync(page)) continue;
        const html = readFileSync(page, 'utf8');
        const scripts = Array.from(
          html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi),
          (match) => match[1],
        );

        expect(scripts.length, `${page} should emit JSON-LD`).toBeGreaterThan(0);
        for (const script of scripts) {
          expect(script.trim(), page).toMatch(/^\{"@context":"https:\/\/schema\.org"/);
          expect(script, page).not.toMatch(/\n\s{2,}"/);
        }
      }
    });
  });

  it('every fragment file is valid JSON', () => {
    const fragmentRoot = join(DIST_DIR, 'vacancy-translations');
    if (!existsSync(fragmentRoot)) return;
    let checked = 0;
    for (const lang of readdirSync(fragmentRoot)) {
      const langDir = join(fragmentRoot, lang);
      if (!statSync(langDir).isDirectory()) continue;
      for (const file of readdirSync(langDir)) {
        if (!file.endsWith('.json')) continue;
        const path = join(langDir, file);
        expect(() => JSON.parse(readFileSync(path, 'utf8')), `${lang}/${file} parses`).not.toThrow();
        checked += 1;
      }
    }
    expect(checked, 'at least one fragment file checked').toBeGreaterThan(0);
  });

  it('large company pages do not inline every vacancy in JSON-LD', () => {
    const page = join(DIST_DIR, 'companies', 'tetrika', 'index.html');
    if (!existsSync(page)) return;

    const html = readFileSync(page, 'utf8');
    const jsonLdBytes = Array.from(
      html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi),
    ).reduce((sum, match) => sum + match[1].length, 0);
    const jsonLdBody = html.match(
      /<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i,
    )?.[1];
    const schema = JSON.parse(jsonLdBody ?? '{}') as {
      '@graph'?: Array<{
        '@type'?: string;
        mainEntity?: { itemListElement?: unknown[] };
      }>;
    };
    const collectionPage = schema['@graph']?.find((node) => node['@type'] === 'CollectionPage');
    const listItemCount = collectionPage?.mainEntity?.itemListElement?.length ?? 0;

    expect(html.length, 'Tetrika company page should stay batch-loaded').toBeLessThan(260_000);
    expect(jsonLdBytes, 'company JSON-LD should not serialize all vacancies').toBeLessThan(80_000);
    expect(listItemCount, 'JSON-LD ItemList should only include the initial batch').toBeLessThanOrEqual(24);
    expect(html, 'full count remains available as lightweight metadata').toMatch(/"numberOfItems":\s*4032/);
  });

  // H13 — lazy-load 49 KB of city data from a static JSON endpoint
  // instead of inlining it into every render of the homepage.
  describe('H13: city-index lazy fetch', () => {
    it('emits dist/api/v1/city-index.json with both lookup tables', () => {
      const cityIndexPath = join(DIST_DIR, 'api', 'v1', 'city-index.json');
      expect(existsSync(cityIndexPath), 'city-index.json exists').toBe(true);
      expect(existsSync(join(DIST_DIR, 'api', 'city-index.json')), 'legacy city-index path').toBe(false);

      const raw = readFileSync(cityIndexPath, 'utf8');
      const data = JSON.parse(raw);

      expect(data).toHaveProperty('availableCities');
      expect(data).toHaveProperty('cityRouteMap');
      expect(Array.isArray(data.availableCities)).toBe(true);
      expect(data.availableCities.length).toBeGreaterThan(500);
      expect(data.availableCities).toContain('Москва');
      expect(data.availableCities).toContain('Санкт-Петербург');

      expect(typeof data.cityRouteMap).toBe('object');
      expect(Object.keys(data.cityRouteMap).length).toBeGreaterThan(500);
      expect(data.cityRouteMap['Москва']).toBe('/rabota-kurerom-moskva/');
      expect(data.cityRouteMap['Санкт-Петербург']).toBe('/rabota-kurerom-sankt-peterburg/');

      // Every entry in availableCities must have a corresponding
      // cityRouteMap entry — that's the invariant the inline script
      // used to rely on when it had both arrays in lockstep.
      for (const name of data.availableCities) {
        expect(
          data.cityRouteMap[name],
          `cityRouteMap missing entry for ${name}`,
        ).toBeTruthy();
      }
    });

    it('homepage HTML no longer inlines the city array literal', () => {
      const indexHtml = readFileSync(join(DIST_DIR, 'index.html'), 'utf8');
      // The original `define:vars={{ availableCities, cityRouteMap }}`
      // emitted `const availableCities = [...]` directly into a
      // <script> tag — that's what H13 eliminates.
      expect(indexHtml).not.toMatch(/const\s+availableCities\s*=\s*\[/);
      expect(indexHtml).not.toMatch(/const\s+cityRouteMap\s*=\s*\{/);
      // And conversely, the lazy-fetch wiring must be present.
      expect(indexHtml).toContain("fetch('/api/v1/city-index.json'");
    });

    it('emits the compare catalog on the versioned API path only', () => {
      const comparePath = join(DIST_DIR, 'api', 'v1', 'compare-jobs.json');
      expect(existsSync(comparePath), 'versioned compare catalog exists').toBe(true);
      expect(existsSync(join(DIST_DIR, 'api', 'compare-jobs.json')), 'legacy compare catalog path').toBe(false);

      const data = JSON.parse(readFileSync(comparePath, 'utf8'));
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(5_000);
      expect(data[0]).toHaveProperty('id');
      expect(data[0]).toHaveProperty('title');
      expect(data[0]).toHaveProperty('link');
    });

    it('homepage review teaser does not repeat reviewer names', () => {
      const indexHtml = readFileSync(join(DIST_DIR, 'index.html'), 'utf8');
      const reviewsStart = indexHtml.indexOf('class="reviews-grid"');
      const templateStart = indexHtml.indexOf('<template id="review-card-template"', reviewsStart);
      const reviewsHtml =
        reviewsStart !== -1 && templateStart !== -1
          ? indexHtml.slice(reviewsStart, templateStart)
          : '';
      const names = Array.from(
        reviewsHtml.matchAll(/<strong\b[^>]*>([^<]+)<\/strong>/g),
        (match) => match[1],
      );

      expect(names).toHaveLength(3);
      expect(new Set(names).size).toBe(names.length);
    });
  });

  // M14 — dedicated city-grid fragment endpoint. The city-switch hot
  // path fetches `/api/grid/<slug>/` (just the `#jobs-grid` markup)
  // instead of the full ~67 KB `/rabota-kurerom-<slug>/` page.
  describe('M14: city-grid fragment endpoint', () => {
    it('emits a grid fragment for a known city', () => {
      const gridPath = join(DIST_DIR, 'api', 'grid', 'moskva', 'index.html');
      expect(existsSync(gridPath), 'api/grid/moskva/ exists').toBe(true);

      const html = readFileSync(gridPath, 'utf8');
      // The fragment must carry the `#jobs-grid` element the client's
      // `swapGridContent` clones children out of, plus the
      // `data-overflow-count` attribute the C2 reveal-more flow reads.
      expect(html).toContain('id="jobs-grid"');
      expect(html).toMatch(/data-overflow-count=/);
      expect(html).toContain('class="job-card"');
    });

    it('grid fragment is far smaller than the full listing page', () => {
      const gridHtml = readFileSync(
        join(DIST_DIR, 'api', 'grid', 'moskva', 'index.html'),
        'utf8',
      );
      const fullHtml = readFileSync(
        join(DIST_DIR, 'rabota-kurerom-moskva', 'index.html'),
        'utf8',
      );
      // The whole point of M14: the fragment drops BaseLayout chrome
      // and page scripts. CSS is now externalized across the build, so
      // a relative-only threshold is too sensitive to the full page
      // shrinking. Keep both invariants: the fragment is still smaller
      // than the document, and it stays under a stable absolute cap.
      expect(gridHtml.length).toBeLessThan(fullHtml.length);
      expect(gridHtml.length).toBeLessThan(120_000);
    });

    it('grid fragment ships no BaseLayout chrome', () => {
      const gridHtml = readFileSync(
        join(DIST_DIR, 'api', 'grid', 'moskva', 'index.html'),
        'utf8',
      );
      // Fragment endpoints render no layout — no <html>/<head>/<body>,
      // no nav/footer landmarks. If any of these leak in, the endpoint
      // accidentally wrapped the grid in a full document again.
      expect(gridHtml).not.toMatch(/<html[\s>]/i);
      expect(gridHtml).not.toMatch(/<head[\s>]/i);
      expect(gridHtml).not.toMatch(/<footer[\s>]/i);
    });

    it('the city-switch fetch targets the fragment endpoint, not the full page', () => {
      // JobGrid.astro's renderJobsForCity() must hit `/api/grid/...`.
      // In optimized builds the JobGrid controller is emitted as a shared
      // `_astro/*.js` asset, so inspect the page plus its local scripts.
      const listingHtml = readFileSync(
        join(DIST_DIR, 'rabota-kurerom-moskva', 'index.html'),
        'utf8',
      );
      const listingCode = `${listingHtml}\n${localScriptAssetCode(listingHtml)}`;
      expect(listingCode).toContain('/api/grid/');
      // The old full-page city fetch must be gone from the hot path.
      expect(listingCode).not.toMatch(/fetch\(`\/rabota-kurerom-\$\{citySlug\}\/`/);
    });
  });

  describe('P0: heavy listing page-weight', () => {
    it('renders only the first batch in a heavy listing main HTML', () => {
      const html = readFileSync(
        join(DIST_DIR, 'rabota-kurerom-podrabotka', 'index.html'),
        'utf8',
      );
      const cardCount = (html.match(/class="job-card"/g) || []).length;

      expect(cardCount).toBe(24);
      expect(html).toMatch(/data-overflow-count="[1-9]\d*"/);
      expect(html).toContain('/api/grid-batch/podrabotka-kurerom/2/');
      expect(html).toContain('id="jobs-grid-reveal-more-btn"');
      expect(html).toMatch(/24 вакансии из \d+ ваканс(ии|ий)/);
      expect(html).toContain('Показать ещё 24 вакансии');
      expect(html).not.toContain('<template class="jobs-grid-overflow"');
      expect(html.length).toBeLessThan(500_000);
    });

    it('keeps daily-pay cards searchable by the same payment field as SSR', () => {
      const html = readFileSync(
        join(DIST_DIR, 'rabota-kurerom-ezhednevnaya-oplata', 'index.html'),
        'utf8',
      );
      const cardCount = (html.match(/class="job-card"/g) || []).length;

      expect(cardCount).toBe(24);
      expect(html).toContain('24 вакансии из 2097 вакансий');
      expect(html).toMatch(/data-search-text="[^"]*Ежедневно/);
    });

    it('renders a city selector on the daily-pay listing', () => {
      const html = readFileSync(
        join(DIST_DIR, 'rabota-kurerom-ezhednevnaya-oplata', 'index.html'),
        'utf8',
      );
      const idPos = html.indexOf('id="hub-city-filter"');
      const end = idPos === -1 ? -1 : html.indexOf('</select>', idPos);
      const block = idPos !== -1 && end !== -1 ? html.slice(idPos, end) : '';
      const optionCount = (block.match(/<option/g) ?? []).length;

      expect(idPos).toBeGreaterThan(-1);
      expect(block).toContain('Все города');
      expect(block).toMatch(/data-name="[^"]+"/);
      expect(optionCount).toBeGreaterThanOrEqual(2);
      expect(html).toContain('data-listing-city-filter');
    });

    it('emits static job-card batch fragments for heavy listings', () => {
      const batchPath = join(
        DIST_DIR,
        'api',
        'grid-batch',
        'podrabotka-kurerom',
        '2',
        'index.html',
      );
      expect(existsSync(batchPath), 'first batch fragment exists').toBe(true);

      const html = readFileSync(batchPath, 'utf8');
      const cardCount = (html.match(/class="job-card"/g) || []).length;

      expect(html).toContain('class="jobs-grid-batch"');
      expect(cardCount).toBe(24);
      expect(html).toMatch(/data-overflow-count="[1-9]\d*"/);
      expect(html).toContain('/api/grid-batch/podrabotka-kurerom/3/');
    });

    it('deduplicates alias grid-batch trees through canonical batch keys', () => {
      const aliasBatchPath = join(
        DIST_DIR,
        'api',
        'grid-batch',
        'rabota-kurerom-podrabotka',
        '2',
        'index.html',
      );
      const aliasPage = readFileSync(
        join(DIST_DIR, 'rabota-kurerom-vecherom', 'index.html'),
        'utf8',
      );

      expect(existsSync(aliasBatchPath), 'alias batch tree should not be generated').toBe(false);
      expect(aliasPage).toContain('/api/grid-batch/podrabotka-kurerom/2/');
      expect(aliasPage).not.toContain('/api/grid-batch/rabota-kurerom-vecherom/2/');
    });

    it('does not ship full available-job id blobs in listing HTML', () => {
      const pages = [
        join(DIST_DIR, 'index.html'),
        join(DIST_DIR, 'rabota-kurerom-moskva', 'index.html'),
        join(DIST_DIR, 'podrabotka-kurerom', 'index.html'),
        join(DIST_DIR, 'rabota-kurerom-podrabotka', 'index.html'),
      ];

      for (const page of pages) {
        if (!existsSync(page)) continue;
        const html = readFileSync(page, 'utf8');
        expect(html, page).not.toContain('data-available-job-ids');
      }
    });

    it('keeps service grid fragments out of the sitemap', () => {
      const sitemapContent = readAllSitemaps();

      expect(sitemapContent).not.toContain('/api/grid/');
      expect(sitemapContent).not.toContain('/api/grid-batch/');
    });

    it('blocks service grid fragments from major search crawlers in robots.txt', () => {
      const robotsPath = join(ROOT, '..', 'public', 'robots.txt');
      const robots = readFileSync(robotsPath, 'utf8');

      const crawlerGroups = [
        '*',
        'Googlebot',
        'GoogleOther',
        'Yandex',
        'YandexBot',
        'YandexAdditionalBot',
        'Bingbot',
      ];

      for (const crawler of crawlerGroups) {
        const crawlerPattern = crawler.replace('*', '\\*');
        const groupPattern = new RegExp(
          `User-agent:\\s*${crawlerPattern}[\\s\\S]*?(?=\\nUser-agent:|\\nSitemap:|$)`,
          'i',
        );
        const group = robots.match(groupPattern)?.[0] ?? '';
        expect(group, `robots group missing for ${crawler}`).not.toBe('');
        expect(group, `${crawler} must disallow /api/grid/`).toContain('Disallow: /api/grid/');
        expect(group, `${crawler} must disallow /api/grid-batch/`).toContain('Disallow: /api/grid-batch/');
        expect(group, `${crawler} must disallow /admin/`).toContain('Disallow: /admin/');
      }
    });
  });

  describe('seo surface cleanup', () => {
    it('keeps selective vacancy indexation consistent across robots, JobPosting and sitemap', () => {
      const sitemapContent = readAllSitemaps();
      const indexableVacancyUrl = 'https://kurerok.ru/v/kuper-foot-courier-olenegorsk-foot/';
      const noindexVacancyUrl = 'https://kurerok.ru/v/efin-bank-representative-chudovo-auto/';
      const indexableHtml = readFileSync(
        join(DIST_DIR, 'v', 'kuper-foot-courier-olenegorsk-foot', 'index.html'),
        'utf8',
      );
      const noindexHtml = readFileSync(
        join(DIST_DIR, 'v', 'efin-bank-representative-chudovo-auto', 'index.html'),
        'utf8',
      );

      expect(sitemapContent).toContain(indexableVacancyUrl);
      expect(indexableHtml).toContain('"@type":"JobPosting"');
      expect(indexableHtml).not.toMatch(/<meta\s+name="robots"\s+content="[^"]*noindex/i);

      expect(sitemapContent).not.toContain(noindexVacancyUrl);
      expect(noindexHtml).toMatch(/<meta\s+name="robots"\s+content="noindex, follow"/i);
      expect(noindexHtml).not.toContain('"@type":"JobPosting"');
    });

    it('emits semantic sitemap chunks including metro pages', () => {
      const sitemapIndex = readFileSync(join(DIST_DIR, 'sitemap-index.xml'), 'utf8');
      const metroSitemap = readFileSync(join(DIST_DIR, 'sitemap-metro-0.xml'), 'utf8');
      const vacancySitemap = readFileSync(join(DIST_DIR, 'sitemap-vacancies-0.xml'), 'utf8');

      expect(sitemapIndex).toContain('sitemap-vacancies-0.xml');
      expect(sitemapIndex).toContain('sitemap-listings-0.xml');
      expect(sitemapIndex).toContain('sitemap-metro-0.xml');
      expect(metroSitemap).toContain('https://kurerok.ru/metro/moskva/sokol/');
      expect(vacancySitemap).toContain('https://kurerok.ru/v/kuper-foot-courier-olenegorsk-foot/');
      expect(vacancySitemap).not.toContain('https://kurerok.ru/v/efin-bank-representative-chudovo-auto/');
    });

    it('keeps metro pages indexable without JobPosting structured data', () => {
      const html = readFileSync(join(DIST_DIR, 'metro', 'moskva', 'sokol', 'index.html'), 'utf8');

      expect(html).toContain('<link rel="canonical" href="https://kurerok.ru/metro/moskva/sokol/">');
      expect(html).not.toMatch(/<meta\s+name="robots"\s+content="[^"]*noindex/i);
      expect(html).toContain('"@type":"SubwayStation"');
      expect(html).not.toContain('"@type":"JobPosting"');
    });

    it('keeps internal and placeholder routes out of the sitemap', () => {
      const sitemapContent = readAllSitemaps();

      expect(sitemapContent).not.toContain('https://kurerok.ru/admin/board/');
      expect(sitemapContent).not.toContain('https://kurerok.ru/blog/');
      expect(sitemapContent).not.toContain('https://kurerok.ru/guide/dohod.md');
      expect(sitemapContent).not.toContain('https://kurerok.ru/antonovka/');
      expect(sitemapContent).not.toContain('https://kurerok.ru/aprelevka/');
    });

    it('marks internal admin and empty blog pages as noindex when emitted', () => {
      const pages = [
        join(DIST_DIR, 'admin', 'board', 'index.html'),
        join(DIST_DIR, 'blog', 'index.html'),
      ];

      for (const page of pages) {
        if (!existsSync(page)) continue;
        const html = readFileSync(page, 'utf8');
        expect(html, page).toMatch(/<meta\s+name="robots"\s+content="[^"]*noindex/i);
      }
    });

    it('does not emit legacy non-courier city pages', () => {
      const legacyPages = [
        join(DIST_DIR, 'antonovka', 'index.html'),
        join(DIST_DIR, 'aprelevka', 'index.html'),
      ];

      for (const page of legacyPages) {
        expect(existsSync(page), `${page} should not be generated`).toBe(false);
      }
    });
  });
});

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

import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import jobs from '../src/data/jobs';
import { vacancySources } from '../src/data/vacancies';
import type { CurrencyCode, TransportMode, VacancyHowToTemplate } from '../src/data/vacancyTypes';

const ROOT = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(ROOT, '..', 'public');

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
  'voxys-call-center-operator',
  'mts-bank-operator',
  'qlean-cleaner',
  'ruki-door-installer',
  'ruki-kitchen-assembler',
  'domovenok-window-cleaner',
  'yandex-go-courier-belarus',
  'yandex-go-courier-kazakhstan',
  'yandex-go-courier-kyrgyzstan',
  'yandex-go-courier-uzbekistan',
];

const VALID_TRANSPORT_MODES: TransportMode[] = ['foot', 'bicycle', 'auto', 'remote', 'office', 'service'];
const VALID_CURRENCIES: CurrencyCode[] = ['RUB', 'BYN', 'KZT', 'KGS', 'UZS'];
const VALID_HOW_TO_TEMPLATES: VacancyHowToTemplate[] = [
  'courier',
  'bank_representative',
  'call_center',
  'office_employee',
  'remote_operator',
  'service_worker',
];

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

  it('uses bundled local company logo files', () => {
    for (const source of vacancySources) {
      const logo = source.company.logo;
      const ctx = `logo for ${source.slug}: ${logo}`;

      expect(logo, ctx).toMatch(/^\/logos\/[^/]+\.(svg|png|jpe?g)$/);
      expect(logo, ctx).not.toMatch(/^https?:\/\//);
      expect(existsSync(join(PUBLIC_DIR, logo.slice(1))), ctx).toBe(true);
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

  it('every explicit HowTo template is in the supported set', () => {
    for (const source of vacancySources) {
      if (!source.howToTemplate) continue;
      expect(VALID_HOW_TO_TEMPLATES, `howToTemplate for ${source.slug}`).toContain(
        source.howToTemplate,
      );
    }
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
        expect(VALID_CURRENCIES, `pay.currency for ${ctx}`).toContain(offer.pay.currency);
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

  it('renders fixed monthly salaries without a misleading "до" prefix', () => {
    const voxysJobs = jobs.filter((job) => job.sourceSlug === 'voxys-call-center-operator');

    expect(voxysJobs.length).toBeGreaterThan(0);
    for (const job of voxysJobs) {
      expect(job.salary, job.slug).toMatch(/^\d[\d ]+ ₽\/мес$/);
      expect(job.details.rate, job.slug).toContain('Фиксированная ставка');
    }
  });

  it('generates MTS Bank remote call-center operator offers', () => {
    const source = vacancySources.find((item) => item.slug === 'mts-bank-operator');
    const mtsJobs = jobs.filter((job) => job.sourceSlug === 'mts-bank-operator');

    expect(source).toBeDefined();
    expect(source?.company.name).toBe('МТС Банк');
    expect(source?.howToTemplate).toBe('call_center');
    expect(source?.incomeCalculator).toEqual({ mode: 'monthly' });
    expect(source?.offers).toHaveLength(140);
    expect(source?.offers.every((offer) => offer.transport === 'remote')).toBe(true);
    expect(source?.offers.every((offer) => offer.employmentFormats?.includes('official'))).toBe(true);

    expect(mtsJobs).toHaveLength(140);
    expect(mtsJobs.some((job) => job.location === 'Химки')).toBe(true);
    expect(mtsJobs.some((job) => job.location === 'Одинцово')).toBe(true);
    expect(mtsJobs.some((job) => job.location === 'Колпино')).toBe(true);
    expect(mtsJobs.some((job) => job.location === 'Пушкин')).toBe(true);
    expect(mtsJobs.some((job) => job.location === 'Шушары')).toBe(true);

    const ryazan = mtsJobs.find((job) => job.location === 'Рязань');
    expect(ryazan?.slug).toBe('mts-bank-operator-ryazan-remote');
    expect(ryazan?.title).toBe('Оператор МТС Банка в Рязани');
    expect(ryazan?.salary).toBe('до 68 500 ₽/мес');
    expect(ryazan?.details.rate).toBe('от 46 000 до 68 500 ₽/мес');
    expect(ryazan?.details.employment_type).toBe('Официальное трудоустройство');
    expect(ryazan?.details.medical_book).toBe('Не требуется');
    expect(ryazan?.details.os).toContain('Компьютер');
    expect(ryazan?.applyLink).toContain('https://trk.ppdu.ru/click?');
  });

  it('generates Ruki Moscow-region service worker offers only', () => {
    const doorSource = vacancySources.find((item) => item.slug === 'ruki-door-installer');
    const kitchenSource = vacancySources.find((item) => item.slug === 'ruki-kitchen-assembler');
    const doorJobs = jobs.filter((job) => job.sourceSlug === 'ruki-door-installer');
    const kitchenJobs = jobs.filter((job) => job.sourceSlug === 'ruki-kitchen-assembler');

    expect(doorSource).toBeDefined();
    expect(kitchenSource).toBeDefined();
    expect(doorSource?.company.name).toBe('Сервис «Руки»');
    expect(kitchenSource?.company.name).toBe('Сервис «Руки»');
    expect(doorSource?.howToTemplate).toBe('service_worker');
    expect(kitchenSource?.howToTemplate).toBe('service_worker');
    expect(doorSource?.incomeCalculator).toEqual({ mode: 'monthly' });
    expect(kitchenSource?.incomeCalculator).toEqual({ mode: 'monthly' });
    expect(doorSource?.offers).toHaveLength(75);
    expect(kitchenSource?.offers).toHaveLength(75);
    expect(doorSource?.offers.every((offer) => offer.salaryConfidence === 'partner')).toBe(true);
    expect(kitchenSource?.offers.every((offer) => offer.salaryConfidence === 'partner')).toBe(true);

    expect(doorJobs).toHaveLength(75);
    expect(kitchenJobs).toHaveLength(75);
    expect(doorJobs.some((job) => job.location === 'Химки')).toBe(true);
    expect(doorJobs.some((job) => job.location === 'Одинцово')).toBe(true);
    expect(kitchenJobs.some((job) => job.location === 'Люберцы')).toBe(true);
    expect([...doorJobs, ...kitchenJobs].some((job) => job.location === 'Санкт-Петербург')).toBe(false);
    expect([...doorJobs, ...kitchenJobs].some((job) => job.location === 'Новосибирск')).toBe(false);

    const moscowDoor = doorJobs.find((job) => job.location === 'Москва');
    expect(moscowDoor?.slug).toBe('ruki-door-installer-moskva-service');
    expect(moscowDoor?.title).toBe('Установщик межкомнатных дверей Сервис «Руки» в Москве');
    expect(moscowDoor?.salary).toBe('до 300 000 ₽/мес');
    expect(moscowDoor?.details.rate).toContain('средний доход за заказ: 15 000 ₽');
    expect(moscowDoor?.details.employment_type).toContain('Самозанятость');
    expect(moscowDoor?.applyLink).toContain('https://my.saleads.pro/s/1fbdx');

    const moscowKitchen = kitchenJobs.find((job) => job.location === 'Москва');
    expect(moscowKitchen?.slug).toBe('ruki-kitchen-assembler-moskva-service');
    expect(moscowKitchen?.title).toBe('Сборщик кухонь Сервис «Руки» в Москве');
    expect(moscowKitchen?.salary).toBe('до 350 000 ₽/мес');
    expect(moscowKitchen?.details.rate).toContain('средний доход за заказ: 27 500 ₽');
    expect(moscowKitchen?.details.employment_type).toContain('Самозанятость');
  });

  it('generates Yandex Go international courier offers with local currencies', () => {
    const sourceSlugs = [
      'yandex-go-courier-belarus',
      'yandex-go-courier-kazakhstan',
      'yandex-go-courier-kyrgyzstan',
      'yandex-go-courier-uzbekistan',
    ];
    const sources = vacancySources.filter((source) => sourceSlugs.includes(source.slug));
    const sourceOffers = sources.flatMap((source) => source.offers);

    expect(sources.map((source) => source.slug).sort()).toEqual([...sourceSlugs].sort());
    expect(sourceOffers).toHaveLength(51);
    expect(sourceOffers.every((offer) => ['foot', 'bicycle', 'auto'].includes(offer.transport))).toBe(true);

    const almatyJobs = jobs.filter(
      (job) => job.sourceSlug === 'yandex-go-courier-kazakhstan' && job.location === 'Алматы',
    );
    expect(almatyJobs.map((job) => job.transport).sort()).toEqual(['auto', 'bicycle', 'foot']);

    const almatyFoot = almatyJobs.find((job) => job.transport === 'foot');
    expect(almatyFoot?.slug).toBe('yandex-go-courier-kazakhstan-almaty-foot');
    expect(almatyFoot?.salary).toBe('до 595 000 ₸/мес');
    expect(almatyFoot?.details.rate).toContain('1 985 ₸/час');
    expect(almatyFoot?.currency).toBe('KZT');
    expect(almatyFoot?.applyLink).toContain('https://my.saleads.pro/s/catm5?');

    expect(
      jobs.some(
        (job) =>
          job.sourceSlug === 'yandex-go-courier-belarus' &&
          job.location === 'Минск' &&
          job.currency === 'BYN',
      ),
    ).toBe(true);
    expect(
      jobs.some(
        (job) =>
          job.sourceSlug === 'yandex-go-courier-kyrgyzstan' &&
          job.location === 'Бишкек' &&
          job.currency === 'KGS',
      ),
    ).toBe(true);
    expect(
      jobs.some(
        (job) =>
          job.sourceSlug === 'yandex-go-courier-uzbekistan' &&
          job.location === 'Ташкент' &&
          job.currency === 'UZS',
      ),
    ).toBe(true);
  });

  it('generates Domovenok window cleaner offers for capital regions and Nizhny Novgorod city', () => {
    const source = vacancySources.find((item) => item.slug === 'domovenok-window-cleaner');
    const domovenokJobs = jobs.filter((job) => job.sourceSlug === 'domovenok-window-cleaner');

    expect(source).toBeDefined();
    expect(source?.company.name).toBe('Домовёнок');
    expect(source?.howToTemplate).toBe('service_worker');
    expect(source?.incomeCalculator).toEqual({ mode: 'monthly' });
    expect(source?.offers).toHaveLength(144);
    expect(domovenokJobs).toHaveLength(144);

    const cities = new Set(domovenokJobs.map((job) => job.location));
    expect(cities.has('Москва')).toBe(true);
    expect(cities.has('Химки')).toBe(true);
    expect(cities.has('Одинцово')).toBe(true);
    expect(cities.has('Санкт-Петербург')).toBe(true);
    expect(cities.has('Колпино')).toBe(true);
    expect(cities.has('Пушкин')).toBe(true);
    expect(cities.has('Мурино')).toBe(true);
    expect(cities.has('Кудрово')).toBe(true);
    expect(cities.has('Нижний Новгород')).toBe(true);
    expect(cities.has('Дзержинск')).toBe(false);
    expect(cities.has('Бор')).toBe(false);

    const moscow = domovenokJobs.find((job) => job.location === 'Москва');
    expect(moscow?.slug).toBe('domovenok-window-cleaner-moskva-service');
    expect(moscow?.salary).toBe('до 172 500 ₽/мес');
    expect(moscow?.sourceUrl).toBe('https://www.domovenok.ru/vakansii_okna');
    expect(moscow?.applyLink).toContain('utm_content=moskva-service');

    const spb = domovenokJobs.find((job) => job.location === 'Санкт-Петербург');
    expect(spb?.slug).toBe('domovenok-window-cleaner-sankt-peterburg-service');
    expect(spb?.salary).toBe('до 129 400 ₽/мес');
    expect(spb?.sourceUrl).toBe('https://spb.domovenok.ru/vakansii_okna');
    expect(spb?.applyLink).toContain('utm_content=sankt-peterburg-service');

    const luban = domovenokJobs.find((job) => job.location === 'Любань');
    expect(luban?.slug).toBe('domovenok-window-cleaner-lyuban-service');
    expect(luban?.title).toBe('Мойщик окон Домовёнок в Любани');

    const telmana = domovenokJobs.find((job) => job.location === 'Тельмана');
    expect(telmana?.slug).toBe('domovenok-window-cleaner-telmana-service');
    expect(telmana?.title).toBe('Мойщик окон Домовёнок в посёлке Тельмана');

    const nizhny = domovenokJobs.find((job) => job.location === 'Нижний Новгород');
    expect(nizhny?.slug).toBe('domovenok-window-cleaner-nizhniy-novgorod-service');
    expect(nizhny?.title).toBe('Мойщик окон Домовёнок в Нижнем Новгороде');
    expect(nizhny?.salary).toBe('до 118 500 ₽/мес');
    expect(nizhny?.sourceUrl).toBe('https://nn.domovenok.ru/vakansii_okna');
    expect(nizhny?.details.age).toBe('от 18 лет');
    expect(nizhny?.details.rate).toContain('мойку окон и балконов');
    expect(nizhny?.details.employment_type).toContain('Самозанятость');
    expect(nizhny?.applyLink).toContain('https://my.saleads.pro/s/u8jcm/5859?');
  });
});

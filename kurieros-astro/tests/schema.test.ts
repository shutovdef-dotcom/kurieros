/**
 * Tests for `buildJobPostingSchema` — JobPosting JSON-LD audit
 * (docs/seo/jobposting-audit-2026-05-25.md).
 *
 * Each fix gets its own `describe` block. Baseline behaviour (fields
 * that should NOT regress) is covered up-front in the `baseline` block
 * so each fix's `describe` can focus on the new behaviour.
 *
 * Naming follows the audit document: Fix A, B, C, D, E, F, G.
 */
import { describe, it, expect } from 'vitest';
import {
  buildJobPostingSchema,
  mapEmploymentTypeToSchema,
  type JobPostingInput,
} from '../src/utils/schema';

const baseInput: JobPostingInput = {
  title: 'Test Courier — Moscow',
  description: 'Sample description ≥ 50 chars to satisfy Google for Jobs minimum.',
  slug: 'test-courier-moskva-foot',
  company: 'Test Company',
  companyUrl: 'https://kurerok.ru/companies/test-company/',
  jobUrl: 'https://kurerok.ru/v/test-courier-moskva-foot/',
  cities: ['Москва'],
  hasApplyLink: true,
  applyLink: 'https://example.com/apply',
  datePosted: '2026-05-01T00:00:00.000Z',
  validThrough: '2026-07-30T00:00:00.000Z',
};

describe('buildJobPostingSchema — baseline (no regression after fixes)', () => {
  it('always emits @type=JobPosting and inLanguage=ru-RU', () => {
    const out = buildJobPostingSchema(baseInput);

    expect(out['@type']).toBe('JobPosting');
    expect(out.inLanguage).toBe('ru-RU');
  });

  it('preserves identifier with KurerOk name and slug value', () => {
    const out = buildJobPostingSchema(baseInput);

    expect(out.identifier).toEqual({
      '@type': 'PropertyValue',
      name: 'КурьерОк',
      value: 'test-courier-moskva-foot',
    });
  });

  it('emits applicantLocationRequirements as Country/Russia', () => {
    const out = buildJobPostingSchema(baseInput);

    expect(out.applicantLocationRequirements).toEqual({
      '@type': 'Country',
      name: 'Russia',
    });
  });

  it('emits hiringOrganization with name and sameAs (back-link to our page)', () => {
    const out = buildJobPostingSchema(baseInput);

    expect(out.hiringOrganization.name).toBe('Test Company');
    expect(out.hiringOrganization.sameAs).toBe(
      'https://kurerok.ru/companies/test-company/',
    );
  });

  it('uses the canonical job page URL and never the external affiliate apply URL', () => {
    const out = buildJobPostingSchema(baseInput);

    expect(out.url).toBe(baseInput.jobUrl);
    expect(out.url).not.toBe(baseInput.applyLink);
  });

  it('marks directApply only after the application flow was explicitly verified', () => {
    expect(buildJobPostingSchema(baseInput).directApply).toBe(false);
    expect(
      buildJobPostingSchema({ ...baseInput, directApplyVerified: true }).directApply,
    ).toBe(true);
  });
});

describe('Fix B (2026-05-25) — isRemote → TELECOMMUTE + country-only jobLocation', () => {
  it('omits jobLocationType when isRemote is false/undefined (non-remote vacancy)', () => {
    const out = buildJobPostingSchema({ ...baseInput, isRemote: false });

    expect('jobLocationType' in out).toBe(false);
  });

  it('adds jobLocationType=TELECOMMUTE when isRemote=true', () => {
    const out = buildJobPostingSchema({ ...baseInput, isRemote: true });

    expect(out).toHaveProperty('jobLocationType', 'TELECOMMUTE');
  });

  it('collapses jobLocation to country-only Place when isRemote=true', () => {
    const out = buildJobPostingSchema({
      ...baseInput,
      isRemote: true,
      cities: ['Барнаул', 'Москва'], // would normally produce 2 PostalAddresses
    });

    expect(out.jobLocation).toEqual([
      {
        '@type': 'Place',
        address: {
          '@type': 'PostalAddress',
          addressCountry: 'RU',
        },
      },
    ]);
    // No streetAddress / postalCode / addressLocality / addressRegion
    // for remote roles — those would contradict TELECOMMUTE.
    expect(out.jobLocation[0].address).not.toHaveProperty('streetAddress');
    expect(out.jobLocation[0].address).not.toHaveProperty('addressLocality');
  });

  it('emits an honest city-level PostalAddress when isRemote=false', () => {
    const out = buildJobPostingSchema({ ...baseInput, cities: ['Москва'] });
    const address = out.jobLocation[0].address as Record<string, unknown>;

    expect(address).toMatchObject({
      '@type': 'PostalAddress',
      addressLocality: 'Москва',
      addressRegion: 'Москва',
      addressCountry: 'RU',
    });
    expect(address).not.toHaveProperty('streetAddress');
    expect(address).not.toHaveProperty('postalCode');
  });

  it('adds an exact workplace address only when the caller supplies source-backed data', () => {
    const out = buildJobPostingSchema({
      ...baseInput,
      cities: ['Москва'],
      workplaceAddress: 'д. Хоругвино, д. 35/2',
    });

    expect(out.jobLocation[0].address).toMatchObject({
      addressLocality: 'Москва',
      streetAddress: 'д. Хоругвино, д. 35/2',
    });
  });
});

describe('JobPosting jobLocation — city-level location hygiene', () => {
  it('emits real region but no fabricated street/postalCode for a known city', () => {
    const out = buildJobPostingSchema({ ...baseInput, cities: ['Барнаул'] });
    const address = out.jobLocation[0].address as Record<string, unknown>;

    expect(address).toMatchObject({
      '@type': 'PostalAddress',
      addressLocality: 'Барнаул',
      addressRegion: 'Алтайский край',
      addressCountry: 'RU',
    });
    expect(address).not.toHaveProperty('streetAddress');
    expect(address).not.toHaveProperty('postalCode');
  });

  it('resolves region for previously-uncovered cities (Апрелевка → Московская область)', () => {
    const out = buildJobPostingSchema({ ...baseInput, cities: ['Апрелевка'] });
    const address = out.jobLocation[0].address as Record<string, unknown>;

    expect(address).toMatchObject({
      '@type': 'PostalAddress',
      addressLocality: 'Апрелевка',
      addressRegion: 'Московская область',
      addressCountry: 'RU',
    });
    expect(address).not.toHaveProperty('streetAddress');
    expect(address).not.toHaveProperty('postalCode');
  });

  it('omits addressRegion only when the city is in neither cityGeo nor the curated map', () => {
    const out = buildJobPostingSchema({ ...baseInput, cities: ['Несуществоград'] });
    const address = out.jobLocation[0].address as Record<string, unknown>;

    expect(address).toMatchObject({
      '@type': 'PostalAddress',
      addressLocality: 'Несуществоград',
      addressCountry: 'RU',
    });
    expect(address).not.toHaveProperty('addressRegion');
    expect(address).not.toHaveProperty('postalCode');
    expect(address).not.toHaveProperty('streetAddress');
  });

  it('normalizes city strings with metro hints before building jobLocation', () => {
    const out = buildJobPostingSchema({
      ...baseInput,
      cities: ['Москва (метро Сокол)', 'метро Арбатская', 'Москва'],
    });

    expect(out.jobLocation).toEqual([
      {
        '@type': 'Place',
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Москва',
          addressRegion: 'Москва',
          addressCountry: 'RU',
        },
      },
    ]);
  });

  it('emits country-only Place for the «Россия» pseudo-city (no locality)', () => {
    const out = buildJobPostingSchema({ ...baseInput, cities: [] });

    // Empty cities list defaults to ['Россия'], which produces just a
    // country-level Place (no locality / region / street).
    expect(out.jobLocation).toEqual([
      {
        '@type': 'Place',
        address: { '@type': 'PostalAddress', addressCountry: 'RU' },
      },
    ]);
  });
});

describe('Fix C (2026-05-25) — real baseSalary range, no 60% heuristic', () => {
  it('emits monthly range using REAL min/max when both provided', () => {
    const out = buildJobPostingSchema({
      ...baseInput,
      baseSalaryMonthlyMin: 60_000,
      baseSalaryMonthlyMax: 94_000,
    });

    expect(out.baseSalary).toEqual({
      '@type': 'MonetaryAmount',
      currency: 'RUB',
      value: {
        '@type': 'QuantitativeValue',
        value: 94_000,
        maxValue: 94_000,
        minValue: 60_000, // NOT 94000 × 0.6 = 56_400
        unitText: 'MONTH',
      },
    });
  });

  it('falls back to single-point monthly when only max is known', () => {
    const out = buildJobPostingSchema({
      ...baseInput,
      baseSalaryMonthlyMax: 94_000,
    });

    expect(out.baseSalary?.value.value).toBe(94_000);
    expect(out.baseSalary?.value.maxValue).toBe(94_000);
    // Fix C — single point, NOT 60% heuristic
    expect(out.baseSalary?.value.minValue).toBe(94_000);
  });

  it('falls back to single-point monthly when only min is known', () => {
    const out = buildJobPostingSchema({
      ...baseInput,
      baseSalaryMonthlyMin: 60_000,
    });

    expect(out.baseSalary?.value.value).toBe(60_000);
    expect(out.baseSalary?.value.minValue).toBe(60_000);
    expect(out.baseSalary?.value.maxValue).toBe(60_000);
  });

  it('emits hourly range with min/max keys when both provided', () => {
    const out = buildJobPostingSchema({
      ...baseInput,
      hourlyRateMin: 300,
      hourlyRateMax: 489,
    });

    expect(out.baseSalary?.value).toEqual({
      '@type': 'QuantitativeValue',
      value: 489,
      maxValue: 489,
      minValue: 300,
      unitText: 'HOUR',
    });
  });

  it('emits hourly without min/max keys when bracket is degenerate (single point)', () => {
    const out = buildJobPostingSchema({
      ...baseInput,
      hourlyRateMax: 489,
    });

    expect(out.baseSalary?.value).toEqual({
      '@type': 'QuantitativeValue',
      value: 489,
      unitText: 'HOUR',
    });
    expect(out.baseSalary?.value).not.toHaveProperty('minValue');
    expect(out.baseSalary?.value).not.toHaveProperty('maxValue');
  });

  it('prefers monthly over hourly when both provided', () => {
    const out = buildJobPostingSchema({
      ...baseInput,
      baseSalaryMonthlyMax: 94_000,
      hourlyRateMax: 489,
    });

    expect(out.baseSalary?.value.unitText).toBe('MONTH');
    expect(out.baseSalary?.value.value).toBe(94_000);
  });

  it('omits baseSalary entirely when no salary data is provided', () => {
    const out = buildJobPostingSchema(baseInput);

    expect('baseSalary' in out).toBe(false);
  });

  it('ignores zero / negative salary inputs', () => {
    const out = buildJobPostingSchema({
      ...baseInput,
      baseSalaryMonthlyMax: 0,
      hourlyRateMax: -5,
    });

    expect('baseSalary' in out).toBe(false);
  });
});

describe('Fix G (2026-05-25) — hiringOrganization.url (official employer homepage)', () => {
  it('omits url when hiringOrganizationUrl is undefined', () => {
    const out = buildJobPostingSchema(baseInput);

    expect('url' in out.hiringOrganization).toBe(false);
    // sameAs (our internal page) still emitted
    expect(out.hiringOrganization.sameAs).toBe(baseInput.companyUrl);
  });

  it('emits url alongside sameAs when hiringOrganizationUrl provided', () => {
    const out = buildJobPostingSchema({
      ...baseInput,
      hiringOrganizationUrl: 'https://burgerking.ru/',
    });

    expect(out.hiringOrganization).toMatchObject({
      '@type': 'Organization',
      name: 'Test Company',
      url: 'https://burgerking.ru/',                                 // employer homepage
      sameAs: 'https://kurerok.ru/companies/test-company/',          // our page
    });
  });
});

describe('Fix I (2026-05-25) — jobBenefits / qualifications as arrays', () => {
  it('emits jobBenefits as array when benefits[] provided', () => {
    const out = buildJobPostingSchema({
      ...baseInput,
      benefits: ['Бесплатное питание.', 'Гибкий график.', 'Униформа выдаётся.'],
    });

    expect(out.jobBenefits).toEqual([
      'Бесплатное питание.',
      'Гибкий график.',
      'Униформа выдаётся.',
    ]);
    expect(Array.isArray(out.jobBenefits)).toBe(true);
  });

  it('emits qualifications as array when qualifications[] provided', () => {
    const out = buildJobPostingSchema({
      ...baseInput,
      qualifications: ['Возраст 18+.', 'Паспорт.', 'СНИЛС.'],
    });

    expect(out.qualifications).toEqual(['Возраст 18+.', 'Паспорт.', 'СНИЛС.']);
  });

  it('omits jobBenefits / qualifications fields when array is empty', () => {
    const out = buildJobPostingSchema({
      ...baseInput,
      benefits: [],
      qualifications: [],
    });

    expect('jobBenefits' in out).toBe(false);
    expect('qualifications' in out).toBe(false);
  });

  it('omits jobBenefits / qualifications fields when undefined', () => {
    const out = buildJobPostingSchema(baseInput);

    expect('jobBenefits' in out).toBe(false);
    expect('qualifications' in out).toBe(false);
  });

  it('experienceRequirements parser handles array input (no regression)', () => {
    // Multi-item qualifications array — parser joins with «; » before
    // matching, so cross-item «опыт ... от N лет» still detected.
    const out = buildJobPostingSchema({
      ...baseInput,
      qualifications: [
        'Возраст от 18 лет.',
        'Опыт работы от 1 года в продажах.',
        'Паспорт.',
      ],
    });

    expect(out.experienceRequirements).toEqual({
      '@type': 'OccupationalExperienceRequirements',
      monthsOfExperience: 12,
    });
  });

  it('experienceRequirements parser still omits for «без опыта» (array form)', () => {
    const out = buildJobPostingSchema({
      ...baseInput,
      qualifications: ['Опыт работы не требуется.', 'Паспорт.'],
    });

    expect('experienceRequirements' in out).toBe(false);
  });

  it('experienceRequirements parser does not misfire on «возраст от 18 лет» alone', () => {
    // The «лет» here refers to age, not experience — must not produce
    // monthsOfExperience just because the duration phrase exists.
    const out = buildJobPostingSchema({
      ...baseInput,
      qualifications: ['Возраст от 18 лет.', 'Паспорт.'],
    });

    expect('experienceRequirements' in out).toBe(false);
  });
});

describe('Fix E (2026-05-25) — per-source occupationalCategory (mapping in sourceOccupation.ts)', () => {
  it('uses explicit occupationalCategory when provided (e.g. from getSourceOccupation)', () => {
    const out = buildJobPostingSchema({
      ...baseInput,
      occupationalCategory: '35-3023 Fast Food and Counter Workers',
    });

    expect(out.occupationalCategory).toBe('35-3023 Fast Food and Counter Workers');
  });

  it('falls back to 53-3031 Driver/Sales Workers when undefined', () => {
    const out = buildJobPostingSchema({
      ...baseInput,
      occupationalCategory: undefined,
    });

    expect(out.occupationalCategory).toBe('53-3031 Driver/Sales Workers');
  });

  it('falls back to 53-3031 when explicit input is empty string', () => {
    const out = buildJobPostingSchema({
      ...baseInput,
      occupationalCategory: '',
    });

    expect(out.occupationalCategory).toBe('53-3031 Driver/Sales Workers');
  });
});

describe('Fix D (2026-05-25) — per-company industry (mapping in companyIndustry.ts)', () => {
  it('uses the explicit industry input when provided (e.g. from getCompanyIndustry)', () => {
    const out = buildJobPostingSchema({
      ...baseInput,
      industry: 'Общественное питание',
    });

    expect(out.industry).toBe('Общественное питание');
  });

  it('falls back to «Курьерская доставка» default when industry is undefined', () => {
    const out = buildJobPostingSchema({ ...baseInput, industry: undefined });

    expect(out.industry).toBe('Курьерская доставка');
  });
});

describe('mapEmploymentTypeToSchema — direct regex coverage', () => {
  it('maps самозанятость → CONTRACTOR', () => {
    expect(mapEmploymentTypeToSchema('Самозанятость')).toEqual(['CONTRACTOR']);
  });

  it('maps официальное трудоустройство → FULL_TIME', () => {
    expect(mapEmploymentTypeToSchema('Официальное трудоустройство')).toEqual([
      'FULL_TIME',
    ]);
  });

  it('returns OTHER when label is undefined', () => {
    expect(mapEmploymentTypeToSchema(undefined)).toEqual(['OTHER']);
  });

  it('detects both FULL_TIME and PART_TIME in a combined «полная или подработка» string', () => {
    const result = mapEmploymentTypeToSchema(
      'Официальное трудоустройство гибкий график: подработка или полная смена',
    );

    // Order is set-iteration order — guaranteed insertion order in JS,
    // and the regex array puts FULL_TIME (2nd entry) before PART_TIME
    // (3rd entry), so it ends up `[FULL_TIME, PART_TIME]`.
    expect(result).toEqual(['FULL_TIME', 'PART_TIME']);
  });
});

describe('Fix F (2026-05-25) — scheduleText combined with employmentTypeLabel', () => {
  it('Burger-King-style mixed schedule emits both FULL_TIME and PART_TIME', () => {
    const out = buildJobPostingSchema({
      ...baseInput,
      employmentTypeLabel: 'Официальное трудоустройство',
      scheduleText: 'гибкий график: подработка или полная смена',
    });

    expect(out.employmentType).toEqual(['FULL_TIME', 'PART_TIME']);
  });

  it('legacy call without scheduleText still works — only employmentTypeLabel applies', () => {
    const out = buildJobPostingSchema({
      ...baseInput,
      employmentTypeLabel: 'Официальное трудоустройство',
    });

    expect(out.employmentType).toEqual(['FULL_TIME']);
  });

  it('shift-rotation schedule («5/2 или 2/2») does NOT misfire PART_TIME', () => {
    // Alfa-Bank — «5/2, 2/2, 4/2 или 3/2» describes shift rotation,
    // not part-time. The regex must not accidentally tag it PART_TIME.
    const out = buildJobPostingSchema({
      ...baseInput,
      employmentTypeLabel: 'Официальное трудоустройство',
      scheduleText: '5/2, 2/2, 4/2 или 3/2 с 09:00 до 21:00',
    });

    expect(out.employmentType).toEqual(['FULL_TIME']);
    expect(out.employmentType).not.toContain('PART_TIME');
  });

  it('самозанятость + слотовая работа stays CONTRACTOR (no FULL_TIME / PART_TIME leak)', () => {
    const out = buildJobPostingSchema({
      ...baseInput,
      employmentTypeLabel: 'Самозанятость',
      scheduleText: 'слоты от 3 часов в день, смены до 12 часов',
    });

    expect(out.employmentType).toEqual(['CONTRACTOR']);
  });

  it('regression-guard: «полностью удалённый формат» does NOT misfire FULL_TIME', () => {
    // Discovered during local build verification of T-Bank operator B2B
    // (tbank-outbound-b2b-operator-barnaul-remote). The regex
    // `/полн/` matched «полностью» (meaning «fully»/«entirely»), tagging
    // the role as FULL_TIME when it's actually a remote contractor.
    // Negative lookahead `/полн(?!остью)/` fixes this without
    // affecting «полная смена» / «полная занятость» matches.
    const out = buildJobPostingSchema({
      ...baseInput,
      employmentTypeLabel: 'Самозанятость',
      scheduleText: 'Гибкий график, полностью удалённый формат',
    });

    expect(out.employmentType).toEqual(['CONTRACTOR']);
    expect(out.employmentType).not.toContain('FULL_TIME');
  });

  it('still detects FULL_TIME for «полная смена» (positive case after regression-guard)', () => {
    const out = buildJobPostingSchema({
      ...baseInput,
      employmentTypeLabel: 'Официальное трудоустройство',
      scheduleText: 'полная смена 8 часов',
    });

    expect(out.employmentType).toContain('FULL_TIME');
  });

  it('still detects FULL_TIME for «полный рабочий день»', () => {
    const out = buildJobPostingSchema({
      ...baseInput,
      employmentTypeLabel: 'Трудовой договор',
      scheduleText: 'полный рабочий день, 5/2',
    });

    expect(out.employmentType).toContain('FULL_TIME');
  });
});

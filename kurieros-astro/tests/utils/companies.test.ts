import { describe, it, expect } from 'vitest';
import { getCompaniesFromJobs, slugifyCompany, type JobLike, type ReviewLike } from '../../src/utils/companies';

const makeJob = (overrides: Partial<JobLike> = {}): JobLike => {
  const { details, ...rest } = overrides;

  return {
    slug: 'yandex-eda-courier-moskva-foot',
    title: 'Пеший курьер',
    company: 'Яндекс Еда',
    companyLogo: '/logos/yandex-eda.svg',
    applyLink: 'https://partner.example/apply?utm_source=feed&utm_content=moskva-foot',
    location: 'Москва',
    salary: 'до 120 000 ₽/мес',
    tags: ['foot'],
    ...rest,
    details: {
      payment_freq: details?.payment_freq ?? 'Ежедневно',
      age: details?.age ?? '18+',
      employment_type: details?.employment_type ?? 'ГПХ',
    },
  };
};

const makeReview = (overrides: Partial<ReviewLike> = {}): ReviewLike => ({
  company: 'Яндекс Еда',
  rating: 4.5,
  city: 'Москва',
  comment: 'Удобно совмещать',
  pros: 'График',
  cons: 'Погода',
  date: '2026-06-01',
  name: 'Алексей',
  ...overrides,
});

describe('slugifyCompany', () => {
  it('returns the curated slug for Альфа-Банк', () => {
    // Curated COMPANY_SLUGS map is the source of truth — must stay stable
    // because the slug appears in /companies/<slug>/ URLs.
    expect(slugifyCompany('Альфа-Банк')).toBe('alfa-bank');
  });

  it('returns the curated slug for Яндекс Еда', () => {
    expect(slugifyCompany('Яндекс Еда')).toBe('yandex-eda');
  });

  it('returns the curated slug for Т-Банк', () => {
    expect(slugifyCompany('Т-Банк')).toBe('t-bank');
  });

  it('returns the curated slug for Сервис «Руки»', () => {
    expect(slugifyCompany('Сервис «Руки»')).toBe('servis-ruki');
  });

  it('returns the curated slug for Домовёнок', () => {
    expect(slugifyCompany('Домовёнок')).toBe('domovenok');
  });

  it('returns the curated slug for Купер (Сбермаркет)', () => {
    expect(slugifyCompany('Купер (Сбермаркет)')).toBe('kuper-sbermarket');
  });

  it('falls back to transliteration for an unknown company name', () => {
    // No entry in COMPANY_SLUGS — slug derives from cyrillicToLatin path.
    const slug = slugifyCompany('Новая Фирма');
    expect(slug).toMatch(/^[a-z0-9-]+$/);
    expect(slug.length).toBeGreaterThan(0);
    expect(slug.startsWith('-')).toBe(false);
    expect(slug.endsWith('-')).toBe(false);
  });

  it('produces deterministic output across multiple calls', () => {
    const a = slugifyCompany('Альфа-Банк');
    const b = slugifyCompany('Альфа-Банк');
    const c = slugifyCompany('Альфа-Банк');
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it('collapses repeated dashes for transliteration fallback', () => {
    const slug = slugifyCompany('  Тест    Кафе  ');
    expect(slug).not.toMatch(/--/);
  });
});

describe('getCompaniesFromJobs', () => {
  it('groups jobs by company and builds stable company metadata', () => {
    const companies = getCompaniesFromJobs([
      makeJob({
        location: 'Москва, Вся Россия, Санкт-Петербург',
        tags: ['foot', 'bicycle', 'unknown'],
      }),
      makeJob({
        slug: 'yandex-eda-courier-kazan-auto',
        location: 'Казань',
        salary: 'до 180 000 ₽/мес',
        tags: ['auto'],
        applyLink: 'https://partner.example/apply?utm_source=second&utm_content=kazan-auto',
        details: {
          payment_freq: 'Еженедельно',
          age: '16+',
          employment_type: 'Самозанятость',
        },
      }),
    ]);

    expect(companies).toHaveLength(1);
    expect(companies[0]).toMatchObject({
      name: 'Яндекс Еда',
      slug: 'yandex-eda',
      href: '/companies/yandex-eda/',
      vacancyCount: 2,
      primaryTransport: 'Пешком',
      maxSalary: 180000,
      paymentPreview: ['Ежедневно', 'Еженедельно'],
      agePreview: ['18+', '16+'],
      employmentPreview: ['ГПХ', 'Самозанятость'],
    });
    expect(companies[0].applyLink).toBe('https://partner.example/apply?utm_source=feed');
    expect(companies[0].cities).toEqual(['Москва', 'Санкт-Петербург', 'Казань']);
    expect(companies[0].topCities).toEqual(['Москва', 'Санкт-Петербург', 'Казань']);
    expect(companies[0].transportModes).toEqual(['Пешком', 'Велосипед / самокат', 'На авто']);
    expect(companies[0].shortIntro).toContain('доставка еды и продуктов');
    expect(companies[0].faqItems[0].answer).toContain('выплаты: Ежедневно и Еженедельно');
  });

  it('attaches matching reviews and ignores reviews for absent companies', () => {
    const companies = getCompaniesFromJobs(
      [makeJob()],
      [
        makeReview({ rating: 4 }),
        makeReview({ rating: 5 }),
        makeReview({ company: 'Несуществующая компания', rating: 1 }),
      ],
    );

    expect(companies).toHaveLength(1);
    expect(companies[0].reviewCount).toBe(2);
    expect(companies[0].rating).toBe(4.5);
    expect(companies[0].reviews.map((review) => review.company)).toEqual(['Яндекс Еда', 'Яндекс Еда']);
  });

  it('falls back to company href and mixed transport when source fields are sparse', () => {
    const companies = getCompaniesFromJobs([
      makeJob({
        company: 'Новая Доставка',
        companyLogo: '/logos/custom.svg',
        applyLink: '#',
        location: 'Вся Россия',
        salary: 'по договоренности',
        tags: [],
        details: {
          payment_freq: '',
          age: '',
          employment_type: '',
        },
      }),
    ]);

    expect(companies[0]).toMatchObject({
      slug: 'novaya-dostavka',
      href: '/companies/novaya-dostavka/',
      applyLink: '/companies/novaya-dostavka/',
      primaryTransport: 'Смешанный формат',
      rating: null,
      maxSalary: 0,
      cities: [],
      topCities: [],
    });
    expect(companies[0].fitPoints[2]).toContain('география зависит от конкретной вакансии');
    expect(companies[0].shortIntro).toContain('курьерская занятость');
    expect(companies[0].faqItems[0].answer).toContain('смешанные форматы');
    expect(companies[0].faqItems[2].answer).toContain('условия зависят от вакансии');
  });

  it('uses remote as a real company transport format', () => {
    const companies = getCompaniesFromJobs([
      makeJob({
        company: 'МТС Банк',
        companyLogo: '/logos/mts-bank.png',
        tags: ['remote', '18+', 'emp:official'],
      }),
    ]);

    expect(companies[0].primaryTransport).toBe('Удалённо');
    expect(companies[0].transportModes).toEqual(['Удалённо']);
    expect(companies[0].faqItems[0].answer).toContain('Основные форматы: Удалённо');
  });

  it('keeps an invalid apply link as-is and does not overwrite the first valid link later', () => {
    const companies = getCompaniesFromJobs([
      makeJob({ applyLink: 'not a url' }),
      makeJob({ slug: 'yandex-eda-courier-spb-foot', applyLink: 'https://partner.example/second' }),
    ]);

    expect(companies[0].applyLink).toBe('not a url');
  });

  it('covers company type labels used on public company pages', () => {
    const companies = getCompaniesFromJobs([
      makeJob({ company: 'Альфа-Банк', companyLogo: '/logos/alfa.svg' }),
      makeJob({ company: 'Ozon', companyLogo: '/logos/ozon.svg' }),
      makeJob({ company: 'Бургер Кинг', companyLogo: '/logos/burger-king.svg' }),
      makeJob({ company: 'Сервис «Руки»', companyLogo: '/logos/ruki.png', tags: ['service'] }),
      makeJob({ company: 'Домовёнок', companyLogo: '/logos/domovenok.png', tags: ['service'] }),
    ]);

    const bySlug = new Map(companies.map((company) => [company.slug, company]));
    expect(bySlug.get('alfa-bank')?.shortIntro).toContain('финтех и банковская доставка');
    expect(bySlug.get('ozon')?.shortIntro).toContain('логистика и e-commerce');
    expect(bySlug.get('burger-king')?.shortIntro).toContain('ресторанная доставка');
    expect(bySlug.get('servis-ruki')?.shortIntro).toContain('ремонт и бытовые услуги');
    expect(bySlug.get('domovenok')?.shortIntro).toContain('клининг и бытовые услуги');
  });
});

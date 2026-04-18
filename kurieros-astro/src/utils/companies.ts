import { getVacancyPluralText, humanJoin, parseSalary } from './format';

export type JobLike = {
  slug: string;
  title: string;
  company: string;
  companyLogo: string;
  location: string;
  salary: string;
  shortDescription?: string;
  tags: string[];
  details: {
    payment_freq: string;
    age: string;
    employment_type: string;
  };
};

export type ReviewLike = {
  company: string;
  rating: number;
  city: string;
  comment: string;
  pros: string;
  cons: string;
  date: string;
  name: string;
};

const COMPANY_SLUGS: Record<string, string> = {
  'Яндекс Еда': 'yandex-eda',
  'Яндекс Маркет': 'yandex-market',
  'Купер (Сбермаркет)': 'kuper-sbermarket',
  'Альфа-Банк': 'alfa-bank',
  'Т-Банк': 't-bank',
  'Бургер Кинг': 'burger-king',
  'Додо Пицца': 'dodo-pizza',
  'Магнит Доставка': 'magnit-dostavka',
  'Пятерочка': 'pyaterochka',
  'СДЭК': 'cdek',
  'Самокат': 'samokat',
  'ВТБ': 'vtb',
  'ВкусВилл': 'vkusvill',
  'Ozon': 'ozon',
};

const TRANSPORT_LABELS: Record<string, string> = {
  auto: 'На авто',
  bicycle: 'Велосипед / самокат',
  foot: 'Пешком',
};

const CYRILLIC_MAP: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i',
  й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
  у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '',
  э: 'e', ю: 'yu', я: 'ya',
};

const transliterate = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .split('')
    .map((char) => CYRILLIC_MAP[char] ?? char)
    .join('');

export const slugifyCompany = (name: string) =>
  COMPANY_SLUGS[name] ||
  transliterate(name)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/--+/g, '-');

const companyTypeLabel = (name: string) => {
  if (/банк/i.test(name)) return 'финтех и банковская доставка';
  if (/яндекс еда|самокат|вкусвилл|купер|пятерочка|магнит/i.test(name)) return 'доставка еды и продуктов';
  if (/ozon|сдэк|яндекс маркет/i.test(name)) return 'логистика и e-commerce';
  if (/додо|бургер кинг/i.test(name)) return 'ресторанная доставка';
  return 'курьерская занятость';
};

export type CompanyEntity = {
  name: string;
  slug: string;
  logo: string;
  href: string;
  jobs: JobLike[];
  reviews: ReviewLike[];
  vacancyCount: number;
  cities: string[];
  topCities: string[];
  transportModes: string[];
  primaryTransport: string;
  payments: string[];
  paymentPreview: string[];
  agePreview: string[];
  employmentPreview: string[];
  reviewCount: number;
  rating: number | null;
  maxSalary: number;
  shortIntro: string;
  fitPoints: string[];
  cautionPoints: string[];
  faqItems: Array<{
    question: string;
    answer: string;
  }>;
};

export const getCompaniesFromJobs = (jobs: JobLike[], reviews: ReviewLike[] = []): CompanyEntity[] => {
  const companies = new Map<string, {
    name: string;
    slug: string;
    logo: string;
    jobs: JobLike[];
    cities: Set<string>;
    payments: Set<string>;
    ages: Set<string>;
    employmentTypes: Set<string>;
    transportModes: Set<string>;
    reviews: ReviewLike[];
    maxSalary: number;
  }>();

  jobs.forEach((job) => {
    const existing = companies.get(job.company) || {
      name: job.company,
      slug: slugifyCompany(job.company),
      logo: job.companyLogo,
      jobs: [],
      cities: new Set<string>(),
      payments: new Set<string>(),
      ages: new Set<string>(),
      employmentTypes: new Set<string>(),
      transportModes: new Set<string>(),
      reviews: [],
      maxSalary: 0,
    };

    existing.jobs.push(job);
    existing.payments.add(job.details.payment_freq);
    existing.ages.add(job.details.age);
    existing.employmentTypes.add(job.details.employment_type);
    existing.maxSalary = Math.max(existing.maxSalary, parseSalary(job.salary));

    job.tags.forEach((tag) => {
      if (TRANSPORT_LABELS[tag]) {
        existing.transportModes.add(TRANSPORT_LABELS[tag]);
      }
    });

    job.location
      .split(',')
      .map((city) => city.trim())
      .filter((city) => city && city !== 'Вся Россия')
      .forEach((city) => existing.cities.add(city));

    companies.set(job.company, existing);
  });

  reviews.forEach((review) => {
    const company = companies.get(review.company);
    if (company) {
      company.reviews.push(review);
    }
  });

  return Array.from(companies.values())
    .map((company) => {
      const reviewCount = company.reviews.length;
      const rating = reviewCount
        ? Number((company.reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount).toFixed(1))
        : null;
      const topCities = Array.from(company.cities).slice(0, 4);
      const transportModes = Array.from(company.transportModes);
      const primaryTransport = transportModes[0] || 'Смешанный формат';
      const paymentPreview = Array.from(company.payments).slice(0, 2);
      const employmentPreview = Array.from(company.employmentTypes).slice(0, 2);
      const agePreview = Array.from(company.ages).slice(0, 2);
      const shortIntro = `${company.name} на Курьерок — это ${companyTypeLabel(company.name)}, где сейчас есть ${company.jobs.length} ${getVacancyPluralText(company.jobs.length)}. Здесь удобно сравнить формат работы, выплаты и ограничения до отклика.`;

      return {
        name: company.name,
        slug: company.slug,
        logo: company.logo,
        href: `/companies/${company.slug}/`,
        jobs: company.jobs,
        reviews: company.reviews,
        vacancyCount: company.jobs.length,
        cities: Array.from(company.cities),
        topCities,
        transportModes,
        primaryTransport,
        payments: Array.from(company.payments),
        paymentPreview,
        agePreview,
        employmentPreview,
        reviewCount,
        rating,
        maxSalary: company.maxSalary,
        shortIntro,
        fitPoints: [
          `Тем, кто рассматривает ${company.name} и хочет быстро понять, какой транспорт, выплаты и оформление встречаются в вакансиях бренда.`,
          `Кандидатам, которым важно сравнить вакансии ${company.name} между собой до перехода к анкете или прямому отклику.`,
          `Тем, кто хочет заранее понять географию бренда: ${topCities.length ? humanJoin(topCities) : 'география зависит от конкретной вакансии'}.`,
        ],
        cautionPoints: [
          `Перед откликом проверяйте финальные выплаты и формат оформления: у ${company.name} они могут отличаться между вакансиями и городами.`,
          `Если критичны возраст, гражданство, медкнижка или официальный ТК РФ, открывайте каждую карточку вакансии и сверяйте детали отдельно.`,
          `Карточка компании помогает быстро понять контекст бренда, но финальные условия всегда подтверждаются уже на странице вакансии или у работодателя.`,
        ],
        faqItems: [
          {
            question: `Какие вакансии есть у ${company.name}?`,
            answer: `Сейчас на сайте есть ${company.jobs.length} ${getVacancyPluralText(company.jobs.length)} ${company.name}. Основные форматы: ${humanJoin(transportModes) || 'смешанные форматы'}${paymentPreview.length ? `, выплаты: ${humanJoin(paymentPreview)}` : ''}.`,
          },
          {
            question: `Кому подходит работа в ${company.name}?`,
            answer: `Работа в ${company.name} подходит тем, кто рассматривает ${companyTypeLabel(company.name)} и хочет заранее сравнить транспорт, выплаты, оформление и ограничения до отклика.`,
          },
          {
            question: 'Что проверить перед откликом?',
            answer: `Перед откликом стоит сверить выплаты, возрастной порог, тип занятости и ограничения конкретной вакансии. По этой компании на сайте показаны форматы оформления: ${humanJoin(employmentPreview) || 'условия зависят от вакансии'}.`,
          },
        ],
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
};

export const getCompanyBySlug = (jobs: JobLike[], reviews: ReviewLike[], slug: string) =>
  getCompaniesFromJobs(jobs, reviews).find((company) => company.slug === slug);

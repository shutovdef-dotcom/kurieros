import { getCompanyGuide } from '../data/companyGuides';
import { formatRussianPlural } from './format';
import { formatMoneyPerMonth } from './money';
import { companiesFromJobs } from './companiesIndex';
import { orderGuideCities, pickGuideVacancyExamples } from './companyGuideExamples';
import { pickFeaturedCompanyReviews } from './reviewSamples';
import { getVacancyDetailPath } from './vacancyUrl';

export const DESIGN_COMPANY_SLUG = 'kuper-ex-sbermarket';

export type UiSkillVariant = {
  slug: string;
  skill: string;
  repo: string;
  systemType: string;
  sourceUrl: string;
  name: string;
  navLabel: string;
  nameExplanation: string;
  thesis: string;
  href: string;
  accent: string;
  strengths: string[];
  risks: string[];
};

export const UI_SKILL_VARIANTS: UiSkillVariant[] = [
  {
    slug: 'shadcn-ui',
    skill: 'shadcn-ui/shadcn',
    repo: 'shadcn-ui/ui',
    systemType: 'Component design system',
    sourceUrl: 'https://github.com/shadcn-ui/ui',
    name: 'shadcn/ui Console',
    navLabel: 'shadcn/ui',
    nameExplanation:
      'Console здесь означает рабочую панель из готовых компонентных примитивов: карточки, бейджи, разделители, списки и accordion собирают страницу как аккуратный интерфейс.',
    thesis: 'Компонентная страница в духе shadcn/ui: cards, badges, separators, accordion и спокойные semantic tokens.',
    href: '/designs/company-ui-skills/shadcn-ui/',
    accent: '#18181b',
    strengths: [
      'Самая настоящая компонентная система из найденных UI Skills.',
      'Лучше всего переносится в production: понятные компоненты, токены, состояния.',
      'Хорошо подходит странице компании как справочнику с фактами, FAQ и списками.',
    ],
    risks: [
      'Может выглядеть слишком “SaaS dashboard”, если не добавить брендовую деталь.',
      'В этом Astro-проекте нельзя просто импортировать React-компоненты без отдельной интеграции.',
    ],
  },
  {
    slug: 'swiss-design',
    skill: 'zeke/swiss-design',
    repo: 'zeke/swiss-design-skill',
    systemType: 'Spec-driven visual system',
    sourceUrl: 'https://github.com/zeke/swiss-design-skill',
    name: 'Swiss Ledger',
    navLabel: 'Swiss',
    nameExplanation:
      'Ledger — “ведомость” или “реестр”: версия превращает страницу компании в строгий отчёт с сеткой, крупной типографикой и табличным чтением фактов.',
    thesis: 'Рациональная сетка, сухая типографика и максимум доверия: страница как аккуратный отчёт о работодателе.',
    href: '/designs/company-ui-skills/swiss-design/',
    accent: '#2d6a4f',
    strengths: [
      'Лучше всего структурирует факты, города, условия и FAQ.',
      'Сильная читаемость и дисциплина на длинном контенте.',
      'Хорошо подходит SEO-страницам, где важны доверие и сканирование.',
    ],
    risks: [
      'Может быть слишком строгой и менее эмоциональной.',
      'Потребует точной типографики, иначе быстро станет сухой таблицей.',
    ],
  },
  {
    slug: 'oklch-system',
    skill: 'jakubkrehel/oklch-skill',
    repo: 'jakubkrehel/oklch-skill',
    systemType: 'Color-token system',
    sourceUrl: 'https://github.com/jakubkrehel/oklch-skill',
    name: 'Tonal Tokens',
    navLabel: 'OKLCH',
    nameExplanation:
      'Tokens — потому что дизайн держится на цветовых ролях, а не на случайных оттенках: primary, surface, warning и спокойные тональные статусы.',
    thesis: 'Версия, где главный эксперимент — не форма, а управляемая OKLCH-палитра с понятными ролями и контрастом.',
    href: '/designs/company-ui-skills/oklch-system/',
    accent: 'oklch(0.45 0.09 155)',
    strengths: [
      'Лучше всего показывает, как цвет может стать системой, а не декором.',
      'Полезен для будущей темы КурьерОК: scale, contrast, semantic roles.',
      'Даёт спокойную, доверительную страницу без серой каши.',
    ],
    risks: [
      'Это не компонентная библиотека, а цветовая методика.',
      'Если форма страницы слабая, одна палитра её не спасёт.',
    ],
  },
  {
    slug: 'impeccable-system',
    skill: 'pbakaus/impeccable',
    repo: 'pbakaus/impeccable',
    systemType: 'Design-language and quality system',
    sourceUrl: 'https://github.com/pbakaus/impeccable',
    name: 'Route Desk',
    navLabel: 'Route Desk',
    nameExplanation:
      'Desk — рабочий стол кандидата, Route — маршрут перед откликом: версия показывает путь через документы, слоты, выплаты и первую подходящую карточку.',
    thesis: 'Страница как рабочий стол кандидата: один главный маршрут, меньше одинаковых карточек, больше иерархии и craft-паттернов.',
    href: '/designs/company-ui-skills/impeccable-system/',
    accent: '#2f6b4f',
    strengths: [
      'Лучше всего борется с generic AI UI и плоской иерархией.',
      'Хорошо извлекает “мир продукта”: маршруты, слоты, документы, проверка перед откликом.',
      'Может дать самые полезные идеи для реального редизайна страницы.',
    ],
    risks: [
      'Это не installable component kit, а design-language/harness.',
      'Требует вкусовой калибровки: можно уйти слишком далеко от текущего бренда.',
    ],
  },
];

const formatUpdatedDate = (date: string): string =>
  new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date));

export const getCompanyDesignPreview = (slug = DESIGN_COMPANY_SLUG) => {
  const company = companiesFromJobs.find((item) => item.slug === slug);

  if (!company) {
    throw new Error(`Company ${slug} not found`);
  }

  const guide = getCompanyGuide(company.slug, company);
  const updatedDate = formatUpdatedDate(guide.updatedAt);
  const cities = orderGuideCities(company.cities, guide.featuredCities, 12);
  const hiddenCityCount = Math.max(0, company.cities.length - cities.length);
  const vacancyExamples = pickGuideVacancyExamples(company.jobs, guide.featuredCities, 6)
    .map((job) => ({
      href: getVacancyDetailPath(job),
      title: job.title,
      location: job.location,
      salary: job.salary,
      payment: job.details.payment_freq,
      employment: job.details.employment_type,
      age: job.details.age,
    }));
  const reviews = pickFeaturedCompanyReviews(company.reviews, company.name).slice(0, 2);
  const salaryLabel =
    company.maxSalary && company.maxSalaryCurrency
      ? `до ${formatMoneyPerMonth(company.maxSalary, company.maxSalaryCurrency)}`
      : 'смотрите по городу';
  const vacancyCountText =
    `${company.vacancyCount} ${formatRussianPlural(company.vacancyCount, ['вакансия', 'вакансии', 'вакансий'])}`;
  const cityCountText =
    `${company.cities.length} ${formatRussianPlural(company.cities.length, ['город', 'города', 'городов'])}`;

  return {
    company,
    guide,
    updatedDate,
    cities,
    hiddenCityCount,
    vacancyExamples,
    reviews,
    salaryLabel,
    vacancyCountText,
    cityCountText,
    primaryPayment: company.paymentPreview[0] || 'выплаты уточняются',
    primaryFormat: company.transportModes.join(', ') || company.primaryTransport,
  };
};

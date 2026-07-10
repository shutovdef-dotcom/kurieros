import type { GeneratedJob } from '../data/vacancyTypes';
import { getCityHref } from './cities';
import { slugifyCompany } from './companies';
import { getVacancyDetailPath } from './vacancyUrl';

export type CitySeoClusterKind = 'city-jobs' | 'warehouse';

export type CitySeoCluster = {
  slug: string;
  kind: CitySeoClusterKind;
  primaryIntent: string;
  h1: string;
  title: string;
  guideTitle: string;
  guideLead: string;
  hubAnchorLabel: string;
  hubAnchorDescription: string;
  appliesToSourceSlugs?: readonly string[];
  growthCohort?: boolean;
  preferredNeighbourSlugs?: readonly string[];
};

export type CityCohortVacancyLink = {
  href: string;
  title: string;
  company: string;
  companyHref: string;
  salary: string;
  sourceSlug: string;
};

export type CityClusterNeighbour = {
  slug: string;
  name: string;
  vacancyCount: number;
};

export type VacancyCityClusterLink = {
  href: string;
  label: string;
  description: string;
};

const OZON_WAREHOUSE_SOURCE_SLUGS = [
  'ozon-warehouse-operator',
  'ozon-goods-handler',
  'ozon-electric-stacker-driver',
] as const;

export const CITY_GROWTH_COHORT_SLUGS = [
  'sredneuralsk',
  'pervomaysk',
  'timashevsk',
  'kartaly',
  'metallostroy',
  'chkalovsk',
] as const;

const CITY_SEO_CLUSTERS: readonly CitySeoCluster[] = [
  {
    slug: 'horugvino',
    kind: 'warehouse',
    primaryIntent: 'работа и вакансии на складе Ozon в Хоругвино',
    h1: 'Работа на складе Ozon в Хоругвино — вакансии и роли',
    title: 'Склад Ozon в Хоругвино — вакансии и роли | КурьерОк',
    guideTitle: 'Какие складские роли Ozon доступны в Хоругвино',
    guideLead:
      'Здесь собраны роли Ozon на складе в Хоругвино: оператор, обработчик товаров и водитель складской техники. В карточках можно сверить условия для каждой роли.',
    hubAnchorLabel: 'Все складские вакансии Ozon в Хоругвино',
    hubAnchorDescription:
      'Городская страница собирает складские роли Ozon, условия и активные карточки в одном месте.',
    appliesToSourceSlugs: OZON_WAREHOUSE_SOURCE_SLUGS,
  },
  {
    slug: 'olenegorsk',
    kind: 'city-jobs',
    primaryIntent: 'работа курьером и вакансии в Оленегорске',
    h1: 'Работа курьером в Оленегорске — вакансии, доход и работодатели',
    title: 'Работа курьером в Оленегорске — вакансии и работодатели | КурьерОк',
    guideTitle: 'Какие вакансии доступны в Оленегорске',
    guideLead:
      'Здесь собраны активные роли и работодатели Оленегорска. Откройте конкретную вакансию, чтобы сверить доход, формат и условия.',
    hubAnchorLabel: 'Все вакансии в Оленегорске',
    hubAnchorDescription:
      'Городская страница собирает работодателей, роли, доход и все активные вакансии в одном месте.',
  },
  {
    slug: 'volokolamsk',
    kind: 'city-jobs',
    primaryIntent: 'работа курьером и вакансии в Волоколамске',
    h1: 'Работа курьером в Волоколамске — вакансии, доход и работодатели',
    title: 'Работа курьером в Волоколамске — вакансии и работодатели | КурьерОк',
    guideTitle: 'Какие вакансии доступны в Волоколамске',
    guideLead:
      'На странице можно сравнить активные вакансии Волоколамска по роли, работодателю, формату и заявленному доходу.',
    hubAnchorLabel: 'Все вакансии в Волоколамске',
    hubAnchorDescription:
      'Городская страница собирает работодателей, роли, доход и все активные вакансии в одном месте.',
  },
  {
    slug: 'sredneuralsk',
    kind: 'city-jobs',
    primaryIntent: 'работа и вакансии в Среднеуральске',
    h1: 'Работа и вакансии в Среднеуральске — роли и работодатели',
    title: 'Работа и вакансии в Среднеуральске | КурьерОк',
    guideTitle: 'Какие вакансии доступны в Среднеуральске',
    guideLead:
      'Ниже показаны активные карточки из текущей базы: точная роль, работодатель и заявленная сумма. Переход ведёт на конкретную вакансию, где можно сверить условия.',
    hubAnchorLabel: 'Все вакансии в Среднеуральске',
    hubAnchorDescription:
      'Сравните роли, работодателей и заявленный доход в Среднеуральске.',
    growthCohort: true,
    preferredNeighbourSlugs: [
      'verhnyaya-pyshma',
      'ekaterinburg',
      'berezovskiy',
      'pervouralsk',
      'novouralsk',
      'aramil',
    ],
  },
  {
    slug: 'pervomaysk',
    kind: 'city-jobs',
    primaryIntent: 'работа и вакансии в Первомайске',
    h1: 'Работа и вакансии в Первомайске — роли и работодатели',
    title: 'Работа и вакансии в Первомайске | КурьерОк',
    guideTitle: 'Какие вакансии доступны в Первомайске',
    guideLead:
      'Ниже показаны активные карточки из текущей базы: точная роль, работодатель и заявленная сумма. Переход ведёт на конкретную вакансию, где можно сверить условия.',
    hubAnchorLabel: 'Все вакансии в Первомайске',
    hubAnchorDescription:
      'Сравните роли, работодателей и заявленный доход в Первомайске.',
    growthCohort: true,
    preferredNeighbourSlugs: [
      'sarov',
      'temnikov',
      'krasnoslobodsk',
      'lukoyanov',
      'arzamas',
      'kovylkino',
    ],
  },
  {
    slug: 'timashevsk',
    kind: 'city-jobs',
    primaryIntent: 'работа и вакансии в Тимашевске',
    h1: 'Работа и вакансии в Тимашевске — роли и работодатели',
    title: 'Работа и вакансии в Тимашевске | КурьерОк',
    guideTitle: 'Какие вакансии доступны в Тимашевске',
    guideLead:
      'Ниже показаны активные карточки из текущей базы: точная роль, работодатель и заявленная сумма. Переход ведёт на конкретную вакансию, где можно сверить условия.',
    hubAnchorLabel: 'Все вакансии в Тимашевске',
    hubAnchorDescription:
      'Сравните роли, работодателей и заявленный доход в Тимашевске.',
    growthCohort: true,
    preferredNeighbourSlugs: [
      'korenovsk',
      'krasnodar',
      'ust-labinsk',
      'slavyansk-na-kubani',
      'primorsko-ahtarsk',
      'adygeysk',
    ],
  },
  {
    slug: 'kartaly',
    kind: 'city-jobs',
    primaryIntent: 'работа и вакансии в Карталах',
    h1: 'Работа и вакансии в Карталах — роли и работодатели',
    title: 'Работа и вакансии в Карталах | КурьерОк',
    guideTitle: 'Какие вакансии доступны в Карталах',
    guideLead:
      'Ниже показаны активные карточки из текущей базы: точная роль, работодатель и заявленная сумма. Переход ведёт на конкретную вакансию, где можно сверить условия.',
    hubAnchorLabel: 'Все вакансии в Карталах',
    hubAnchorDescription:
      'Сравните роли, работодателей и заявленный доход в Карталах.',
    growthCohort: true,
    preferredNeighbourSlugs: [
      'magnitogorsk',
      'troitsk',
      'verhneuralsk',
      'sibay',
      'plast',
      'uchaly',
    ],
  },
  {
    slug: 'metallostroy',
    kind: 'city-jobs',
    primaryIntent: 'работа и вакансии в Металлострое',
    h1: 'Работа и вакансии в Металлострое — роли и работодатели',
    title: 'Работа и вакансии в Металлострое | КурьерОк',
    guideTitle: 'Какие вакансии доступны в Металлострое',
    guideLead:
      'Ниже показаны активные карточки из текущей базы: точная роль, работодатель и заявленная сумма. Переход ведёт на конкретную вакансию, где можно сверить условия.',
    hubAnchorLabel: 'Все вакансии в Металлострое',
    hubAnchorDescription:
      'Сравните роли, работодателей и заявленный доход в Металлострое.',
    growthCohort: true,
    preferredNeighbourSlugs: [
      'kolpino',
      'nikolskoe',
      'otradnoe',
      'kirovsk',
      'shlisselburg',
      'sankt-peterburg',
    ],
  },
  {
    slug: 'chkalovsk',
    kind: 'city-jobs',
    primaryIntent: 'работа и вакансии в Чкаловске',
    h1: 'Работа и вакансии в Чкаловске — роли и работодатели',
    title: 'Работа и вакансии в Чкаловске | КурьерОк',
    guideTitle: 'Какие вакансии доступны в Чкаловске',
    guideLead:
      'Ниже показаны активные карточки из текущей базы: точная роль, работодатель и заявленная сумма. Переход ведёт на конкретную вакансию, где можно сверить условия.',
    hubAnchorLabel: 'Все вакансии в Чкаловске',
    hubAnchorDescription:
      'Сравните роли, работодателей и заявленный доход в Чкаловске.',
    growthCohort: true,
    preferredNeighbourSlugs: [
      'zavolzhe',
      'gorodets',
      'puchezh',
      'balahna',
      'volodarsk',
      'dzerzhinsk',
    ],
  },
  {
    slug: 'novovoronezh',
    kind: 'city-jobs',
    primaryIntent: 'работа курьером и вакансии в Нововоронеже',
    h1: 'Работа курьером в Нововоронеже — вакансии, доход и работодатели',
    title: 'Работа курьером в Нововоронеже — вакансии и работодатели | КурьерОк',
    guideTitle: 'Какие вакансии доступны в Нововоронеже',
    guideLead:
      'Здесь можно сравнить вакансии Нововоронежа по работодателю, роли, формату и заявленному доходу.',
    hubAnchorLabel: 'Все вакансии в Нововоронеже',
    hubAnchorDescription:
      'Городская страница собирает работодателей, роли, доход и все активные вакансии в одном месте.',
  },
  {
    slug: 'sosnovoborsk',
    kind: 'city-jobs',
    primaryIntent: 'работа курьером и вакансии в Сосновоборске',
    h1: 'Работа курьером в Сосновоборске — вакансии, доход и работодатели',
    title: 'Работа курьером в Сосновоборске — вакансии и работодатели | КурьерОк',
    guideTitle: 'Какие вакансии доступны в Сосновоборске',
    guideLead:
      'Здесь можно сравнить вакансии Сосновоборска по работодателю, роли, формату и заявленному доходу.',
    hubAnchorLabel: 'Все вакансии в Сосновоборске',
    hubAnchorDescription:
      'Городская страница собирает работодателей, роли, доход и все активные вакансии в одном месте.',
  },
] as const;

export const CITY_SEO_CLUSTER_SLUGS = CITY_SEO_CLUSTERS.map((cluster) => cluster.slug);

const CITY_SEO_CLUSTER_BY_SLUG = Object.fromEntries(
  CITY_SEO_CLUSTERS.map((cluster) => [cluster.slug, cluster]),
) as Readonly<Record<string, CitySeoCluster>>;

const slugFromCityHref = (href: string): string =>
  href.replace(/^\/rabota-kurerom-/, '').replace(/\/$/, '');

const getPrimaryCityName = (location: string): string | null =>
  location
    .split(',')
    .map((city) => city.trim())
    .find((city) => city && city !== 'Вся Россия') ?? null;

export const getCitySeoCluster = (citySlug: string): CitySeoCluster | undefined =>
  CITY_SEO_CLUSTER_BY_SLUG[citySlug];

type CityCohortJob = Pick<
  GeneratedJob,
  'slug' | 'detailSlug' | 'detailAnchor' | 'title' | 'company' | 'salary' | 'sourceSlug'
>;

export const buildCityCohortVacancyLinks = (
  jobs: readonly CityCohortJob[],
  limit = 6,
): CityCohortVacancyLink[] => {
  const seenHrefs = new Set<string>();
  const companyRanks = new Map<string, number>();
  const candidates = jobs.flatMap((job, sourceIndex) => {
    const href = getVacancyDetailPath(job);
    if (seenHrefs.has(href)) return [];

    seenHrefs.add(href);
    const companyRank = companyRanks.get(job.company) ?? 0;
    companyRanks.set(job.company, companyRank + 1);

    return [{ job, href, companyRank, sourceIndex }];
  });

  return candidates
    .sort((left, right) =>
      left.companyRank - right.companyRank || left.sourceIndex - right.sourceIndex)
    .slice(0, Math.max(0, Math.floor(limit)))
    .map(({ job, href }) => ({
      href,
      title: job.title,
      company: job.company,
      companyHref: `/companies/${slugifyCompany(job.company)}/`,
      salary: job.salary,
      sourceSlug: job.sourceSlug,
    }));
};

export const resolveCityClusterNeighbours = (
  cluster: CitySeoCluster | undefined,
  availableCities: readonly CityClusterNeighbour[],
  fallbackNeighbours: readonly CityClusterNeighbour[],
): CityClusterNeighbour[] => {
  const availableBySlug = new Map(
    availableCities
      .filter((city) => city.vacancyCount > 0)
      .map((city) => [city.slug, city] as const),
  );
  const preferredSlugs = cluster?.preferredNeighbourSlugs ?? [];
  const candidateSlugs = [
    ...preferredSlugs,
    ...fallbackNeighbours.map((city) => city.slug),
  ];
  const seen = new Set<string>();

  return candidateSlugs.flatMap((slug) => {
    const city = availableBySlug.get(slug);
    if (!city || slug === cluster?.slug || seen.has(slug)) return [];

    seen.add(slug);
    return [{ slug: city.slug, name: city.name, vacancyCount: city.vacancyCount }];
  }).slice(0, 6);
};

export const getVacancyCityClusterLink = (
  job: Pick<GeneratedJob, 'location' | 'sourceSlug'>,
): VacancyCityClusterLink | null => {
  const cityName = getPrimaryCityName(job.location);
  if (!cityName) return null;

  const href = getCityHref(cityName);
  const cluster = getCitySeoCluster(slugFromCityHref(href));
  if (!cluster) return null;

  if (
    cluster.appliesToSourceSlugs !== undefined &&
    !cluster.appliesToSourceSlugs.includes(job.sourceSlug)
  ) {
    return null;
  }

  return {
    href,
    label: cluster.hubAnchorLabel,
    description: cluster.hubAnchorDescription,
  };
};

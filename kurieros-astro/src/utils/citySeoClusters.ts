import type { GeneratedJob } from '../data/vacancyTypes';
import { getCityHref } from './cities';

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

const CITY_SEO_CLUSTERS: readonly CitySeoCluster[] = [
  {
    slug: 'horugvino',
    kind: 'warehouse',
    primaryIntent: 'работа и вакансии на складе Ozon в Хоругвино',
    h1: 'Работа на складе Ozon в Хоругвино — вакансии и роли',
    title: 'Склад Ozon в Хоругвино — вакансии и роли | КурьерОк',
    guideTitle: 'Складской кластер Ozon в Хоругвино',
    guideLead:
      'Эта страница собирает складские роли Ozon в Хоругвино: оператор склада, обработчик товаров и техника склада. Отдельные карточки остаются точными вакансиями по роли.',
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
    guideTitle: 'Главная страница вакансий в Оленегорске',
    guideLead:
      'Здесь собраны роли, работодатели и активные вакансии города. Карточки ниже отвечают за точные запросы по компании, роли и транспорту.',
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
    guideTitle: 'Главная страница вакансий в Волоколамске',
    guideLead:
      'Страница объединяет вакансии Волоколамска, чтобы общий городской запрос вел на один хаб, а не на отдельные карточки.',
    hubAnchorLabel: 'Все вакансии в Волоколамске',
    hubAnchorDescription:
      'Городская страница собирает работодателей, роли, доход и все активные вакансии в одном месте.',
  },
  {
    slug: 'pervomaysk',
    kind: 'city-jobs',
    primaryIntent: 'работа курьером и вакансии в Первомайске',
    h1: 'Работа курьером в Первомайске — вакансии, доход и работодатели',
    title: 'Работа курьером в Первомайске — вакансии и работодатели | КурьерОк',
    guideTitle: 'Главная страница вакансий в Первомайске',
    guideLead:
      'Городской хаб показывает активные роли и работодателей Первомайска, а карточки вакансий остаются дочерними страницами.',
    hubAnchorLabel: 'Все вакансии в Первомайске',
    hubAnchorDescription:
      'Городская страница собирает работодателей, роли, доход и все активные вакансии в одном месте.',
  },
  {
    slug: 'timashevsk',
    kind: 'city-jobs',
    primaryIntent: 'работа курьером и вакансии в Тимашевске',
    h1: 'Работа курьером в Тимашевске — вакансии, доход и работодатели',
    title: 'Работа курьером в Тимашевске — вакансии и работодатели | КурьерОк',
    guideTitle: 'Главная страница вакансий в Тимашевске',
    guideLead:
      'Страница закрепляет один городской URL для общего спроса по Тимашевску и ведет дальше в точные вакансии.',
    hubAnchorLabel: 'Все вакансии в Тимашевске',
    hubAnchorDescription:
      'Городская страница собирает работодателей, роли, доход и все активные вакансии в одном месте.',
  },
  {
    slug: 'metallostroy',
    kind: 'city-jobs',
    primaryIntent: 'работа курьером и вакансии в Металлострое',
    h1: 'Работа курьером в Металлострое — вакансии, доход и работодатели',
    title: 'Работа курьером в Металлострое — вакансии и работодатели | КурьерОк',
    guideTitle: 'Главная страница вакансий в Металлострое',
    guideLead:
      'Городской хаб помогает не размазывать общий запрос по отдельным карточкам вакансий в Металлострое.',
    hubAnchorLabel: 'Все вакансии в Металлострое',
    hubAnchorDescription:
      'Городская страница собирает работодателей, роли, доход и все активные вакансии в одном месте.',
  },
  {
    slug: 'chkalovsk',
    kind: 'city-jobs',
    primaryIntent: 'работа курьером и вакансии в Чкаловске',
    h1: 'Работа курьером в Чкаловске — вакансии, доход и работодатели',
    title: 'Работа курьером в Чкаловске — вакансии и работодатели | КурьерОк',
    guideTitle: 'Главная страница вакансий в Чкаловске',
    guideLead:
      'Страница собирает активные предложения Чкаловска и делает отдельные вакансии поддерживающими точными страницами.',
    hubAnchorLabel: 'Все вакансии в Чкаловске',
    hubAnchorDescription:
      'Городская страница собирает работодателей, роли, доход и все активные вакансии в одном месте.',
  },
  {
    slug: 'novovoronezh',
    kind: 'city-jobs',
    primaryIntent: 'работа курьером и вакансии в Нововоронеже',
    h1: 'Работа курьером в Нововоронеже — вакансии, доход и работодатели',
    title: 'Работа курьером в Нововоронеже — вакансии и работодатели | КурьерОк',
    guideTitle: 'Главная страница вакансий в Нововоронеже',
    guideLead:
      'Городская страница отвечает на общий спрос по Нововоронежу, а карточки ниже уточняют компанию, роль и формат.',
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
    guideTitle: 'Главная страница вакансий в Сосновоборске',
    guideLead:
      'Страница закрепляет один лучший URL для городского запроса и ведет в точные вакансии Сосновоборска.',
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

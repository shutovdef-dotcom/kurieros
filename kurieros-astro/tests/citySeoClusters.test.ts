import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CITY_GROWTH_COHORT_SLUGS,
  CITY_SEO_CLUSTER_SLUGS,
  buildCityCohortVacancyLinks,
  getCitySeoCluster,
  getVacancyCityClusterLink,
  resolveCityClusterNeighbours,
} from '../src/utils/citySeoClusters';
import type { GeneratedJob } from '../src/data/vacancyTypes';
import { getCityJobsFromMap } from '../src/utils/jobFilters';
import { jobsByCity } from '../src/utils/jobsByCityIndex';
import { citiesFromJobs } from '../src/utils/citiesIndex';
import { getNearbyCities } from '../src/utils/cityGeoIndex';
import { getVacancyDetailPath } from '../src/utils/vacancyUrl';

const source = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const job = (overrides: Partial<GeneratedJob>): GeneratedJob => ({
  id: 1,
  sourceId: 1,
  sourceSlug: 'kuper-foot-courier',
  slug: 'kuper-foot-courier-olenegorsk-foot',
  title: 'Пеший курьер в Купер в Оленегорске',
  company: 'Купер',
  companyLogo: '/logos/kuper.png',
  salary: 'до 88 200 ₽/мес',
  location: 'Оленегорск',
  tags: ['foot'],
  labels: [],
  applyLink: '#',
  description: '',
  requirements: [],
  benefits: [],
  requiredDocuments: [],
  details: {
    rate: '',
    schedule: '',
    education: '',
    age: '',
    payment_freq: 'Еженедельно',
    citizenship: '',
    medical_book: '',
    self_employed: '',
    employment_type: '',
    transport_provision: '',
    uniform: '',
    os: '',
  },
  search_tags: [],
  shortDescription: '',
  transport: 'foot',
  transportProvision: 'not_required',
  salaryConfidence: 'official',
  currency: 'RUB',
  updatedAt: '2026-06-28',
  ...overrides,
});

describe('city SEO clusters', () => {
  it('pins the proven city clusters from the June SEO analysis', () => {
    expect(CITY_SEO_CLUSTER_SLUGS).toEqual([
      'horugvino',
      'olenegorsk',
      'volokolamsk',
      'pervomaysk',
      'timashevsk',
      'metallostroy',
      'chkalovsk',
      'novovoronezh',
      'sosnovoborsk',
    ]);
  });

  it('builds city hub links for generic city clusters', () => {
    expect(getVacancyCityClusterLink(job({}))).toEqual({
      href: '/rabota-kurerom-olenegorsk/',
      label: 'Все вакансии в Оленегорске',
      description:
        'Городская страница собирает работодателей, роли, доход и все активные вакансии в одном месте.',
    });
  });

  it('limits the Horugvino warehouse cluster to Ozon warehouse roles', () => {
    expect(
      getVacancyCityClusterLink(
        job({
          location: 'Хоругвино',
          sourceSlug: 'ozon-warehouse-operator',
          slug: 'ozon-warehouse-operator-horugvino-foot',
        }),
      )?.label,
    ).toBe('Все складские вакансии Ozon в Хоругвино');

    expect(
      getVacancyCityClusterLink(
        job({
          location: 'Хоругвино',
          sourceSlug: 'tetrika-teacher',
          slug: 'tetrika-teacher-horugvino-remote',
        }),
      ),
    ).toBeNull();
  });

  it('keeps cluster guides source-driven and wired into listing/vacancy pages', () => {
    expect(getCitySeoCluster('olenegorsk')?.primaryIntent).toContain('вакансии');
    expect(source('src/pages/[slug].astro')).toContain('CityClusterGuide');
    expect(source('src/pages/v/[slug].astro')).toContain('getVacancyCityClusterLink');
    expect(source('src/components/vacancy/VacancyBreadcrumb.astro')).toContain(
      'cityClusterLink',
    );
  });

  it('defines the six approved city-growth cohort pages without expanding age or metro surfaces', () => {
    expect(CITY_GROWTH_COHORT_SLUGS).toEqual([
      'sredneuralsk',
      'pervomaysk',
      'timashevsk',
      'kartaly',
      'metallostroy',
      'chkalovsk',
    ]);

    for (const slug of CITY_GROWTH_COHORT_SLUGS) {
      const cluster = getCitySeoCluster(slug);
      expect(cluster?.growthCohort, slug).toBe(true);
      expect(cluster?.guideLead, slug).not.toMatch(/SEO|URL|кластер|хаб|поисков|дочерн/i);
    }
  });

  it('builds exact vacancy links from current source jobs for every cohort city', () => {
    const cityNamesBySlug = {
      sredneuralsk: 'Среднеуральск',
      pervomaysk: 'Первомайск',
      timashevsk: 'Тимашевск',
      kartaly: 'Карталы',
      metallostroy: 'Металлострой',
      chkalovsk: 'Чкаловск',
    } as const;

    for (const slug of CITY_GROWTH_COHORT_SLUGS) {
      const cityJobs = getCityJobsFromMap(jobsByCity, cityNamesBySlug[slug]);
      const links = buildCityCohortVacancyLinks(cityJobs, 6);

      expect(links.length, slug).toBeGreaterThanOrEqual(2);
      expect(links.length, slug).toBeLessThanOrEqual(6);
      expect(new Set(links.map((link) => link.href)).size, slug).toBe(links.length);

      for (const link of links) {
        const sourceJob = cityJobs.find((entry) => getVacancyDetailPath(entry) === link.href);
        expect(sourceJob, `${slug}: ${link.href}`).toBeDefined();
        expect(link, `${slug}: ${link.href}`).toMatchObject({
          title: sourceJob?.title,
          company: sourceJob?.company,
          salary: sourceJob?.salary,
          sourceSlug: sourceJob?.sourceSlug,
        });
        expect(link.companyHref).toMatch(/^\/companies\/[a-z0-9-]+\/$/);
      }
    }
  });

  it('keeps employers diversified and links Купер city evidence to the canonical company page', () => {
    for (const cityName of ['Среднеуральск', 'Тимашевск']) {
      const links = buildCityCohortVacancyLinks(
        getCityJobsFromMap(jobsByCity, cityName),
        6,
      );

      expect(new Set(links.map((link) => link.company)).size, cityName)
        .toBeGreaterThanOrEqual(2);
      expect(links, cityName).toContainEqual(
        expect.objectContaining({
          company: 'Купер (ex. СберМаркет)',
          companyHref: '/companies/kuper-ex-sbermarket/',
        }),
      );
    }
  });

  it('resolves useful live neighbour links for all six cities, including Metallostroy fallback', () => {
    for (const slug of CITY_GROWTH_COHORT_SLUGS) {
      const cluster = getCitySeoCluster(slug);
      const neighbours = resolveCityClusterNeighbours(
        cluster,
        citiesFromJobs,
        getNearbyCities(slug),
      );

      expect(neighbours.length, slug).toBeGreaterThanOrEqual(4);
      expect(new Set(neighbours.map((city) => city.slug)).size, slug).toBe(neighbours.length);
      expect(neighbours.some((city) => city.slug === slug), slug).toBe(false);
      expect(neighbours.every((city) => city.vacancyCount > 0), slug).toBe(true);
    }

    expect(
      resolveCityClusterNeighbours(
        getCitySeoCluster('metallostroy'),
        citiesFromJobs,
        [],
      ).map((city) => city.slug),
    ).toContain('kolpino');
  });

  it('does not expose internal SEO labels in the visible city guide', () => {
    const component = source('src/components/CityClusterGuide.astro');

    expect(component).not.toContain('Главный URL кластера');
    expect(component).not.toContain('<dt>Интент</dt>');
    expect(component).not.toContain('{cluster.primaryIntent}');
    expect(component).toContain('Текущие предложения');
    expect(component).toContain('vacancyLinks');
  });
});

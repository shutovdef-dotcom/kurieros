import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CITY_SEO_CLUSTER_SLUGS,
  getCitySeoCluster,
  getVacancyCityClusterLink,
} from '../src/utils/citySeoClusters';
import type { GeneratedJob } from '../src/data/vacancyTypes';

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
});

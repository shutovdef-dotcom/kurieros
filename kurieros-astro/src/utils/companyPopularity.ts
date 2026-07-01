import type { CompanyEntity } from './companies';

export const POPULAR_COMPANY_SLUGS = [
  'kuper-ex-sbermarket',
  'yandex-eda',
  'samokat',
  'ozon',
  'ozon-fresh',
  'x5-dostavka',
  'alfa-bank',
  't-bank',
  'burger-king',
  'eda-v-yandeks-go',
  'eda-v-yandex-go',
  'mts-bank',
  'efin',
  'servis-ruki',
  'qlean',
  'domovenok',
  'voxys',
  'tetrika',
] as const;

const POPULARITY_RANK = new Map<string, number>(
  POPULAR_COMPANY_SLUGS.map((slug, index) => [slug, index]),
);

const rankCompany = (company: CompanyEntity): number =>
  POPULARITY_RANK.get(company.slug) ?? Number.MAX_SAFE_INTEGER;

export const sortCompaniesByPopularity = <T extends CompanyEntity>(
  companies: readonly T[],
): T[] =>
  [...companies].sort((companyA, companyB) => {
    const rankDiff = rankCompany(companyA) - rankCompany(companyB);

    return (
      rankDiff ||
      companyB.vacancyCount - companyA.vacancyCount ||
      (companyB.rating || 0) - (companyA.rating || 0) ||
      companyA.name.localeCompare(companyB.name, 'ru')
    );
  });

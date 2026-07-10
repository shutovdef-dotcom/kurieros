export type CompanyCommercialHub = {
  href: string;
  label: string;
  intent: 'commercial-listing';
};

export type BrandCategoryCompanyLink = {
  categorySlug: string;
  companySlug: string;
  companyName: string;
  companyHref: string;
  label: string;
};

/**
 * Employer SEO architecture:
 * - `/companies/{slug}/` is the primary indexable employer guide.
 * - `/rabota-kurerom-{brand}/` category facets remain commercial vacancy
 *   lists, but cross-canonical to the employer guide to avoid cannibalization.
 */
export const BRAND_CATEGORY_COMPANY_LINKS: Readonly<Record<string, BrandCategoryCompanyLink>> = {
  kuper: {
    categorySlug: 'kuper',
    companySlug: 'kuper-ex-sbermarket',
    companyName: 'Купер',
    companyHref: '/companies/kuper-ex-sbermarket/',
    label: 'Разбор работодателя Купер',
  },
  ozon: {
    categorySlug: 'ozon',
    companySlug: 'ozon',
    companyName: 'Ozon',
    companyHref: '/companies/ozon/',
    label: 'Разбор работодателя Ozon',
  },
  samokat: {
    categorySlug: 'samokat',
    companySlug: 'samokat',
    companyName: 'Самокат',
    companyHref: '/companies/samokat/',
    label: 'Разбор работодателя Самокат',
  },
};

export const COMPANY_COMMERCIAL_HUBS: Readonly<Record<string, CompanyCommercialHub>> = {
  'kuper-ex-sbermarket': {
    href: '/rabota-kurerom-kuper/',
    label: 'Смотреть вакансии Купер',
    intent: 'commercial-listing',
  },
  ozon: {
    href: '/rabota-kurerom-ozon/',
    label: 'Смотреть вакансии Ozon',
    intent: 'commercial-listing',
  },
  samokat: {
    href: '/rabota-kurerom-samokat/',
    label: 'Смотреть вакансии Самокат',
    intent: 'commercial-listing',
  },
};

const COMPANY_ALTERNATE_NAMES: Readonly<Record<string, readonly string[]>> = {
  'kuper-ex-sbermarket': ['Купер', 'СберМаркет'],
};

export const getBrandCategoryCompanyLink = (
  categorySlug: string,
): BrandCategoryCompanyLink | undefined =>
  BRAND_CATEGORY_COMPANY_LINKS[categorySlug];

export const getBrandCategoryCompanyCanonical = (categorySlug: string): string | undefined =>
  getBrandCategoryCompanyLink(categorySlug)?.companyHref;

export const getCompanyCommercialHub = (
  companySlug: string,
): CompanyCommercialHub | undefined =>
  COMPANY_COMMERCIAL_HUBS[companySlug];

export const getCompanyAlternateNames = (
  companySlug: string,
): readonly string[] | undefined => COMPANY_ALTERNATE_NAMES[companySlug];

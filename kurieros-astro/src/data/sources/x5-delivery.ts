import { z } from 'zod';
import x5DeliveryVacanciesSource from '../x5-delivery-vacancies.json';
import { isCityBlocked, normalizeCityKey, slugifyCity } from '../../utils/cities';
import type {
  EmploymentFormat,
  VacancyContent,
  VacancyOffer,
  VacancySource,
} from '../vacancyTypes';
import { X5_DELIVERY_APPLY, X5_DELIVERY_LOGO } from '../partnerLinks';
import { expandCitiesForCapitalRegions } from './geoExpansion';
import { formatRub } from './shared';

// === Constants =======================================================

const X5_DELIVERY_COMPANY_NAME = 'X5 Доставка';
const X5_DELIVERY_COMPANY_LOGO = X5_DELIVERY_LOGO;
const X5_DELIVERY_EMPLOYMENT_FORMATS = ['self_employed'] satisfies EmploymentFormat[];
const X5_DELIVERY_CITIZENSHIP = 'ЕАЭС';
const X5_DELIVERY_SCHEDULE =
  'Свободный график: дневная доставка, смены планируются на выбор';

// === Schema ==========================================================

const x5RegionalCitiesSchema = z.object({
  region: z.string().min(1),
  cities: z.array(z.string().min(1)),
});

export const X5DeliveryVacanciesSchema = z.object({
  company: z.literal(X5_DELIVERY_COMPANY_NAME),
  sourceUrl: z.url(),
  geoSourceUrl: z.url(),
  creativeSourceUrl: z.url(),
  updatedAt: z.string().min(1),
  dailyIncomeRub: z.number().positive(),
  monthlyMaxRub: z.number().positive(),
  directCities: z.array(z.string().min(1)),
  regionalCities: z.array(x5RegionalCitiesSchema),
  nearestCityOverrides: z.record(z.string(), z.string().min(1)),
});

export type X5DeliveryVacanciesData = z.infer<typeof X5DeliveryVacanciesSchema>;

const x5DeliveryVacancies: X5DeliveryVacanciesData =
  X5DeliveryVacanciesSchema.parse(x5DeliveryVacanciesSource);

const nearestCityByKey = new Map(
  Object.entries(x5DeliveryVacancies.nearestCityOverrides).map(([rawCity, nearestCity]) => [
    normalizeCityKey(rawCity),
    nearestCity,
  ]),
);

// === Helpers =========================================================

const getNearestKnownCity = (rawCity: string) => {
  const trimmedCity = rawCity.trim();
  const nearestCity = nearestCityByKey.get(normalizeCityKey(trimmedCity)) ?? trimmedCity;

  if (!isCityBlocked(nearestCity)) return nearestCity;

  throw new Error(
    `X5 Delivery city mapping resolved "${trimmedCity}" to blocked city "${nearestCity}".`,
  );
};

const uniqueCities = (cities: readonly string[]) =>
  Array.from(new Map(cities.map((city) => [normalizeCityKey(city), city])).values());

const buildX5DeliveryApplyLink = (city: string): string | undefined => {
  if (!X5_DELIVERY_APPLY.startsWith('https://')) return undefined;

  const url = new URL(X5_DELIVERY_APPLY);
  const citySlug = slugifyCity(city);

  url.searchParams.set('utm_source', 'kurerok');
  url.searchParams.set('utm_medium', 'vacancy');
  url.searchParams.set('utm_campaign', 'x5-delivery-auto-courier');
  url.searchParams.set('utm_content', `${citySlug}-auto`);

  return url.toString();
};

const buildX5DeliveryPay = (): VacancyOffer['pay'] => {
  const dailyText = `от ${formatRub(x5DeliveryVacancies.dailyIncomeRub)} ₽/день`;
  const monthlyText = `до ${formatRub(x5DeliveryVacancies.monthlyMaxRub)} ₽/мес`;

  return {
    currency: 'RUB',
    monthly: {
      max: x5DeliveryVacancies.monthlyMaxRub,
      text: monthlyText,
    },
    perShift: {
      min: x5DeliveryVacancies.dailyIncomeRub,
      text: dailyText,
    },
    rate:
      `${dailyText}; ориентир ${monthlyText}, итоговый доход зависит от количества доставок и выбранных смен`,
    paymentFrequency: 'Еженедельно',
  };
};

// === Content =========================================================

const x5DeliveryAutoCourierContent: VacancyContent = {
  title: 'Водитель X5 Доставки на личном авто {cityPrep}',
  shortDescription:
    'Доставка заказов X5 на личном автомобиле: дневные смены на выбор, еженедельные выплаты на карту, бесплатная термосумка и доход до 182 000 ₽ в месяц.',
  description:
    'X5 Доставка приглашает водителей на личном автомобиле {cityPrep}. Нужно забирать товары в магазине и доставлять клиентам. Формат сотрудничества — договор оказания услуг через самозанятость; смены планируются на выбор, доставка проходит в дневное время. Выплаты перечисляются на карту каждую неделю.',
  requirements: [
    'Возраст от 18 лет.',
    'Гражданство ЕАЭС.',
    'Личный автомобиль.',
    'Водительское удостоверение РФ.',
    'Статус самозанятого или готовность оформить самозанятость.',
    'Аккуратность, пунктуальность и готовность доставлять товары клиентам.',
  ],
  benefits: [
    'Доход от 6 000 ₽ в день и ориентир до 182 000 ₽ в месяц.',
    'Доставка в дневное время.',
    'Планирование смен на ваш выбор.',
    'Сотрудничество по договору оказания услуг.',
    'Выплаты на карту каждую неделю.',
    'Бесплатная термосумка.',
    'Отсутствие штрафов по условиям оффера.',
    'Акция «приведи друга»: 10 000 ₽.',
  ],
  requiredDocuments: [
    'Паспорт.',
    'Водительское удостоверение РФ.',
    'Документы на автомобиль.',
    'Статус самозанятого или готовность оформить его перед стартом.',
  ],
  labels: [
    'На личном авто',
    'X5 Доставка',
    'Еженедельные выплаты',
    'Самозанятость',
    'Свободный график',
  ],
  searchTags: [
    'X5 Доставка',
    'X5',
    'водитель X5',
    'автокурьер',
    'водитель на личном авто',
    'доставка продуктов',
    'самозанятость',
  ],
};

// === Offer construction ==============================================

const nonCapitalRegionalCities = x5DeliveryVacancies.regionalCities
  .filter(({ region }) => region !== 'Московская область' && region !== 'Ленинградская область')
  .flatMap(({ cities }) => cities);

const x5DeliveryCities = uniqueCities([
  ...x5DeliveryVacancies.directCities.filter(
    (city) => city !== 'Москва' && city !== 'Санкт-Петербург',
  ),
  ...expandCitiesForCapitalRegions(['Москва', 'Санкт-Петербург'], {
    includeLeningradRegion: true,
  }),
  ...nonCapitalRegionalCities,
].map(getNearestKnownCity));

const buildX5DeliveryOffer = (city: string, cityIndex: number): VacancyOffer => {
  const applyLink = buildX5DeliveryApplyLink(city);

  return {
    city,
    transport: 'auto',
    transportProvision: 'own',
    pay: buildX5DeliveryPay(),
    isActive: true,
    updatedAt: x5DeliveryVacancies.updatedAt,
    sourceUrl: x5DeliveryVacancies.sourceUrl,
    salaryConfidence: 'partner',
    ageFrom: 18,
    citizenship: X5_DELIVERY_CITIZENSHIP,
    medicalBook: 'unknown',
    employmentFormats: [...X5_DELIVERY_EMPLOYMENT_FORMATS],
    schedule: X5_DELIVERY_SCHEDULE,
    ...(applyLink ? { applyLink } : {}),
    priority: 1660 - cityIndex,
  };
};

const x5DeliveryAutoCourierOffers = x5DeliveryCities.map(buildX5DeliveryOffer);

// === Source ==========================================================

export const x5DeliverySource: VacancySource = {
  id: 36,
  slug: 'x5-delivery-auto-courier',
  company: { name: X5_DELIVERY_COMPANY_NAME, logo: X5_DELIVERY_COMPANY_LOGO },
  content: x5DeliveryAutoCourierContent,
  defaults: {
    ageFrom: 18,
    medicalBook: 'unknown',
    employmentFormats: [...X5_DELIVERY_EMPLOYMENT_FORMATS],
    schedule: X5_DELIVERY_SCHEDULE,
    education: 'Не требуется',
    citizenship: X5_DELIVERY_CITIZENSHIP,
    uniform: 'Бесплатная термосумка',
    os: 'Android или iOS',
  },
  offers: x5DeliveryAutoCourierOffers,
  incomeCalculator: { mode: 'monthly' },
  howToTemplate: 'courier',
  extraTags: [
    'x5-delivery',
    'auto-courier',
    'grocery-delivery',
    'self-employed',
    'source:lovko',
    'source:google-sheet',
  ],
  isHot: true,
};

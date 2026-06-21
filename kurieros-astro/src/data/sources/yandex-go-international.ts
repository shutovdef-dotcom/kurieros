import { slugifyCity } from '../../utils/cities';
import {
  formatMoneyPerHour,
  formatMonthlyMaxText,
} from '../../utils/money';
import type {
  CurrencyCode,
  EmploymentFormat,
  TransportMode,
  VacancyContent,
  VacancyOffer,
  VacancySource,
} from '../vacancyTypes';
import {
  YANDEX_GO_BY_APPLY,
  YANDEX_GO_BY_LOGO,
  YANDEX_GO_KG_APPLY,
  YANDEX_GO_KG_LOGO,
  YANDEX_GO_KZ_APPLY,
  YANDEX_GO_KZ_LOGO,
  YANDEX_GO_UZ_APPLY,
  YANDEX_GO_UZ_LOGO,
} from '../partnerLinks';
import { TRANSPORT_PRIORITY } from './shared';

// === Types ===========================================================

type CourierTransportMode = Extract<TransportMode, 'foot' | 'bicycle' | 'auto'>;

type CountryCode = 'belarus' | 'kazakhstan' | 'kyrgyzstan' | 'uzbekistan';

type RateValue = {
  hourly: number;
  monthly: number;
};

type CityRates = {
  city: string;
  rates: Partial<Record<CourierTransportMode, RateValue>>;
};

type CountryConfig = {
  id: number;
  slug: string;
  companyName: string;
  logo: string;
  applyLink: string;
  sourceUrl: string;
  currency: CurrencyCode;
  paymentFrequency: string;
  citizenship: string;
  requirementsOverride?: string[];
  requiredDocumentsOverride: string[];
  content: VacancyContent;
  rates: CityRates[];
  priorityBase: number;
};

// === Constants =======================================================

const YANDEX_GO_UPDATED_AT = '2026-06-15';
const YANDEX_GO_EMPLOYMENT_FORMATS = ['self_employed'] satisfies EmploymentFormat[];
const TRANSPORT_MODES = ['foot', 'bicycle', 'auto'] satisfies CourierTransportMode[];

const SALEADS_SOURCE_URLS: Record<CountryCode, string> = {
  belarus:
    'https://saleads.pro/lk/webmaster/offer/6e726520-dc80-11ef-9c3f-7b9291ae7456#info',
  kazakhstan:
    'https://saleads.pro/lk/webmaster/offer/df4d7d90-ccb8-11ee-81f4-f396c2f8e017#info',
  kyrgyzstan:
    'https://saleads.pro/lk/webmaster/offer/b3b07340-701c-11ef-8753-2b74e9096302#info',
  uzbekistan:
    'https://saleads.pro/lk/webmaster/offer/abe91520-74d6-11ee-b58a-c14e8d55f67d#info',
};

// === Helpers =========================================================

const buildYandexGoApplyLink = (
  applyLink: string,
  sourceSlug: string,
  city: string,
  transport: CourierTransportMode,
) => {
  const url = new URL(applyLink);

  url.searchParams.set('utm_source', 'kurerok');
  url.searchParams.set('utm_medium', 'vacancy');
  url.searchParams.set('utm_campaign', sourceSlug);
  url.searchParams.set('utm_content', `${slugifyCity(city)}-${transport}`);

  return url.toString();
};

const buildYandexGoPay = (
  rate: RateValue,
  currency: CurrencyCode,
  paymentFrequency: string,
): VacancyOffer['pay'] => ({
  currency,
  hourly: {
    min: rate.hourly,
    max: rate.hourly,
    text: formatMoneyPerHour(rate.hourly, currency),
  },
  monthly: {
    max: rate.monthly,
    text: formatMonthlyMaxText(rate.monthly, currency),
  },
  rate: `${formatMoneyPerHour(rate.hourly, currency)}, ${formatMonthlyMaxText(rate.monthly, currency)}`,
  paymentFrequency,
});

const buildContent = (companyName: string): VacancyContent => ({
  title: `{transportTitle}-партнёр сервиса ${companyName} {cityPrep}`,
  shortDescription:
    'Доставка заказов через Я.Про рядом с домом, свободный график от 2 часов и прозрачный доход.',
  description:
    'Ищем курьеров-партнёров {cityPrep}. Доход формируется за количество часов и обслуженных клиентов. Часы доставки (тайм-слоты) выбираете сами.',
  requirements: [
    'Возраст от 18 лет.',
    'Смартфон на Android 5.0 и выше.',
    'Готовность доставлять заказы вовремя.',
  ],
  benefits: [
    'Еженедельные выплаты на карту.',
    'Гибкий график: можно выбирать удобные слоты и район.',
    'Выбор района: работайте рядом с домом или там, где больше заказов.',
    'Прозрачный доход: бонусы и повышенные ставки в пиковые часы.',
  ],
  requiredDocuments: [
    'Документы для подключения уточняются при оформлении.',
  ],
  labels: ['Без опыта', 'Курьер', 'Доставка', 'Свободный график'],
  searchTags: [companyName, 'Yandex Go', 'курьер', 'доставка еды'],
});

const createOffers = (config: CountryConfig): VacancyOffer[] =>
  config.rates.flatMap((cityRate, cityIndex) =>
    TRANSPORT_MODES.flatMap((transport): VacancyOffer[] => {
      const rate = cityRate.rates[transport];
      if (!rate) return [];

      return [{
        city: cityRate.city,
        transport,
        transportProvision: transport === 'foot' ? 'not_required' : 'own',
        pay: buildYandexGoPay(rate, config.currency, config.paymentFrequency),
        isActive: true,
        updatedAt: YANDEX_GO_UPDATED_AT,
        sourceUrl: config.sourceUrl,
        salaryConfidence: 'partner',
        ageFrom: 18,
        citizenship: config.citizenship,
        medicalBook: 'unknown',
        employmentFormats: [...YANDEX_GO_EMPLOYMENT_FORMATS],
        schedule: 'Свободный график',
        applyLink: buildYandexGoApplyLink(
          config.applyLink,
          config.slug,
          cityRate.city,
          transport,
        ),
        priority: config.priorityBase - cityIndex * 10 + TRANSPORT_PRIORITY[transport],
        ...(config.requirementsOverride?.length
          ? { requirementsOverride: config.requirementsOverride }
          : {}),
        requiredDocumentsOverride: config.requiredDocumentsOverride,
      }];
    }),
  );

const buildSource = (config: CountryConfig): VacancySource => ({
  id: config.id,
  slug: config.slug,
  company: {
    name: config.companyName,
    logo: config.logo,
  },
  content: config.content,
  defaults: {
    ageFrom: 18,
    medicalBook: 'unknown',
    employmentFormats: [...YANDEX_GO_EMPLOYMENT_FORMATS],
    schedule: 'Свободный график',
    education: 'Не требуется',
    citizenship: config.citizenship,
    uniform: 'Уточняется у партнёра',
    os: 'Android / iOS',
  },
  offers: createOffers(config),
  incomeCalculator: { mode: 'hourly' },
  howToTemplate: 'courier',
  extraTags: ['yandex_go', 'courier', 'food_delivery', 'foot', 'bicycle', 'auto', 'source:saleads'],
});

// === Country data ====================================================

const belarusRequiredDocuments = [
  'Документ, удостоверяющий личность.',
  'Банковская карта для выплат.',
  'Документы для подключения уточняются при оформлении.',
];

const kazakhstanRequiredDocuments = [
  'Удостоверение личности или паспорт.',
  'ИИН.',
  'Банковская карта для выплат.',
];

const kyrgyzstanRequiredDocuments = [
  'Кыргызстан: физическая ID-карта или физический загранпаспорт + «Түндүк».',
  'Для иностранных граждан: документы по правилам найма в Кыргызстане.',
];

const uzbekistanRequiredDocuments = [
  'Документ, удостоверяющий личность: удостоверение личности или паспорт.',
  'Своя банковская карта.',
  'СМЗ.',
  'Для нерезидентов Узбекистана: ВНЖ вместо паспорта.',
];

const countryConfigs: CountryConfig[] = [
  {
    id: 23,
    slug: 'yandex-go-courier-belarus',
    companyName: 'Еда в Яндекс Go',
    logo: YANDEX_GO_BY_LOGO,
    applyLink: YANDEX_GO_BY_APPLY,
    sourceUrl: SALEADS_SOURCE_URLS.belarus,
    currency: 'BYN',
    paymentFrequency: 'Еженедельно',
    citizenship: 'Беларусь / иностранные граждане по правилам найма',
    requiredDocumentsOverride: belarusRequiredDocuments,
    content: buildContent('Еда в Яндекс Go'),
    priorityBase: 1450,
    rates: [
      {
        city: 'Минск',
        rates: {
          foot: { hourly: 7, monthly: 1_700 },
          bicycle: { hourly: 9, monthly: 2_425 },
          auto: { hourly: 18, monthly: 4_525 },
        },
      },
    ],
  },
  {
    id: 24,
    slug: 'yandex-go-courier-kazakhstan',
    companyName: 'Еда в Яндекс Go',
    logo: YANDEX_GO_KZ_LOGO,
    applyLink: YANDEX_GO_KZ_APPLY,
    sourceUrl: SALEADS_SOURCE_URLS.kazakhstan,
    currency: 'KZT',
    paymentFrequency: 'Уточняется',
    citizenship: 'Казахстан / иностранные граждане по правилам найма',
    requiredDocumentsOverride: kazakhstanRequiredDocuments,
    content: buildContent('Еда в Яндекс Go'),
    priorityBase: 1440,
    rates: [
      {
        city: 'Алматы',
        rates: {
          foot: { hourly: 1_985, monthly: 595_000 },
          bicycle: { hourly: 2_250, monthly: 675_000 },
          auto: { hourly: 2_535, monthly: 760_000 },
        },
      },
      {
        city: 'Астана',
        rates: {
          foot: { hourly: 1_750, monthly: 525_000 },
          bicycle: { hourly: 1_935, monthly: 580_000 },
          auto: { hourly: 2_585, monthly: 775_000 },
        },
      },
      {
        city: 'Шымкент',
        rates: {
          bicycle: { hourly: 1_715, monthly: 515_000 },
          auto: { hourly: 2_035, monthly: 610_000 },
        },
      },
      {
        city: 'Атырау',
        rates: {
          foot: { hourly: 1_235, monthly: 370_000 },
          bicycle: { hourly: 1_400, monthly: 420_000 },
          auto: { hourly: 2_200, monthly: 660_000 },
        },
      },
      {
        city: 'Актобе',
        rates: {
          foot: { hourly: 885, monthly: 265_000 },
          bicycle: { hourly: 1_115, monthly: 335_000 },
          auto: { hourly: 1_715, monthly: 515_000 },
        },
      },
      {
        city: 'Актау',
        rates: {
          foot: { hourly: 1_065, monthly: 320_000 },
          bicycle: { hourly: 1_450, monthly: 435_000 },
          auto: { hourly: 1_835, monthly: 550_000 },
        },
      },
      {
        city: 'Караганда',
        rates: {
          bicycle: { hourly: 1_365, monthly: 410_000 },
          auto: { hourly: 1_765, monthly: 530_000 },
        },
      },
      {
        city: 'Костанай',
        rates: {
          foot: { hourly: 950, monthly: 285_000 },
          bicycle: { hourly: 1_115, monthly: 335_000 },
        },
      },
      {
        city: 'Павлодар',
        rates: {
          foot: { hourly: 1_150, monthly: 345_000 },
          bicycle: { hourly: 1_350, monthly: 405_000 },
          auto: { hourly: 1_635, monthly: 490_000 },
        },
      },
    ],
  },
  {
    id: 25,
    slug: 'yandex-go-courier-kyrgyzstan',
    companyName: 'Еда в Яндекс Go',
    logo: YANDEX_GO_KG_LOGO,
    applyLink: YANDEX_GO_KG_APPLY,
    sourceUrl: SALEADS_SOURCE_URLS.kyrgyzstan,
    currency: 'KGS',
    paymentFrequency: 'Еженедельно',
    citizenship: 'Кыргызстан / иностранные граждане по правилам найма',
    requirementsOverride: [
      'Пешие курьеры: возраст от 18 до 55 лет включительно.',
      'Автокурьеры: возраст от 18 до 65 лет включительно.',
    ],
    requiredDocumentsOverride: kyrgyzstanRequiredDocuments,
    content: buildContent('Еда в Яндекс Go'),
    priorityBase: 1430,
    rates: [
      {
        city: 'Бишкек',
        rates: {
          foot: { hourly: 215, monthly: 53_500 },
          bicycle: { hourly: 240, monthly: 60_000 },
          auto: { hourly: 370, monthly: 93_000 },
        },
      },
      {
        city: 'Ош',
        rates: {
          foot: { hourly: 145, monthly: 36_000 },
          bicycle: { hourly: 215, monthly: 54_000 },
          auto: { hourly: 340, monthly: 85_000 },
        },
      },
      {
        city: 'Джалал-Абад',
        rates: {
          foot: { hourly: 160, monthly: 40_000 },
          bicycle: { hourly: 205, monthly: 51_000 },
          auto: { hourly: 315, monthly: 78_500 },
        },
      },
    ],
  },
  {
    id: 26,
    slug: 'yandex-go-courier-uzbekistan',
    companyName: 'Еда в Yandex Go',
    logo: YANDEX_GO_UZ_LOGO,
    applyLink: YANDEX_GO_UZ_APPLY,
    sourceUrl: SALEADS_SOURCE_URLS.uzbekistan,
    currency: 'UZS',
    paymentFrequency: 'Уточняется',
    citizenship: 'Узбекистан / иностранные граждане по правилам найма',
    requirementsOverride: [
      'Пешие курьеры: возраст от 18 до 55 лет включительно.',
      'Автокурьеры: возраст от 18 до 65 лет включительно.',
      'Своя банковская карта.',
      'СМЗ.',
    ],
    requiredDocumentsOverride: uzbekistanRequiredDocuments,
    content: buildContent('Еда в Yandex Go'),
    priorityBase: 1420,
    rates: [
      {
        city: 'Ташкент',
        rates: {
          foot: { hourly: 27_200, monthly: 6_800_000 },
          bicycle: { hourly: 32_000, monthly: 8_000_000 },
          auto: { hourly: 44_000, monthly: 11_000_000 },
        },
      },
      {
        city: 'Самарканд',
        rates: {
          foot: { hourly: 22_400, monthly: 5_600_000 },
          bicycle: { hourly: 26_800, monthly: 6_700_000 },
          auto: { hourly: 37_200, monthly: 9_300_000 },
        },
      },
      {
        city: 'Наманган',
        rates: {
          foot: { hourly: 11_200, monthly: 2_800_000 },
          bicycle: { hourly: 14_000, monthly: 3_500_000 },
          auto: { hourly: 29_600, monthly: 7_400_000 },
        },
      },
      {
        city: 'Нукус',
        rates: {
          auto: { hourly: 28_800, monthly: 7_200_000 },
        },
      },
      {
        city: 'Фергана',
        rates: {
          foot: { hourly: 14_000, monthly: 3_500_000 },
          bicycle: { hourly: 17_600, monthly: 4_400_000 },
          auto: { hourly: 28_800, monthly: 7_200_000 },
        },
      },
      {
        city: 'Андижан',
        rates: {
          bicycle: { hourly: 18_800, monthly: 4_700_000 },
          auto: { hourly: 27_600, monthly: 6_900_000 },
        },
      },
    ],
  },
];

// === Sources =========================================================

export const yandexGoInternationalSources: VacancySource[] =
  countryConfigs.map(buildSource);

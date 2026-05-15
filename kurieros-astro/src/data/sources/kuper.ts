/**
 * Купер (ex. СберМаркет) — 4 sources: foot courier, bike courier,
 * auto courier, and order picker.
 *
 * Pay rates are loaded from `kuper-pay-rates.json` (per-city 12-hour
 * shift rate; we convert to hourly via `toHourlyFromShift` and reuse
 * Yandex Eda's `buildPay` so the wallet/instant-payout messaging stays
 * consistent across the two daily-pay partners).
 *
 * Per-city citizenship label is inherited from Yandex Eda
 * (`yandexCitizenshipByCity`) so cities present in both registries
 * (e.g. «Москва» → «РФ / ЕАЭС / СНГ») render the same chip; cities
 * Купер ships that Yandex doesn't fall back to `KUPER_DEFAULT_CITIZENSHIP`.
 */
import kuperPayRatesSource from '../kuper-pay-rates.json';
import { slugifyCity } from '../../utils/cities';
import type {
  EmploymentFormat,
  TransportMode,
  VacancyContent,
  VacancyOffer,
  VacancySource,
} from '../vacancyTypes';
import {
  KUPER_LOGO,
  KUPER_FOOT_AND_BIKE_APPLY,
  KUPER_PACKER_APPLY,
  KUPER_AUTO_APPLY,
} from '../partnerLinks';
import {
  TRANSPORT_PRIORITY,
  buildPay,
  getRequiredDocumentOverrides,
} from './shared';
import { yandexCitizenshipByCity } from './yandex-eda';

// === Constants =======================================================

const KUPER_COMPANY_NAME = 'Купер (ex. СберМаркет)';
const KUPER_COMPANY_LOGO = KUPER_LOGO;
const KUPER_FOOT_AND_BIKE_APPLY_LINK = KUPER_FOOT_AND_BIKE_APPLY;
const KUPER_PACKER_APPLY_LINK = KUPER_PACKER_APPLY;
const KUPER_AUTO_APPLY_LINK = KUPER_AUTO_APPLY;
const KUPER_DEFAULT_CITIZENSHIP = 'РФ / ЕАЭС / СНГ';
const KUPER_EMPLOYMENT_FORMATS = ['self_employed'] satisfies EmploymentFormat[];

// === Types ===========================================================

type KuperPayRates = {
  sourceUrl: string;
  exportedAt: string;
  footAndBikeShiftByCity: Record<string, number>;
  autoShiftByCity: Record<string, number>;
  packerShiftByCity: Record<string, number>;
};

type KuperRole = 'foot' | 'bike' | 'auto' | 'packer';

const kuperPayRates = kuperPayRatesSource as KuperPayRates;

const KUPER_PAY_SOURCE_URL = kuperPayRates.sourceUrl;
const KUPER_UPDATED_AT = kuperPayRates.exportedAt;

// === Helpers =========================================================

const getKuperCitizenship = (city: string) =>
  yandexCitizenshipByCity.get(city) ?? KUPER_DEFAULT_CITIZENSHIP;

const toHourlyFromShift = (shiftPer12Hours: number) => {
  const raw = shiftPer12Hours / 12;
  return Number.isInteger(raw) ? raw : Number(raw.toFixed(2));
};

const buildKuperApplyLink = (baseLink: string, city: string, role: KuperRole) => {
  const url = new URL(baseLink);
  const citySlug = slugifyCity(city);

  url.searchParams.set('utm_source', 'kurerok');
  url.searchParams.set('utm_medium', 'vacancy');
  url.searchParams.set('utm_campaign', `kuper-${role}`);
  url.searchParams.set('utm_content', `${citySlug}-${role}`);

  return url.toString();
};

const createKuperOffer = ({
  city,
  shiftPer12Hours,
  cityIndex,
  transport,
  role,
  baseApplyLink,
  priorityBase,
  schedule,
  benefitsOverride,
  transportProvision,
}: {
  city: string;
  shiftPer12Hours: number;
  cityIndex: number;
  transport: TransportMode;
  role: KuperRole;
  baseApplyLink: string;
  priorityBase: number;
  schedule: string;
  benefitsOverride?: string[];
  transportProvision?: VacancyOffer['transportProvision'];
}): VacancyOffer => {
  const citizenship = getKuperCitizenship(city);

  // Kuper accepts foot/bicycle couriers from 16 with parental consent;
  // auto requires 18+ (driving licence). Packers — adults only by Kuper rules.
  const ageFrom = transport === 'auto' || role === 'packer' ? 18 : 16;
  // Foot couriers don't need any vehicle of their own. Override only when
  // caller didn't pass an explicit transportProvision.
  const computedProvision: VacancyOffer['transportProvision'] | undefined =
    transportProvision ?? (transport === 'foot' ? 'not_required' : undefined);
  return {
    city,
    transport,
    pay: buildPay(toHourlyFromShift(shiftPer12Hours)),
    isActive: true,
    updatedAt: KUPER_UPDATED_AT,
    sourceUrl: KUPER_PAY_SOURCE_URL,
    salaryConfidence: 'partner',
    ageFrom,
    citizenship,
    medicalBook: 'required',
    employmentFormats: [...KUPER_EMPLOYMENT_FORMATS],
    schedule,
    applyLink: buildKuperApplyLink(baseApplyLink, city, role),
    priority: priorityBase - cityIndex * 10 + TRANSPORT_PRIORITY[transport],
    requiredDocumentsOverride: getRequiredDocumentOverrides(citizenship),
    ...(benefitsOverride?.length ? { benefitsOverride } : {}),
    ...(computedProvision ? { transportProvision: computedProvision } : {}),
  };
};

// === Content =========================================================

const kuperRequiredDocuments = [
  'Для граждан РФ: паспорт с пропиской и медицинская книжка; оформление через самозанятость.',
];

const kuperCommonBenefits = [
  'Еженедельные выплаты на карту.',
  'Гибкий график: можно выбирать удобные слоты и район.',
  'Скидки и бонусы от сервисов Купера и партнёров.',
  'Брендированная форма по условиям точки.',
  'Бонус за приглашённых друзей (по реферальной программе).',
];

const kuperFootContent: VacancyContent = {
  title: 'Пеший курьер в Купер {cityPrep}',
  shortDescription: 'Курьер Купера: доставляйте заказы рядом с домом пешком или на велосипеде.',
  description:
    'Купер — крупнейший онлайн-сервис покупок. На позиции пешего курьера можно доставлять заказы из магазинов и ресторанов рядом с домом.',
  requirements: [
    'Доставлять заказы клиентам из магазинов и ресторанов в радиусе до 3 км.',
    'Пользоваться приложением для получения маршрута и статуса заказа.',
    'Быть вежливым при передаче заказа клиенту.',
  ],
  benefits: [
    ...kuperCommonBenefits,
    'Можно выполнять доставки пешком, на велосипеде или самокате.',
  ],
  requiredDocuments: [...kuperRequiredDocuments],
  labels: ['Пеший курьер', 'Можно на велосипеде', 'Еженедельные выплаты'],
  searchTags: ['Купер', 'пеший курьер', 'доставка', 'подработка'],
};

const kuperBikeContent: VacancyContent = {
  title: 'Велокурьер в Купер {cityPrep}',
  shortDescription: 'Доставляйте заказы на велосипеде или самокате в удобном районе.',
  description:
    'Купер ищет велокурьеров для быстрой доставки. Работа в удобном районе, со слотами под ваш график.',
  requirements: [
    'Доставлять заказы клиентам на велосипеде или самокате.',
    'Следить за качеством и сохранностью заказа во время доставки.',
    'Использовать приложение Купера для маршрутизации и статусов.',
  ],
  benefits: [
    ...kuperCommonBenefits,
    'Во всех городах доступна аренда электровелосипеда за 0 ₽.',
  ],
  requiredDocuments: [...kuperRequiredDocuments],
  labels: ['Велокурьер', 'Аренда электровелосипеда 0 ₽', 'Еженедельные выплаты'],
  searchTags: ['Купер', 'велокурьер', 'самокат', 'доставка'],
};

const kuperAutoContent: VacancyContent = {
  title: 'Автокурьер в Купер {cityPrep}',
  shortDescription: 'Плановая и быстрая доставка заказов на авто с еженедельными выплатами.',
  description:
    'Вакансия автокурьера в Купере: доставляйте заказы на автомобиле, выбирайте удобный район и получайте выплаты каждую неделю.',
  requirements: [
    'Доставлять собранные заказы клиентам по маршруту из приложения.',
    'Соблюдать тайм-слоты плановой доставки и правила передачи заказа.',
    'Поддерживать связь с поддержкой и клиентом через приложение при необходимости.',
  ],
  benefits: [
    ...kuperCommonBenefits,
    'Для Москвы доступна аренда автомобиля компании.',
  ],
  requiredDocuments: [...kuperRequiredDocuments],
  labels: ['Автокурьер', 'Плановая доставка', 'Еженедельные выплаты'],
  searchTags: ['Купер', 'автокурьер', 'доставка на авто', 'плановая доставка'],
};

const kuperPackerContent: VacancyContent = {
  title: 'Сборщик заказов в Купер {cityPrep}',
  shortDescription: 'Собирайте интернет-заказы в магазинах METRO, «Лента Онлайн» и других партнёров.',
  description:
    'Сборщик заказов в Купере отвечает за точную и аккуратную сборку клиентских заказов для плановой доставки.',
  requirements: [
    'Собирать товары по списку клиента в приложении.',
    'Проверять сроки годности и внешний вид товаров.',
    'Передавать собранные заказы курьеру в рамках тайм-слота.',
  ],
  benefits: [...kuperCommonBenefits],
  requiredDocuments: [...kuperRequiredDocuments],
  labels: ['Сборщик заказов', 'Плановая доставка', 'Еженедельные выплаты'],
  searchTags: ['Купер', 'сборщик заказов', 'магазин', 'плановая доставка'],
};

// === Per-role offers =================================================

const kuperFootAndBikeShiftByCity = Object.entries(kuperPayRates.footAndBikeShiftByCity);
// For auto profile use "Плановая" shifts where they exist, and fallback to "Быстрая".
const kuperAutoShiftByCity = Object.entries(kuperPayRates.autoShiftByCity);
const kuperPackerShiftByCity = Object.entries(kuperPayRates.packerShiftByCity);

const kuperFootOffers = kuperFootAndBikeShiftByCity.map(([city, shift], cityIndex) =>
  createKuperOffer({
    city,
    shiftPer12Hours: shift,
    cityIndex,
    transport: 'foot',
    role: 'foot',
    baseApplyLink: KUPER_FOOT_AND_BIKE_APPLY_LINK,
    priorityBase: 1900,
    schedule: 'Смена до 12 часов, гибкий график от 3 часов в день',
  }),
);

const kuperBikeOffers = kuperFootAndBikeShiftByCity.map(([city, shift], cityIndex) =>
  createKuperOffer({
    city,
    shiftPer12Hours: shift,
    cityIndex,
    transport: 'bicycle',
    role: 'bike',
    baseApplyLink: KUPER_FOOT_AND_BIKE_APPLY_LINK,
    priorityBase: 1950,
    schedule: 'Смена до 12 часов, гибкий график от 3 часов в день',
    benefitsOverride: ['Во всех городах доступна аренда электровелосипеда за 0 ₽.'],
  }),
);

const kuperAutoOffers = kuperAutoShiftByCity.map(([city, shift], cityIndex) =>
  createKuperOffer({
    city,
    shiftPer12Hours: shift,
    cityIndex,
    transport: 'auto',
    role: 'auto',
    baseApplyLink: KUPER_AUTO_APPLY_LINK,
    priorityBase: 2000,
    schedule: 'Смена до 12 часов, гибкий график от 3 часов в день',
    ...(city === 'Москва'
      ? {
          transportProvision: 'company' as const,
          benefitsOverride: ['Для автокурьера в Москве доступна аренда автомобиля компании.'],
        }
      : {}),
  }),
);

const kuperPackerOffers = kuperPackerShiftByCity.map(([city, shift], cityIndex) =>
  createKuperOffer({
    city,
    shiftPer12Hours: shift,
    cityIndex,
    transport: 'foot',
    role: 'packer',
    baseApplyLink: KUPER_PACKER_APPLY_LINK,
    priorityBase: 1850,
    schedule: 'Смена до 12 часов',
  }),
);

// === Sources =========================================================

const kuperDefaults: VacancySource['defaults'] = {
  ageFrom: 18,
  medicalBook: 'required',
  employmentFormats: [...KUPER_EMPLOYMENT_FORMATS],
  schedule: 'Смена до 12 часов, гибкий график от 3 часов в день',
  education: 'Не требуется',
  citizenship: KUPER_DEFAULT_CITIZENSHIP,
  uniform: 'Брендированная форма по условиям точки',
  os: 'Android или iOS',
};

const kuperFootSource: VacancySource = {
  id: 2,
  slug: 'kuper-foot-courier',
  company: { name: KUPER_COMPANY_NAME, logo: KUPER_COMPANY_LOGO },
  content: kuperFootContent,
  defaults: { ...kuperDefaults },
  offers: kuperFootOffers,
  extraTags: ['kuper', 'courier', 'foot', 'source:google-sheet'],
  isHot: true,
};

const kuperBikeSource: VacancySource = {
  id: 3,
  slug: 'kuper-bike-courier',
  company: { name: KUPER_COMPANY_NAME, logo: KUPER_COMPANY_LOGO },
  content: kuperBikeContent,
  defaults: { ...kuperDefaults },
  offers: kuperBikeOffers,
  extraTags: ['kuper', 'courier', 'bike', 'source:google-sheet'],
  isHot: true,
};

const kuperAutoSource: VacancySource = {
  id: 4,
  slug: 'kuper-auto-courier',
  company: { name: KUPER_COMPANY_NAME, logo: KUPER_COMPANY_LOGO },
  content: kuperAutoContent,
  defaults: { ...kuperDefaults },
  offers: kuperAutoOffers,
  extraTags: ['kuper', 'courier', 'auto', 'source:google-sheet'],
  isHot: true,
};

const kuperPackerSource: VacancySource = {
  id: 5,
  slug: 'kuper-order-picker',
  company: { name: KUPER_COMPANY_NAME, logo: KUPER_COMPANY_LOGO },
  content: kuperPackerContent,
  defaults: { ...kuperDefaults, schedule: 'Смена до 12 часов' },
  offers: kuperPackerOffers,
  extraTags: ['kuper', 'picker', 'store', 'source:google-sheet'],
  isHot: true,
};

/** All Купер sources, in the same order they originally appeared in `vacancies.ts`. */
export const kuperSources: VacancySource[] = [
  kuperFootSource,
  kuperBikeSource,
  kuperAutoSource,
  kuperPackerSource,
];

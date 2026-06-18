/**
 * Самокат — courier-partner (scooter / bicycle). We are an OFFICIAL
 * PARTNER of the Самокат delivery service, not Самокат itself, so the
 * copy follows the partner-mandated wording (see the «нельзя → можно»
 * stop-word table): «курьер-партнёр», «доход», «договор о
 * сотрудничестве», «часы доставки / тайм-слоты» — never «зарплата»,
 * «работа», «вакансия», «трудоустройство», «смена», «стажировка».
 *
 * Cities, per-city activity and per-city pay come from two partner
 * Google Sheets (see `samokat-vacancies.json` → `sourceUrl` /
 * `salarySourceUrl`). Closed cities ship as `isActive: false`.
 */
import { z } from 'zod';
import samokatVacanciesSource from '../samokat-vacancies.json';
import { slugifyCity } from '../../utils/cities';
import type {
  EmploymentFormat,
  VacancyContent,
  VacancyOffer,
  VacancySource,
} from '../vacancyTypes';
import { SAMOKAT_LOGO, SAMOKAT_APPLY } from '../partnerLinks';
import { formatRub } from './shared';

// === Constants =======================================================

const SAMOKAT_COMPANY_NAME = 'Самокат';
const SAMOKAT_COMPANY_LOGO = SAMOKAT_LOGO;
const SAMOKAT_APPLY_LINK = SAMOKAT_APPLY;
// Courier-partners cooperate via a service contract (самозанятость / ГПХ),
// not employment — matches «Заключение договора о сотрудничестве».
const SAMOKAT_EMPLOYMENT_FORMATS = ['self_employed', 'gph'] satisfies EmploymentFormat[];

// === Schema ==========================================================

const samokatOfferSchema = z.object({
  city: z.string().min(1),
  transport: z.enum(['bicycle']),
  isActive: z.boolean(),
  // «РФ» or «РФ+СНГ» from the geo sheet → resolved to a display string below.
  citizenship: z.string().min(1),
  hourlyRub: z.number().optional(),
  monthlyMaxRub: z.number().optional(),
});

export const SamokatVacanciesSchema = z.looseObject({
  company: z.string().min(1),
  sourceUrl: z.url(),
  salarySourceUrl: z.url().optional(),
  updatedAt: z.string().min(1),
  offerCount: z.number().int().nonnegative(),
  offers: z.array(samokatOfferSchema),
});

export type SamokatVacanciesData = z.infer<typeof SamokatVacanciesSchema>;
type SamokatOfferSource = z.infer<typeof samokatOfferSchema>;

const samokatVacancies: SamokatVacanciesData =
  SamokatVacanciesSchema.parse(samokatVacanciesSource);

// === Helpers =========================================================

const buildSamokatApplyLink = (city: string) => {
  const url = new URL(SAMOKAT_APPLY_LINK);
  const citySlug = slugifyCity(city);

  url.searchParams.set('utm_source', 'kurerok');
  url.searchParams.set('utm_medium', 'vacancy');
  url.searchParams.set('utm_campaign', 'samokat-courier');
  url.searchParams.set('utm_content', `${citySlug}-bicycle`);

  return url.toString();
};

const buildSamokatPay = (offer: SamokatOfferSource): VacancyOffer['pay'] => {
  const monthly =
    offer.monthlyMaxRub && offer.monthlyMaxRub > 0
      ? { max: Math.round(offer.monthlyMaxRub), text: `до ${formatRub(offer.monthlyMaxRub)} ₽/мес` }
      : undefined;
  const hourly =
    offer.hourlyRub && offer.hourlyRub > 0
      ? {
          min: Math.round(offer.hourlyRub),
          max: Math.round(offer.hourlyRub),
          text: `${formatRub(offer.hourlyRub)} ₽/час`,
        }
      : undefined;

  return {
    currency: 'RUB',
    ...(monthly ? { monthly } : {}),
    ...(hourly ? { hourly } : {}),
    // Closed cities ship without pay numbers — keep a valid PayModel text.
    ...(!monthly && !hourly ? { monthly: { text: 'Доход сдельный: по часам, заказам и весу' } } : {}),
    rate:
      'Доход за количество часов, обслуженных клиентов и вес заказов; надбавки за погодные условия и доплата за доставку в понедельник и воскресенье',
    paymentFrequency: 'Еженедельно',
  };
};

const resolveCitizenship = (raw: string): string =>
  /снг/i.test(raw) ? 'РФ / ЕАЭС / СНГ' : 'РФ';

// === Content =========================================================

const samokatCourierContent: VacancyContent = {
  title: 'Курьер-партнёр Самоката {cityPrep}',
  shortDescription:
    'Доставляйте заказы клиентам сервиса Самокат на самокате или велосипеде: доход по часам, заказам и весу, надбавки за погоду. Часы доставки выбираете сами, договор о сотрудничестве — за час.',
  description:
    'Мы — официальный партнёр онлайн-магазина Самокат (продукты и товары для дома с доставкой от 15 минут). Ищем курьеров-партнёров {cityPrep}. Доход формируется за количество часов и обслуженных клиентов; добавляем за сложные погодные условия и вес заказов, есть доплата за доставку в понедельник и воскресенье и бонус за каждого приведённого друга. Часы доставки (тайм-слоты) выбираете сами. Заключение договора о сотрудничестве — в течение часа, перед стартом — вводный инструктаж по стандартам доставки сервиса Самокат.',
  requirements: [
    'Возраст от 18 лет (до 55 лет).',
    'Гражданство РФ; в ряде городов — также страны ЕАЭС / СНГ.',
    'Смартфон на Android 5.0 и выше.',
    'Свой самокат или велосипед; если своего транспорта нет, уточните доступность аренды у партнёра в выбранном городе.',
    'Готовность доставлять заказы вовремя.',
  ],
  benefits: [
    'Доход по количеству часов, обслуженных клиентов и весу заказов.',
    'Надбавки за сложные погодные условия и вес заказов.',
    'Доплата за доставку в понедельник и воскресенье.',
    'Бонус за каждого приведённого друга.',
    'Часы доставки (тайм-слоты) выбираете сами.',
    'Заключение договора о сотрудничестве в течение часа.',
    'Вводный инструктаж — обучение стандартам доставки сервиса Самокат.',
    'У некоторых партнёров доступен собственный велосипед или аренда транспорта на выбор.',
  ],
  requiredDocuments: ['Паспорт.', 'ИНН.', 'СНИЛС.'],
  labels: ['Гибкие часы доставки', 'Без опыта', 'Партнёр Самоката'],
  searchTags: ['Самокат', 'курьер на самокате', 'велокурьер', 'доставка', 'курьер-партнёр'],
};

// === Offer construction ==============================================

const samokatCourierOffers = samokatVacancies.offers.map((offer, offerIndex) => ({
  city: offer.city,
  transport: offer.transport,
  pay: buildSamokatPay(offer),
  isActive: offer.isActive,
  updatedAt: samokatVacancies.updatedAt,
  sourceUrl: samokatVacancies.sourceUrl,
  salaryConfidence: 'partner' as const,
  ageFrom: 18,
  citizenship: resolveCitizenship(offer.citizenship),
  medicalBook: 'not_required' as const,
  employmentFormats: [...SAMOKAT_EMPLOYMENT_FORMATS],
  schedule: 'Свободные часы доставки (тайм-слоты)',
  applyLink: buildSamokatApplyLink(offer.city),
  priority: 1400 - offerIndex,
  transportProvision: 'own_or_partner_rental',
})) satisfies VacancyOffer[];

// === Source ==========================================================

export const samokatSource: VacancySource = {
  id: 20,
  slug: 'samokat-courier',
  company: { name: SAMOKAT_COMPANY_NAME, logo: SAMOKAT_COMPANY_LOGO },
  content: samokatCourierContent,
  defaults: {
    ageFrom: 18,
    medicalBook: 'not_required',
    employmentFormats: [...SAMOKAT_EMPLOYMENT_FORMATS],
    schedule: 'Свободные часы доставки (тайм-слоты)',
    education: 'Не требуется',
    citizenship: 'РФ / ЕАЭС / СНГ',
    uniform: 'Выдаётся',
    os: 'Android 5.0 и выше',
  },
  offers: samokatCourierOffers,
  extraTags: ['samokat', 'food_delivery', 'scooter', 'flexible', 'source:google-sheet'],
  isHot: true,
};

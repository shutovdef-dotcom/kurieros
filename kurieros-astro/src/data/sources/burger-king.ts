/**
 * Бургер Кинг — Повар-кассир.
 *
 * CPA offer via pampadu (oid=2085). Cook-cashier role for ~135 active
 * cities (and ~60 inactive/standby cities, preserved for catalog
 * completeness per partner request). Salary inherits Сочи rate for
 * Адлер/Лазаревское; Москва micro-districts (Бутово, Внуковское,
 * Мосрентген) folded into Москва via cityDistricts. Skipped airport
 * pseudo-cities. Tiny settlements not in CITY_DATASET render with
 * population=0 fallback.
 *
 * Note: this partner's `offer.isActive` flag IS read (unlike most
 * other partners on this site which are uniformly always-active) —
 * it preserves the inactive-city carry-over from the partner sheet.
 */
import { z } from 'zod';
import burgerKingVacanciesSource from '../burger-king-vacancies.json';
import { slugifyCity } from '../../utils/cities';
import type {
  EmploymentFormat,
  VacancyContent,
  VacancyOffer,
  VacancySource,
} from '../vacancyTypes';
import { BURGER_KING_LOGO, BURGER_KING_APPLY } from '../partnerLinks';
import { formatRub } from './shared';

// === Constants =======================================================

const BURGER_KING_COMPANY_NAME = 'Бургер Кинг';
const BURGER_KING_COMPANY_LOGO = BURGER_KING_LOGO;
const BURGER_KING_APPLY_LINK = BURGER_KING_APPLY;
const BURGER_KING_CITIZENSHIP = 'РФ / ЕАЭС';
const BURGER_KING_EMPLOYMENT_FORMATS = ['official'] satisfies EmploymentFormat[];

// === Schema ==========================================================

/**
 * Per-city offer rows. `monthlyMin` / `monthlyMax` may legitimately be
 * zero (the salary scraper writes 0 when no figure is published for a
 * standby city); `buildBurgerKingPay` falls back to "от 40 000 ₽/мес"
 * in that case. Must be finite — NaN/Infinity would silently break the
 * downstream `Math.round` and corrupt thousands of pages.
 *
 * `cityDistricts` is currently populated only for Москва (folding the
 * Бутово / Внуковское / Мосрентген micro-districts back into Москва).
 */
const burgerKingOfferSchema = z.object({
  city: z.string().min(1),
  // Zod v4 `z.number()` already rejects NaN/Infinity — `.finite()` dropped.
  monthlyMin: z.number(),
  monthlyMax: z.number(),
  isActive: z.boolean(),
  hiringNeed: z.number().nonnegative(),
  cityDistricts: z.array(z.string()).optional(),
});

export const BurgerKingVacanciesSchema = z.object({
  sourceUrl: z.url(),
  // `salarySourceUrl` is a free-form annotated string in the JSON
  // (e.g. "https://…/edit (tab «ЗП повара-кассиры»)") — validate as
  // non-empty rather than URL to match production reality.
  salarySourceUrl: z.string().min(1),
  citiesSourceUrl: z.url(),
  updatedAt: z.string().min(1),
  notes: z.string(),
  offers: z.array(burgerKingOfferSchema),
});

export type BurgerKingVacanciesData = z.infer<typeof BurgerKingVacanciesSchema>;
type BurgerKingOfferSource = z.infer<typeof burgerKingOfferSchema>;

const burgerKingVacancies: BurgerKingVacanciesData =
  BurgerKingVacanciesSchema.parse(burgerKingVacanciesSource);

// === Helpers =========================================================

const buildBurgerKingApplyLink = (city: string) => {
  const url = new URL(BURGER_KING_APPLY_LINK);
  const citySlug = slugifyCity(city);

  // pampadu reference link already carries `erid` and partner tracking;
  // append UTM only — never overwrite existing query params.
  url.searchParams.set('utm_source', 'kurerok');
  url.searchParams.set('utm_medium', 'vacancy');
  url.searchParams.set('utm_campaign', 'burger-king-cook-cashier');
  url.searchParams.set('utm_content', `${citySlug}-foot`);

  return url.toString();
};

const buildBurgerKingPay = (monthlyMin: number, monthlyMax: number): VacancyOffer['pay'] => {
  const normMin = Number.isFinite(monthlyMin) && monthlyMin > 0 ? Math.round(monthlyMin) : 0;
  const normMax = Number.isFinite(monthlyMax) && monthlyMax > 0 ? Math.round(monthlyMax) : 0;

  // Display text: prefer "X – Y ₽/мес" range; fall back to "до Y" or "от X".
  const monthlyText = normMax > 0
    ? (normMin > 0 ? `${formatRub(normMin)}–${formatRub(normMax)} ₽/мес` : `до ${formatRub(normMax)} ₽/мес`)
    : (normMin > 0 ? `от ${formatRub(normMin)} ₽/мес` : 'от 40 000 ₽/мес');

  return {
    currency: 'RUB',
    monthly: {
      ...(normMin > 0 ? { min: normMin } : {}),
      ...(normMax > 0 ? { max: normMax } : {}),
      text: monthlyText,
    },
    rate: 'Оклад + ежемесячные бонусы; питание и униформа за счёт компании',
    // Burger King hires via "Оформление по ТК РФ" — Russian labour code
    // requires payouts at least twice per month.
    paymentFrequency: '2 раза в месяц (по ТК РФ)',
  };
};

// === Content =========================================================

const burgerKingCookCashierContent: VacancyContent = {
  title: 'Повар-кассир в Бургер Кинг {cityPrep}',
  shortDescription:
    'Работа в ресторане Бургер Кинг: приготовление блюд, касса, выдача заказов. Гибкий график, оплата 2 раза в месяц.',
  description:
    'Бургер Кинг — один из крупнейших работодателей России в сфере фастфуда. Работа в ресторане {cityPrep}: приготовление блюд по корпоративным стандартам, работа на кассе и расчёт гостей, сбор и выдача заказов, поддержание чистоты в зале и на рабочем месте. Опыт не требуется — обучение оплачивается с первого дня. Подходит студентам и совмещающим: гибкий график, можно подработка или полная смена. Питание и униформа — бесплатно, медкнижку оформляем за счёт компании. Понятная зарплата 2 раза в месяц + ежемесячные бонусы.',
  requirements: [
    'Возраст 18+.',
    'Опыт работы не требуется — научим всему на месте.',
    'Свободное владение русским языком.',
    'Готовность работать в команде и общаться с гостями.',
  ],
  benefits: [
    'Оформление по ТК РФ с начислением стажа, оплачиваемыми больничными и отпусками.',
    'Зарплата 2 раза в месяц + бонусы каждый месяц.',
    'Оплачиваемое обучение с первого дня.',
    'Гибкий график: подработка или полные смены, можно совмещать с учёбой.',
    'Бесплатное питание во время смены.',
    'Униформа выдаётся бесплатно.',
    'Медкнижка оформляется за счёт компании.',
    'Возможность выбрать удобный ресторан рядом с домом.',
    'Карьерный рост: от повара-кассира до управляющего рестораном.',
    'Бонус «приведи друга»: 10 000 ₽ за каждого друга, отработавшего 50+ часов.',
  ],
  requiredDocuments: [
    'Паспорт.',
    'СНИЛС.',
    'ИНН.',
    'Медкнижка (можно оформить за счёт компании).',
  ],
  searchTags: ['Бургер Кинг', 'Burger King', 'повар', 'кассир', 'фастфуд', 'ресторан', 'без опыта', 'официальное трудоустройство'],
};

// === Offer construction ==============================================

const burgerKingCookCashierOffers = burgerKingVacancies.offers.map((offer) => ({
  city: offer.city,
  transport: 'foot',
  pay: buildBurgerKingPay(offer.monthlyMin, offer.monthlyMax),
  isActive: offer.isActive,
  updatedAt: burgerKingVacancies.updatedAt,
  sourceUrl: burgerKingVacancies.citiesSourceUrl,
  salaryConfidence: 'partner',
  ageFrom: 18,
  citizenship: BURGER_KING_CITIZENSHIP,
  medicalBook: 'compensated',
  employmentFormats: [...BURGER_KING_EMPLOYMENT_FORMATS],
  applyLink: buildBurgerKingApplyLink(offer.city),
  // Higher hiringNeed → higher priority; max city demand (Москва=45) gets
  // priority 1045, idle cities (hiringNeed=0) get 1000 baseline.
  priority: 1000 + offer.hiringNeed,
  ...(offer.cityDistricts && offer.cityDistricts.length > 0 ? { cityDistricts: [...offer.cityDistricts] } : {}),
})) satisfies VacancyOffer[];

// === Source ==========================================================

export const burgerKingSource: VacancySource = {
  id: 19,
  slug: 'burger-king-cook-cashier',
  company: { name: BURGER_KING_COMPANY_NAME, logo: BURGER_KING_COMPANY_LOGO },
  content: burgerKingCookCashierContent,
  defaults: {
    ageFrom: 18,
    medicalBook: 'compensated',
    employmentFormats: [...BURGER_KING_EMPLOYMENT_FORMATS],
    schedule: 'Гибкий график: подработка или полная смена',
    education: 'Не требуется',
    citizenship: BURGER_KING_CITIZENSHIP,
    uniform: 'Выдаётся бесплатно',
    os: 'Не требуется',
  },
  offers: burgerKingCookCashierOffers,
  extraTags: [
    'burger-king',
    'restaurant',
    'cook-cashier',
    'no-experience',
    'official-employment',
    'medical-book-covered',
    'source:google-sheet',
  ],
  isHot: false,
};

import descriptionTranslationsSource from './vacancy-description-translations.json';
import kuperPayRatesSource from './kuper-pay-rates.json';
import tBankVacanciesSource from './tbank-vacancies.json';
import efinVacanciesSource from './efin-vacancies.json';
import alfaBankVacanciesSource from './alfa-bank-vacancies.json';
import { ozonVacancySources } from './ozonOffers';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from './translations';
import { slugifyCity } from '../utils/cities';
import type {
  EmploymentFormat,
  VacancyContent,
  LocalizedVacancyContent,
  TransportMode,
  VacancyOffer,
  VacancySource,
} from './vacancyTypes';

const YANDEX_EDA_APPLY_LINK = 'https://my2go.ru/mitpJ?erid=2VtzqwSDctu';
const YANDEX_EDA_PAY_SOURCE_URL =
  'https://docs.google.com/spreadsheets/d/17gBp0k07GCPS3Ugf7JACHogCoYpZtYZRsQnnEhIedwY/edit?gid=1115757494#gid=1115757494';
const UPDATED_AT = '2026-04-17';

const KUPER_COMPANY_NAME = 'Купер (ex. СберМаркет)';
const KUPER_COMPANY_LOGO =
  'https://agents.pampadu.ru/api/file/ViewFile?type=1&name=c0a42c37-73f4-4de0-a4f9-fd0689380a79.png';
const KUPER_FOOT_AND_BIKE_APPLY_LINK =
  'https://trk.ppdu.ru/click/qHQDwLuc?erid=2SDnjeL6Zwp&landingId=2739';
const KUPER_PACKER_APPLY_LINK =
  'https://trk.ppdu.ru/click/qHQDwLuc?erid=2SDnjeL6Zwp&landingId=2740';
const KUPER_AUTO_APPLY_LINK =
  'https://trk.ppdu.ru/click/qHQDwLuc?erid=2SDnjeL6Zwp&landingId=2741';
const KUPER_DEFAULT_CITIZENSHIP = 'РФ / ЕАЭС / СНГ';
const T_BANK_COMPANY_NAME = 'Т-Банк';
const T_BANK_COMPANY_LOGO =
  'https://agents.pampadu.ru/api/file/ViewFile?type=1&name=23a3b3dd-48a4-4edf-a2a6-c5d681389c1a.png';
const T_BANK_APPLY_LINK = 'https://trk.ppdu.ru/click/X76Tf6si?erid=2SDnjcbs16H';
const T_BANK_CITIZENSHIP = 'РФ / ЕАЭС';
const T_BANK_EMPLOYMENT_FORMATS = ['gph', 'self_employed'] satisfies EmploymentFormat[];
const EFIN_COMPANY_NAME = 'Efin';
const EFIN_COMPANY_LOGO =
  'https://agents.pampadu.ru/api/file/ViewFile?type=1&name=314d3acb-aba3-488c-9ddb-9c41dece71ca.png';
const EFIN_APPLY_LINK = 'https://trk.ppdu.ru/click/VuqTAiCx?erid=2SDnjdmxiVK';
const EFIN_CITIZENSHIP = 'РФ';
const EFIN_EMPLOYMENT_FORMATS = ['self_employed'] satisfies EmploymentFormat[];
// === Ozon ============================================================
// Ozon vacancies live in ./ozonOffers.ts — they're generated from the
// live recruitment.ozon.ru/ref-courier-sklad form via
// tools/fetch-ozon-vacancies.mjs. The CTA uses the magic
// `applyLink: 'lead-form:ozon'` prefix consumed by JobCard.astro /
// pages/v/[slug].astro, which swap the external `<a>` for a button
// that opens OzonLeadModal.astro. The modal POSTs to the Cloudflare
// Worker (workers/ozon-lead/), which holds the referrer phone +
// Telegram bot token as server-side secrets.

const ALFA_BANK_COMPANY_NAME = 'Альфа-Банк';
const ALFA_BANK_COMPANY_LOGO = '/logos/alfa-bank.svg';
const ALFA_BANK_APPLY_LINK =
  'https://pxl.leads.su/click/00012fe3aecb294c077b1c68b4594cb0?erid=2W5zFJdQNW4';
const ALFA_BANK_CITIZENSHIP = 'РФ / Беларусь / Казахстан';
const ALFA_BANK_EMPLOYMENT_FORMATS = ['official'] satisfies EmploymentFormat[];

type KuperPayRates = {
  sourceUrl: string;
  exportedAt: string;
  footAndBikeShiftByCity: Record<string, number>;
  autoShiftByCity: Record<string, number>;
  packerShiftByCity: Record<string, number>;
};

type TBankOfferSource = {
  city: string;
  workMode?: string | null;
  avgIncomeRub?: number | null;
  incomeMinRub?: number | null;
  incomeMaxRub?: number | null;
  hiringActive?: boolean;
};

type TBankVacancyData = {
  title: string;
  titleTemplate: string;
  shortDescription: string;
  description: string;
  requirements: string[];
  benefits: string[];
  requiredDocuments: string[];
  offers: TBankOfferSource[];
};

type TBankVacanciesData = {
  sourceUrl: string;
  updatedAt: string;
  operatorB2B: TBankVacancyData;
  representative: TBankVacancyData;
};

type EfinOfferSource = {
  city: string;
  transport: 'foot' | 'auto';
  monthlyFromRub: number;
  meetingFeeRub: number;
  schedule?: string;
  workTime?: string;
  statusUpdatedAt?: string;
  region?: string;
  area?: string;
};

type EfinVacanciesData = {
  sourceUrl: string;
  updatedAt: string;
  offers: EfinOfferSource[];
};

type AlfaBankOfferSource = {
  city: string;
  transport: TransportMode;
  monthlyFromRub: number;
  sourceSheets?: string[];
  hasZeroDemandRows?: boolean;
  maxDemand?: number;
  schedule?: string;
  requirement?: string;
  extraInfo?: string;
  updatedAt?: string;
};

type AlfaBankVacanciesData = {
  sourceUrl: string;
  descriptionSourceUrl: string;
  updatedAt: string;
  salaryMonthlyFromRub: number;
  cityCount: number;
  offerCount: number;
  transportRule: string;
  offers: AlfaBankOfferSource[];
};

const TRANSPORT_MODES = ['foot', 'bicycle', 'auto'] satisfies TransportMode[];
const TRANSPORT_PRIORITY: Record<TransportMode, number> = {
  foot: 1,
  bicycle: 2,
  auto: 3,
};

// Temporary fast-mode for local iteration:
// keep ~2% of offers active to speed up builds while UI/content is in flux.
const LIGHT_MODE_ENABLED = false;
const LIGHT_MODE_KEEP_PERCENT = 2;
const LIGHT_MODE_STRIDE = Math.max(1, Math.round(100 / LIGHT_MODE_KEEP_PERCENT));

const YANDEX_EDA_EMPLOYMENT_FORMATS = ['gph', 'self_employed'] satisfies EmploymentFormat[];

const buildYandexEdaApplyLink = (city: string, transport: TransportMode) => {
  const url = new URL(YANDEX_EDA_APPLY_LINK);
  const citySlug = slugifyCity(city);

  // Preserve partner URL and attach vacancy-specific markers for per-offer routing/analytics.
  url.searchParams.set('utm_source', 'kurerok');
  url.searchParams.set('utm_medium', 'vacancy');
  url.searchParams.set('utm_campaign', 'yandex-eda-courier');
  url.searchParams.set('utm_content', `${citySlug}-${transport}`);

  return url.toString();
};

type DescriptionTranslation = {
  shortDescription: string;
  description: string;
};

type YandexEdaCityRate = {
  city: string;
  citizenship: string;
  rates: Record<TransportMode, number>;
};

const descriptionTranslations = descriptionTranslationsSource as Record<SupportedLanguage, DescriptionTranslation>;
const kuperPayRates = kuperPayRatesSource as KuperPayRates;
const tBankVacancies = tBankVacanciesSource as TBankVacanciesData;
const efinVacancies = efinVacanciesSource as EfinVacanciesData;
const alfaBankVacancies = alfaBankVacanciesSource as AlfaBankVacanciesData;

const yandexEdaCityRates: YandexEdaCityRate[] = [
  { city: 'Адлер', citizenship: 'РФ / ЕАЭС', rates: { foot: 445, bicycle: 440, auto: 672 } },
  { city: 'Альметьевск', citizenship: 'РФ / ЕАЭС', rates: { foot: 270, bicycle: 314, auto: 357 } },
  { city: 'Анапа', citizenship: 'РФ / ЕАЭС', rates: { foot: 180, bicycle: 406, auto: 392 } },
  { city: 'Апрелевка', citizenship: 'РФ / ЕАЭС', rates: { foot: 357, bicycle: 504, auto: 494 } },
  { city: 'Архангельск', citizenship: 'РФ / ЕАЭС', rates: { foot: 168, bicycle: 273, auto: 477 } },
  { city: 'Астрахань', citizenship: 'РФ / ЕАЭС', rates: { foot: 257, bicycle: 409, auto: 577 } },
  { city: 'Балаково', citizenship: 'РФ / ЕАЭС', rates: { foot: 253, bicycle: 273, auto: 319 } },
  { city: 'Балашиха', citizenship: 'РФ / ЕАЭС / СНГ', rates: { foot: 380, bicycle: 519, auto: 675 } },
  { city: 'Барнаул', citizenship: 'РФ / ЕАЭС', rates: { foot: 176, bicycle: 372, auto: 599 } },
  { city: 'Батайск', citizenship: 'РФ / ЕАЭС', rates: { foot: 253, bicycle: 286, auto: 484 } },
  { city: 'Белгород', citizenship: 'РФ / ЕАЭС', rates: { foot: 254, bicycle: 404, auto: 502 } },
  { city: 'Бердск', citizenship: 'РФ / ЕАЭС', rates: { foot: 253, bicycle: 393, auto: 346 } },
  { city: 'Брянск', citizenship: 'РФ / ЕАЭС', rates: { foot: 270, bicycle: 431, auto: 516 } },
  { city: 'Великий Новгород', citizenship: 'РФ / ЕАЭС', rates: { foot: 253, bicycle: 370, auto: 562 } },
  { city: 'Видное', citizenship: 'РФ / ЕАЭС / СНГ', rates: { foot: 269, bicycle: 358, auto: 547 } },
  { city: 'Владивосток', citizenship: 'РФ / ЕАЭС', rates: { foot: 402, bicycle: 695, auto: 843 } },
  { city: 'Владикавказ', citizenship: 'РФ / ЕАЭС', rates: { foot: 285, bicycle: 350, auto: 435 } },
  { city: 'Владимир', citizenship: 'РФ / ЕАЭС', rates: { foot: 180, bicycle: 398, auto: 597 } },
  { city: 'Волгоград', citizenship: 'РФ / ЕАЭС', rates: { foot: 221, bicycle: 398, auto: 482 } },
  { city: 'Волжский', citizenship: 'РФ / ЕАЭС', rates: { foot: 192, bicycle: 394, auto: 431 } },
  { city: 'Вологда', citizenship: 'РФ / ЕАЭС', rates: { foot: 145, bicycle: 325, auto: 503 } },
  { city: 'Воронеж', citizenship: 'РФ / ЕАЭС', rates: { foot: 522, bicycle: 549, auto: 592 } },
  { city: 'Выборг', citizenship: 'РФ / ЕАЭС', rates: { foot: 320, bicycle: 379, auto: 511 } },
  { city: 'Дзержинск', citizenship: 'РФ / ЕАЭС', rates: { foot: 320, bicycle: 351, auto: 538 } },
  { city: 'Дмитров', citizenship: 'РФ / ЕАЭС', rates: { foot: 320, bicycle: 459, auto: 623 } },
  { city: 'Долгопрудный', citizenship: 'РФ / ЕАЭС / СНГ', rates: { foot: 346, bicycle: 486, auto: 579 } },
  { city: 'Домодедово', citizenship: 'РФ / ЕАЭС / СНГ', rates: { foot: 454, bicycle: 472, auto: 563 } },
  { city: 'Дубна', citizenship: 'РФ / ЕАЭС', rates: { foot: 269, bicycle: 468, auto: 401 } },
  { city: 'Егорьевск', citizenship: 'РФ / ЕАЭС', rates: { foot: 179, bicycle: 399, auto: 440 } },
  { city: 'Екатеринбург', citizenship: 'РФ / ЕАЭС', rates: { foot: 251, bicycle: 446, auto: 588 } },
  { city: 'Железнодорожный', citizenship: 'РФ / ЕАЭС / СНГ', rates: { foot: 316, bicycle: 422, auto: 407 } },
  { city: 'Жуковский', citizenship: 'РФ / ЕАЭС / СНГ', rates: { foot: 320, bicycle: 333, auto: 647 } },
  { city: 'Зеленоград', citizenship: 'РФ / ЕАЭС / СНГ', rates: { foot: 403, bicycle: 528, auto: 564 } },
  { city: 'Иваново', citizenship: 'РФ / ЕАЭС', rates: { foot: 219, bicycle: 328, auto: 588 } },
  { city: 'Ивантеевка', citizenship: 'РФ / ЕАЭС / СНГ', rates: { foot: 389, bicycle: 347, auto: 480 } },
  { city: 'Ижевск', citizenship: 'РФ / ЕАЭС', rates: { foot: 270, bicycle: 586, auto: 625 } },
  { city: 'Иркутск', citizenship: 'РФ / ЕАЭС', rates: { foot: 292, bicycle: 459, auto: 501 } },
  { city: 'Йошкар-Ола', citizenship: 'РФ / ЕАЭС', rates: { foot: 339, bicycle: 445, auto: 439 } },
  { city: 'Казань', citizenship: 'РФ / ЕАЭС', rates: { foot: 379, bicycle: 464, auto: 588 } },
  { city: 'Калининград', citizenship: 'РФ / ЕАЭС', rates: { foot: 306, bicycle: 485, auto: 694 } },
  { city: 'Калуга', citizenship: 'РФ / ЕАЭС', rates: { foot: 347, bicycle: 495, auto: 583 } },
  { city: 'Кемерово', citizenship: 'РФ / ЕАЭС', rates: { foot: 137, bicycle: 284, auto: 390 } },
  { city: 'Киров', citizenship: 'РФ / ЕАЭС', rates: { foot: 228, bicycle: 455, auto: 688 } },
  { city: 'Клин', citizenship: 'РФ / ЕАЭС', rates: { foot: 320, bicycle: 409, auto: 487 } },
  { city: 'Коломна', citizenship: 'РФ / ЕАЭС', rates: { foot: 262, bicycle: 394, auto: 514 } },
  { city: 'Колпино', citizenship: 'РФ / ЕАЭС', rates: { foot: 160, bicycle: 336, auto: 506 } },
  { city: 'Королёв', citizenship: 'РФ / ЕАЭС / СНГ', rates: { foot: 391, bicycle: 489, auto: 435 } },
  { city: 'Кострома', citizenship: 'РФ / ЕАЭС', rates: { foot: 176, bicycle: 267, auto: 490 } },
  { city: 'Красногорск', citizenship: 'РФ / ЕАЭС / СНГ', rates: { foot: 521, bicycle: 533, auto: 473 } },
  { city: 'Краснодар', citizenship: 'РФ / ЕАЭС', rates: { foot: 477, bicycle: 549, auto: 448 } },
  { city: 'Красноярск', citizenship: 'РФ / ЕАЭС', rates: { foot: 277, bicycle: 475, auto: 589 } },
  { city: 'Курган', citizenship: 'РФ / ЕАЭС', rates: { foot: 252, bicycle: 178, auto: 404 } },
  { city: 'Курск', citizenship: 'РФ / ЕАЭС', rates: { foot: 310, bicycle: 395, auto: 581 } },
  { city: 'Липецк', citizenship: 'РФ / ЕАЭС', rates: { foot: 242, bicycle: 390, auto: 576 } },
  { city: 'Лобня', citizenship: 'РФ / ЕАЭС / СНГ', rates: { foot: 320, bicycle: 359, auto: 576 } },
  { city: 'Лыткарино', citizenship: 'РФ / ЕАЭС', rates: { foot: 320, bicycle: 466, auto: 511 } },
  { city: 'Люберцы', citizenship: 'РФ / ЕАЭС / СНГ', rates: { foot: 402, bicycle: 503, auto: 954 } },
  { city: 'Магнитогорск', citizenship: 'РФ / ЕАЭС', rates: { foot: 195, bicycle: 331, auto: 411 } },
  { city: 'Майкоп', citizenship: 'РФ / ЕАЭС', rates: { foot: 197, bicycle: 311, auto: 452 } },
  { city: 'Москва', citizenship: 'РФ / ЕАЭС / СНГ', rates: { foot: 297, bicycle: 517, auto: 830 } },
  { city: 'Мурманск', citizenship: 'РФ / ЕАЭС', rates: { foot: 381, bicycle: 418, auto: 573 } },
  { city: 'Мытищи', citizenship: 'РФ / ЕАЭС / СНГ', rates: { foot: 439, bicycle: 512, auto: 698 } },
  { city: 'Набережные Челны', citizenship: 'РФ / ЕАЭС', rates: { foot: 270, bicycle: 352, auto: 526 } },
  { city: 'Нальчик', citizenship: 'РФ / ЕАЭС', rates: { foot: 268, bicycle: 468, auto: 510 } },
  { city: 'Наро-Фоминск', citizenship: 'РФ / ЕАЭС / СНГ', rates: { foot: 295, bicycle: 415, auto: 559 } },
  { city: 'Нефтекамск', citizenship: 'РФ / ЕАЭС', rates: { foot: 145, bicycle: 128, auto: 404 } },
  { city: 'Нижневартовск', citizenship: 'РФ / ЕАЭС', rates: { foot: 266, bicycle: 331, auto: 401 } },
  { city: 'Нижнекамск', citizenship: 'РФ / ЕАЭС', rates: { foot: 252, bicycle: 342, auto: 495 } },
  { city: 'Нижний Новгород', citizenship: 'РФ / ЕАЭС', rates: { foot: 257, bicycle: 449, auto: 677 } },
  { city: 'Нижний Тагил', citizenship: 'РФ / ЕАЭС', rates: { foot: 252, bicycle: 222, auto: 404 } },
  { city: 'Новокузнецк', citizenship: 'РФ / ЕАЭС', rates: { foot: 183, bicycle: 332, auto: 505 } },
  { city: 'Новомосковск', citizenship: 'РФ / ЕАЭС', rates: { foot: 252, bicycle: 398, auto: 527 } },
  { city: 'Новороссийск', citizenship: 'РФ / ЕАЭС', rates: { foot: 490, bicycle: 536, auto: 487 } },
  { city: 'Новосибирск', citizenship: 'РФ / ЕАЭС', rates: { foot: 310, bicycle: 488, auto: 570 } },
  { city: 'Новый Уренгой', citizenship: 'РФ / ЕАЭС', rates: { foot: 473, bicycle: 589, auto: 562 } },
  { city: 'Ногинск', citizenship: 'РФ / ЕАЭС', rates: { foot: 193, bicycle: 512, auto: 494 } },
  { city: 'Обнинск', citizenship: 'РФ / ЕАЭС', rates: { foot: 171, bicycle: 588, auto: 603 } },
  { city: 'Одинцово', citizenship: 'РФ / ЕАЭС / СНГ', rates: { foot: 411, bicycle: 556, auto: 832 } },
  { city: 'Омск', citizenship: 'РФ / ЕАЭС', rates: { foot: 252, bicycle: 402, auto: 518 } },
  { city: 'Орел', citizenship: 'РФ / ЕАЭС', rates: { foot: 301, bicycle: 322, auto: 431 } },
  { city: 'Оренбург', citizenship: 'РФ / ЕАЭС', rates: { foot: 193, bicycle: 396, auto: 459 } },
  { city: 'Орехово-Зуево', citizenship: 'РФ / ЕАЭС', rates: { foot: 320, bicycle: 499, auto: 494 } },
  { city: 'Павловский Посад', citizenship: 'РФ / ЕАЭС', rates: { foot: 320, bicycle: 476, auto: 484 } },
  { city: 'Пенза', citizenship: 'РФ / ЕАЭС', rates: { foot: 154, bicycle: 290, auto: 418 } },
  { city: 'Пермь', citizenship: 'РФ / ЕАЭС', rates: { foot: 285, bicycle: 459, auto: 536 } },
  { city: 'Петрозаводск', citizenship: 'РФ / ЕАЭС', rates: { foot: 173, bicycle: 371, auto: 581 } },
  { city: 'Подольск', citizenship: 'РФ / ЕАЭС / СНГ', rates: { foot: 418, bicycle: 476, auto: 618 } },
  { city: 'Псков', citizenship: 'РФ / ЕАЭС', rates: { foot: 281, bicycle: 548, auto: 409 } },
  { city: 'Пушкин', citizenship: 'РФ / ЕАЭС', rates: { foot: 320, bicycle: 383, auto: 511 } },
  { city: 'Пушкино', citizenship: 'РФ / ЕАЭС / СНГ', rates: { foot: 349, bicycle: 446, auto: 625 } },
  { city: 'Пятигорск', citizenship: 'РФ / ЕАЭС', rates: { foot: 344, bicycle: 465, auto: 655 } },
  { city: 'Раменское', citizenship: 'РФ / ЕАЭС / СНГ', rates: { foot: 398, bicycle: 402, auto: 530 } },
  { city: 'Реутов', citizenship: 'РФ / ЕАЭС / СНГ', rates: { foot: 479, bicycle: 400, auto: 371 } },
  { city: 'Ростов-на-Дону', citizenship: 'РФ / ЕАЭС', rates: { foot: 470, bicycle: 534, auto: 602 } },
  { city: 'Рязань', citizenship: 'РФ / ЕАЭС', rates: { foot: 304, bicycle: 489, auto: 631 } },
  { city: 'Самара', citizenship: 'РФ / ЕАЭС', rates: { foot: 365, bicycle: 514, auto: 579 } },
  { city: 'Санкт-Петербург', citizenship: 'РФ / ЕАЭС', rates: { foot: 288, bicycle: 548, auto: 672 } },
  { city: 'Саранск', citizenship: 'РФ / ЕАЭС', rates: { foot: 160, bicycle: 329, auto: 462 } },
  { city: 'Саратов', citizenship: 'РФ / ЕАЭС', rates: { foot: 293, bicycle: 396, auto: 539 } },
  { city: 'Сергиев Посад', citizenship: 'РФ / ЕАЭС / СНГ', rates: { foot: 352, bicycle: 474, auto: 547 } },
  { city: 'Серпухов', citizenship: 'РФ / ЕАЭС / СНГ', rates: { foot: 171, bicycle: 413, auto: 578 } },
  { city: 'Смоленск', citizenship: 'РФ / ЕАЭС', rates: { foot: 520, bicycle: 584, auto: 638 } },
  { city: 'Солнечногорск', citizenship: 'РФ / ЕАЭС / СНГ', rates: { foot: 320, bicycle: 476, auto: 480 } },
  { city: 'Сочи', citizenship: 'РФ / ЕАЭС', rates: { foot: 683, bicycle: 642, auto: 655 } },
  { city: 'Ставрополь', citizenship: 'РФ / ЕАЭС', rates: { foot: 215, bicycle: 380, auto: 561 } },
  { city: 'Старый Оскол', citizenship: 'РФ / ЕАЭС', rates: { foot: 190, bicycle: 406, auto: 488 } },
  { city: 'Стерлитамак', citizenship: 'РФ / ЕАЭС', rates: { foot: 150, bicycle: 315, auto: 437 } },
  { city: 'Ступино', citizenship: 'РФ / ЕАЭС / СНГ', rates: { foot: 255, bicycle: 304, auto: 439 } },
  { city: 'Сургут', citizenship: 'РФ / ЕАЭС', rates: { foot: 259, bicycle: 372, auto: 548 } },
  { city: 'Сыктывкар', citizenship: 'РФ / ЕАЭС', rates: { foot: 216, bicycle: 300, auto: 394 } },
  { city: 'Таганрог', citizenship: 'РФ / ЕАЭС', rates: { foot: 269, bicycle: 459, auto: 460 } },
  { city: 'Тамбов', citizenship: 'РФ / ЕАЭС', rates: { foot: 352, bicycle: 425, auto: 537 } },
  { city: 'Тверь', citizenship: 'РФ / ЕАЭС', rates: { foot: 213, bicycle: 397, auto: 608 } },
  { city: 'Тольятти', citizenship: 'РФ / ЕАЭС', rates: { foot: 312, bicycle: 422, auto: 506 } },
  { city: 'Томск', citizenship: 'РФ / ЕАЭС', rates: { foot: 195, bicycle: 337, auto: 581 } },
  { city: 'Троицк', citizenship: 'РФ / ЕАЭС / СНГ', rates: { foot: 276, bicycle: 304, auto: 511 } },
  { city: 'Тула', citizenship: 'РФ / ЕАЭС', rates: { foot: 386, bicycle: 542, auto: 497 } },
  { city: 'Тюмень', citizenship: 'РФ / ЕАЭС', rates: { foot: 306, bicycle: 359, auto: 527 } },
  { city: 'Ульяновск', citizenship: 'РФ / ЕАЭС', rates: { foot: 212, bicycle: 395, auto: 466 } },
  { city: 'Уфа', citizenship: 'РФ / ЕАЭС', rates: { foot: 305, bicycle: 441, auto: 527 } },
  { city: 'Фрязино', citizenship: 'РФ / ЕАЭС', rates: { foot: 320, bicycle: 414, auto: 437 } },
  { city: 'Хабаровск', citizenship: 'РФ / ЕАЭС', rates: { foot: 540, bicycle: 721, auto: 645 } },
  { city: 'Ханты-Мансийск', citizenship: 'РФ / ЕАЭС', rates: { foot: 136, bicycle: 254, auto: 351 } },
  { city: 'Химки', citizenship: 'РФ / ЕАЭС / СНГ', rates: { foot: 451, bicycle: 521, auto: 537 } },
  { city: 'Чебоксары', citizenship: 'РФ / ЕАЭС', rates: { foot: 258, bicycle: 369, auto: 469 } },
  { city: 'Челябинск', citizenship: 'РФ / ЕАЭС', rates: { foot: 299, bicycle: 467, auto: 557 } },
  { city: 'Череповец', citizenship: 'РФ / ЕАЭС', rates: { foot: 178, bicycle: 363, auto: 568 } },
  { city: 'Чехов', citizenship: 'РФ / ЕАЭС / СНГ', rates: { foot: 320, bicycle: 691, auto: 806 } },
  { city: 'Шахты', citizenship: 'РФ / ЕАЭС', rates: { foot: 253, bicycle: 415, auto: 358 } },
  { city: 'Щелково', citizenship: 'РФ / ЕАЭС / СНГ', rates: { foot: 227, bicycle: 383, auto: 630 } },
  { city: 'Щербинка', citizenship: 'РФ / ЕАЭС / СНГ', rates: { foot: 320, bicycle: 444, auto: 511 } },
  { city: 'Электросталь', citizenship: 'РФ / ЕАЭС / СНГ', rates: { foot: 175, bicycle: 410, auto: 524 } },
  { city: 'Ярославль', citizenship: 'РФ / ЕАЭС', rates: { foot: 251, bicycle: 408, auto: 580 } },
];

const requirements = [
  'Доставлять заказы по понятным маршрутам через приложение «Я.Про».',
  'Следовать инструкциям в приложении — без сложной логистики и лишнего общения.',
];

const benefits = [
  'Прозрачный доход: бонусы и повышенные ставки в пиковые часы.',
  'Доплата за тяжёлые заказы, чаевые от клиентов и доплата за ожидание.',
  'Реферальная программа: получите до 25 000 ₽ за каждого приглашённого друга.',
  'Свободный график от 2 часов: вы сами решаете, когда выходить на доставки.',
  'Выбор района: работайте рядом с домом или там, где больше заказов.',
  '«Заказы в пути»: укажите на карте точку, куда вам нужно попасть — система подберёт заказы по маршруту.',
  'Можно завершить слот или взять паузу, когда окажетесь рядом с нужной точкой.',
  'Комбо-обеды за 95 ₽ из «Яндекс Лавки».',
  'Ежедневный промокод на 300 ₽ в «Яндекс Еде».',
  'Скидка 20% в «Яндекс Лавке» на продукты, товары для дома, готовую еду и выпечку.',
  'Аренда Powerbank от 100 ₽ в сутки через сервис «Бери заряд».',
  'Бесплатная подписка «Яндекс Плюс» для вас и ваших близких.',
  'Специализированная одежда для доставок в любую погоду.',
  'Бесплатное страхование на время доставок.',
  '«Я.Про»: быстрая регистрация и старт (через пару часов после оформления).',
  '«Я.Про»: подбор заказов поблизости с указанием дохода и времени доставки.',
  '«Я.Про»: прозрачная статистика по доходу, чаевым и выплатам.',
  '«Я.Про»: встроенный навигатор с оптимальными маршрутами.',
  '«Я.Про»: подсказки о районах с высокой загрузкой и доходом.',
  '«Я.Про»: доступ к бонусам и скидкам через приложение.',
  '«Я.Про»: стабильная работа при плохом интернет-соединении.',
];

const baseRequiredDocuments = [
  'Для граждан РФ: паспорт с пропиской и медицинская книжка; оформление через договор ГПХ или самозанятость.',
];

const eaesRequiredDocument =
  'Для граждан ЕАЭС: паспорт с регистрацией, медицинская книжка, миграционная карта с целью въезда «Работа», СНИЛС, ИНН и ДМС.';

const nonEaesRequiredDocument =
  'Для граждан стран вне ЕАЭС дополнительно нужны ВНЖ и патент с чеками.';

const buildPay = (hourly: number): VacancyOffer['pay'] => {
  const daily = hourly * 12;
  const monthly = daily * 30;
  const format = (value: number) => new Intl.NumberFormat('ru-RU').format(value);

  return {
    currency: 'RUB',
    hourly: {
      min: hourly,
      max: hourly,
      text: `${format(hourly)} ₽/час`,
    },
    perShift: {
      min: daily,
      max: daily,
      text: `${format(daily)} ₽/день`,
    },
    monthly: {
      min: monthly,
      max: monthly,
      text: `до ${format(monthly)} ₽/мес`,
    },
    rate: `${format(hourly)} ₽/час, ${format(daily)} ₽ за 12 часов, до ${format(monthly)} ₽ за 30 смен`,
    paymentFrequency: 'Еженедельно',
  };
};

const getRequiredDocumentOverrides = (citizenship: string) => {
  const hasEaes = citizenship.includes('ЕАЭС');
  const hasNonEaes = citizenship.includes('вне ЕАЭС');

  return [
    ...(hasEaes ? [eaesRequiredDocument] : []),
    ...(hasNonEaes ? [nonEaesRequiredDocument] : []),
  ];
};

const yandexEdaContentByLanguage: LocalizedVacancyContent = Object.fromEntries(
  SUPPORTED_LANGUAGES.map((language) => {
    const translation = descriptionTranslations[language] ?? descriptionTranslations.ru;

    return [
      language,
      {
        title: language === 'ru'
          ? '{transportTitle} в Яндекс Еда {cityPrep}'
          : '{transportTitle} в Яндекс Еда — {city}',
        shortDescription: translation.shortDescription,
        description: translation.description,
        requirements: [...requirements],
        benefits: [...benefits],
        requiredDocuments: [...baseRequiredDocuments],
        searchTags: ['Яндекс Еда', 'курьер', 'Я.Про', 'доставка еды', 'свободный график'],
      },
    ];
  }),
) as LocalizedVacancyContent;

const createOffer = (
  cityRate: YandexEdaCityRate,
  transport: TransportMode,
  cityIndex: number,
): VacancyOffer => {
  const hourly = cityRate.rates[transport];
  const transportIndex = TRANSPORT_MODES.indexOf(transport);
  const flatOfferIndex = cityIndex * TRANSPORT_MODES.length + transportIndex;
  const isOfferActive = !LIGHT_MODE_ENABLED || flatOfferIndex % LIGHT_MODE_STRIDE === 0;

  return {
    city: cityRate.city,
    transport,
    pay: buildPay(hourly),
    isActive: isOfferActive,
    updatedAt: UPDATED_AT,
    sourceUrl: YANDEX_EDA_PAY_SOURCE_URL,
    salaryConfidence: 'partner',
    // Yandex Eda accepts couriers from 16 with parental consent for foot/bicycle;
    // auto requires 18+ (driving licence).
    ageFrom: transport === 'auto' ? 18 : 16,
    citizenship: cityRate.citizenship,
    medicalBook: 'required',
    employmentFormats: [...YANDEX_EDA_EMPLOYMENT_FORMATS],
    schedule: 'Свободный график от 2 часов',
    applyLink: buildYandexEdaApplyLink(cityRate.city, transport),
    priority: 2000 - cityIndex * 10 + TRANSPORT_PRIORITY[transport],
    requiredDocumentsOverride: getRequiredDocumentOverrides(cityRate.citizenship),
    // Foot couriers don't need any vehicle of their own.
    ...(transport === 'foot' ? { transportProvision: 'not_required' as const } : {}),
  };
};

const KUPER_PAY_SOURCE_URL = kuperPayRates.sourceUrl;
const KUPER_UPDATED_AT = kuperPayRates.exportedAt;
const KUPER_EMPLOYMENT_FORMATS = ['self_employed'] satisfies EmploymentFormat[];
const yandexCitizenshipByCity = new Map(
  yandexEdaCityRates.map((cityRate) => [cityRate.city, cityRate.citizenship]),
);

const getKuperCitizenship = (city: string) =>
  yandexCitizenshipByCity.get(city) ?? KUPER_DEFAULT_CITIZENSHIP;

const toHourlyFromShift = (shiftPer12Hours: number) => {
  const raw = shiftPer12Hours / 12;
  return Number.isInteger(raw) ? raw : Number(raw.toFixed(2));
};

const buildKuperApplyLink = (baseLink: string, city: string, role: 'foot' | 'bike' | 'auto' | 'packer') => {
  const url = new URL(baseLink);
  const citySlug = slugifyCity(city);

  url.searchParams.set('utm_source', 'kurerok');
  url.searchParams.set('utm_medium', 'vacancy');
  url.searchParams.set('utm_campaign', `kuper-${role}`);
  url.searchParams.set('utm_content', `${citySlug}-${role}`);

  return url.toString();
};

const createKuperLocalizedContent = (ruContent: VacancyContent): LocalizedVacancyContent =>
  Object.fromEntries(
    SUPPORTED_LANGUAGES.map((language) => [
      language,
      {
        ...ruContent,
        title: language === 'ru'
          ? ruContent.title
          : ruContent.title.replace('{cityPrep}', '— {city}'),
        requirements: [...ruContent.requirements],
        benefits: [...ruContent.benefits],
        requiredDocuments: [...ruContent.requiredDocuments],
        labels: ruContent.labels ? [...ruContent.labels] : undefined,
        searchTags: ruContent.searchTags ? [...ruContent.searchTags] : undefined,
      },
    ]),
  ) as LocalizedVacancyContent;

type KuperRole = 'foot' | 'bike' | 'auto' | 'packer';

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

const kuperFootContent = createKuperLocalizedContent({
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
});

const kuperBikeContent = createKuperLocalizedContent({
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
});

const kuperAutoContent = createKuperLocalizedContent({
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
});

const kuperPackerContent = createKuperLocalizedContent({
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
});

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

const formatRub = (value: number) => new Intl.NumberFormat('ru-RU').format(value);

const buildTBankPay = (minMonthly: number, maxMonthly: number): VacancyOffer['pay'] => {
  const min = Math.min(minMonthly, maxMonthly);
  // T-Bank publishes income as "from X" (no upper cap) — operators &
  // representatives are paid per result so real income usually exceeds
  // the displayed minimum. Display "от X ₽/мес" instead of misleading
  // "до Y ₽/мес".
  const monthlyText = `от ${formatRub(min)} ₽/мес`;

  return {
    currency: 'RUB',
    monthly: {
      min,
      // Intentionally no `max` — getSalaryText falls back to monthly.text
      // ("от X ₽/мес") instead of the "до X ₽/мес" branch.
      text: monthlyText,
    },
    rate: monthlyText,
    // T-Bank operator/representative offers go through ГПХ/самозанятость —
    // standard for partner-recruited operators is weekly pay-out.
    paymentFrequency: 'Еженедельно',
  };
};

const resolveTBankIncomeRange = (offer: TBankOfferSource) => {
  const numericCandidates = [offer.incomeMinRub, offer.avgIncomeRub, offer.incomeMaxRub]
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0);

  if (!numericCandidates.length) {
    return { min: 70_000, max: 70_000 };
  }

  return {
    min: Math.min(...numericCandidates),
    max: Math.max(...numericCandidates),
  };
};

const buildTBankApplyLink = (city: string, role: 'operator-b2b' | 'representative') => {
  const url = new URL(T_BANK_APPLY_LINK);
  const citySlug = slugifyCity(city);

  url.searchParams.set('utm_source', 'kurerok');
  url.searchParams.set('utm_medium', 'vacancy');
  url.searchParams.set('utm_campaign', `tbank-${role}`);
  url.searchParams.set('utm_content', `${citySlug}-${role}`);

  return url.toString();
};

const getRepresentativeTransport = (workMode?: string | null): TransportMode => {
  const normalized = (workMode ?? '').toLowerCase();

  if (normalized.includes('авто') && !normalized.includes('пеш')) {
    return 'auto';
  }

  return 'foot';
};

const tBankOperatorContent = createKuperLocalizedContent({
  title: tBankVacancies.operatorB2B.title,
  shortDescription: tBankVacancies.operatorB2B.shortDescription,
  description: tBankVacancies.operatorB2B.description,
  requirements: [...tBankVacancies.operatorB2B.requirements],
  benefits: [...tBankVacancies.operatorB2B.benefits],
  requiredDocuments: [...tBankVacancies.operatorB2B.requiredDocuments],
  labels: ['Удалённо', 'B2B-продажи'],
  searchTags: ['Т-Банк', 'оператор', 'B2B-продажи', 'удалённая работа'],
});

const representativeTitleTemplate = tBankVacancies.representative.titleTemplate.includes('в %city-name%')
  ? tBankVacancies.representative.titleTemplate.replace('в %city-name%', '{cityPrep}')
  : tBankVacancies.representative.titleTemplate.includes('%city-name%')
    ? tBankVacancies.representative.titleTemplate.replace('%city-name%', '{cityPrep}')
    : tBankVacancies.representative.title;

const tBankRepresentativeContent = createKuperLocalizedContent({
  title: representativeTitleTemplate,
  shortDescription: tBankVacancies.representative.shortDescription,
  description: tBankVacancies.representative.description,
  requirements: [...tBankVacancies.representative.requirements],
  benefits: [...tBankVacancies.representative.benefits],
  requiredDocuments: [...tBankVacancies.representative.requiredDocuments],
  labels: ['Разъездная работа', 'Гибкий график'],
  searchTags: ['Т-Банк', 'представитель', 'разъездная работа', 'работа с клиентами'],
});

const tBankOperatorOffers = tBankVacancies.operatorB2B.offers.map((offer, cityIndex) => {
  const incomeRange = resolveTBankIncomeRange(offer);

  return {
    city: offer.city,
    // B2B operator is a fully-remote call-center role — no field work, no vehicle.
    transport: 'remote',
    transportProvision: 'not_required',
    pay: buildTBankPay(incomeRange.min, incomeRange.max),
    isActive: offer.hiringActive ?? true,
    updatedAt: tBankVacancies.updatedAt,
    sourceUrl: tBankVacancies.sourceUrl,
    salaryConfidence: 'partner',
    ageFrom: 18,
    citizenship: T_BANK_CITIZENSHIP,
    medicalBook: 'not_required',
    employmentFormats: [...T_BANK_EMPLOYMENT_FORMATS],
    schedule: 'Гибкий график, полностью удалённый формат',
    applyLink: buildTBankApplyLink(offer.city, 'operator-b2b'),
    priority: 1750 - cityIndex * 2,
  } satisfies VacancyOffer;
});

const tBankRepresentativeOffers = tBankVacancies.representative.offers.map((offer, cityIndex) => {
  const incomeRange = resolveTBankIncomeRange(offer);
  const transport = getRepresentativeTransport(offer.workMode);
  const normalizedMode = (offer.workMode ?? '').toLowerCase();
  const hasMixedMode = normalizedMode.includes('авто') && normalizedMode.includes('пеш');

  return {
    city: offer.city,
    transport,
    pay: buildTBankPay(incomeRange.min, incomeRange.max),
    isActive: offer.hiringActive ?? true,
    updatedAt: tBankVacancies.updatedAt,
    sourceUrl: tBankVacancies.sourceUrl,
    salaryConfidence: 'partner',
    ageFrom: 18,
    citizenship: T_BANK_CITIZENSHIP,
    medicalBook: 'unknown',
    employmentFormats: [...T_BANK_EMPLOYMENT_FORMATS],
    schedule: 'От 2 дней в неделю, время выбирается из доступных интервалов',
    applyLink: buildTBankApplyLink(offer.city, 'representative'),
    priority: 1700 - cityIndex * 2 + TRANSPORT_PRIORITY[transport],
    ...(hasMixedMode
      ? {
          benefitsOverride: ['В этом городе можно работать как на авто, так и пешком (по условиям вакансии).'],
        }
      : {}),
  } satisfies VacancyOffer;
});

const buildEfinApplyLink = (city: string, transport: EfinOfferSource['transport']) => {
  const url = new URL(EFIN_APPLY_LINK);
  const citySlug = slugifyCity(city);

  url.searchParams.set('utm_source', 'kurerok');
  url.searchParams.set('utm_medium', 'vacancy');
  url.searchParams.set('utm_campaign', 'efin-bank-representative');
  url.searchParams.set('utm_content', `${citySlug}-${transport}`);

  return url.toString();
};

const buildAlfaBankApplyLink = (city: string, transport: AlfaBankOfferSource['transport']) => {
  const url = new URL(ALFA_BANK_APPLY_LINK);
  const citySlug = slugifyCity(city);

  url.searchParams.set('utm_source', 'kurerok');
  url.searchParams.set('utm_medium', 'vacancy');
  url.searchParams.set('utm_campaign', 'alfa-bank-representative');
  url.searchParams.set('utm_content', `${citySlug}-${transport}`);

  return url.toString();
};

const buildEfinPay = (monthlyFromRub: number, meetingFeeRub: number): VacancyOffer['pay'] => {
  const normalizedMonthly = Number.isFinite(monthlyFromRub) && monthlyFromRub > 0
    ? Math.round(monthlyFromRub)
    : 50_000;
  const normalizedMeeting = Number.isFinite(meetingFeeRub) && meetingFeeRub > 0
    ? Math.round(meetingFeeRub)
    : 400;
  const monthlyText = `от ${formatRub(normalizedMonthly)} ₽/мес`;
  const perOrderText = `в среднем ${formatRub(normalizedMeeting)} ₽ за встречу`;

  return {
    currency: 'RUB',
    monthly: {
      min: normalizedMonthly,
      text: monthlyText,
    },
    perOrder: {
      min: normalizedMeeting,
      max: normalizedMeeting,
      text: perOrderText,
    },
    rate: `${perOrderText}; ${monthlyText}`,
    paymentFrequency: 'Еженедельно',
  };
};

const buildEfinSchedule = (offer: EfinOfferSource) => {
  const schedule = offer.schedule?.trim();
  const workTime = offer.workTime?.trim();

  if (schedule && workTime) {
    return `${schedule}; ${workTime}`;
  }

  if (schedule) {
    return schedule;
  }

  if (workTime) {
    return workTime;
  }

  return 'Гибкий график, время встреч выбираете самостоятельно';
};

const efinRepresentativeContent = createKuperLocalizedContent({
  title: 'Представитель банка в Efin {cityPrep} {transportSuffix}',
  shortDescription:
    'Разъездная работа с еженедельными выплатами: оплачивается каждая встреча с клиентом банка.',
  description:
    'Работая в Efin, вы получаете еженедельные выплаты и доход, на который влияете напрямую: каждая встреча оплачивается отдельно. Формат гибкий и комфортный — вы сами выбираете график. Оформление и выдача продуктов проходят без бумажек через мобильное приложение, где можно брать заявки с карты. Старт быстрый, без долгого ожидания трудоустройства, а плотность заявок высокая благодаря широкой партнерской сети банков. Дополнительно доступны чаевые, реферальные выплаты и регулярные конкурсы с призами.',
  requirements: [
    'Доставлять клиентам банковские продукты.',
    'Консультировать клиентов по продуктам и сервисам банков.',
  ],
  benefits: [
    'Еженедельные выплаты вознаграждения.',
    'Оплата за каждую встречу с клиентом: уровень дохода зависит от вашей активности.',
    'Средняя стоимость встречи — около 400 ₽.',
    'Гибкий и комфортный график, который вы определяете самостоятельно.',
    'Безбумажное оформление и выдача продуктов: нужен только смартфон.',
    'Быстрый старт без длительного ожидания оформления в штат банка.',
    'Высокая плотность заявок в районе и постоянный поток встреч.',
    'Удобное мобильное приложение с необходимой информацией по заявкам.',
    'Поддержка на старте и в процессе работы.',
    'Регулярные конкурсы с ценными призами.',
    'Дополнительное вознаграждение по программе «Собери свою команду» — от 10 000 до 15 000 ₽ за рекомендацию.',
    'Дополнительный доход от чаевых и рекомендаций клиентов сервиса reki.efin.ru.',
  ],
  requiredDocuments: [
    'Паспорт гражданина РФ с указанием прописки.',
    'СНИЛС.',
    'ИНН.',
    'Оформленный статус самозанятого.',
  ],
  labels: ['Разъездная работа', 'Еженедельные выплаты', 'Оплата за встречи'],
  searchTags: ['Efin', 'выездной представитель банка', 'банковские продукты', 'самозанятость'],
});

const efinRepresentativeOffers = efinVacancies.offers.map((offer, cityIndex) => ({
  city: offer.city,
  transport: offer.transport,
  pay: buildEfinPay(offer.monthlyFromRub, offer.meetingFeeRub),
  isActive: true,
  updatedAt: efinVacancies.updatedAt,
  sourceUrl: efinVacancies.sourceUrl,
  salaryConfidence: 'partner',
  ageFrom: 18,
  citizenship: EFIN_CITIZENSHIP,
  medicalBook: 'not_required',
  employmentFormats: [...EFIN_EMPLOYMENT_FORMATS],
  schedule: buildEfinSchedule(offer),
  applyLink: buildEfinApplyLink(offer.city, offer.transport),
  priority: 1650 - cityIndex * 2 + TRANSPORT_PRIORITY[offer.transport],
  ...(offer.transport === 'auto' ? { transportProvision: 'own' as const } : {}),
}) satisfies VacancyOffer);

const buildAlfaBankPay = (monthlyFromRub: number): VacancyOffer['pay'] => {
  const normalizedMonthly = Number.isFinite(monthlyFromRub) && monthlyFromRub > 0
    ? Math.round(monthlyFromRub)
    : alfaBankVacancies.salaryMonthlyFromRub;
  const monthlyText = `от ${formatRub(normalizedMonthly)} ₽/мес`;

  return {
    currency: 'RUB',
    monthly: {
      min: normalizedMonthly,
      text: monthlyText,
    },
    rate: 'Оплата за каждую доставку и за каждое подключение дополнительных банковских услуг',
    // Alfa-Bank hires representatives via "Оформление по ТК РФ" — Russian
    // labour code requires payouts at least twice per month.
    paymentFrequency: '2 раза в месяц (по ТК РФ)',
  };
};

const buildAlfaBankSchedule = (offer: AlfaBankOfferSource) => {
  const schedule = offer.schedule?.trim();

  return schedule || 'Гибкий график: 5/2, 2/2, 4/2 или 3/2';
};

const buildAlfaBankRequirementsOverride = (offer: AlfaBankOfferSource) => {
  const requirement = offer.requirement?.trim();

  if (!requirement) {
    return {};
  }

  const lowerRequirement = requirement.toLowerCase();

  if (/^(с\s+авто|авто|личн(?:ый|ое)\s+авто|наличие\s+авто|на\s+авто)$/.test(lowerRequirement)) {
    return {};
  }

  if (/без\s+авто|можно\s+без\s+авто/.test(lowerRequirement)) {
    return {};
  }

  if (offer.transport !== 'auto' && /авто|автомоб/.test(lowerRequirement)) {
    return {};
  }

  if (offer.transport !== 'foot' && /пеш/.test(lowerRequirement)) {
    return {};
  }

  return {
    requirementsOverride: [`Условия по таблице для города: ${requirement}.`],
  };
};

const buildAlfaBankBenefitsOverride = (offer: AlfaBankOfferSource) => {
  const extraInfo = offer.extraInfo?.trim();

  if (!extraInfo) {
    return {};
  }

  const lowerExtraInfo = extraInfo.toLowerCase();

  if (/^(с\s+авто|авто|без\s+авто|можно\s+без\s+авто)$/.test(lowerExtraInfo)) {
    return {};
  }

  if (/офис|удаленка|удалёнка/.test(lowerExtraInfo)) {
    return {};
  }

  return {
    benefitsOverride: [extraInfo],
  };
};

const alfaBankRepresentativeContent = createKuperLocalizedContent({
  title: '{transportBankRoleTitle} Альфа-Банка {cityPrep}',
  shortDescription:
    'Разъездная работа в Альфа-Банке: доставка банковских продуктов клиентам, подписание документов и помощь с подключением сервисов банка.',
  description:
    'Альфа-Банк ищет представителей для работы с клиентами на выезде. Нужно доставлять банковские продукты, встречаться с клиентами в удобных точках города, подписывать документы, консультировать по услугам и предложениям банка, а также помогать подключать дополнительные сервисы. Формат подойдёт кандидатам без опыта: перед стартом есть обучение, поддержка и понятный ввод в работу. Банк предлагает официальное оформление, гибкий график, возможности для роста и доступ к корпоративным льготам, скидкам и обучающим программам.',
  requirements: [
    'Возраст от 18 лет; после 40 лет банк дополнительно смотрит на опыт и навыки кандидата.',
    'Гражданство РФ, Беларуси или Казахстана.',
    'Образование от среднего специального и выше; кандидатов со средним образованием могут рассмотреть отдельно.',
    'Готовность к разъездному характеру работы и продажам.',
    'Опрятный внешний вид, без тату на видных частях тела.',
    'Грамотная речь без сильного акцента.',
    'Отсутствие судимости и отсутствие активного статуса в CRM рекрутмента за последние 90 календарных дней.',
    'Наличие авто может быть преимуществом в регионах; для строк с требованием авто генерируется только автоформат.',
  ],
  benefits: [
    'Оформление по ТК РФ.',
    'Зарплата от 120 000 ₽; доход зависит от доставок и подключений дополнительных банковских услуг.',
    'Гибкий график: 5/2, 2/2, 4/2 или 3/2.',
    'Комфортный дресс-код.',
    'Льготные условия на услуги банка и скидки от партнёров.',
    'Оплата больничного до 10 дней.',
    'Карьерный рост с наставником.',
    'Бесплатное обучение в Альфа-Академии, вебинары и доступ к корпоративным библиотекам.',
    'Корпоративные сообщества и мероприятия: книжные клубы, киноклубы, спорт и кибертурниры.',
  ],
  requiredDocuments: [
    'Паспорт.',
    'Документы для оформления по ТК РФ.',
    'Документ об образовании, если потребуется на этапе проверки.',
  ],
  searchTags: ['Альфа-Банк', 'представитель банка', 'банковские продукты', 'официальное трудоустройство'],
});

const alfaBankRepresentativeOffers = alfaBankVacancies.offers.map((offer, offerIndex) => ({
  city: offer.city,
  transport: offer.transport,
  pay: buildAlfaBankPay(offer.monthlyFromRub),
  isActive: true,
  updatedAt: offer.updatedAt || alfaBankVacancies.updatedAt,
  sourceUrl: alfaBankVacancies.sourceUrl,
  salaryConfidence: 'partner',
  ageFrom: 18,
  citizenship: ALFA_BANK_CITIZENSHIP,
  medicalBook: 'not_required',
  employmentFormats: [...ALFA_BANK_EMPLOYMENT_FORMATS],
  schedule: buildAlfaBankSchedule(offer),
  applyLink: buildAlfaBankApplyLink(offer.city, offer.transport),
  priority: 1500 - offerIndex,
  ...buildAlfaBankRequirementsOverride(offer),
  ...buildAlfaBankBenefitsOverride(offer),
})) satisfies VacancyOffer[];

// === Ozon =============================================================
// All Ozon vacancies (5 backend slugs × N cities each — 88 offers in
// total) live in `./ozonOffers.ts`, generated from the live form
// catalogue at `./ozon-vacancies.json` (refreshed via
// `node tools/fetch-ozon-vacancies.mjs`). The Cloudflare Worker
// (`workers/ozon-lead/`) validates every (vacancy, cityID,
// hireObjectUUID) triple against `workers/ozon-lead/src/whitelist.js`,
// so re-run `node tools/build-worker-whitelist.mjs` and redeploy the
// Worker after editing the catalogue.

const _initialSources = [
  {
    id: 1,
    slug: 'yandex-eda-courier',
    company: {
      name: 'Яндекс Еда',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/5/57/Yandex_Eats_icon.svg',
    },
    content: yandexEdaContentByLanguage,
    defaults: {
      ageFrom: 18,
      medicalBook: 'required',
      employmentFormats: [...YANDEX_EDA_EMPLOYMENT_FORMATS],
      schedule: 'Свободный график от 2 часов',
      education: 'Не требуется',
      citizenship: 'РФ / ЕАЭС / СНГ',
      uniform: 'Специализированная одежда для доставок',
      os: 'Android или iOS',
    },
    offers: yandexEdaCityRates.flatMap((cityRate, cityIndex) =>
      TRANSPORT_MODES.map((transport) => createOffer(cityRate, transport, cityIndex)),
    ),
    extraTags: ['flexible', 'food_delivery', 'yandex_eda', 'source:google-sheet'],
    isHot: true,
  },
  {
    id: 2,
    slug: 'kuper-foot-courier',
    company: {
      name: KUPER_COMPANY_NAME,
      logo: KUPER_COMPANY_LOGO,
    },
    content: kuperFootContent,
    defaults: {
      ageFrom: 18,
      medicalBook: 'required',
      employmentFormats: [...KUPER_EMPLOYMENT_FORMATS],
      schedule: 'Смена до 12 часов, гибкий график от 3 часов в день',
      education: 'Не требуется',
      citizenship: KUPER_DEFAULT_CITIZENSHIP,
      uniform: 'Брендированная форма по условиям точки',
      os: 'Android или iOS',
    },
    offers: kuperFootOffers,
    extraTags: ['kuper', 'courier', 'foot', 'source:google-sheet'],
    isHot: true,
  },
  {
    id: 3,
    slug: 'kuper-bike-courier',
    company: {
      name: KUPER_COMPANY_NAME,
      logo: KUPER_COMPANY_LOGO,
    },
    content: kuperBikeContent,
    defaults: {
      ageFrom: 18,
      medicalBook: 'required',
      employmentFormats: [...KUPER_EMPLOYMENT_FORMATS],
      schedule: 'Смена до 12 часов, гибкий график от 3 часов в день',
      education: 'Не требуется',
      citizenship: KUPER_DEFAULT_CITIZENSHIP,
      uniform: 'Брендированная форма по условиям точки',
      os: 'Android или iOS',
    },
    offers: kuperBikeOffers,
    extraTags: ['kuper', 'courier', 'bike', 'source:google-sheet'],
    isHot: true,
  },
  {
    id: 4,
    slug: 'kuper-auto-courier',
    company: {
      name: KUPER_COMPANY_NAME,
      logo: KUPER_COMPANY_LOGO,
    },
    content: kuperAutoContent,
    defaults: {
      ageFrom: 18,
      medicalBook: 'required',
      employmentFormats: [...KUPER_EMPLOYMENT_FORMATS],
      schedule: 'Смена до 12 часов, гибкий график от 3 часов в день',
      education: 'Не требуется',
      citizenship: KUPER_DEFAULT_CITIZENSHIP,
      uniform: 'Брендированная форма по условиям точки',
      os: 'Android или iOS',
    },
    offers: kuperAutoOffers,
    extraTags: ['kuper', 'courier', 'auto', 'source:google-sheet'],
    isHot: true,
  },
  {
    id: 5,
    slug: 'kuper-order-picker',
    company: {
      name: KUPER_COMPANY_NAME,
      logo: KUPER_COMPANY_LOGO,
    },
    content: kuperPackerContent,
    defaults: {
      ageFrom: 18,
      medicalBook: 'required',
      employmentFormats: [...KUPER_EMPLOYMENT_FORMATS],
      schedule: 'Смена до 12 часов',
      education: 'Не требуется',
      citizenship: KUPER_DEFAULT_CITIZENSHIP,
      uniform: 'Брендированная форма по условиям точки',
      os: 'Android или iOS',
    },
    offers: kuperPackerOffers,
    extraTags: ['kuper', 'picker', 'store', 'source:google-sheet'],
    isHot: true,
  },
  {
    id: 6,
    slug: 'tbank-outbound-b2b-operator',
    company: {
      name: T_BANK_COMPANY_NAME,
      logo: T_BANK_COMPANY_LOGO,
    },
    content: tBankOperatorContent,
    defaults: {
      ageFrom: 18,
      medicalBook: 'unknown',
      employmentFormats: [...T_BANK_EMPLOYMENT_FORMATS],
      schedule: 'Гибкий график, полностью удалённый формат',
      education: 'От 9 классов',
      citizenship: T_BANK_CITIZENSHIP,
      uniform: 'Не требуется',
      os: 'iOS / Android',
    },
    offers: tBankOperatorOffers,
    extraTags: ['tbank', 'operator', 'b2b', 'remote', 'source:google-sheet'],
    isHot: true,
  },
  {
    id: 7,
    slug: 'tbank-representative',
    company: {
      name: T_BANK_COMPANY_NAME,
      logo: T_BANK_COMPANY_LOGO,
    },
    content: tBankRepresentativeContent,
    defaults: {
      ageFrom: 18,
      medicalBook: 'unknown',
      employmentFormats: [...T_BANK_EMPLOYMENT_FORMATS],
      schedule: 'От 2 дней в неделю, время выбирается из доступных интервалов',
      education: 'От 9 классов',
      citizenship: T_BANK_CITIZENSHIP,
      uniform: 'Не требуется',
      os: 'iOS / Android',
    },
    offers: tBankRepresentativeOffers,
    extraTags: ['tbank', 'representative', 'field-sales', 'source:google-sheet'],
    isHot: true,
  },
  {
    id: 8,
    slug: 'efin-bank-representative',
    company: {
      name: EFIN_COMPANY_NAME,
      logo: EFIN_COMPANY_LOGO,
    },
    content: efinRepresentativeContent,
    defaults: {
      ageFrom: 18,
      medicalBook: 'not_required',
      employmentFormats: [...EFIN_EMPLOYMENT_FORMATS],
      schedule: 'Гибкий график, время встреч выбираете самостоятельно',
      education: 'Не требуется',
      citizenship: EFIN_CITIZENSHIP,
      uniform: 'Дресс-код по стандартам банка-партнёра',
      os: 'Android или iOS',
    },
    offers: efinRepresentativeOffers,
    extraTags: ['efin', 'bank-representative', 'field-work', 'source:google-sheet'],
    isHot: true,
  },
  {
    id: 9,
    slug: 'alfa-bank-representative',
    company: {
      name: ALFA_BANK_COMPANY_NAME,
      logo: ALFA_BANK_COMPANY_LOGO,
    },
    content: alfaBankRepresentativeContent,
    defaults: {
      ageFrom: 18,
      medicalBook: 'not_required',
      employmentFormats: [...ALFA_BANK_EMPLOYMENT_FORMATS],
      schedule: 'Гибкий график: 5/2, 2/2, 4/2 или 3/2',
      education: 'От среднего специального; возможно среднее образование по согласованию',
      citizenship: ALFA_BANK_CITIZENSHIP,
      uniform: 'Комфортный дресс-код',
      os: 'Android или iOS',
    },
    offers: alfaBankRepresentativeOffers,
    extraTags: ['alfa-bank', 'bank-representative', 'field-sales', 'official-employment', 'source:google-sheet'],
    isHot: true,
  },
  // Ozon — 5 sources (id 10..14), one per backend slug. Generated in
  // ./ozonOffers.ts from the live form catalogue. Their offers carry a
  // placeholder `pay: { monthly: { min, text: 'от N ₽/мес' } }` because
  // Ozon's ref-form publishes only shift rates, not bank-card hourlies.
  // We post-process them below so each Ozon offer in a city where
  // Y.Eda or Купер publishes a real hourly rate gets a buildPay()-built
  // pay object with a comparable «до X ₽/мес» salary tag and an
  // hourly used by the income calculator. Cities without Y.Eda/Купер
  // data (rare — Истра, Подольск, etc.) keep the «от N ₽/мес» template.
  ...ozonVacancySources,
] satisfies VacancySource[];

// === Ozon hourly fallback ============================================
// Hash for deterministic per-(slug,city,transport) jitter — keeps two
// Ozon vacancies in the same city visually distinct (e.g. Москва
// Operator, Goods Handler, Courier all get different numbers within
// 88-98% of the city's best Y.Eda/Купер rate).
const _hashStr = (s: string): number => {
	let h = 2166136261;
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return Math.abs(h | 0);
};

const _cityBestHourly = new Map<string, number>();
for (const source of _initialSources) {
	if (source.slug.startsWith('ozon-')) continue;
	for (const offer of source.offers) {
		if (!offer.isActive) continue;
		const rate =
			(typeof offer.pay.hourly?.max === 'number' && Number.isFinite(offer.pay.hourly.max) ? offer.pay.hourly.max : 0) ||
			(typeof offer.pay.hourly?.min === 'number' && Number.isFinite(offer.pay.hourly.min) ? offer.pay.hourly.min : 0);
		if (rate > (_cityBestHourly.get(offer.city) ?? 0)) {
			_cityBestHourly.set(offer.city, rate);
		}
	}
}

// Build the public vacancySources array IMMUTABLY: for Ozon sources
// without a real pay.hourly, return a fresh source object with new
// offers; for everything else, return the source unchanged. We never
// mutate offer.pay or source.offers in place — keeps consumers (jobs.ts,
// pages/v/[slug].astro) from observing a half-applied state if they
// happen to import the module before the postprocess runs (current
// SSG-only flow doesn't hit that, but the immutable shape is safer
// for tests / future module-graph changes).
export const vacancySources: VacancySource[] = _initialSources.map((source) => {
	if (!source.slug.startsWith('ozon-')) return source;
	const updatedOffers = source.offers.map((offer) => {
		if (offer.pay.hourly) return offer;
		const best = _cityBestHourly.get(offer.city);
		if (!best) return offer;
		const jitterKey = `${source.slug}-${offer.city}-${offer.transport}`;
		const jitter = _hashStr(jitterKey) % 100;        // 0..99
		const ratio = 0.88 + jitter / 1000;               // 0.880..0.979
		const fallbackHourly = Math.round(best * ratio);
		return { ...offer, pay: buildPay(fallbackHourly) };
	});
	return { ...source, offers: updatedOffers };
});

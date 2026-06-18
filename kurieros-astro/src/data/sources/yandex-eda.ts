/**
 * Яндекс Еда — courier (foot / bicycle / auto).
 *
 * Pay rates are hand-curated from the partner-shared Google Sheet (see
 * `YANDEX_EDA_PAY_SOURCE_URL`) and live as a static city-rate table
 * below. The table also acts as the city/citizenship registry for
 * Купер (which doesn't ship its own citizenship metadata) — see
 * `yandexCitizenshipByCity` re-exported for `kuper.ts`.
 */
import { slugifyCity } from '../../utils/cities';
import type {
  EmploymentFormat,
  TransportMode,
  VacancyContent,
  VacancyOffer,
  VacancySource,
} from '../vacancyTypes';
import { YANDEX_EDA_APPLY } from '../partnerLinks';
import {
  TRANSPORT_PRIORITY,
  UPDATED_AT,
  buildPay,
  getRequiredDocumentOverrides,
} from './shared';

// === Constants =======================================================

const YANDEX_EDA_APPLY_LINK = YANDEX_EDA_APPLY;
const YANDEX_EDA_PAY_SOURCE_URL =
  'https://docs.google.com/spreadsheets/d/17gBp0k07GCPS3Ugf7JACHogCoYpZtYZRsQnnEhIedwY/edit?gid=1115757494#gid=1115757494';

// Yandex Eda offers no remote/office courier mode — the on-site transport
// modes are foot/bicycle/auto only. Remote and office stay in the global
// `TransportMode` union (used by non-courier partners).
type YandexEdaTransportMode = Exclude<TransportMode, 'remote' | 'office' | 'service'>;

const TRANSPORT_MODES = ['foot', 'bicycle', 'auto'] satisfies YandexEdaTransportMode[];

// Was a dev-iteration toggle (`LIGHT_MODE_*`) that subsampled offers
// to speed up local builds. Removed — the site is a CPA-referral
// aggregator with no concept of «inactive» vacancies (every offer
// goes to a partner referral link), so all generated offers are
// uniformly `isActive: true`.

const YANDEX_EDA_EMPLOYMENT_FORMATS = ['gph', 'self_employed'] satisfies EmploymentFormat[];

// === Helpers =========================================================

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

// === Per-city rates ==================================================

type YandexEdaCityRate = {
  city: string;
  citizenship: string;
  rates: Record<YandexEdaTransportMode, number>;
};

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

/**
 * City → citizenship label index, also consumed by Купер via
 * `kuper.ts` (Kuper inherits Yandex's per-city citizenship label
 * because Kuper's source sheet doesn't ship one).
 */
export const yandexCitizenshipByCity = new Map(
  yandexEdaCityRates.map((cityRate) => [cityRate.city, cityRate.citizenship]),
);

/**
 * City → per-hour transport rates (foot / bicycle / auto), consumed by
 * `utils/yandexCityRates.ts` as the Купер-less fallback rate source for
 * the city-insights block (Z1.1). Keyed by the exact Russian city name
 * used across the vacancy data (matches `getCityShiftRates`).
 */
export const yandexEdaRatesByCity = new Map(
  yandexEdaCityRates.map((cityRate) => [cityRate.city, cityRate.rates]),
);

// === Content =========================================================

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

const yandexEdaContent: VacancyContent = {
  title: '{transportTitle} в Яндекс Еда {cityPrep}',
  shortDescription:
    'Доставка заказов через Я.Про рядом с домом, свободный график от 2 часов и прозрачный доход.',
  description:
    'Яндекс Еда набирает курьеров. Город подключения: {city}. Вы доставляете заказы по понятным маршрутам через приложение «Я.Про»: можно выбирать район, выходить на слоты от 2 часов, брать паузы и видеть доход по заказам заранее.',
  requirements: [...requirements],
  benefits: [...benefits],
  requiredDocuments: [...baseRequiredDocuments],
  searchTags: ['Яндекс Еда', 'курьер', 'Я.Про', 'доставка еды', 'свободный график'],
};

// === Offer construction ==============================================

const createOffer = (
  cityRate: YandexEdaCityRate,
  transport: YandexEdaTransportMode,
  cityIndex: number,
): VacancyOffer => {
  const hourly = cityRate.rates[transport];

  return {
    city: cityRate.city,
    transport,
    pay: buildPay(hourly),
    // Always-active per CPA-aggregator policy (PR #C3 — no concept
    // of disabled vacancies on this site).
    isActive: true,
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
    ...(transport === 'bicycle'
      ? {
          transportProvision: 'own_or_partner_rental' as const,
          benefitsOverride: [
            'Для велокурьеров доступны предложения на аренду и покупку велосипедов и электротранспорта у партнёров.',
          ],
        }
      : {}),
  };
};

// === Source ==========================================================

export const yandexEdaSource: VacancySource = {
  id: 1,
  slug: 'yandex-eda-courier',
  company: {
    name: 'Яндекс Еда',
    // Local SVG instead of Wikimedia hot-linking — Wikimedia
    // hot-linking is fragile (policy restrictions, lazy CDN behaviour)
    // and the bundled `/public/logos/yandex-eda.svg` exists for this.
    logo: '/logos/yandex-eda.svg',
  },
  content: yandexEdaContent,
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
  // `flexible` is no longer hardcoded here — it is derived from `schedule`
  // in jobs.ts (src/utils/flexibleSchedule.ts). Yandex Eda's "Свободный
  // график от 2 часов" matches that rule, so all 399 jobs still get it.
  extraTags: ['food_delivery', 'yandex_eda', 'source:google-sheet'],
  isHot: true,
};

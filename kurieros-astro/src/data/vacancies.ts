import descriptionTranslationsSource from './vacancy-description-translations.json';
import kuperPayRatesSource from './kuper-pay-rates.json';
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
const KUPER_DEFAULT_CITIZENSHIP = 'РФ / ЕАЭС / страны вне ЕАЭС при наличии ВНЖ и патента';

type KuperPayRates = {
  sourceUrl: string;
  exportedAt: string;
  footAndBikeShiftByCity: Record<string, number>;
  autoShiftByCity: Record<string, number>;
  packerShiftByCity: Record<string, number>;
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

const yandexEdaCityRates: YandexEdaCityRate[] = [
  { city: 'Адлер', citizenship: 'РФ', rates: { foot: 445, bicycle: 440, auto: 672 } },
  { city: 'Альметьевск', citizenship: 'РФ', rates: { foot: 270, bicycle: 314, auto: 357 } },
  { city: 'Анапа', citizenship: 'РФ', rates: { foot: 180, bicycle: 406, auto: 392 } },
  { city: 'Апрелевка', citizenship: 'РФ', rates: { foot: 357, bicycle: 504, auto: 494 } },
  { city: 'Архангельск', citizenship: 'РФ', rates: { foot: 168, bicycle: 273, auto: 477 } },
  { city: 'Астрахань', citizenship: 'РФ', rates: { foot: 257, bicycle: 409, auto: 577 } },
  { city: 'Балаково', citizenship: 'РФ', rates: { foot: 253, bicycle: 273, auto: 319 } },
  { city: 'Балашиха', citizenship: 'РФ / ЕАЭС / страны вне ЕАЭС при наличии ВНЖ и патента', rates: { foot: 380, bicycle: 519, auto: 675 } },
  { city: 'Барнаул', citizenship: 'РФ', rates: { foot: 176, bicycle: 372, auto: 599 } },
  { city: 'Батайск', citizenship: 'РФ', rates: { foot: 253, bicycle: 286, auto: 484 } },
  { city: 'Белгород', citizenship: 'РФ', rates: { foot: 254, bicycle: 404, auto: 502 } },
  { city: 'Бердск', citizenship: 'РФ', rates: { foot: 253, bicycle: 393, auto: 346 } },
  { city: 'Брянск', citizenship: 'РФ', rates: { foot: 270, bicycle: 431, auto: 516 } },
  { city: 'Великий Новгород', citizenship: 'РФ', rates: { foot: 253, bicycle: 370, auto: 562 } },
  { city: 'Видное', citizenship: 'РФ / ЕАЭС / страны вне ЕАЭС при наличии ВНЖ и патента', rates: { foot: 269, bicycle: 358, auto: 547 } },
  { city: 'Владивосток', citizenship: 'РФ', rates: { foot: 402, bicycle: 695, auto: 843 } },
  { city: 'Владикавказ', citizenship: 'РФ', rates: { foot: 285, bicycle: 350, auto: 435 } },
  { city: 'Владимир', citizenship: 'РФ', rates: { foot: 180, bicycle: 398, auto: 597 } },
  { city: 'Волгоград', citizenship: 'РФ', rates: { foot: 221, bicycle: 398, auto: 482 } },
  { city: 'Волжский', citizenship: 'РФ', rates: { foot: 192, bicycle: 394, auto: 431 } },
  { city: 'Вологда', citizenship: 'РФ', rates: { foot: 145, bicycle: 325, auto: 503 } },
  { city: 'Воронеж', citizenship: 'РФ', rates: { foot: 522, bicycle: 549, auto: 592 } },
  { city: 'Выборг', citizenship: 'РФ', rates: { foot: 320, bicycle: 379, auto: 511 } },
  { city: 'Дзержинск', citizenship: 'РФ', rates: { foot: 320, bicycle: 351, auto: 538 } },
  { city: 'Дмитров', citizenship: 'РФ', rates: { foot: 320, bicycle: 459, auto: 623 } },
  { city: 'Долгопрудный', citizenship: 'РФ / ЕАЭС / страны вне ЕАЭС при наличии ВНЖ и патента', rates: { foot: 346, bicycle: 486, auto: 579 } },
  { city: 'Домодедово', citizenship: 'РФ / ЕАЭС / страны вне ЕАЭС при наличии ВНЖ и патента', rates: { foot: 454, bicycle: 472, auto: 563 } },
  { city: 'Дубна', citizenship: 'РФ', rates: { foot: 269, bicycle: 468, auto: 401 } },
  { city: 'Егорьевск', citizenship: 'РФ', rates: { foot: 179, bicycle: 399, auto: 440 } },
  { city: 'Екатеринбург', citizenship: 'РФ / ЕАЭС', rates: { foot: 251, bicycle: 446, auto: 588 } },
  { city: 'Железнодорожный', citizenship: 'РФ / ЕАЭС / страны вне ЕАЭС при наличии ВНЖ и патента', rates: { foot: 316, bicycle: 422, auto: 407 } },
  { city: 'Жуковский', citizenship: 'РФ / ЕАЭС / страны вне ЕАЭС при наличии ВНЖ и патента', rates: { foot: 320, bicycle: 333, auto: 647 } },
  { city: 'Зеленоград', citizenship: 'РФ / ЕАЭС / страны вне ЕАЭС при наличии ВНЖ и патента', rates: { foot: 403, bicycle: 528, auto: 564 } },
  { city: 'Иваново', citizenship: 'РФ', rates: { foot: 219, bicycle: 328, auto: 588 } },
  { city: 'Ивантеевка', citizenship: 'РФ / ЕАЭС / страны вне ЕАЭС при наличии ВНЖ и патента', rates: { foot: 389, bicycle: 347, auto: 480 } },
  { city: 'Ижевск', citizenship: 'РФ', rates: { foot: 270, bicycle: 586, auto: 625 } },
  { city: 'Иркутск', citizenship: 'РФ', rates: { foot: 292, bicycle: 459, auto: 501 } },
  { city: 'Йошкар-Ола', citizenship: 'РФ', rates: { foot: 339, bicycle: 445, auto: 439 } },
  { city: 'Казань', citizenship: 'РФ / ЕАЭС', rates: { foot: 379, bicycle: 464, auto: 588 } },
  { city: 'Калининград', citizenship: 'РФ', rates: { foot: 306, bicycle: 485, auto: 694 } },
  { city: 'Калуга', citizenship: 'РФ', rates: { foot: 347, bicycle: 495, auto: 583 } },
  { city: 'Кемерово', citizenship: 'РФ', rates: { foot: 137, bicycle: 284, auto: 390 } },
  { city: 'Киров', citizenship: 'РФ', rates: { foot: 228, bicycle: 455, auto: 688 } },
  { city: 'Клин', citizenship: 'РФ', rates: { foot: 320, bicycle: 409, auto: 487 } },
  { city: 'Коломна', citizenship: 'РФ', rates: { foot: 262, bicycle: 394, auto: 514 } },
  { city: 'Колпино', citizenship: 'РФ / ЕАЭС', rates: { foot: 160, bicycle: 336, auto: 506 } },
  { city: 'Королёв', citizenship: 'РФ / ЕАЭС / страны вне ЕАЭС при наличии ВНЖ и патента', rates: { foot: 391, bicycle: 489, auto: 435 } },
  { city: 'Кострома', citizenship: 'РФ', rates: { foot: 176, bicycle: 267, auto: 490 } },
  { city: 'Красногорск', citizenship: 'РФ / ЕАЭС / страны вне ЕАЭС при наличии ВНЖ и патента', rates: { foot: 521, bicycle: 533, auto: 473 } },
  { city: 'Краснодар', citizenship: 'РФ / ЕАЭС', rates: { foot: 477, bicycle: 549, auto: 448 } },
  { city: 'Красноярск', citizenship: 'РФ', rates: { foot: 277, bicycle: 475, auto: 589 } },
  { city: 'Курган', citizenship: 'РФ', rates: { foot: 252, bicycle: 178, auto: 404 } },
  { city: 'Курск', citizenship: 'РФ', rates: { foot: 310, bicycle: 395, auto: 581 } },
  { city: 'Липецк', citizenship: 'РФ', rates: { foot: 242, bicycle: 390, auto: 576 } },
  { city: 'Лобня', citizenship: 'РФ / ЕАЭС / страны вне ЕАЭС при наличии ВНЖ и патента', rates: { foot: 320, bicycle: 359, auto: 576 } },
  { city: 'Лыткарино', citizenship: 'РФ', rates: { foot: 320, bicycle: 466, auto: 511 } },
  { city: 'Люберцы', citizenship: 'РФ / ЕАЭС / страны вне ЕАЭС при наличии ВНЖ и патента', rates: { foot: 402, bicycle: 503, auto: 954 } },
  { city: 'Магнитогорск', citizenship: 'РФ', rates: { foot: 195, bicycle: 331, auto: 411 } },
  { city: 'Майкоп', citizenship: 'РФ', rates: { foot: 197, bicycle: 311, auto: 452 } },
  { city: 'Москва', citizenship: 'РФ / ЕАЭС / страны вне ЕАЭС при наличии ВНЖ и патента', rates: { foot: 297, bicycle: 517, auto: 830 } },
  { city: 'Мурманск', citizenship: 'РФ', rates: { foot: 381, bicycle: 418, auto: 573 } },
  { city: 'Мытищи', citizenship: 'РФ / ЕАЭС / страны вне ЕАЭС при наличии ВНЖ и патента', rates: { foot: 439, bicycle: 512, auto: 698 } },
  { city: 'Набережные Челны', citizenship: 'РФ', rates: { foot: 270, bicycle: 352, auto: 526 } },
  { city: 'Нальчик', citizenship: 'РФ', rates: { foot: 268, bicycle: 468, auto: 510 } },
  { city: 'Наро-Фоминск', citizenship: 'РФ / ЕАЭС / страны вне ЕАЭС при наличии ВНЖ и патента', rates: { foot: 295, bicycle: 415, auto: 559 } },
  { city: 'Нефтекамск', citizenship: 'РФ', rates: { foot: 145, bicycle: 128, auto: 404 } },
  { city: 'Нижневартовск', citizenship: 'РФ', rates: { foot: 266, bicycle: 331, auto: 401 } },
  { city: 'Нижнекамск', citizenship: 'РФ', rates: { foot: 252, bicycle: 342, auto: 495 } },
  { city: 'Нижний Новгород', citizenship: 'РФ / ЕАЭС', rates: { foot: 257, bicycle: 449, auto: 677 } },
  { city: 'Нижний Тагил', citizenship: 'РФ', rates: { foot: 252, bicycle: 222, auto: 404 } },
  { city: 'Новокузнецк', citizenship: 'РФ', rates: { foot: 183, bicycle: 332, auto: 505 } },
  { city: 'Новомосковск', citizenship: 'РФ', rates: { foot: 252, bicycle: 398, auto: 527 } },
  { city: 'Новороссийск', citizenship: 'РФ', rates: { foot: 490, bicycle: 536, auto: 487 } },
  { city: 'Новосибирск', citizenship: 'РФ / ЕАЭС', rates: { foot: 310, bicycle: 488, auto: 570 } },
  { city: 'Новый Уренгой', citizenship: 'РФ', rates: { foot: 473, bicycle: 589, auto: 562 } },
  { city: 'Ногинск', citizenship: 'РФ', rates: { foot: 193, bicycle: 512, auto: 494 } },
  { city: 'Обнинск', citizenship: 'РФ', rates: { foot: 171, bicycle: 588, auto: 603 } },
  { city: 'Одинцово', citizenship: 'РФ / ЕАЭС / страны вне ЕАЭС при наличии ВНЖ и патента', rates: { foot: 411, bicycle: 556, auto: 832 } },
  { city: 'Омск', citizenship: 'РФ', rates: { foot: 252, bicycle: 402, auto: 518 } },
  { city: 'Орел', citizenship: 'РФ', rates: { foot: 301, bicycle: 322, auto: 431 } },
  { city: 'Оренбург', citizenship: 'РФ', rates: { foot: 193, bicycle: 396, auto: 459 } },
  { city: 'Орехово-Зуево', citizenship: 'РФ', rates: { foot: 320, bicycle: 499, auto: 494 } },
  { city: 'Павловский Посад', citizenship: 'РФ', rates: { foot: 320, bicycle: 476, auto: 484 } },
  { city: 'Пенза', citizenship: 'РФ', rates: { foot: 154, bicycle: 290, auto: 418 } },
  { city: 'Пермь', citizenship: 'РФ', rates: { foot: 285, bicycle: 459, auto: 536 } },
  { city: 'Петрозаводск', citizenship: 'РФ', rates: { foot: 173, bicycle: 371, auto: 581 } },
  { city: 'Подольск', citizenship: 'РФ / ЕАЭС / страны вне ЕАЭС при наличии ВНЖ и патента', rates: { foot: 418, bicycle: 476, auto: 618 } },
  { city: 'Псков', citizenship: 'РФ', rates: { foot: 281, bicycle: 548, auto: 409 } },
  { city: 'Пушкин', citizenship: 'РФ', rates: { foot: 320, bicycle: 383, auto: 511 } },
  { city: 'Пушкино', citizenship: 'РФ / ЕАЭС / страны вне ЕАЭС при наличии ВНЖ и патента', rates: { foot: 349, bicycle: 446, auto: 625 } },
  { city: 'Пятигорск', citizenship: 'РФ', rates: { foot: 344, bicycle: 465, auto: 655 } },
  { city: 'Раменское', citizenship: 'РФ / ЕАЭС / страны вне ЕАЭС при наличии ВНЖ и патента', rates: { foot: 398, bicycle: 402, auto: 530 } },
  { city: 'Реутов', citizenship: 'РФ / ЕАЭС / страны вне ЕАЭС при наличии ВНЖ и патента', rates: { foot: 479, bicycle: 400, auto: 371 } },
  { city: 'Ростов-на-Дону', citizenship: 'РФ', rates: { foot: 470, bicycle: 534, auto: 602 } },
  { city: 'Рязань', citizenship: 'РФ', rates: { foot: 304, bicycle: 489, auto: 631 } },
  { city: 'Самара', citizenship: 'РФ', rates: { foot: 365, bicycle: 514, auto: 579 } },
  { city: 'Санкт-Петербург', citizenship: 'РФ / ЕАЭС', rates: { foot: 288, bicycle: 548, auto: 672 } },
  { city: 'Саранск', citizenship: 'РФ', rates: { foot: 160, bicycle: 329, auto: 462 } },
  { city: 'Саратов', citizenship: 'РФ', rates: { foot: 293, bicycle: 396, auto: 539 } },
  { city: 'Сергиев Посад', citizenship: 'РФ / ЕАЭС / страны вне ЕАЭС при наличии ВНЖ и патента', rates: { foot: 352, bicycle: 474, auto: 547 } },
  { city: 'Серпухов', citizenship: 'РФ / ЕАЭС / страны вне ЕАЭС при наличии ВНЖ и патента', rates: { foot: 171, bicycle: 413, auto: 578 } },
  { city: 'Смоленск', citizenship: 'РФ', rates: { foot: 520, bicycle: 584, auto: 638 } },
  { city: 'Солнечногорск', citizenship: 'РФ / ЕАЭС / страны вне ЕАЭС при наличии ВНЖ и патента', rates: { foot: 320, bicycle: 476, auto: 480 } },
  { city: 'Сочи', citizenship: 'РФ', rates: { foot: 683, bicycle: 642, auto: 655 } },
  { city: 'Ставрополь', citizenship: 'РФ', rates: { foot: 215, bicycle: 380, auto: 561 } },
  { city: 'Старый Оскол', citizenship: 'РФ', rates: { foot: 190, bicycle: 406, auto: 488 } },
  { city: 'Стерлитамак', citizenship: 'РФ', rates: { foot: 150, bicycle: 315, auto: 437 } },
  { city: 'Ступино', citizenship: 'РФ / ЕАЭС / страны вне ЕАЭС при наличии ВНЖ и патента', rates: { foot: 255, bicycle: 304, auto: 439 } },
  { city: 'Сургут', citizenship: 'РФ', rates: { foot: 259, bicycle: 372, auto: 548 } },
  { city: 'Сыктывкар', citizenship: 'РФ', rates: { foot: 216, bicycle: 300, auto: 394 } },
  { city: 'Таганрог', citizenship: 'РФ', rates: { foot: 269, bicycle: 459, auto: 460 } },
  { city: 'Тамбов', citizenship: 'РФ', rates: { foot: 352, bicycle: 425, auto: 537 } },
  { city: 'Тверь', citizenship: 'РФ', rates: { foot: 213, bicycle: 397, auto: 608 } },
  { city: 'Тольятти', citizenship: 'РФ', rates: { foot: 312, bicycle: 422, auto: 506 } },
  { city: 'Томск', citizenship: 'РФ', rates: { foot: 195, bicycle: 337, auto: 581 } },
  { city: 'Троицк', citizenship: 'РФ / ЕАЭС / страны вне ЕАЭС при наличии ВНЖ и патента', rates: { foot: 276, bicycle: 304, auto: 511 } },
  { city: 'Тула', citizenship: 'РФ', rates: { foot: 386, bicycle: 542, auto: 497 } },
  { city: 'Тюмень', citizenship: 'РФ', rates: { foot: 306, bicycle: 359, auto: 527 } },
  { city: 'Ульяновск', citizenship: 'РФ', rates: { foot: 212, bicycle: 395, auto: 466 } },
  { city: 'Уфа', citizenship: 'РФ', rates: { foot: 305, bicycle: 441, auto: 527 } },
  { city: 'Фрязино', citizenship: 'РФ', rates: { foot: 320, bicycle: 414, auto: 437 } },
  { city: 'Хабаровск', citizenship: 'РФ', rates: { foot: 540, bicycle: 721, auto: 645 } },
  { city: 'Ханты-Мансийск', citizenship: 'РФ', rates: { foot: 136, bicycle: 254, auto: 351 } },
  { city: 'Химки', citizenship: 'РФ / ЕАЭС / страны вне ЕАЭС при наличии ВНЖ и патента', rates: { foot: 451, bicycle: 521, auto: 537 } },
  { city: 'Чебоксары', citizenship: 'РФ', rates: { foot: 258, bicycle: 369, auto: 469 } },
  { city: 'Челябинск', citizenship: 'РФ', rates: { foot: 299, bicycle: 467, auto: 557 } },
  { city: 'Череповец', citizenship: 'РФ', rates: { foot: 178, bicycle: 363, auto: 568 } },
  { city: 'Чехов', citizenship: 'РФ / ЕАЭС / страны вне ЕАЭС при наличии ВНЖ и патента', rates: { foot: 320, bicycle: 691, auto: 806 } },
  { city: 'Шахты', citizenship: 'РФ', rates: { foot: 253, bicycle: 415, auto: 358 } },
  { city: 'Щелково', citizenship: 'РФ / ЕАЭС / страны вне ЕАЭС при наличии ВНЖ и патента', rates: { foot: 227, bicycle: 383, auto: 630 } },
  { city: 'Щербинка', citizenship: 'РФ / ЕАЭС / страны вне ЕАЭС при наличии ВНЖ и патента', rates: { foot: 320, bicycle: 444, auto: 511 } },
  { city: 'Электросталь', citizenship: 'РФ / ЕАЭС / страны вне ЕАЭС при наличии ВНЖ и патента', rates: { foot: 175, bicycle: 410, auto: 524 } },
  { city: 'Ярославль', citizenship: 'РФ', rates: { foot: 251, bicycle: 408, auto: 580 } },
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
    ageFrom: 18,
    citizenship: cityRate.citizenship,
    medicalBook: 'required',
    employmentFormats: [...YANDEX_EDA_EMPLOYMENT_FORMATS],
    schedule: 'Свободный график от 2 часов',
    applyLink: buildYandexEdaApplyLink(cityRate.city, transport),
    priority: 2000 - cityIndex * 10 + TRANSPORT_PRIORITY[transport],
    requiredDocumentsOverride: getRequiredDocumentOverrides(cityRate.citizenship),
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

  return {
    city,
    transport,
    pay: buildPay(toHourlyFromShift(shiftPer12Hours)),
    isActive: true,
    updatedAt: KUPER_UPDATED_AT,
    sourceUrl: KUPER_PAY_SOURCE_URL,
    salaryConfidence: 'partner',
    ageFrom: 18,
    citizenship,
    medicalBook: 'required',
    employmentFormats: [...KUPER_EMPLOYMENT_FORMATS],
    schedule,
    applyLink: buildKuperApplyLink(baseApplyLink, city, role),
    priority: priorityBase - cityIndex * 10 + TRANSPORT_PRIORITY[transport],
    requiredDocumentsOverride: getRequiredDocumentOverrides(citizenship),
    ...(benefitsOverride?.length ? { benefitsOverride } : {}),
    ...(transportProvision ? { transportProvision } : {}),
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

export const vacancySources = [
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
      citizenship: 'РФ / ЕАЭС / страны вне ЕАЭС при наличии ВНЖ и патента',
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
] satisfies VacancySource[];

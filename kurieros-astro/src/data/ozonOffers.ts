/**
 * Ozon vacancy generator — turns the live form catalogue
 * (`./ozon-vacancies.json`, refreshed via
 * `node tools/fetch-ozon-vacancies.mjs`) into 5 ready-to-use
 * `VacancySource` entries (one per backend `combineCustomerVacancy`
 * slug), each with N offers (one per supported city).
 *
 * Why this shape:
 *   • The Ozon form maps 7 dropdown labels onto 5 backend slugs
 *     (rocket:courier covers «Курьер на личном легковом авто»,
 *     «Курьер на личном грузовом авто», и «Курьер на автомобиле
 *     компании» — the form differentiates only client-side).
 *   • For SEO/UI we still want one vacancy *page* per (role × city)
 *     pair so each route has unique title/description/keywords.
 *   • The runtime contract with the lead-form Worker is the
 *     `(vacancy, cityID, hireObjectUUID)` triple, so each offer
 *     carries `ozonLeadForm` metadata that the modal forwards to
 *     `kurerok-ozon-lead.shutovdef.workers.dev/lead`.
 *
 * Re-run `node tools/build-worker-whitelist.mjs` after editing this
 * file or refreshing `ozon-vacancies.json` so the Worker's
 * `src/whitelist.js` stays in sync (otherwise legitimate leads will
 * 400 with `invalid_vacancy_city_combination`).
 */

import { z } from 'zod';
import ozonVacanciesData from './ozon-vacancies.json';
import ozonFreshVacanciesData from './ozon-fresh-vacancies.json';
import { formatRub } from './sources/shared';
import type {
  EmploymentFormat,
  OzonLeadFormMeta,
  TransportMode,
  VacancyContent,
  VacancyOffer,
  VacancySource,
} from './vacancyTypes';

// === Constants ========================================================
// Partner URLs/logos centralized in `./partnerLinks.ts`. Local ALL_CAPS
// aliases re-export them so the rest of this file stays readable.
import {
  OZON_LOGO,
  OZON_FRESH_LOGO,
  OZON_LEAD_APPLY as OZON_LEAD_APPLY_PARTNER,
  OZON_REF_LANDING_SKLAD as OZON_REF_LANDING_SKLAD_PARTNER,
  OZON_REF_LANDING_FRESH as OZON_REF_LANDING_FRESH_PARTNER,
} from './partnerLinks';

const OZON_COMPANY_NAME = 'Ozon';
const OZON_COMPANY_LOGO = OZON_LOGO;
const OZON_FRESH_COMPANY_NAME = 'Ozon fresh';
// `ozon-fresh.svg` was never added to /public/logos/ — fall back to
// the parent Ozon brand mark to avoid the broken-image placeholder.
// Replace with a dedicated `/logos/ozon-fresh.svg` once design ships it.
const OZON_FRESH_COMPANY_LOGO = OZON_FRESH_LOGO;
const OZON_LEAD_APPLY = OZON_LEAD_APPLY_PARTNER;
const OZON_REF_LANDING_SKLAD = OZON_REF_LANDING_SKLAD_PARTNER;
const OZON_REF_LANDING_FRESH = OZON_REF_LANDING_FRESH_PARTNER;
// Backwards-compat alias used by the long-standing courier template.
const OZON_REF_LANDING = OZON_REF_LANDING_SKLAD;
const OZON_UPDATED_AT = new Date().toISOString().slice(0, 10);

// === Types ===========================================================

/** sklad slugs — combineCustomerVacancy values from ref-courier-sklad. */
type OzonSkladSlug =
  | 'rocket:courier'
  | 'ff:truckDriver'
  | 'ff:operator'
  | 'ff:electricStackerDriver'
  | 'ff:brigadier';

/** Fresh slugs — composite `${customer}:${vacancy}` from fresh-referral-office. */
type OzonFreshSlug =
  | 'express:courier'
  | 'express:operator'
  | 'express:adminPersonal'
  | 'express:factoryKitchen';

type OzonRoleSlug = OzonSkladSlug | OzonFreshSlug;

type OzonRoleTemplate = {
  /** combineCustomerVacancy slug (sklad) or `${customer}:${vacancy}` (Fresh). */
  slug: OzonRoleSlug;
  /**
   * `'express'` for Fresh (fresh-referral-office), undefined for sklad
   * (ref-courier-sklad). Drives Worker payload-shape branching.
   */
  customer?: 'express';
  /** URL slug (kurerok.ru/v/<sourceSlug>-<city>-<transport>/). */
  sourceSlug: string;
  /** VacancySource.id — keeps numeric IDs stable across Ozon roles. */
  sourceId: number;
  /** Display brand on cards (defaults: 'Ozon' / sklad logo). */
  companyName?: string;
  companyLogo?: string;
  /** Where the lead lands upstream (defaults: ref-courier-sklad URL). */
  refLanding?: string;
  transport: TransportMode;
  content: VacancyContent;
  /** Lower bound for the human-readable monthly salary text. */
  monthlyMinRub: number;
  rateLine: string;
  paymentFrequency: string;
  scheduleText: string;
  ageFrom: number;
  citizenship: string;
  medicalBook: 'required' | 'not_required';
  employmentFormats: EmploymentFormat[];
  uniformText: string;
  educationText: string;
  extraTags: string[];
  /** Lower number → lower priority on listings. Courier stays at top. */
  priorityBase: number;
  isHot?: boolean;
};

// === Helpers =========================================================

// `formatRub` lives in `./sources/shared.ts` — it normalises ICU's
// non-ASCII thousands separators (U+00A0 / U+202F) so Ozon's rendered
// salary doesn't visibly drift from other partners depending on the
// runtime ICU version.

const monthlyText = (min: number) => `от ${formatRub(min)} ₽/мес`;

/** Strip leading "г. " from city names for cleaner display + slugs. */
const normalizeCity = (raw: string) => raw.replace(/^г\.\s*/i, '').trim();

// === Templates =======================================================

const COURIER_TEMPLATE: OzonRoleTemplate = {
  slug: 'rocket:courier',
  sourceSlug: 'ozon-courier',
  sourceId: 10,
  transport: 'auto',
  content: {
    title: 'Автокурьер Ozon {cityPrep}',
    shortDescription:
      'Доставка заказов на личном легковом или служебном авто Ozon. Гибкий график, еженедельные выплаты, регистрация через Госуслуги.',
    description:
      'Ozon ищет автокурьеров для доставки заказов клиентам {city}. Можно работать на собственном легковом или грузовом авто, либо взять служебный автомобиль компании. Формат — самозанятость или ИП. Регистрация и обучение проходят в приложении Ozon Job через Госуслуги. Свободный график, можно совмещать с другими подработками. Выплаты раз в неделю напрямую на карту. Подключение через нашу заявку: оставьте контакты — мы передадим их в Ozon, после чего вам придёт SMS со ссылкой на регистрацию.',
    requirements: [
      'Возраст от 18 лет.',
      'Гражданство РФ или ЕАЭС.',
      'Личный или служебный автомобиль (легковой / грузовой).',
      'Действующее водительское удостоверение категории B.',
      'Самозанятость или ИП (поможем оформить за 5 минут через «Мой налог»).',
      'Готовность пройти онбординг в приложении Ozon Job через Госуслуги.',
    ],
    benefits: [
      'Доход от 100 000 ₽ в месяц при полной загрузке.',
      'Еженедельные выплаты напрямую на карту.',
      'Свободный график — берёте слоты в приложении сами.',
      'Бонус за регистрацию по реферальному коду после первой смены.',
      'Дополнительные бонусы за брендирование автомобиля.',
      'Прямая поддержка от нас на всех этапах онбординга.',
    ],
    requiredDocuments: [
      'Паспорт РФ или ЕАЭС.',
      'Водительское удостоверение категории B.',
      'Свидетельство о регистрации ТС или договор аренды.',
      'Регистрация в «Мой налог» (самозанятость) или ИП.',
    ],
    searchTags: [
      'Ozon',
      'Озон',
      'автокурьер',
      'самозанятость',
      'личный автомобиль',
      'служебный автомобиль',
    ],
  },
  monthlyMinRub: 100_000,
  rateLine: 'Тариф за заказ + бонусы за брендирование автомобиля',
  paymentFrequency: 'Еженедельно',
  scheduleText: 'Свободный график, слоты от 4 часов',
  ageFrom: 18,
  citizenship: 'РФ / ЕАЭС',
  medicalBook: 'not_required',
  employmentFormats: ['self_employed', 'individual_entrepreneur'],
  uniformText: 'Брендированный автомобиль (за бонус)',
  educationText: 'Не требуется',
  extraTags: ['ozon', 'auto', 'self-employed', 'lead-form'],
  priorityBase: 1700,
  isHot: true,
};

const TRUCK_DRIVER_TEMPLATE: OzonRoleTemplate = {
  slug: 'ff:truckDriver',
  sourceSlug: 'ozon-truck-driver',
  sourceId: 11,
  transport: 'auto',
  content: {
    title: 'Водитель-экспедитор Ozon {cityPrep}',
    shortDescription:
      'Доставка товаров между складами и точками выдачи Ozon на грузовом автомобиле компании. Официальное оформление, стабильный доход.',
    description:
      'Ozon приглашает водителей-экспедиторов на грузовой автомобиль компании {cityPrep}. Маршруты — между складами Ozon, дарксторами и пунктами выдачи. Оформление по ТК РФ или ГПХ, бесплатная медицинская комиссия, корпоративная связь и форма. Стабильный график 5/2 или 2/2, оплата сверхурочных и ночных смен. Подключение через нашу заявку: оставьте контакты — Ozon свяжется с вами для оформления.',
    requirements: [
      'Возраст от 21 года.',
      'Гражданство РФ или ЕАЭС.',
      'Водительское удостоверение категории B / C (стаж от 1 года).',
      'Готовность к сменной работе и командировкам в пределах региона.',
      'Внимательность к документам и ответственности за груз.',
    ],
    benefits: [
      'Официальное оформление по ТК РФ — белая зарплата 2 раза в месяц.',
      'Грузовой автомобиль и топливо за счёт компании.',
      'Корпоративная медкомиссия и форма.',
      'Доплата за сверхурочные, ночные смены и работу в выходные.',
      'Льготная корпоративная связь и питание на складах.',
      'Подключение через наш реферальный канал — вы быстрее проходите оформление.',
    ],
    requiredDocuments: [
      'Паспорт РФ или ЕАЭС.',
      'Водительское удостоверение категории B / C.',
      'Трудовая книжка / СНИЛС / ИНН.',
      'Медицинская справка (если есть; иначе пройдёте бесплатно).',
    ],
    searchTags: [
      'Ozon',
      'Озон',
      'водитель',
      'экспедитор',
      'грузовой автомобиль',
      'категория C',
    ],
  },
  monthlyMinRub: 90_000,
  rateLine: 'Оклад + надбавки за сверхурочные и ночные смены',
  paymentFrequency: '2 раза в месяц',
  scheduleText: 'Сменный график 5/2 или 2/2',
  ageFrom: 21,
  citizenship: 'РФ / ЕАЭС',
  medicalBook: 'not_required',
  employmentFormats: ['official', 'gph'],
  uniformText: 'Брендированная форма от компании',
  educationText: 'Не требуется',
  extraTags: ['ozon', 'auto', 'official-employment', 'lead-form', 'truck-driver'],
  priorityBase: 1400,
};

const OPERATOR_TEMPLATE: OzonRoleTemplate = {
  slug: 'ff:operator',
  sourceSlug: 'ozon-warehouse-operator',
  sourceId: 12,
  transport: 'foot',
  content: {
    title: 'Оператор склада Ozon {cityPrep}',
    shortDescription:
      'Сборка, упаковка и сортировка заказов на фулфилмент-складе Ozon. Сменный график, еженедельные выплаты, бесплатное питание.',
    description:
      'Ozon приглашает операторов склада {cityPrep} — сборка заказов клиентов, упаковка и сортировка товаров. Работа в современном тёплом складе, без улицы и погоды. Сменный график 2/2 или 5/2 — выбираете удобный, можно подрабатывать в выходные. Бесплатное питание, корпоративный транспорт от метро / ж/д станции, льготная медкомиссия. Подключение через нашу заявку: оставьте контакты — Ozon пришлёт SMS с приглашением на смену.',
    requirements: [
      'Возраст от 18 лет.',
      'Гражданство РФ, ЕАЭС или СНГ.',
      'Готовность работать стоя и поднимать груз до 15 кг.',
      'Без опыта — обучение на месте за 1 смену.',
    ],
    benefits: [
      'Доход от 70 000 ₽ в месяц при полной загрузке.',
      'Сменный график 2/2 или 5/2 на выбор.',
      'Бесплатное горячее питание в столовой.',
      'Корпоративный транспорт от ближайшего метро / станции.',
      'Льготная медицинская комиссия и форма.',
      'Подработки в выходные — оплата выше тарифа.',
    ],
    requiredDocuments: [
      'Паспорт РФ, ЕАЭС или СНГ.',
      'Патент / РВП / ВНЖ для иностранных граждан.',
      'СНИЛС и ИНН.',
    ],
    // NB: 'сборщик' deliberately omitted — that's a darkstore/supermarket
    // picker role (Kuper, Ozon Fresh order-picker). FF warehouse operator
    // does picking too, but matching «сборщик» queries here causes
    // off-intent impressions and high bounce. Stick to fulfillment-domain
    // synonyms (оператор склада / комплектовщик / упаковщик / фулфилмент).
    searchTags: [
      'Ozon',
      'Озон',
      'оператор склада',
      'комплектовщик',
      'упаковщик',
      'фулфилмент',
    ],
  },
  monthlyMinRub: 70_000,
  rateLine: 'Сменная оплата + надбавки за выработку',
  paymentFrequency: 'Еженедельно',
  scheduleText: 'Сменный график 2/2 или 5/2',
  ageFrom: 18,
  citizenship: 'РФ / ЕАЭС / СНГ',
  medicalBook: 'not_required',
  employmentFormats: ['gph', 'self_employed', 'official'],
  uniformText: 'Форма от компании',
  educationText: 'Не требуется',
  extraTags: ['ozon', 'warehouse', 'lead-form', 'no-experience'],
  priorityBase: 1500,
};

const STACKER_TEMPLATE: OzonRoleTemplate = {
  slug: 'ff:electricStackerDriver',
  sourceSlug: 'ozon-electric-stacker-driver',
  sourceId: 13,
  transport: 'foot',
  content: {
    title: 'Водитель электроштабелера Ozon {cityPrep}',
    shortDescription:
      'Управление электроштабелером и ричтраком на складе Ozon. Сменный график, оформление по ТК, обучение и допуск за счёт компании.',
    description:
      'Ozon приглашает водителей электроштабелера {cityPrep} — перемещение паллет на складе, погрузка и разгрузка. Современная техника (Jungheinrich, Linde), отдельные коридоры для пешеходов и техники. Если у вас нет действующего удостоверения — Ozon оплатит обучение и допуск. Сменный график 2/2 или 5/2, бесплатное питание и корпоративный транспорт. Подключение через нашу заявку.',
    requirements: [
      'Возраст от 21 года.',
      'Гражданство РФ или ЕАЭС.',
      'Удостоверение водителя погрузчика (если нет — обучим за счёт компании).',
      'Внимательность и готовность к сменному графику.',
    ],
    benefits: [
      'Доход от 90 000 ₽ в месяц при полной загрузке.',
      'Бесплатное обучение и удостоверение водителя погрузчика.',
      'Современная техника Jungheinrich / Linde.',
      'Бесплатное горячее питание в столовой.',
      'Корпоративный транспорт от метро / ж/д станции.',
      'Оформление по ТК РФ — белая зарплата 2 раза в месяц.',
    ],
    requiredDocuments: [
      'Паспорт РФ или ЕАЭС.',
      'Удостоверение водителя погрузчика (если есть).',
      'СНИЛС и ИНН.',
    ],
    searchTags: [
      'Ozon',
      'Озон',
      'электроштабелер',
      'водитель погрузчика',
      'ричтрак',
      'склад',
    ],
  },
  monthlyMinRub: 90_000,
  rateLine: 'Сменная оплата + надбавки за выработку',
  paymentFrequency: '2 раза в месяц',
  scheduleText: 'Сменный график 2/2 или 5/2',
  ageFrom: 21,
  citizenship: 'РФ / ЕАЭС',
  medicalBook: 'not_required',
  employmentFormats: ['official', 'gph'],
  uniformText: 'Форма и СИЗ от компании',
  educationText: 'Не требуется (обучение и допуск за счёт Ozon)',
  extraTags: ['ozon', 'warehouse', 'lead-form', 'forklift', 'official-employment'],
  priorityBase: 1300,
};

const BRIGADIER_TEMPLATE: OzonRoleTemplate = {
  slug: 'ff:brigadier',
  sourceSlug: 'ozon-goods-handler',
  sourceId: 14,
  transport: 'foot',
  content: {
    title: 'Специалист по обработке товаров Ozon {cityPrep}',
    shortDescription:
      'Приёмка, упаковка и отгрузка товаров на складе Ozon. Сменный график, еженедельные выплаты, обучение за счёт компании.',
    description:
      'Ozon приглашает специалистов по обработке товаров {cityPrep} — приёмка поступлений, упаковка заказов клиентов, отгрузка машинам. Работа в тёплом современном складе, без улицы. Без опыта — обучение на месте за 1 смену. Сменный график 2/2 или 5/2, бесплатное питание, корпоративный транспорт от метро. Подключение через нашу заявку: оставьте контакты — Ozon пришлёт SMS.',
    requirements: [
      'Возраст от 18 лет.',
      'Гражданство РФ, ЕАЭС или СНГ.',
      'Готовность работать стоя и поднимать груз до 15 кг.',
      'Без опыта — обучение в первую смену.',
    ],
    benefits: [
      'Доход от 65 000 ₽ в месяц при полной загрузке.',
      'Сменный график 2/2 или 5/2 на выбор.',
      'Бесплатное горячее питание в столовой.',
      'Корпоративный транспорт от ближайшего метро / станции.',
      'Подработки в выходные — оплата выше тарифа.',
      'Льготная медицинская комиссия и форма.',
    ],
    requiredDocuments: [
      'Паспорт РФ, ЕАЭС или СНГ.',
      'Патент / РВП / ВНЖ для иностранных граждан.',
      'СНИЛС и ИНН.',
    ],
    searchTags: [
      'Ozon',
      'Озон',
      'обработка товаров',
      'упаковщик',
      'фулфилмент',
      'без опыта',
    ],
  },
  monthlyMinRub: 65_000,
  rateLine: 'Сменная оплата + надбавки за выработку',
  paymentFrequency: 'Еженедельно',
  scheduleText: 'Сменный график 2/2 или 5/2',
  ageFrom: 18,
  citizenship: 'РФ / ЕАЭС / СНГ',
  medicalBook: 'not_required',
  employmentFormats: ['gph', 'self_employed', 'official'],
  uniformText: 'Форма от компании',
  educationText: 'Не требуется',
  extraTags: ['ozon', 'warehouse', 'lead-form', 'no-experience'],
  priorityBase: 1450,
};

// === Ozon Fresh (fresh-referral-office) templates ====================
// Все Fresh-офферы используют customer='express' и fullpath
// `https://recruitment.ozon.ru/fresh-referral-office`. Условия и
// зарплаты — из открытых источников Ozon Fresh / hh.ru / vc.ru
// (значения нижней границы; верхняя строится через city-based
// hourly-fallback в src/data/vacancies.ts).

const FRESH_COURIER_TEMPLATE: OzonRoleTemplate = {
  slug: 'express:courier',
  customer: 'express',
  sourceSlug: 'ozon-fresh-courier',
  sourceId: 15,
  companyName: OZON_FRESH_COMPANY_NAME,
  companyLogo: OZON_FRESH_COMPANY_LOGO,
  refLanding: OZON_REF_LANDING_FRESH,
  transport: 'foot',
  content: {
    title: 'Курьер Ozon fresh {cityPrep}',
    shortDescription:
      'Доставка свежих продуктов из дарксторов Ozon fresh пешком или на велосипеде. Заказы рядом, выплаты раз в неделю, регистрация через Госуслуги.',
    description:
      'Ozon fresh — доставка продуктов и готовой еды за 30–60 минут. Курьеры работают пешком, на велосипеде или самокате — заказы выдаются в дарксторе рядом с домом, маршрут выкручивается приложением. График свободный (слоты от 4 часов), выплаты раз в неделю на карту, бонусы за пик-часы и плохую погоду. Подключение через нашу заявку: оставьте контакты — Ozon пришлёт SMS со ссылкой на регистрацию в Госуслугах.',
    requirements: [
      'Возраст от 18 лет.',
      'Гражданство РФ, ЕАЭС или СНГ (для не-ЕАЭС нужны ВНЖ + патент).',
      'Самозанятость или ИП (поможем оформить за 5 минут через «Мой налог»).',
      'Готовность пройти онбординг в приложении Ozon Job через Госуслуги.',
      'Желательно — Android или iOS-смартфон с интернетом.',
    ],
    benefits: [
      'Доход от 80 000 ₽ в месяц при загрузке 5 смен в неделю.',
      'Еженедельные выплаты напрямую на карту.',
      'Свободный график — слоты от 4 часов, можно совмещать с учёбой.',
      'Бонусы за пик-часы (час пик и непогода — повышенный тариф).',
      'Брендированная форма Ozon fresh за счёт компании.',
      'Подключение через наш реферальный канал — быстрее проходите оформление.',
    ],
    requiredDocuments: [
      'Паспорт РФ, ЕАЭС или СНГ.',
      'Регистрация в «Мой налог» (самозанятость) или ИП.',
      'СНИЛС и ИНН.',
      'Патент / РВП / ВНЖ для иностранных граждан.',
    ],
    searchTags: [
      'Ozon fresh',
      'Озон фреш',
      'курьер',
      'пеший курьер',
      'продукты',
      'дарксторы',
      'самозанятость',
    ],
  },
  monthlyMinRub: 80_000,
  rateLine: 'Тариф за заказ + бонусы за пик-часы и плохую погоду',
  paymentFrequency: 'Еженедельно',
  scheduleText: 'Свободный график, слоты от 4 часов',
  ageFrom: 18,
  citizenship: 'РФ / ЕАЭС / СНГ',
  medicalBook: 'not_required',
  employmentFormats: ['self_employed', 'individual_entrepreneur'],
  uniformText: 'Брендированная форма Ozon fresh за счёт компании',
  educationText: 'Не требуется',
  extraTags: ['ozon-fresh', 'foot', 'self-employed', 'lead-form'],
  priorityBase: 1680,
  isHot: true,
};

const FRESH_OPERATOR_TEMPLATE: OzonRoleTemplate = {
  slug: 'express:operator',
  customer: 'express',
  sourceSlug: 'ozon-fresh-order-picker',
  sourceId: 16,
  companyName: OZON_FRESH_COMPANY_NAME,
  companyLogo: OZON_FRESH_COMPANY_LOGO,
  refLanding: OZON_REF_LANDING_FRESH,
  transport: 'foot',
  content: {
    title: 'Сборщик заказов Ozon fresh {cityPrep}',
    shortDescription:
      'Сборка свежих продуктов в даркстор Ozon fresh: 30–60 минут от заказа до отгрузки курьеру. Сменный график, бесплатное питание, ТК РФ.',
    description:
      'Ozon fresh — мини-склады с продуктами в радиусе 3 км от клиента. Сборщик получает заказ в приложении, собирает товары по полкам даркстора и отдаёт курьеру за 6–10 минут. Работа в холодных и охлаждённых зонах (отдельные тёплые куртки выдаются), сменный график 2/2 или 5/2, бесплатное горячее питание, оформление по ТК РФ. Подключение через нашу заявку: оставьте контакты — Ozon пришлёт SMS.',
    requirements: [
      'Возраст от 18 лет.',
      'Гражданство РФ, ЕАЭС или СНГ.',
      'Готовность работать стоя 12 часов и быть в холоде.',
      'Без опыта — обучение в первую смену.',
      'Внимательность к артикулам и срокам годности.',
    ],
    benefits: [
      'Доход от 75 000 ₽ в месяц при полной загрузке.',
      'Сменный график 2/2 или 5/2 на выбор.',
      'Бесплатное горячее питание в столовой даркстора.',
      'Оформление по ТК РФ — белая зарплата 2 раза в месяц.',
      'Тёплая брендированная форма для холодильных зон.',
      'Подработки в выходные — оплата выше тарифа.',
    ],
    requiredDocuments: [
      'Паспорт РФ, ЕАЭС или СНГ.',
      'Патент / РВП / ВНЖ для иностранных граждан.',
      'СНИЛС и ИНН.',
      'Медкнижка не нужна (выдаётся при необходимости за счёт компании).',
    ],
    searchTags: [
      'Ozon fresh',
      'Озон фреш',
      'сборщик заказов',
      'комплектовщик',
      'даркстор',
      'продукты',
    ],
  },
  monthlyMinRub: 75_000,
  rateLine: 'Сменная оплата + надбавки за выработку и ночные смены',
  paymentFrequency: '2 раза в месяц',
  scheduleText: 'Сменный график 2/2 или 5/2',
  ageFrom: 18,
  citizenship: 'РФ / ЕАЭС / СНГ',
  medicalBook: 'not_required',
  employmentFormats: ['official', 'gph'],
  uniformText: 'Брендированная форма + тёплая куртка для холодильных зон',
  educationText: 'Не требуется',
  extraTags: ['ozon-fresh', 'darkstore', 'lead-form', 'official-employment', 'no-experience'],
  priorityBase: 1480,
};

const FRESH_ADMIN_TEMPLATE: OzonRoleTemplate = {
  slug: 'express:adminPersonal',
  customer: 'express',
  sourceSlug: 'ozon-fresh-administrator',
  sourceId: 17,
  companyName: OZON_FRESH_COMPANY_NAME,
  companyLogo: OZON_FRESH_COMPANY_LOGO,
  refLanding: OZON_REF_LANDING_FRESH,
  transport: 'foot',
  content: {
    title: 'Администратор даркстора Ozon fresh {cityPrep}',
    shortDescription:
      'Управление сменой в дарксторе Ozon fresh: контроль сборщиков, приёмка поставок, KPI по скорости. Официальная зарплата, бонусы за выполнение плана.',
    description:
      'Ozon fresh ищет администраторов даркстора {cityPrep}. Вы отвечаете за свою смену: распределение задач между сборщиками, приёмка поставок от поставщиков, контроль сроков годности, KPI по скорости отгрузки заказов курьерам. Опыт линейного управления (3–5 человек) приветствуется, но не обязателен — есть программа стажёра. Оформление по ТК РФ, белая зарплата 2 раза в месяц + квартальный бонус за KPI. Подключение через нашу заявку.',
    requirements: [
      'Возраст от 21 года.',
      'Гражданство РФ или ЕАЭС.',
      'Опыт работы в рознице / общепите / логистике от 1 года (управленческий опыт — плюс).',
      'Готовность к сменному графику и физическим нагрузкам.',
      'Уверенный пользователь смартфона и Excel / Google Sheets.',
    ],
    benefits: [
      'Доход от 95 000 ₽ в месяц + квартальный бонус за выполнение KPI.',
      'Оформление по ТК РФ — белая зарплата 2 раза в месяц.',
      'Корпоративный ДМС после испытательного срока.',
      'Программа стажёра для тех, кто переходит из линейной позиции.',
      'Карьерный путь: администратор → старший администратор → управляющий даркстором.',
      'Бесплатное питание в столовой даркстора и брендированная форма.',
    ],
    requiredDocuments: [
      'Паспорт РФ или ЕАЭС.',
      'Трудовая книжка / СНИЛС / ИНН.',
      'Документы об образовании (если есть).',
    ],
    searchTags: [
      'Ozon fresh',
      'Озон фреш',
      'администратор',
      'управляющий',
      'даркстор',
      'старший смены',
    ],
  },
  monthlyMinRub: 95_000,
  rateLine: 'Оклад + квартальный бонус по KPI',
  paymentFrequency: '2 раза в месяц',
  scheduleText: 'Сменный график 5/2 или 2/2',
  ageFrom: 21,
  citizenship: 'РФ / ЕАЭС',
  medicalBook: 'not_required',
  employmentFormats: ['official'],
  uniformText: 'Брендированная форма Ozon fresh',
  educationText: 'Среднее специальное или высшее (приветствуется)',
  extraTags: ['ozon-fresh', 'darkstore', 'manager', 'lead-form', 'official-employment'],
  priorityBase: 1380,
};

const FRESH_KITCHEN_TEMPLATE: OzonRoleTemplate = {
  slug: 'express:factoryKitchen',
  customer: 'express',
  sourceSlug: 'ozon-fresh-kitchen-staff',
  sourceId: 18,
  companyName: OZON_FRESH_COMPANY_NAME,
  companyLogo: OZON_FRESH_COMPANY_LOGO,
  refLanding: OZON_REF_LANDING_FRESH,
  transport: 'foot',
  content: {
    title: 'Сотрудник фабрики-кухни Ozon fresh {cityPrep}',
    shortDescription:
      'Готовка и упаковка готовых блюд для Ozon fresh. Без опыта, обучение за счёт компании, бесплатное питание, медкнижка от Ozon.',
    description:
      'Фабрика-кухня Ozon fresh готовит салаты, супы, горячие блюда, выпечку и упаковывает их для доставки. Сотрудники работают на отдельных линиях: нарезка, сборка, упаковка, маркировка. Без опыта — обучение на месте за 1–2 смены, опытные шеф-наставники. Сменный график 2/2 или 5/2, бесплатное горячее питание, медкнижка оформляется за счёт компании. Подключение через нашу заявку.',
    requirements: [
      'Возраст от 18 лет.',
      'Гражданство РФ, ЕАЭС или СНГ.',
      'Медкнижка обязательна (оформим за счёт компании, если нет).',
      'Готовность к сменному графику и работе на ногах.',
      'Аккуратность и внимательность к санитарным нормам.',
    ],
    benefits: [
      'Доход от 70 000 ₽ в месяц при полной загрузке.',
      'Сменный график 2/2 или 5/2 на выбор.',
      'Бесплатное горячее питание в столовой фабрики-кухни.',
      'Медкнижка оформляется за счёт компании.',
      'Оформление по ТК РФ — белая зарплата 2 раза в месяц.',
      'Подработки в выходные — оплата выше тарифа.',
    ],
    requiredDocuments: [
      'Паспорт РФ, ЕАЭС или СНГ.',
      'Патент / РВП / ВНЖ для иностранных граждан.',
      'Медкнижка (если есть; иначе оформим бесплатно).',
      'СНИЛС и ИНН.',
    ],
    searchTags: [
      'Ozon fresh',
      'Озон фреш',
      'фабрика-кухня',
      'повар',
      'упаковщик',
      'кулинария',
      'без опыта',
    ],
  },
  monthlyMinRub: 70_000,
  rateLine: 'Сменная оплата + надбавки за ночные смены',
  paymentFrequency: '2 раза в месяц',
  scheduleText: 'Сменный график 2/2 или 5/2',
  ageFrom: 18,
  citizenship: 'РФ / ЕАЭС / СНГ',
  medicalBook: 'required',
  employmentFormats: ['official', 'gph'],
  uniformText: 'Брендированная форма + санитарный комплект',
  educationText: 'Не требуется',
  extraTags: ['ozon-fresh', 'kitchen', 'lead-form', 'no-experience', 'medical-book-paid'],
  priorityBase: 1420,
};

const TEMPLATES: OzonRoleTemplate[] = [
  COURIER_TEMPLATE,
  TRUCK_DRIVER_TEMPLATE,
  OPERATOR_TEMPLATE,
  STACKER_TEMPLATE,
  BRIGADIER_TEMPLATE,
  FRESH_COURIER_TEMPLATE,
  FRESH_OPERATOR_TEMPLATE,
  FRESH_ADMIN_TEMPLATE,
  FRESH_KITCHEN_TEMPLATE,
];

// === Catalogue schemas ===============================================
// The two Ozon JSON catalogues (`ozon-vacancies.json`,
// `ozon-fresh-vacancies.json`) are externally sourced — regenerated by
// `tools/fetch-ozon-vacancies.mjs` against the live Ozon catalogue. Per
// the v2 H5 boundary ("every JSON-driven partner validates with Zod at
// module init"), they are parsed here rather than `as`-cast: a scraper
// change that drops `hireObjects` or mistypes `cityID` now fails the
// build loud with a field-level path instead of shipping a malformed
// `ozonLeadForm` the lead-form Worker would silently reject.

const ozonHireObjectSchema = z.object({
  name: z.string(),
  uuid: z.string(),
});

const ozonCatalogueCitySchema = z.object({
  cityName: z.string(),
  cityID: z.string(),
  hireObjects: z.array(ozonHireObjectSchema),
});

/** Schema for `ozon-vacancies.json` (sklad — keyed by raw `combineCustomerVacancy` slug). */
export const OzonSkladVacanciesSchema = z.array(
  z.object({
    slug: z.string(),
    label: z.string(),
    cities: z.array(ozonCatalogueCitySchema),
  }),
);

/** Schema for `ozon-fresh-vacancies.json` (Fresh — keyed by `${customer}:${vacancy}`). */
export const OzonFreshVacanciesSchema = z.array(
  z.object({
    customer: z.string(),
    vacancy: z.string(),
    label: z.string(),
    cities: z.array(ozonCatalogueCitySchema),
  }),
);

type RawSkladEntry = z.infer<typeof OzonSkladVacanciesSchema>[number];
type RawFreshEntry = z.infer<typeof OzonFreshVacanciesSchema>[number];

const ozonVacancies: RawSkladEntry[] = OzonSkladVacanciesSchema.parse(ozonVacanciesData);
const ozonFreshVacancies: RawFreshEntry[] = OzonFreshVacanciesSchema.parse(ozonFreshVacanciesData);

// === Generation ======================================================

/**
 * Find the catalogue rows for a given template's slug. Sklad catalogue
 * keys by raw `combineCustomerVacancy` slug; Fresh catalogue keys by
 * `${customer}:${vacancy}` constructed locally.
 */
const findCatalogueCities = (
  template: OzonRoleTemplate,
): RawSkladEntry['cities'] | undefined => {
  if (template.customer === 'express') {
    const fresh = ozonFreshVacancies.find(
      (v) => `${v.customer}:${v.vacancy}` === template.slug,
    );
    return fresh?.cities;
  }
  const sklad = ozonVacancies.find((v) => v.slug === template.slug);
  return sklad?.cities;
};

const buildOffersForTemplate = (template: OzonRoleTemplate): VacancyOffer[] => {
  const cities = findCatalogueCities(template);
  if (!cities) return [];

  return cities.map((city, cityIndex) => {
    // Default to the first hire-object UUID per city — most cities only
    // have one. Cities with several addresses (e.g. Москва FF Хоругвино
    // + Подольск) still resolve to a deterministic default; users can
    // be re-routed to a different address by adding more vacancy
    // entries later if/when needed.
    const hireObject = city.hireObjects[0];
    if (!hireObject) {
      throw new Error(
        `[ozonOffers] ${template.slug} → ${city.cityName} has zero hire objects in catalogue`,
      );
    }
    const cleanCity = normalizeCity(city.cityName);

    // For Fresh, store the SHORT vacancy slug in the meta (matches
    // Worker's downstream Ozon API call), but the WHITELIST tuple key
    // uses `${customer}:${vacancy}` — Worker reconstructs that on
    // ingest. For sklad, the slug is already the full
    // combineCustomerVacancy.
    const isFresh = template.customer === 'express';
    let metaVacancy: string;
    if (isFresh) {
      const parts = template.slug.split(':');
      if (parts.length !== 2 || !parts[1]) {
        throw new Error(
          `[ozonOffers] Fresh template ${template.slug} must follow 'customer:vacancy' shape`,
        );
      }
      metaVacancy = parts[1];
    } else {
      metaVacancy = template.slug;
    }
    const ozonLeadForm: OzonLeadFormMeta = {
      vacancy: metaVacancy,
      ...(template.customer ? { customer: template.customer } : {}),
      cityID: city.cityID,
      hireObjectUUID: hireObject.uuid,
      hireObjectLabel: hireObject.name,
    };

    const offer: VacancyOffer = {
      city: cleanCity,
      transport: template.transport,
      pay: {
        currency: 'RUB',
        monthly: {
          min: template.monthlyMinRub,
          text: monthlyText(template.monthlyMinRub),
        },
        rate: template.rateLine,
        paymentFrequency: template.paymentFrequency,
      },
      isActive: true,
      updatedAt: OZON_UPDATED_AT,
      sourceUrl: template.refLanding ?? OZON_REF_LANDING,
      salaryConfidence: 'partner',
      ageFrom: template.ageFrom,
      citizenship: template.citizenship,
      medicalBook: template.medicalBook,
      employmentFormats: [...template.employmentFormats],
      schedule: template.scheduleText,
      applyLink: OZON_LEAD_APPLY,
      // Subtract cityIndex so Москва / SPb stay first; non-courier roles
      // sit below the courier on the listings since priorityBase < 1700.
      priority: template.priorityBase - cityIndex,
      ozonLeadForm,
    };
    return offer;
  });
};

// === Public API ======================================================

export const ozonVacancySources: VacancySource[] = TEMPLATES.map((template) => ({
  id: template.sourceId,
  slug: template.sourceSlug,
  company: {
    name: template.companyName ?? OZON_COMPANY_NAME,
    logo: template.companyLogo ?? OZON_COMPANY_LOGO,
  },
  content: template.content,
  defaults: {
    ageFrom: template.ageFrom,
    medicalBook: template.medicalBook,
    employmentFormats: [...template.employmentFormats],
    schedule: template.scheduleText,
    education: template.educationText,
    citizenship: template.citizenship,
    uniform: template.uniformText,
    os: 'Android или iOS',
  },
  offers: buildOffersForTemplate(template),
  extraTags: template.extraTags,
  ...(template.isHot ? { isHot: true } : {}),
}));

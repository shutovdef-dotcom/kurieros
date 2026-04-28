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

import ozonVacanciesData from './ozon-vacancies.json';
import { SUPPORTED_LANGUAGES } from './translations';
import type {
  EmploymentFormat,
  LocalizedVacancyContent,
  OzonLeadFormMeta,
  TransportMode,
  VacancyContent,
  VacancyOffer,
  VacancySource,
} from './vacancyTypes';

// === Constants ========================================================

const OZON_COMPANY_NAME = 'Ozon';
const OZON_COMPANY_LOGO = '/logos/ozon.svg';
const OZON_LEAD_APPLY = 'lead-form:ozon';
const OZON_REF_LANDING = 'https://recruitment.ozon.ru/ref-courier-sklad';
const OZON_UPDATED_AT = new Date().toISOString().slice(0, 10);

// === Types ===========================================================

type OzonRoleSlug =
  | 'rocket:courier'
  | 'ff:truckDriver'
  | 'ff:operator'
  | 'ff:electricStackerDriver'
  | 'ff:brigadier';

type OzonRoleTemplate = {
  /** combineCustomerVacancy slug (matches whitelist + JSON file). */
  slug: OzonRoleSlug;
  /** URL slug (kurerok.ru/v/<sourceSlug>-<city>-<transport>/). */
  sourceSlug: string;
  /** VacancySource.id — keeps numeric IDs stable across Ozon roles. */
  sourceId: number;
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

const localize = (ru: VacancyContent): LocalizedVacancyContent =>
  Object.fromEntries(
    SUPPORTED_LANGUAGES.map((language) => [
      language,
      {
        ...ru,
        title: language === 'ru'
          ? ru.title
          : ru.title.replace('{cityPrep}', '— {city}'),
        requirements: [...ru.requirements],
        benefits: [...ru.benefits],
        requiredDocuments: [...ru.requiredDocuments],
        searchTags: ru.searchTags ? [...ru.searchTags] : undefined,
        labels: ru.labels ? [...ru.labels] : undefined,
      },
    ]),
  ) as LocalizedVacancyContent;

const formatRub = (n: number) =>
  new Intl.NumberFormat('ru-RU').format(n).replace(/ /g, ' ');

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
    searchTags: [
      'Ozon',
      'Озон',
      'оператор склада',
      'комплектовщик',
      'сборщик',
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

const TEMPLATES: OzonRoleTemplate[] = [
  COURIER_TEMPLATE,
  TRUCK_DRIVER_TEMPLATE,
  OPERATOR_TEMPLATE,
  STACKER_TEMPLATE,
  BRIGADIER_TEMPLATE,
];

const TEMPLATE_BY_SLUG = new Map<OzonRoleSlug, OzonRoleTemplate>(
  TEMPLATES.map((t) => [t.slug, t]),
);

// === Generation ======================================================

type RawVacancyEntry = {
  slug: string;
  label: string;
  cities: Array<{
    cityName: string;
    cityID: string;
    hireObjects: Array<{ name: string; uuid: string }>;
  }>;
};

const buildOffersForSlug = (slug: OzonRoleSlug): VacancyOffer[] => {
  const template = TEMPLATE_BY_SLUG.get(slug);
  if (!template) return [];
  const data = (ozonVacanciesData as RawVacancyEntry[]).find((v) => v.slug === slug);
  if (!data) return [];

  return data.cities.map((city, cityIndex) => {
    // Default to the first hire-object UUID per city — most cities only
    // have one. Cities with several addresses (e.g. Москва FF Хоругвино
    // + Подольск) still resolve to a deterministic default; users can
    // be re-routed to a different address by adding more vacancy
    // entries later if/when needed.
    const hireObject = city.hireObjects[0];
    if (!hireObject) {
      throw new Error(
        `[ozonOffers] ${slug} → ${city.cityName} has zero hire objects in ozon-vacancies.json`,
      );
    }
    const cleanCity = normalizeCity(city.cityName);
    const ozonLeadForm: OzonLeadFormMeta = {
      vacancy: slug,
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
      sourceUrl: OZON_REF_LANDING,
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
    name: OZON_COMPANY_NAME,
    logo: OZON_COMPANY_LOGO,
  },
  content: localize(template.content),
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
  offers: buildOffersForSlug(template.slug),
  extraTags: template.extraTags,
  ...(template.isHot ? { isHot: true } : {}),
}));

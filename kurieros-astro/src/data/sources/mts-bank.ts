import { slugifyCity } from '../../utils/cities';
import type {
  EmploymentFormat,
  VacancyContent,
  VacancyOffer,
  VacancySource,
} from '../vacancyTypes';
import { MTS_BANK_APPLY, MTS_BANK_LOGO } from '../partnerLinks';
import { expandCitiesForCapitalRegions } from './geoExpansion';
import { formatRub } from './shared';

// === Constants =======================================================

const MTS_BANK_COMPANY_NAME = 'МТС Банк';
const MTS_BANK_COMPANY_LOGO = MTS_BANK_LOGO;
const MTS_BANK_APPLY_LINK = MTS_BANK_APPLY;
const MTS_BANK_SOURCE_URL = 'https://agents.pampadu.ru/app/offer/view/1534';
const MTS_BANK_UPDATED_AT = '2026-06-15';
const MTS_BANK_CITIZENSHIP = 'РФ';
const MTS_BANK_EMPLOYMENT_FORMATS = ['official'] satisfies EmploymentFormat[];
const MTS_BANK_SCHEDULE = 'Сменный график 2/2 или 5/2, удалённый формат';
const MTS_BANK_MONTHLY_MIN_RUB = 46_000;
const MTS_BANK_MONTHLY_MAX_RUB = 68_500;

const mtsBankRemoteBaseCities = [
  ['Брянск', 'Европа'],
  ['Великий Новгород', 'Европа'],
  ['Владимир', 'Европа'],
  ['Волгоград', 'Европа'],
  ['Воронеж', 'Европа'],
  ['Йошкар-Ола', 'Европа'],
  ['Казань', 'Европа'],
  ['Калуга', 'Европа'],
  ['Кострома', 'Европа'],
  ['Краснодар', 'Европа'],
  ['Курск', 'Европа'],
  ['Липецк', 'Европа'],
  ['Москва', 'Европа'],
  ['Нижний Новгород', 'Европа'],
  ['Псков', 'Европа'],
  ['Рязань', 'Европа'],
  ['Самара', 'Европа'],
  ['Санкт-Петербург', 'Европа'],
  ['Смоленск', 'Европа'],
  ['Тверь', 'Европа'],
  ['Ярославль', 'Европа'],
  ['Ульяновск', 'Европа'],
  ['Орёл', 'Европа'],
  ['Оренбург', 'Европа'],
  ['Саратов', 'Европа'],
  ['Вологда', 'Европа'],
  ['Ижевск', 'Европа'],
  ['Барнаул', 'Восток'],
  ['Екатеринбург', 'Восток'],
  ['Кемерово', 'Восток'],
  ['Новосибирск', 'Восток'],
  ['Омск', 'Восток'],
  ['Томск', 'Восток'],
  ['Тюмень', 'Восток'],
  ['Уфа', 'Восток'],
  ['Пермь', 'Восток'],
] as const;

const mtsBankRemoteBaseCityLandings = new Map<string, string>(mtsBankRemoteBaseCities);
const mtsBankRemoteCities = expandCitiesForCapitalRegions(
  mtsBankRemoteBaseCities.map(([city]) => city),
).map((city) => [city, mtsBankRemoteBaseCityLandings.get(city) ?? 'Европа'] as const);

// === Helpers =========================================================

const buildMtsBankApplyLink = (city: string, landing: string) => {
  const url = new URL(MTS_BANK_APPLY_LINK);
  const citySlug = slugifyCity(city);

  url.searchParams.set('utm_source', 'kurerok');
  url.searchParams.set('utm_medium', 'vacancy');
  url.searchParams.set('utm_campaign', 'mts-bank-operator');
  url.searchParams.set('utm_content', `${citySlug}-remote`);
  url.searchParams.set('utm_term', landing.toLowerCase());

  return url.toString();
};

const buildMtsBankPay = (): VacancyOffer['pay'] => {
  const monthlyText =
    `от ${formatRub(MTS_BANK_MONTHLY_MIN_RUB)} до ${formatRub(MTS_BANK_MONTHLY_MAX_RUB)} ₽/мес`;

  return {
    currency: 'RUB',
    monthly: {
      min: MTS_BANK_MONTHLY_MIN_RUB,
      max: MTS_BANK_MONTHLY_MAX_RUB,
      text: monthlyText,
    },
    rate: monthlyText,
    paymentFrequency: '2 раза в месяц (по ТК РФ)',
  };
};

// === Content =========================================================

const mtsBankOperatorContent: VacancyContent = {
  title: 'Оператор МТС Банка {cityPrep}',
  shortDescription:
    'Удалённая работа оператором МТС Банка: консультации клиентов по банковским продуктам, официальное оформление, ДМС и сменный график.',
  description:
    'МТС Банк приглашает операторов клиентского сервиса. Нужно консультировать клиентов банка по кредитным продуктам, графику платежей, сумме, срокам и способам оплаты, а также информировать о программах лояльности: кредитных каникулах, рефинансировании, амнистии и других продуктах.',
  requirements: [
    'Возраст от 18 до 45 лет.',
    'Гражданство РФ.',
    'Грамотная устная и письменная речь.',
    'Умение легко устанавливать контакт с людьми.',
    'Готовность быстро обучаться и ориентироваться в потоке информации.',
    'Для удалённой работы нужно тихое место, компьютер, гарнитура и стабильный интернет.',
    'Опыт работы в клиентском сервисе будет плюсом, но не обязателен.',
  ],
  benefits: [
    'Официальное оформление с первого дня.',
    'Доход: оклад + ежемесячная премия.',
    'Сменный график 2/2 или 5/2.',
    'Доплата за ночные смены 40%.',
    'ДМС с первого месяца, включая стоматологию.',
    'Страхование от несчастных случаев и материальная помощь.',
    'Отпуск 28 календарных дней.',
    'Мобильная связь за счёт компании и льготные тарифы для близких.',
    'Скидки и специальные предложения от продуктов экосистемы МТС.',
    'Корпоративное обучение и онлайн-библиотека.',
  ],
  requiredDocuments: [
    'Паспорт гражданина РФ.',
    'Для мужчин: приписное свидетельство или военный билет РФ.',
  ],
  labels: [
    'Удалённо',
    'Оператор',
    'Колл-центр',
    'Без опыта',
    'Официальное оформление',
    'ДМС',
  ],
  searchTags: [
    'МТС Банк',
    'оператор МТС Банка',
    'оператор call-центра',
    'оператор колл-центра',
    'контактный центр',
    'поддержка клиентов',
    'удалённая работа',
  ],
};

// === Offer construction ==============================================

const mtsBankOperatorOffers = mtsBankRemoteCities.map(
  ([city, landing], cityIndex) => ({
    city,
    transport: 'remote',
    transportProvision: 'not_required',
    pay: buildMtsBankPay(),
    isActive: true,
    updatedAt: MTS_BANK_UPDATED_AT,
    sourceUrl: MTS_BANK_SOURCE_URL,
    salaryConfidence: 'estimated',
    ageFrom: 18,
    citizenship: MTS_BANK_CITIZENSHIP,
    medicalBook: 'not_required',
    employmentFormats: [...MTS_BANK_EMPLOYMENT_FORMATS],
    schedule: MTS_BANK_SCHEDULE,
    applyLink: buildMtsBankApplyLink(city, landing),
    priority: 1625 - cityIndex,
  }) satisfies VacancyOffer,
);

// === Source ==========================================================

export const mtsBankSource: VacancySource = {
  id: 27,
  slug: 'mts-bank-operator',
  company: { name: MTS_BANK_COMPANY_NAME, logo: MTS_BANK_COMPANY_LOGO },
  content: mtsBankOperatorContent,
  defaults: {
    ageFrom: 18,
    medicalBook: 'not_required',
    employmentFormats: [...MTS_BANK_EMPLOYMENT_FORMATS],
    schedule: MTS_BANK_SCHEDULE,
    education: 'Не требуется',
    citizenship: MTS_BANK_CITIZENSHIP,
    uniform: 'Не требуется',
    os: 'Компьютер, гарнитура и стабильный интернет',
  },
  offers: mtsBankOperatorOffers,
  incomeCalculator: { mode: 'monthly' },
  howToTemplate: 'call_center',
  extraTags: ['mts-bank', 'operator', 'call-center', 'remote', 'official', 'source:pampadu'],
  isHot: true,
};

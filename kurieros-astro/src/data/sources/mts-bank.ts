import { slugifyCity } from '../../utils/cities';
import type {
  VacancyContent,
  VacancyOffer,
  VacancySource,
} from '../vacancyTypes';
import { MTS_BANK_APPLY, MTS_BANK_LOGO } from '../partnerLinks';

// === Constants =======================================================

const MTS_BANK_COMPANY_NAME = 'МТС';
const MTS_BANK_COMPANY_LOGO = MTS_BANK_LOGO;
const MTS_BANK_APPLY_LINK = MTS_BANK_APPLY;
const MTS_BANK_SOURCE_URL = 'https://agents.pampadu.ru/app/offer/view/1534';
const MTS_BANK_UPDATED_AT = '2026-06-15';
const MTS_BANK_CHECKED_AT = '2026-10-13';
const MTS_BANK_CITIZENSHIP = 'РФ';
const MTS_BANK_SCHEDULE = 'Индивидуальный гибкий график';

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

const mtsBankRemoteCities = mtsBankRemoteBaseCities;

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

// === Content =========================================================

const mtsBankOperatorContent: VacancyContent = {
  title: 'Оператор колл-центра МТС {cityPrep}',
  shortDescription:
    'Удалённая работа оператором колл-центра МТС. Индивидуальный гибкий график, ДМС с первого месяца и бесплатная мобильная связь. Доход и оформление уточняются.',
  description:
    'Карточка оператора колл-центра для проекта МТС. Работа удалённая, график индивидуальный и гибкий. В актуальной карточке партнёра указаны ДМС с первого месяца и бесплатная мобильная связь. Доход, оформление и остальные условия уточняются при отклике.',
  requirements: [
    'Возраст от 18 до 45 лет.',
    'Для оформления нужен паспорт РФ; для мужчин — военный билет или приписное свидетельство.',
  ],
  benefits: [
    'ДМС с первого месяца.',
    'Бесплатная мобильная связь.',
    'Индивидуальный гибкий график.',
  ],
  requiredDocuments: [
    'Паспорт гражданина РФ.',
    'Для мужчин: военный билет или приписное свидетельство.',
  ],
  labels: [
    'Удалённо',
    'Оператор',
    'Колл-центр',
    'Гибкий график',
    'ДМС',
  ],
  searchTags: [
    'МТС',
    'оператор колл-центра МТС',
    'оператор call-центра',
    'колл-центр',
    'удалённая работа',
  ],
};

// === Offer construction ==============================================

const mtsBankOperatorOffers = mtsBankRemoteCities.map(
  ([city, landing], cityIndex) => ({
    city,
    transport: 'remote',
    transportProvision: 'not_required',
    pay: { currency: 'RUB', paymentFrequency: 'Уточняется' },
    isActive: true,
    updatedAt: MTS_BANK_UPDATED_AT,
    contentUpdatedAt: MTS_BANK_CHECKED_AT,
    sourceCheckedAt: MTS_BANK_CHECKED_AT,
    sourceUrl: MTS_BANK_SOURCE_URL,
    salaryConfidence: 'estimated',
    ageFrom: 18,
    citizenship: MTS_BANK_CITIZENSHIP,
    medicalBook: 'unknown',
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
    medicalBook: 'unknown',
    employmentFormats: [],
    schedule: MTS_BANK_SCHEDULE,
    education: 'Уточняется',
    citizenship: MTS_BANK_CITIZENSHIP,
    uniform: 'Уточняется',
    os: 'Уточняется',
  },
  offers: mtsBankOperatorOffers,
  incomeCalculator: { mode: 'hidden' },
  howToTemplate: 'remote_operator',
  extraTags: ['mts', 'operator', 'call-center', 'remote', 'source:pampadu'],
  isHot: true,
};

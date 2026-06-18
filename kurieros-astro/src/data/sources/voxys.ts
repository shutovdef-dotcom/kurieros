import { slugifyCity } from '../../utils/cities';
import type {
  EmploymentFormat,
  VacancyContent,
  VacancyOffer,
  VacancySource,
} from '../vacancyTypes';
import { VOXYS_APPLY, VOXYS_LOGO } from '../partnerLinks';
import { formatRub } from './shared';

// === Constants =======================================================

const VOXYS_COMPANY_NAME = 'Voxys';
const VOXYS_COMPANY_LOGO = VOXYS_LOGO;
const VOXYS_APPLY_LINK = VOXYS_APPLY;
const VOXYS_SOURCE_URL =
  'https://docs.google.com/spreadsheets/d/1b5i4EfoEVd7A-TT-cWxfXMC_XqvcCmxLNV_e5HXApQE';
const VOXYS_UPDATED_AT = '2026-05-07';
const VOXYS_CITIZENSHIP = 'Уточняется';
const VOXYS_EMPLOYMENT_FORMATS = ['official'] satisfies EmploymentFormat[];

const VOXYS_OFFICE_SCHEDULE =
  '5/2, 2/2, 3/3; подработка от 4 часов; утренние, дневные, вечерние и ночные смены';

const voxysOfficeSalaryByCity = [
  ['Барнаул', 50_000],
  ['Оренбург', 50_000],
  ['Чебоксары', 50_000],
  ['Ижевск', 50_000],
  ['Волгоград', 50_000],
  ['Калининград', 52_000],
  ['Калуга', 43_500],
  ['Курск', 50_000],
  ['Орёл', 50_000],
  ['Ростов-на-Дону', 50_000],
  ['Саранск', 50_000],
  ['Таганрог', 50_000],
  ['Челябинск', 50_000],
  ['Тюмень', 50_000],
  ['Астрахань', 50_000],
] as const;

// === Helpers =========================================================

const buildVoxysApplyLink = (city: string) => {
  const url = new URL(VOXYS_APPLY_LINK);
  const citySlug = slugifyCity(city);

  url.searchParams.set('utm_source', 'kurerok');
  url.searchParams.set('utm_medium', 'vacancy');
  url.searchParams.set('utm_campaign', 'voxys-call-center-operator');
  url.searchParams.set('utm_content', `${citySlug}-office`);

  return url.toString();
};

const buildVoxysFixedMonthlyPay = (monthlyRub: number): VacancyOffer['pay'] => {
  const monthly = Math.round(monthlyRub);
  const monthlyText = `${formatRub(monthly)} ₽/мес`;

  return {
    currency: 'RUB',
    monthly: {
      min: monthly,
      max: monthly,
      text: monthlyText,
    },
    rate: `Фиксированная ставка: ${monthlyText}`,
    paymentFrequency: '2 раза в месяц (по ТК РФ)',
  };
};

// === Content =========================================================

const voxysCallCenterOperatorContent: VacancyContent = {
  title: 'Оператор колл-центра Voxys {cityPrep}',
  shortDescription:
    'Оператор колл-центра Voxys: голосовая поддержка клиентов партнёрских компаний, официальное оформление, оплачиваемое обучение и гибкие смены.',
  description:
    'Voxys приглашает операторов колл-центра для работы в офисе. Нужно помогать клиентам компаний-партнёров по телефону: отвечать на вопросы, консультировать по услугам и сервисам, работать с входящими и исходящими звонками. Проектов в чатах нет.',
  requirements: [
    'Готовность консультировать клиентов по сервисам, услугам и продуктам компаний-партнёров.',
    'Работа только с голосовой поддержкой: входящие и исходящие звонки.',
    'Грамотная устная речь и готовность общаться с клиентами по телефону.',
    'Опыт в колл-центре не обязателен.',
    'Возраст 18–50 лет.',
  ],
  benefits: [
    'Официальное оформление по ТК РФ.',
    'Приветственный бонус 10 000 ₽.',
    'Бонус 15 000 ₽ за каждого приведённого друга.',
    'Оплачиваемое обучение и поддержка наставников.',
    'Гибкие графики: 5/2, 2/2, 3/3.',
    'Подработка от 4 часов.',
    'Ночные смены с доплатой 20%.',
    'Можно совмещать с учёбой.',
    'Корпоративные активности, конкурсы и награды.',
  ],
  requiredDocuments: [
    'Паспорт.',
    'СНИЛС.',
    'ИНН.',
    'Документы для оформления по ТК РФ.',
  ],
  labels: [
    'Официальное оформление',
    'Офис',
    'Без опыта',
    'Фиксированная зарплата',
    'Оплачиваемое обучение',
    'Гибкий график',
  ],
  searchTags: [
    'Voxys',
    'Воксис',
    'оператор',
    'оператор колл-центра',
    'оператор горячей линии',
    'контакт-центр',
    'голосовая поддержка',
  ],
};

// === Offer construction ==============================================

const voxysCallCenterOperatorOffers = voxysOfficeSalaryByCity.map(
  ([city, monthlyRub], cityIndex) => ({
    city,
    transport: 'office',
    transportProvision: 'not_required',
    pay: buildVoxysFixedMonthlyPay(monthlyRub),
    isActive: true,
    updatedAt: VOXYS_UPDATED_AT,
    sourceUrl: VOXYS_SOURCE_URL,
    salaryConfidence: 'partner',
    ageFrom: 18,
    citizenship: VOXYS_CITIZENSHIP,
    medicalBook: 'not_required',
    employmentFormats: [...VOXYS_EMPLOYMENT_FORMATS],
    schedule: VOXYS_OFFICE_SCHEDULE,
    applyLink: buildVoxysApplyLink(city),
    priority: 1650 - cityIndex,
  }) satisfies VacancyOffer,
);

// === Source ==========================================================

export const voxysSource: VacancySource = {
  id: 21,
  slug: 'voxys-call-center-operator',
  company: { name: VOXYS_COMPANY_NAME, logo: VOXYS_COMPANY_LOGO },
  content: voxysCallCenterOperatorContent,
  defaults: {
    ageFrom: 18,
    medicalBook: 'not_required',
    employmentFormats: [...VOXYS_EMPLOYMENT_FORMATS],
    schedule: VOXYS_OFFICE_SCHEDULE,
    education: 'Не требуется',
    citizenship: VOXYS_CITIZENSHIP,
    uniform: 'Не требуется',
    os: 'Не требуется',
  },
  offers: voxysCallCenterOperatorOffers,
  incomeCalculator: { mode: 'monthly' },
  howToTemplate: 'call_center',
  extraTags: ['voxys', 'operator', 'call-center', 'office', 'fixed-salary', 'source:google-sheet'],
};

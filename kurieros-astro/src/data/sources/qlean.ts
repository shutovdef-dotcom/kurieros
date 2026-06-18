import { slugifyCity } from '../../utils/cities';
import type {
  EmploymentFormat,
  VacancyContent,
  VacancyOffer,
  VacancySource,
} from '../vacancyTypes';
import { QLEAN_APPLY, QLEAN_LOGO } from '../partnerLinks';
import { expandCitiesForCapitalRegions } from './geoExpansion';
import { formatRub } from './shared';

// === Constants =======================================================

const QLEAN_COMPANY_NAME = 'Qlean';
const QLEAN_COMPANY_LOGO = QLEAN_LOGO;
const QLEAN_APPLY_LINK = QLEAN_APPLY;
const QLEAN_SOURCE_URL =
  'https://docs.google.com/spreadsheets/d/1R0jC9-n-PQposYBfzXB6Svw-jzDJZDxBpc8WCzoVfz0/edit?usp=sharing';
const QLEAN_UPDATED_AT = '2026-06-15';
const QLEAN_CITIZENSHIP =
  'РФ / Беларусь / Молдова / Казахстан / Украина / Киргизия / Таджикистан / Узбекистан / Грузия / Армения';
const QLEAN_EMPLOYMENT_FORMATS = ['self_employed'] satisfies EmploymentFormat[];
const QLEAN_MONTHLY_MIN = 30_000;
const QLEAN_MONTHLY_MAX = 120_000;
const QLEAN_SCHEDULE = 'Свободный график: исполнитель сам выбирает дни и заказы';

// Qlean source says Moscow / Moscow Oblast and Saint Petersburg. It does
// not mention Leningrad Oblast, so that opt-in list stays disabled here.
const qleanServiceCities = expandCitiesForCapitalRegions(['Москва', 'Санкт-Петербург']);

// === Helpers =========================================================

const buildQleanApplyLink = (city: string) => {
  const url = new URL(QLEAN_APPLY_LINK);
  const citySlug = slugifyCity(city);

  url.searchParams.set('utm_source', 'kurerok');
  url.searchParams.set('utm_medium', 'vacancy');
  url.searchParams.set('utm_campaign', 'qlean-cleaner');
  url.searchParams.set('utm_content', `${citySlug}-service`);

  return url.toString();
};

const buildQleanMonthlyPay = (): VacancyOffer['pay'] => {
  const monthlyText = `${formatRub(QLEAN_MONTHLY_MIN)}–${formatRub(QLEAN_MONTHLY_MAX)} ₽/мес`;

  return {
    currency: 'RUB',
    monthly: {
      min: QLEAN_MONTHLY_MIN,
      max: QLEAN_MONTHLY_MAX,
      text: monthlyText,
    },
    rate: 'Оплата за выполненные заказы на уборку; доход зависит от количества заказов',
    paymentFrequency: 'Каждый понедельник или наличными сразу после заказа',
  };
};

// === Content =========================================================

const qleanCleanerContent: VacancyContent = {
  title: 'Клинер Qlean {cityPrep}',
  shortDescription:
    'Выездная работа клинером Qlean: уборка квартир и домов, свободный график, обучение и регулярные выплаты.',
  description:
    'Qlean приглашает исполнителей для уборки квартир и домов {cityPrep}. Задачи: поддерживающая уборка комнат, кухни, коридора и санузлов, протирка поверхностей, мытьё посуды и аккуратная раскладка вещей. Исполнитель сам выбирает удобные заказы и график, проходит инструктаж и получает поддержку команды Qlean по телефону или в чате.',
  requirements: [
    'Аккуратность, пунктуальность и внимательное отношение к клиенту.',
    'Готовность выполнять поддерживающую уборку квартир и домов по стандартам сервиса.',
    'Готовность пройти инструктаж перед первыми заказами.',
    'Опыт в клининге не обязателен.',
  ],
  benefits: [
    'До 120 000 ₽ в месяц при регулярном выполнении заказов.',
    'Можно выбирать удобный график и локации заказов.',
    'Постоянный поток клиентов: до 3 заказов в день.',
    'Выплаты каждую неделю или наличными сразу после заказа.',
    'Официальное сотрудничество с сервисом.',
    'Поддержка по телефону и в чате.',
    'Инструктаж и обучение перед стартом.',
  ],
  requiredDocuments: [
    'Паспорт.',
    'ИНН.',
    'СНИЛС.',
    'Банковская карта для выплат.',
    'Статус самозанятого или готовность оформить его перед стартом.',
  ],
  labels: [
    'Выездные услуги',
    'Самозанятость',
    'Свободный график',
    'Еженедельные выплаты',
    'Без опыта',
  ],
  searchTags: [
    'Qlean',
    'Клин',
    'клинер',
    'уборка',
    'клининг',
    'выездные услуги',
    'самозанятость',
    'без опыта',
  ],
};

// === Offer construction ==============================================

const qleanCleanerOffers = qleanServiceCities.map((city, cityIndex): VacancyOffer => ({
  city,
  transport: 'service',
  transportProvision: 'not_required',
  pay: buildQleanMonthlyPay(),
  isActive: true,
  updatedAt: QLEAN_UPDATED_AT,
  sourceUrl: QLEAN_SOURCE_URL,
  salaryConfidence: 'partner',
  ageFrom: 18,
  citizenship: QLEAN_CITIZENSHIP,
  medicalBook: 'unknown',
  employmentFormats: [...QLEAN_EMPLOYMENT_FORMATS],
  schedule: QLEAN_SCHEDULE,
  applyLink: buildQleanApplyLink(city),
  priority: 1500 - cityIndex,
}));

// === Source ==========================================================

export const qleanSource: VacancySource = {
  id: 22,
  slug: 'qlean-cleaner',
  company: { name: QLEAN_COMPANY_NAME, logo: QLEAN_COMPANY_LOGO },
  content: qleanCleanerContent,
  defaults: {
    ageFrom: 18,
    medicalBook: 'unknown',
    employmentFormats: [...QLEAN_EMPLOYMENT_FORMATS],
    schedule: QLEAN_SCHEDULE,
    education: 'Не требуется',
    citizenship: QLEAN_CITIZENSHIP,
    uniform: 'Уточняется у партнёра',
    os: 'Не требуется',
  },
  offers: qleanCleanerOffers,
  incomeCalculator: { mode: 'monthly' },
  howToTemplate: 'service_worker',
  extraTags: ['qlean', 'cleaner', 'cleaning', 'service', 'self-employed', 'source:google-sheet'],
};

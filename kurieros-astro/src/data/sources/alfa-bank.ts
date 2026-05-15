/**
 * Альфа-Банк — outbound bank-products representative (foot/auto per
 * city). Officially employed via TK RF (Russian labour code), so
 * payouts are 2× per month.
 *
 * Per-city `requirement` and `extraInfo` free-text fields can carry
 * city-specific hints (e.g. "с авто", "удалёнка") — we filter the
 * boilerplate ones (auto/no-auto / office / remote tags) so they
 * don't leak into requirements/benefits overrides as duplicate noise.
 */
import alfaBankVacanciesSource from '../alfa-bank-vacancies.json';
import { slugifyCity } from '../../utils/cities';
import type {
  EmploymentFormat,
  TransportMode,
  VacancyContent,
  VacancyOffer,
  VacancySource,
} from '../vacancyTypes';
import { ALFA_BANK_LOGO, ALFA_BANK_APPLY } from '../partnerLinks';
import { formatRub } from './shared';

// === Constants =======================================================

const ALFA_BANK_COMPANY_NAME = 'Альфа-Банк';
const ALFA_BANK_COMPANY_LOGO = ALFA_BANK_LOGO;
const ALFA_BANK_APPLY_LINK = ALFA_BANK_APPLY;
const ALFA_BANK_CITIZENSHIP = 'РФ / Беларусь / Казахстан';
const ALFA_BANK_EMPLOYMENT_FORMATS = ['official'] satisfies EmploymentFormat[];

// === Types ===========================================================

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

const alfaBankVacancies = alfaBankVacanciesSource as AlfaBankVacanciesData;

// === Helpers =========================================================

const buildAlfaBankApplyLink = (city: string, transport: AlfaBankOfferSource['transport']) => {
  const url = new URL(ALFA_BANK_APPLY_LINK);
  const citySlug = slugifyCity(city);

  url.searchParams.set('utm_source', 'kurerok');
  url.searchParams.set('utm_medium', 'vacancy');
  url.searchParams.set('utm_campaign', 'alfa-bank-representative');
  url.searchParams.set('utm_content', `${citySlug}-${transport}`);

  return url.toString();
};

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

// === Content =========================================================

const alfaBankRepresentativeContent: VacancyContent = {
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
};

// === Offer construction ==============================================

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

// === Source ==========================================================

export const alfaBankSource: VacancySource = {
  id: 9,
  slug: 'alfa-bank-representative',
  company: { name: ALFA_BANK_COMPANY_NAME, logo: ALFA_BANK_COMPANY_LOGO },
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
};

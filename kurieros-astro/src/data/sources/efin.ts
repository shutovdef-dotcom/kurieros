/**
 * Efin — banking-products field representative (foot/auto per city).
 *
 * Bilateral pay model: monthly minimum guarantee + per-meeting fee.
 * Both numbers come from `efin-vacancies.json` per city.
 */
import efinVacanciesSource from '../efin-vacancies.json';
import { slugifyCity } from '../../utils/cities';
import type {
  EmploymentFormat,
  VacancyContent,
  VacancyOffer,
  VacancySource,
} from '../vacancyTypes';
import { EFIN_LOGO, EFIN_APPLY } from '../partnerLinks';
import { TRANSPORT_PRIORITY, formatRub } from './shared';

// === Constants =======================================================

const EFIN_COMPANY_NAME = 'Efin';
const EFIN_COMPANY_LOGO = EFIN_LOGO;
const EFIN_APPLY_LINK = EFIN_APPLY;
const EFIN_CITIZENSHIP = 'РФ';
const EFIN_EMPLOYMENT_FORMATS = ['self_employed'] satisfies EmploymentFormat[];

// === Types ===========================================================

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

const efinVacancies = efinVacanciesSource as EfinVacanciesData;

// === Helpers =========================================================

const buildEfinApplyLink = (city: string, transport: EfinOfferSource['transport']) => {
  const url = new URL(EFIN_APPLY_LINK);
  const citySlug = slugifyCity(city);

  url.searchParams.set('utm_source', 'kurerok');
  url.searchParams.set('utm_medium', 'vacancy');
  url.searchParams.set('utm_campaign', 'efin-bank-representative');
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

// === Content =========================================================

const efinRepresentativeContent: VacancyContent = {
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
};

// === Offer construction ==============================================

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

// === Source ==========================================================

export const efinSource: VacancySource = {
  id: 8,
  slug: 'efin-bank-representative',
  company: { name: EFIN_COMPANY_NAME, logo: EFIN_COMPANY_LOGO },
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
};

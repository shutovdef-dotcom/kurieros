import { slugifyCity } from '../../utils/cities';
import type { EmploymentFormat, VacancyContent, VacancyOffer, VacancySource } from '../vacancyTypes';
import { DOMOVENOK_APPLY, DOMOVENOK_LOGO } from '../partnerLinks';
import { expandCitiesForCapitalRegions } from './geoExpansion';
import { formatRub } from './shared';

// === Constants =======================================================

const DOMOVENOK_COMPANY_NAME = 'Домовёнок';
const DOMOVENOK_COMPANY_LOGO = DOMOVENOK_LOGO;
const DOMOVENOK_APPLY_LINK = DOMOVENOK_APPLY;
const DOMOVENOK_MOSCOW_SOURCE_URL = 'https://www.domovenok.ru/vakansii_okna';
const DOMOVENOK_SPB_SOURCE_URL = 'https://spb.domovenok.ru/vakansii_okna';
const DOMOVENOK_NN_SOURCE_URL = 'https://nn.domovenok.ru/vakansii_okna';
const DOMOVENOK_UPDATED_AT = '2026-06-21';
const DOMOVENOK_CITIZENSHIP = 'РФ / иностранные граждане при наличии патента';
const DOMOVENOK_EMPLOYMENT_FORMATS = ['self_employed'] satisfies EmploymentFormat[];
const DOMOVENOK_SCHEDULE =
  'Свободный график: исполнитель сам выбирает дни, доступные для заказов';
const DOMOVENOK_MOSCOW_MONTHLY_MAX = 172_500;
const DOMOVENOK_SPB_MONTHLY_MAX = 129_400;
const DOMOVENOK_NN_MONTHLY_MAX = 118_500;

// === Helpers =========================================================

const buildDomovenokApplyLink = (city: string) => {
  const url = new URL(DOMOVENOK_APPLY_LINK);
  const citySlug = slugifyCity(city);

  url.searchParams.set('utm_source', 'kurerok');
  url.searchParams.set('utm_medium', 'vacancy');
  url.searchParams.set('utm_campaign', 'domovenok-window-cleaner');
  url.searchParams.set('utm_content', `${citySlug}-service`);

  return url.toString();
};

const buildDomovenokPay = (monthlyMax: number): VacancyOffer['pay'] => ({
  currency: 'RUB',
  monthly: {
    max: monthlyMax,
    text: `до ${formatRub(monthlyMax)} ₽/мес`,
  },
  rate:
    'Доход за выполненные заказы на мойку окон и балконов; зависит от количества заказов и стажа в сервисе',
  paymentFrequency: 'После каждого выполненного заказа',
});

const buildDomovenokOffer = (
  city: string,
  monthlyMax: number,
  sourceUrl: string,
  priority: number,
): VacancyOffer => ({
  city,
  transport: 'service',
  transportProvision: 'not_required',
  pay: buildDomovenokPay(monthlyMax),
  isActive: true,
  updatedAt: DOMOVENOK_UPDATED_AT,
  sourceUrl,
  salaryConfidence: 'official',
  ageFrom: 18,
  citizenship: DOMOVENOK_CITIZENSHIP,
  medicalBook: 'unknown',
  employmentFormats: [...DOMOVENOK_EMPLOYMENT_FORMATS],
  schedule: DOMOVENOK_SCHEDULE,
  applyLink: buildDomovenokApplyLink(city),
  priority,
});

// === Content =========================================================

const domovenokWindowCleanerContent: VacancyContent = {
  title: 'Мойщик окон Домовёнок {cityPrep}',
  shortDescription:
    'Выездная работа мойщиком окон в сервисе «Домовёнок»: заказы на мойку окон и балконов, свободный график, обучение и выплаты после выполненных заказов.',
  description:
    'Домовёнок приглашает исполнителей на мойку окон и балконов {cityPrep}. Сервис распределяет заказы через приложение: исполнитель видит будущие и выполненные заказы, доход и активные дни. Опыт в клининге не обязателен: перед стартом есть инструктаж и обучение, а форму, средства и инвентарь для работы предоставляет сервис.',
  requirements: [
    'Паспорт, ИНН или патент, банковская карта и смартфон.',
    'Готовность к разъездной работе и активному физическому труду.',
    'Готовность пройти обучение и инструктаж перед первыми заказами.',
    'Аккуратность, пунктуальность и внимательное отношение к клиенту.',
    'Опыт в клининге не обязателен.',
  ],
  benefits: [
    'До 172 500 ₽ в месяц в зависимости от города и регулярности выполненных заказов.',
    'Выплаты после каждого выполненного заказа и 100% чаевых.',
    'Можно выбирать дни, доступные для заказов.',
    'Бесплатное обучение и получение навыков за несколько часов.',
    'Форма, средства и инвентарь для мойки окон предоставляются сервисом.',
    'Чем дольше сотрудничество, тем выше процент и больше заказов.',
    'Заказы, доход и активные дни доступны в приложении.',
  ],
  requiredDocuments: [
    'Паспорт.',
    'ИНН или патент.',
    'Банковская карта для выплат.',
    'Смартфон.',
    'Статус самозанятого или готовность подключиться к сервису как самозанятый.',
  ],
  labels: [
    'Мойка окон',
    'Выездные услуги',
    'Самозанятость',
    'Свободный график',
    'Без опыта',
  ],
  searchTags: [
    'Домовёнок',
    'Домовенок',
    'мойщик окон',
    'мойка окон',
    'клининг',
    'уборка',
    'выездные услуги',
    'самозанятость',
  ],
};

// === Offers ==========================================================

const domovenokMoscowRegionOffers = expandCitiesForCapitalRegions(['Москва'])
  .map((city, index) =>
    buildDomovenokOffer(
      city,
      DOMOVENOK_MOSCOW_MONTHLY_MAX,
      DOMOVENOK_MOSCOW_SOURCE_URL,
      1490 - index,
    ),
  );

const domovenokSpbRegionOffers = expandCitiesForCapitalRegions(
  ['Санкт-Петербург'],
  { includeLeningradRegion: true },
).map((city, index) =>
  buildDomovenokOffer(
    city,
    DOMOVENOK_SPB_MONTHLY_MAX,
    DOMOVENOK_SPB_SOURCE_URL,
    1390 - index,
  ),
);

const domovenokNizhnyNovgorodOffer = buildDomovenokOffer(
  'Нижний Новгород',
  DOMOVENOK_NN_MONTHLY_MAX,
  DOMOVENOK_NN_SOURCE_URL,
  1290,
);

const domovenokWindowCleanerOffers: VacancyOffer[] = [
  ...domovenokMoscowRegionOffers,
  ...domovenokSpbRegionOffers,
  domovenokNizhnyNovgorodOffer,
];

// === Source ==========================================================

export const domovenokSource: VacancySource = {
  id: 30,
  slug: 'domovenok-window-cleaner',
  company: { name: DOMOVENOK_COMPANY_NAME, logo: DOMOVENOK_COMPANY_LOGO },
  content: domovenokWindowCleanerContent,
  defaults: {
    ageFrom: 18,
    medicalBook: 'unknown',
    employmentFormats: [...DOMOVENOK_EMPLOYMENT_FORMATS],
    schedule: DOMOVENOK_SCHEDULE,
    education: 'Не требуется',
    citizenship: DOMOVENOK_CITIZENSHIP,
    uniform: 'Форма, средства и инвентарь предоставляются сервисом',
    os: 'Смартфон для приложения Домовёнок',
  },
  offers: domovenokWindowCleanerOffers,
  incomeCalculator: { mode: 'monthly' },
  howToTemplate: 'service_worker',
  extraTags: [
    'domovenok',
    'window-cleaner',
    'cleaning',
    'service',
    'self-employed',
    'source:saleads',
  ],
};

import { slugifyCity } from '../../utils/cities';
import type {
  EmploymentFormat,
  VacancyContent,
  VacancyOffer,
  VacancySource,
} from '../vacancyTypes';
import { RUKI_APPLY, RUKI_LOGO } from '../partnerLinks';
import { expandCitiesForCapitalRegions } from './geoExpansion';
import { formatRub } from './shared';

// === Constants =======================================================

const RUKI_COMPANY_NAME = 'Сервис «Руки»';
const RUKI_COMPANY_LOGO = RUKI_LOGO;
const RUKI_APPLY_LINK = RUKI_APPLY;
const RUKI_SOURCE_URL =
  'https://docs.google.com/spreadsheets/d/18rlWf9-spEg7_1fjhwYlI3_CJt734EgEPP_xypRrUfg/edit?gid=0#gid=0';
const RUKI_UPDATED_AT = '2026-06-15';
const RUKI_CITIZENSHIP = 'РФ / ЕАЭС / страны вне ЕАЭС при наличии документов';
const RUKI_EMPLOYMENT_FORMATS = [
  'self_employed',
  'individual_entrepreneur',
] satisfies EmploymentFormat[];
const RUKI_SCHEDULE =
  'Свободный график: мастер сам выбирает заказы, дату работ и зону выезда';

const rukiMoscowRegionCities = expandCitiesForCapitalRegions(['Москва']);

type RukiPayConfig = {
  monthlyMin: number;
  monthlyMax: number;
  averageOrder: number;
  rate: string;
};

const doorInstallerPay: RukiPayConfig = {
  monthlyMin: 200_000,
  monthlyMax: 300_000,
  averageOrder: 15_000,
  rate:
    'Партнёрская оценка по листу «Условия»: установка межкомнатных дверей; доход зависит от количества заказов',
};

const kitchenAssemblerPay: RukiPayConfig = {
  monthlyMin: 280_000,
  monthlyMax: 350_000,
  averageOrder: 27_500,
  rate:
    'Партнёрская оценка по листу «Условия»: сборка кухонных гарнитуров; доход зависит от количества заказов',
};

// === Helpers =========================================================

const buildRukiApplyLink = (city: string, campaign: string) => {
  const url = new URL(RUKI_APPLY_LINK);
  const citySlug = slugifyCity(city);

  url.searchParams.set('utm_source', 'kurerok');
  url.searchParams.set('utm_medium', 'vacancy');
  url.searchParams.set('utm_campaign', campaign);
  url.searchParams.set('utm_content', `${citySlug}-service`);

  return url.toString();
};

const buildRukiPay = (config: RukiPayConfig): VacancyOffer['pay'] => {
  const monthlyText = `${formatRub(config.monthlyMin)}–${formatRub(config.monthlyMax)} ₽/мес`;

  return {
    currency: 'RUB',
    monthly: {
      min: config.monthlyMin,
      max: config.monthlyMax,
      text: monthlyText,
    },
    perOrder: {
      min: config.averageOrder,
      max: config.averageOrder,
      text: `${formatRub(config.averageOrder)} ₽ за заказ в среднем`,
    },
    rate: `${config.rate}; средний доход за заказ: ${formatRub(config.averageOrder)} ₽`,
    paymentFrequency: 'На карту в течение 1–2 дней после выполненного заказа',
  };
};

const buildRukiOffers = (
  campaign: string,
  payConfig: RukiPayConfig,
  priorityBase: number,
): VacancyOffer[] =>
  rukiMoscowRegionCities.map((city, cityIndex): VacancyOffer => ({
    city,
    transport: 'service',
    transportProvision: 'not_required',
    pay: buildRukiPay(payConfig),
    isActive: true,
    updatedAt: RUKI_UPDATED_AT,
    sourceUrl: RUKI_SOURCE_URL,
    salaryConfidence: 'partner',
    ageFrom: 18,
    citizenship: RUKI_CITIZENSHIP,
    medicalBook: 'unknown',
    employmentFormats: [...RUKI_EMPLOYMENT_FORMATS],
    schedule: RUKI_SCHEDULE,
    applyLink: buildRukiApplyLink(city, campaign),
    priority: priorityBase - cityIndex,
  }));

// === Content =========================================================

const rukiSharedBenefits = [
  'Стабильный поток заказов в Москве и Московской области.',
  'Мастер сам выбирает подходящие заказы на доске или карте.',
  'В заказе заранее видны адрес, состав работ, комиссия и сумма к выплате.',
  'Заказы чаще всего уже проверены и оплачены клиентом.',
  'Договоры и отчётность ведутся через приложение с электронной подписью клиента.',
  'Нет депозитов и предоплат; комиссия оплачивается после расчёта с клиентом.',
  'Поддержка сервиса работает 7 дней в неделю.',
  'Можно работать свободно или выбрать формат с полной загрузкой и гарантией минимального дохода.',
];

const rukiSharedRequiredDocuments = [
  'Паспорт: главная страница, регистрация, фото паспорта под углом и селфи с паспортом.',
  'ИНН РФ или другого государства.',
  'Банковская карта для выплат.',
  'Фото портретного типа для анкеты мастера.',
  'Для иностранных граждан: миграционная карта, ВНЖ или РВП и временная регистрация.',
];

const rukiDoorInstallerContent: VacancyContent = {
  title: 'Установщик межкомнатных дверей Сервис «Руки» {cityPrep}',
  shortDescription:
    'Заказы на установку межкомнатных дверей через сервис «Руки»: свободный выбор заказов, понятная стоимость работ и выплаты на карту после выполнения.',
  description:
    'Сервис «Руки» подключает установщиков межкомнатных дверей к заказам {cityPrep}. Мастер видит адрес, состав работ, комиссию и сумму к выплате в приложении, выбирает подходящие заявки, согласует детали с клиентом, выполняет установку и закрывает заказ через приложение.',
  requirements: [
    'Профессиональный опыт установки межкомнатных дверей по реальным заказам.',
    'Свой рабочий инструмент для установки дверей.',
    'Смартфон для работы с заказами, договором и отчётностью.',
    'Готовность пройти отборочный звонок, проверку документов и онлайн-интервью.',
    'Аккуратность на объекте и корректное общение с клиентом.',
    'Нельзя передавать заказы другим исполнителям без согласования с сервисом.',
  ],
  benefits: [
    'Средний доход за заказ по партнёрской таблице: 15 000 ₽.',
    ...rukiSharedBenefits,
  ],
  requiredDocuments: rukiSharedRequiredDocuments,
  labels: [
    'Установка дверей',
    'Выездные услуги',
    'Самозанятость',
    'Свободный график',
    'Выплаты после заказа',
  ],
  searchTags: [
    'Сервис Руки',
    'Сервис «Руки»',
    'hands.ru',
    'установщик дверей',
    'установка межкомнатных дверей',
    'выездной мастер',
    'самозанятость',
  ],
};

const rukiKitchenAssemblerContent: VacancyContent = {
  title: 'Сборщик кухонь Сервис «Руки» {cityPrep}',
  shortDescription:
    'Заказы на сборку и установку кухонь через сервис «Руки»: работа по прайсу, свободный выбор заказов, приложение для договоров и выплат.',
  description:
    'Сервис «Руки» подключает сборщиков кухонных гарнитуров к заказам {cityPrep}. Мастер получает заявки через приложение, заранее видит фронт работ, стоимость и комиссию, согласует дату с клиентом, выполняет сборку и установку кухни, подписывает документы в приложении и получает оплату на карту.',
  requirements: [
    'Опыт сборки и установки кухонных гарнитуров от 1 года.',
    'Свой рабочий инструмент: перфоратор, дисковая пила, дрель-шуруповёрт, электролобзик и пылесос.',
    'Смартфон для работы с заказами, договором и отчётностью.',
    'Готовность пройти отборочный звонок, проверку документов и онлайн-интервью.',
    'Аккуратность на объекте и корректное общение с клиентом.',
    'Нельзя передавать заказы другим исполнителям без согласования с сервисом.',
  ],
  benefits: [
    'Средний доход за заказ по партнёрской таблице: 27 500 ₽.',
    ...rukiSharedBenefits,
    'Не нужно самостоятельно искать клиентов и оправдывать цену перед заказчиком.',
  ],
  requiredDocuments: rukiSharedRequiredDocuments,
  labels: [
    'Сборка кухонь',
    'Выездные услуги',
    'Самозанятость',
    'Свободный график',
    'Выплаты после заказа',
  ],
  searchTags: [
    'Сервис Руки',
    'Сервис «Руки»',
    'hands.ru',
    'сборщик кухонь',
    'сборщик кухонных гарнитуров',
    'установка кухни',
    'выездной мастер',
    'самозанятость',
  ],
};

// === Sources =========================================================

export const rukiSources: VacancySource[] = [
  {
    id: 28,
    slug: 'ruki-door-installer',
    company: { name: RUKI_COMPANY_NAME, logo: RUKI_COMPANY_LOGO },
    content: rukiDoorInstallerContent,
    defaults: {
      ageFrom: 18,
      medicalBook: 'unknown',
      employmentFormats: [...RUKI_EMPLOYMENT_FORMATS],
      schedule: RUKI_SCHEDULE,
      education: 'Профессиональный опыт установки дверей',
      citizenship: RUKI_CITIZENSHIP,
      uniform: 'Не требуется',
      os: 'Смартфон для приложения сервиса',
    },
    offers: buildRukiOffers('ruki-door-installer', doorInstallerPay, 1510),
    incomeCalculator: { mode: 'monthly' },
    howToTemplate: 'service_worker',
    extraTags: [
      'ruki',
      'hands',
      'door-installer',
      'repair',
      'service',
      'self-employed',
      'source:saleads',
      'source:google-sheet',
    ],
    isHot: true,
  },
  {
    id: 29,
    slug: 'ruki-kitchen-assembler',
    company: { name: RUKI_COMPANY_NAME, logo: RUKI_COMPANY_LOGO },
    content: rukiKitchenAssemblerContent,
    defaults: {
      ageFrom: 18,
      medicalBook: 'unknown',
      employmentFormats: [...RUKI_EMPLOYMENT_FORMATS],
      schedule: RUKI_SCHEDULE,
      education: 'Опыт сборки кухонь от 1 года',
      citizenship: RUKI_CITIZENSHIP,
      uniform: 'Не требуется',
      os: 'Смартфон для приложения сервиса',
    },
    offers: buildRukiOffers('ruki-kitchen-assembler', kitchenAssemblerPay, 1505),
    incomeCalculator: { mode: 'monthly' },
    howToTemplate: 'service_worker',
    extraTags: [
      'ruki',
      'hands',
      'kitchen-assembler',
      'repair',
      'service',
      'self-employed',
      'source:saleads',
      'source:google-sheet',
    ],
    isHot: true,
  },
];

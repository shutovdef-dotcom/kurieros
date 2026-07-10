import type { CompanyEntity } from '../utils/companies';
import { formatRussianPlural, humanJoin } from '../utils/format';
import { formatMoneyPerMonth } from '../utils/money';
import { getCompanyCommercialHub } from '../utils/companySeo';
import { getCompanyHomepage } from './companyHomepages';

export type CompanyGuideFaqItem = {
  question: string;
  answer: string;
};

export type CompanyGuideSource = {
  label: string;
  url: string;
};

export type CompanyGuideBlock = {
  title: string;
  text: string;
};

export type CompanyGuide = {
  slug: string;
  title: string;
  description: string;
  kicker: string;
  h1: string;
  subtitle: string;
  summary: string;
  primaryHubHref: string;
  primaryHubLabel: string;
  vacancyPreviewLimit: number;
  cityPreviewLimit: number;
  featuredCities: string[];
  verdictTitle: string;
  verdictPoints: string[];
  guideBlocks: CompanyGuideBlock[];
  fitPoints: string[];
  cautionPoints: string[];
  steps: string[];
  faqItems: CompanyGuideFaqItem[];
  sourceNotes: string[];
  sources: CompanyGuideSource[];
  updatedAt: string;
};

export const COMPANY_GUIDE_VACANCY_LIMIT = 8;
export const COMPANY_GUIDE_CITY_LIMIT = 16;

const COMPANY_GUIDE_UPDATED_AT = '2026-06-28';

const POPULAR_GUIDE_CITIES = [
  'Москва',
  'Санкт-Петербург',
  'Екатеринбург',
  'Новосибирск',
  'Казань',
  'Нижний Новгород',
  'Краснодар',
  'Ростов-на-Дону',
  'Самара',
  'Уфа',
  'Челябинск',
  'Пермь',
  'Красноярск',
  'Воронеж',
  'Волгоград',
  'Омск',
];

const COMPANY_GUIDES: Readonly<Record<string, CompanyGuide>> = {
  'kuper-ex-sbermarket': {
    slug: 'kuper-ex-sbermarket',
    title: 'Купер (ex. СберМаркет): работа, условия и выплаты | КурьерОк',
    description:
      'Гайд по работе в Купер: какие есть вакансии, как устроены выплаты, документы, медкнижка, самозанятость, сборка заказов и что проверить перед откликом.',
    kicker: 'Гайд по работодателю',
    h1: 'Работа в Купер: условия, выплаты и вакансии',
    subtitle:
      'Коротко разбираем, кому подходит Купер, какие роли бывают и что важно уточнить до отклика.',
    summary:
      'Купер работает с доставкой продуктов и заказов из магазинов. Здесь собраны условия, частые вопросы и текущие вакансии по городам и ролям.',
    primaryHubHref: '#company-vacancies',
    primaryHubLabel: 'Смотреть вакансии Купер на этой странице',
    vacancyPreviewLimit: COMPANY_GUIDE_VACANCY_LIMIT,
    cityPreviewLimit: COMPANY_GUIDE_CITY_LIMIT,
    featuredCities: [
      'Москва',
      'Санкт-Петербург',
      'Екатеринбург',
      'Новосибирск',
      'Казань',
      'Нижний Новгород',
      'Краснодар',
      'Ростов-на-Дону',
      'Самара',
      'Уфа',
      'Челябинск',
      'Пермь',
      'Красноярск',
      'Воронеж',
      'Волгоград',
      'Омск',
    ],
    verdictTitle: 'Когда стоит рассматривать Купер?',
    verdictPoints: [
      'Купер стоит смотреть, если вам ближе доставка продуктов, работа по слотам и понятный маршрут из приложения.',
      'На странице вакансий лучше сравнивать конкретный город и роль: пеший курьер, велокурьер, автокурьер или сборщик заказов.',
      'Перед откликом важно отдельно проверить выплаты, требования к документам, медкнижку и правила отмены слотов.',
    ],
    guideBlocks: [
      {
        title: 'Какие роли бывают',
        text:
          'Чаще всего встречаются курьерские роли пешком, на велосипеде или на автомобиле. В части городов также доступны вакансии сборщика заказов в магазине или дарксторе.',
      },
      {
        title: 'Доход и выплаты',
        text:
          'Доход зависит от города, транспорта, слотов, нагрузки и правил конкретной вакансии. На КурьерОк лучше сравнивать не обещание в рекламе, а карточку с городом, ролью и верхней планкой дохода.',
      },
      {
        title: 'Оформление и документы',
        text:
          'Обычно проверяют паспорт, ИНН, СНИЛС, способ получения выплат и статус самозанятого или другой формат договора. Для работы с продуктами может понадобиться медкнижка.',
      },
    ],
    fitPoints: [
      'Тем, кто хочет работать в доставке продуктов и выбирать формат: пешком, на велосипеде, на авто или в роли сборщика.',
      'Тем, кому важно заранее понять документы, выплаты, график и ограничения до перехода в анкету работодателя.',
      'Тем, кто сравнивает Купер с Яндекс Едой, Самокатом или Ozon и хочет увидеть не только список вакансий, но и условия.',
    ],
    cautionPoints: [
      'Не ориентируйтесь только на верхнюю сумму дохода: она зависит от города, смен, транспорта и фактической нагрузки.',
      'Проверьте медкнижку, самозанятость, гражданство, возраст и требования к транспорту в конкретной вакансии.',
      'Уточняйте правила слотов, опозданий, отмен и возможных корректировок выплат до выхода на первую смену.',
    ],
    steps: [
      'Откройте основной список вакансий Купер и выберите город, транспорт или роль.',
      'Сравните 2-3 карточки по доходу, выплатам, графику, документам и требованиям.',
      'Подготовьте паспорт, ИНН, СНИЛС, реквизиты для выплат и медкнижку, если она нужна для выбранной роли.',
      'Перейдите в анкету работодателя и проверьте финальные условия перед подтверждением смены.',
    ],
    faqItems: [
      {
        question: 'Какие вакансии есть в Купере?',
        answer:
          'На КурьерОк встречаются вакансии пешего курьера, велокурьера, автокурьера и сборщика заказов. Доступность ролей зависит от города и текущего набора.',
      },
      {
        question: 'Нужна ли самозанятость для работы в Купере?',
        answer:
          'Во многих курьерских вакансиях используется самозанятость или договорный формат работы. Перед откликом проверьте тип оформления в конкретной карточке и в анкете работодателя.',
      },
      {
        question: 'Нужна ли медкнижка курьеру Купера?',
        answer:
          'Для доставки продуктов и работы с заказами из магазинов медкнижка может быть обязательной. Если роль связана со сборкой или передачей продуктов, лучше заранее уточнить срок оформления и кто оплачивает медосмотр.',
      },
      {
        question: 'Как часто платят курьерам Купера?',
        answer:
          'Частота выплат зависит от вакансии, города и формата оформления. В карточках на КурьерОк обращайте внимание на поле выплат, а финальный график выплат сверяйте в анкете Купера.',
      },
      {
        question: 'Можно ли работать в Купере без опыта?',
        answer:
          'Да, для курьерских и части сборочных ролей опыт обычно не является главным требованием. Важнее документы, смартфон, готовность работать по правилам сервиса и аккуратность с заказами.',
      },
      {
        question: 'Чем сборщик заказов отличается от курьера?',
        answer:
          'Сборщик работает внутри магазина или даркстора: находит товары, проверяет позиции и передает заказ на доставку. Курьер забирает готовый заказ и доставляет его клиенту по маршруту.',
      },
      {
        question: 'Есть ли штрафы в Купере?',
        answer:
          'Кандидаты чаще всего переживают из-за опозданий, отмен слотов, отказов от заказов и спорных корректировок. Перед стартом уточните правила сервиса и сохраните условия, которые вам показали при оформлении.',
      },
      {
        question: 'Где смотреть все актуальные вакансии Купера?',
        answer:
          'Актуальные карточки по городам, ролям, транспорту и доходу показаны в разделе вакансий на этой странице. Перед откликом откройте конкретную карточку и сверьте условия.',
      },
    ],
    sourceNotes: [
      'Факты на странице собраны из карточек вакансий КурьерОк, открытых страниц работодателя и типовых вопросов кандидатов о доставке продуктов.',
      'Условия могут отличаться по городу и роли, поэтому финальные требования всегда проверяются в конкретной вакансии и анкете Купера.',
    ],
    sources: [
      {
        label: 'Официальная страница работы Купер',
        url: 'https://kuper.ru/rabota',
      },
      {
        label: 'Вакансии Купер на КурьерОк',
        url: '#company-vacancies',
      },
    ],
    updatedAt: '2026-06-28',
  },
};

const uniqueValues = (items: readonly string[]): string[] => {
  const seen = new Set<string>();

  return items.filter((item) => {
    const normalized = item.trim().toLocaleLowerCase('ru-RU');

    if (!normalized || seen.has(normalized)) return false;

    seen.add(normalized);
    return true;
  });
};

const vacancyCountLabel = (count: number): string =>
  `${count} ${formatRussianPlural(count, ['вакансия', 'вакансии', 'вакансий'])}`;

const previewText = (items: readonly string[], fallback: string): string => {
  const visibleItems = uniqueValues(items).slice(0, 3);

  return visibleItems.length ? humanJoin(visibleItems) : fallback;
};

const salaryText = (company: CompanyEntity): string =>
  company.maxSalary && company.maxSalaryCurrency
    ? `до ${formatMoneyPerMonth(company.maxSalary, company.maxSalaryCurrency)}`
    : 'по условиям конкретной вакансии';

const companyCategoryText = (companyName: string): string => {
  if (/банк/i.test(companyName)) return 'выездных встреч, доставки банковских продуктов и клиентского сервиса';
  if (/тетрика/i.test(companyName)) return 'онлайн-обучения и удаленной работы с учениками';
  if (/voxys/i.test(companyName)) return 'контакт-центра и клиентского сервиса';
  if (/руки|домов[её]нок|qlean/i.test(companyName)) return 'сервисных и бытовых услуг';
  if (/ozon|efin/i.test(companyName)) return 'логистики, доставки и e-commerce';
  if (/бургер|еда|самокат|купер|fresh/i.test(companyName)) return 'доставки еды, продуктов и заказов';

  return 'курьерской и сервисной занятости';
};

const buildFeaturedCities = (company: CompanyEntity): string[] =>
  uniqueValues([
    ...POPULAR_GUIDE_CITIES,
    ...company.topCities,
    ...company.cities,
  ]).slice(0, COMPANY_GUIDE_CITY_LIMIT);

const buildDefaultCompanyGuide = (company: CompanyEntity): CompanyGuide => {
  const vacancyText = vacancyCountLabel(company.vacancyCount);
  const transportText = previewText(company.transportModes, company.primaryTransport);
  const paymentText = previewText(company.paymentPreview, 'выплаты зависят от вакансии');
  const employmentText = previewText(company.employmentPreview, 'формат оформления указан в карточке');
  const ageText = previewText(company.agePreview, 'возрастной порог зависит от роли');
  const topCitiesText = previewText(company.topCities, 'города зависят от текущего набора');
  const categoryText = companyCategoryText(company.name);
  const officialHomepage = getCompanyHomepage(company.name);
  const commercialHub = getCompanyCommercialHub(company.slug);

  return {
    slug: company.slug,
    title: `Работа в компании ${company.name}: условия, выплаты и вакансии | КурьерОк`,
    description:
      `${company.name}: ${vacancyText}, ${transportText.toLowerCase()}, доход ${salaryText(company)}. Разбираем выплаты, оформление, города и что проверить перед откликом.`.slice(0, 170),
    kicker: 'Гайд по работодателю',
    h1: `Работа в компании ${company.name}: условия и вакансии`,
    subtitle:
      `Коротко разбираем, кому подходит ${company.name}, какие форматы есть и что важно уточнить до отклика.`,
    summary:
      `${company.name} на КурьерОк - это страница-справочник по работодателю: здесь собраны активные вакансии, типовые условия, города, выплаты и вопросы, которые стоит закрыть до анкеты.`,
    primaryHubHref: commercialHub?.href ?? '#company-vacancies',
    primaryHubLabel: commercialHub?.label ?? 'Смотреть примеры вакансий',
    vacancyPreviewLimit: COMPANY_GUIDE_VACANCY_LIMIT,
    cityPreviewLimit: COMPANY_GUIDE_CITY_LIMIT,
    featuredCities: buildFeaturedCities(company),
    verdictTitle: `Когда стоит рассматривать ${company.name}?`,
    verdictPoints: [
      `${company.name} стоит открыть, если вы рассматриваете формат ${categoryText} и хотите быстро сравнить реальные карточки на КурьерОк.`,
      `Сейчас в базе есть ${vacancyText}; чаще всего встречаются форматы: ${transportText}.`,
      `Перед откликом отдельно проверьте выплаты, оформление, возраст, документы и требования к городу: условия могут отличаться между карточками.`,
    ],
    guideBlocks: [
      {
        title: 'Какие роли бывают',
        text:
          `Вакансии ${company.name} могут отличаться по роли, графику и месту работы. По текущим карточкам главный ориентир такой: ${transportText}.`,
      },
      {
        title: 'Доход и выплаты',
        text:
          `Верхняя планка дохода сейчас: ${salaryText(company)}. Выплаты в карточках описаны как: ${paymentText}. Сравнивайте город, график и условия выхода, а не только максимальную сумму.`,
      },
      {
        title: 'Оформление и документы',
        text:
          `Форматы оформления: ${employmentText}. Возрастной ориентир: ${ageText}. Перед анкетой проверьте паспорт, ИНН, СНИЛС, реквизиты для выплат и дополнительные требования конкретной роли.`,
      },
    ],
    fitPoints: [
      `Тем, кто рассматривает ${company.name} и хочет понять условия до перехода в отдельную вакансию.`,
      `Тем, кому важно сравнить город, формат работы, выплаты и оформление на одной странице.`,
      `Тем, кто выбирает между несколькими работодателями и хочет увидеть не рекламное обещание, а структуру текущих карточек.`,
    ],
    cautionPoints: [
      `Не ориентируйтесь только на верхнюю сумму дохода: для ${company.name} она зависит от города, смен, графика, роли и фактической нагрузки.`,
      `Проверьте возраст, гражданство, самозанятость или другой тип оформления, документы и возможные требования к транспорту в конкретной вакансии.`,
      `Если условия в анкете работодателя отличаются от карточки на КурьерОк, финальным источником будут условия, которые работодатель покажет перед стартом.`,
    ],
    steps: [
      `Посмотрите краткий вывод по ${company.name} и решите, подходит ли вам формат работы.`,
      `Откройте примеры вакансий и сравните 2-3 карточки по городу, доходу, графику, выплатам и оформлению.`,
      'Проверьте документы, возрастные ограничения, требования к транспорту и дополнительные условия конкретной роли.',
      'Перейдите в подходящую вакансию или анкету работодателя и сверяйте финальные условия перед выходом на первую смену.',
    ],
    faqItems: [
      {
        question: `Какие вакансии есть у ${company.name}?`,
        answer:
          `Сейчас на КурьерОк есть ${vacancyText} ${company.name}. Основные форматы по текущим карточкам: ${transportText}.`,
      },
      {
        question: `Сколько можно заработать в ${company.name}?`,
        answer:
          `Ориентир по верхней планке дохода: ${salaryText(company)}. Итоговая сумма зависит от города, графика, роли, количества смен и правил конкретной вакансии.`,
      },
      {
        question: `Как часто платят в ${company.name}?`,
        answer:
          `В карточках встречаются такие форматы выплат: ${paymentText}. Перед откликом обязательно сверяйте периодичность выплат и способ получения денег в выбранной вакансии.`,
      },
      {
        question: `Какое оформление предлагает ${company.name}?`,
        answer:
          `По текущим карточкам указаны форматы: ${employmentText}. В зависимости от роли могут потребоваться самозанятость, ГПХ, трудовой договор или другой формат оформления.`,
      },
      {
        question: `В каких городах есть работа в ${company.name}?`,
        answer:
          `Сильнее всего по текущим данным представлены: ${topCitiesText}. Полный список городов на странице формируется из активных вакансий и может меняться при обновлении базы.`,
      },
      {
        question: `Нужен ли опыт для работы в ${company.name}?`,
        answer:
          'Для части ролей опыт не является главным требованием, но важны документы, аккуратность, соблюдение правил сервиса и готовность работать по условиям конкретной вакансии.',
      },
      {
        question: `Что проверить перед откликом в ${company.name}?`,
        answer:
          `Проверьте доход, выплаты, график, возрастной порог (${ageText}), оформление, город, требования к транспорту и дополнительные документы. Особенно внимательно сравнивайте условия, если открываете несколько похожих карточек.`,
      },
    ],
    sourceNotes: [
      `Страница собрана из активных карточек ${company.name} на КурьерОк, данных о городах, выплатах, форматах оформления и отзывов, если они есть в базе.`,
      'Условия могут отличаться по городу и роли, поэтому финальные требования всегда нужно проверять в конкретной вакансии и анкете работодателя.',
    ],
    sources: [
      ...(officialHomepage
        ? [
            {
              label: `Официальный сайт ${company.name}`,
              url: officialHomepage,
            },
          ]
        : []),
      {
        label: `Вакансии ${company.name} на КурьерОк`,
        url: '#company-vacancies',
      },
    ],
    updatedAt: COMPANY_GUIDE_UPDATED_AT,
  };
};

export function getCompanyGuide(slug: string): CompanyGuide | undefined;
export function getCompanyGuide(slug: string, company: CompanyEntity): CompanyGuide;
export function getCompanyGuide(slug: string, company?: CompanyEntity): CompanyGuide | undefined {
  const guideOverride = COMPANY_GUIDES[slug];

  if (guideOverride) return guideOverride;

  return company ? buildDefaultCompanyGuide(company) : undefined;
}

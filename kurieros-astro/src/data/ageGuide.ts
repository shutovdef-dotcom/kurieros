import {
  getSourceById,
  type KnowledgeSource,
} from '../utils/knowledge';

export type AgeRoleId = 'foot' | 'bike' | 'auto' | 'picker' | 'bank';

export type AgeGuideRow = {
  id: string;
  brand: string;
  role: string;
  roleId: AgeRoleId;
  minimumAge: string;
  parentalConsent: string;
  employment: string;
  verifiedAt: string;
  sourceIds: string[];
  companyHref: string;
  vacancyHref: string;
};

export type AgeGuideSection = {
  id: AgeRoleId;
  heading: string;
  body: string;
  sourceIds: string[];
};

export type AgeGuideFaqItem = {
  id: string;
  question: string;
  answer: string;
  sourceIds: string[];
};

export type VerifiedKnowledgeSource = KnowledgeSource & {
  verified_at: string;
};

const VERIFIED_AT = '2026-07-10';

export const AGE_GUIDE = {
  publishedDate: '2026-04-26',
  modifiedDate: VERIFIED_AT,
  methodology:
    'Сравнение составлено только по страницам самих работодателей. Если официальный источник не называет возраст, согласие родителей или форму оформления, в таблице стоит «не указано». Данные агрегаторов, форумов и пересказы не использовались.',
  rows: [
    {
      id: 'kuper-foot-16',
      brand: 'Купер',
      role: 'Пеший курьер',
      roleId: 'foot',
      minimumAge: 'С 16 лет',
      parentalConsent: 'Не требуется с 16 лет',
      employment: 'Самозанятость, публичная оферта',
      verifiedAt: VERIFIED_AT,
      sourceIds: ['age-kuper-courier'],
      companyHref: '/companies/kuper-ex-sbermarket/',
      vacancyHref: '/v/kuper-foot-courier-moskva-foot/',
    },
    {
      id: 'yandex-foot-under-18',
      brand: 'Яндекс Еда',
      role: 'Пеший курьер',
      roleId: 'foot',
      minimumAge: 'Не указан; правила учитывают курьеров младше 18',
      parentalConsent: 'Не указано',
      employment: 'Курьер-партнёр; вид договора на странице не указан',
      verifiedAt: VERIFIED_AT,
      sourceIds: ['age-yandex-standards'],
      companyHref: '/companies/yandex-eda/',
      vacancyHref: '/v/yandex-eda-courier-moskva-foot/',
    },
    {
      id: 'kuper-bike-16',
      brand: 'Купер',
      role: 'Велокурьер',
      roleId: 'bike',
      minimumAge: 'С 16 лет',
      parentalConsent: 'Не требуется с 16 лет',
      employment: 'Самозанятость, публичная оферта',
      verifiedAt: VERIFIED_AT,
      sourceIds: ['age-kuper-courier'],
      companyHref: '/companies/kuper-ex-sbermarket/',
      vacancyHref: '/v/kuper-bike-courier-moskva-bicycle/',
    },
    {
      id: 'yandex-bike-under-18',
      brand: 'Яндекс Еда',
      role: 'Велокурьер',
      roleId: 'bike',
      minimumAge: 'Не указан; правила учитывают курьеров младше 18',
      parentalConsent: 'Не указано',
      employment: 'Курьер-партнёр; вид договора на странице не указан',
      verifiedAt: VERIFIED_AT,
      sourceIds: ['age-yandex-standards'],
      companyHref: '/companies/yandex-eda/',
      vacancyHref: '/v/yandex-eda-courier-moskva-bicycle/',
    },
    {
      id: 'kuper-auto-18',
      brand: 'Купер',
      role: 'Автокурьер',
      roleId: 'auto',
      minimumAge: 'С 18 лет',
      parentalConsent: 'Не применяется для совершеннолетних',
      employment: 'Самозанятость',
      verifiedAt: VERIFIED_AT,
      sourceIds: ['age-kuper-roles', 'age-kuper-employment'],
      companyHref: '/companies/kuper-ex-sbermarket/',
      vacancyHref: '/v/kuper-auto-courier-moskva-auto/',
    },
    {
      id: 'kuper-picker-16',
      brand: 'Купер',
      role: 'Сборщик заказов',
      roleId: 'picker',
      minimumAge: 'С 16 лет',
      parentalConsent: 'На странице сборщика не указано',
      employment: 'Самозанятость',
      verifiedAt: VERIFIED_AT,
      sourceIds: ['age-kuper-picker'],
      companyHref: '/companies/kuper-ex-sbermarket/',
      vacancyHref: '/v/kuper-order-picker-moskva-foot/',
    },
    {
      id: 'tbank-representative-18',
      brand: 'Т-Банк',
      role: 'Представитель',
      roleId: 'bank',
      minimumAge: 'С 18 лет для обычной вакансии',
      parentalConsent: 'Не применяется; младше 18 — курсы и стажировки',
      employment: 'ГПД; в части вакансий доступна самозанятость',
      verifiedAt: VERIFIED_AT,
      sourceIds: ['age-tbank-requirements', 'age-tbank-representative'],
      companyHref: '/companies/t-bank/',
      vacancyHref: '/v/tbank-representative-moskva-auto/',
    },
    {
      id: 'alfa-representative-unknown-age',
      brand: 'Альфа-Банк',
      role: 'Специалист по доставке карт',
      roleId: 'bank',
      minimumAge: 'Не указан в проверенной вакансии',
      parentalConsent: 'Не указано',
      employment: 'Трудовой договор по ТК РФ',
      verifiedAt: VERIFIED_AT,
      sourceIds: ['age-alfa-representative'],
      companyHref: '/companies/alfa-bank/',
      vacancyHref: '/v/alfa-bank-representative-moskva-foot/',
    },
  ] satisfies AgeGuideRow[],
  roleSections: [
    {
      id: 'foot',
      heading: 'Пеший курьер: подтверждённый порог есть у Купера',
      body:
        'Купер прямо принимает пеших курьеров с 16 лет и отдельно пишет, что с этого возраста согласие родителей не требуется. У Яндекс Еды официальные стандарты предусматривают курьеров младше 18 лет и ограничивают время доставок, но не называют нижнюю границу и не описывают согласие. Поэтому переносить на Яндекс цифру 16 из сторонних сайтов нельзя.',
      sourceIds: ['age-kuper-courier', 'age-yandex-standards'],
    },
    {
      id: 'bike',
      heading: 'Велокурьер: возраст проверяется отдельно от права на аренду',
      body:
        'Купер включает велодоставку в доступные с 16 лет форматы и не требует согласия родителей с этого возраста. Для Яндекс Еды в проверенной официальной инструкции подтверждён только сам факт работы курьеров младше 18 лет; точный минимум для велоформата на странице не опубликован.',
      sourceIds: ['age-kuper-courier', 'age-yandex-standards'],
    },
    {
      id: 'auto',
      heading: 'Автокурьер: у Купера опубликован порог 18 лет',
      body:
        'На официальной странице партнёрства Купера автокурьер выделен отдельно и указан возраст от 18 лет. Та же экосистема найма указывает самозанятость как требование для сотрудничества. Мы не распространяем этот порог на другие сервисы без их собственных подтверждений.',
      sourceIds: ['age-kuper-roles', 'age-kuper-employment'],
    },
    {
      id: 'picker',
      heading: 'Сборщик заказов: не смешиваем с курьерской ролью',
      body:
        'У Купера есть отдельная официальная страница сборщика заказов с 16 лет. На ней указана самозанятость, но нет ответа про согласие родителей. Поэтому в таблице согласие оставлено как неизвестное, даже несмотря на опубликованные условия для курьеров того же бренда.',
      sourceIds: ['age-kuper-picker'],
    },
    {
      id: 'bank',
      heading: 'Банковский представитель: это не обычная доставка',
      body:
        'Т-Банк кандидатам младше 18 лет предлагает образовательные курсы и стажировки; обычная вакансия представителя оформляется по ГПД, а в части объявлений — как самозанятость. В проверенной вакансии Альфа-Банка опубликовано оформление по ТК РФ, но возраст и согласие родителей не названы. Такие поля нельзя заполнять по аналогии с Т-Банком.',
      sourceIds: [
        'age-tbank-requirements',
        'age-tbank-representative',
        'age-alfa-representative',
      ],
    },
  ] satisfies AgeGuideSection[],
  faqItems: [
    {
      id: 'kuper-from-16',
      question: 'Можно ли работать курьером в Купере с 16 лет?',
      answer:
        'Да. Купер официально указывает 16 лет для пешей и велодоставки. На той же странице сказано, что с 16 лет согласие родителей не требуется.',
      sourceIds: ['age-kuper-courier'],
    },
    {
      id: 'auto-from-16',
      question: 'Можно ли в 16 лет работать автокурьером?',
      answer:
        'В Купере — нет: для автокурьера опубликован порог 18 лет. По другим брендам ориентируйтесь только на их текущую анкету или официальную вакансию.',
      sourceIds: ['age-kuper-roles'],
    },
    {
      id: 'picker-from-16',
      question: 'Берут ли сборщиков заказов с 16 лет?',
      answer:
        'Купер публикует отдельную вакансию сборщика с 16 лет и указывает самозанятость. Требование о согласии родителей на этой странице не приведено.',
      sourceIds: ['age-kuper-picker'],
    },
    {
      id: 'yandex-exact-age',
      question: 'Со скольки лет берёт Яндекс Еда?',
      answer:
        'Проверенная официальная страница не называет точный минимум. Она подтверждает, что для курьеров младше 18 лет действуют сокращённое время доставок и дневной интервал. Точный порог и документы нужно проверить в анкете своего города.',
      sourceIds: ['age-yandex-standards'],
    },
    {
      id: 'bank-under-18',
      question: 'Можно ли стать банковским представителем до 18 лет?',
      answer:
        'Т-Банк соискателей младше 18 лет направляет на курсы и стажировки, поэтому обычную вакансию представителя в сравнении считаем доступной с 18 лет. Альфа-Банк в проверенной вакансии возраст не указал.',
      sourceIds: ['age-tbank-requirements', 'age-alfa-representative'],
    },
    {
      id: 'employment-differs',
      question: 'Форма оформления одинакова у всех работодателей?',
      answer:
        'Нет. На проверенных страницах Купер указывает самозанятость, Т-Банк — ГПД и в части вакансий самозанятость, Альфа-Банк — оформление по ТК РФ. Всегда сверяйте конкретную вакансию перед откликом.',
      sourceIds: [
        'age-kuper-employment',
        'age-tbank-representative',
        'age-alfa-representative',
      ],
    },
  ] satisfies AgeGuideFaqItem[],
} as const;

export const getAgeGuideSource = (
  sourceId: string,
): VerifiedKnowledgeSource | undefined => {
  const source = getSourceById(sourceId);
  return source?.verified_at
    ? (source as VerifiedKnowledgeSource)
    : undefined;
};

export const getAgeGuideSources = (): VerifiedKnowledgeSource[] =>
  Array.from(
    new Set([
      ...AGE_GUIDE.rows.flatMap((row) => row.sourceIds),
      ...AGE_GUIDE.roleSections.flatMap((section) => section.sourceIds),
      ...AGE_GUIDE.faqItems.flatMap((item) => item.sourceIds),
    ]),
  )
    .map(getAgeGuideSource)
    .filter((source): source is VerifiedKnowledgeSource => Boolean(source));

export const buildAgeGuideFaqEntities = (
  items: readonly AgeGuideFaqItem[],
) =>
  items.map((item) => ({
    '@type': 'Question' as const,
    name: item.question,
    acceptedAnswer: {
      '@type': 'Answer' as const,
      text: item.answer,
    },
  }));

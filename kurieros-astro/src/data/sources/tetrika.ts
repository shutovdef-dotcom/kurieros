import { isCityBlocked, normalizeCityKey, slugifyCity } from '../../utils/cities';
import { CITY_DATASET } from '../cities-dataset';
import { TETRIKA_APPLY, TETRIKA_LOGO } from '../partnerLinks';
import type {
  EmploymentFormat,
  VacancyContent,
  VacancyOffer,
  VacancySource,
} from '../vacancyTypes';
import { formatRub } from './shared';

// === Constants =======================================================

const TETRIKA_COMPANY_NAME = 'Тетрика';
const TETRIKA_COMPANY_LOGO = TETRIKA_LOGO;
const TETRIKA_APPLY_LINK = TETRIKA_APPLY;
const TETRIKA_SOURCE_URL = 'https://agents.pampadu.ru/app/offer/view/1044';
const TETRIKA_UPDATED_AT = '2026-06-21';
const TETRIKA_CITIZENSHIP = 'Уточняется у партнёра';
const TETRIKA_EMPLOYMENT_FORMATS = [
  'self_employed',
  'individual_entrepreneur',
] satisfies EmploymentFormat[];
const TETRIKA_MONTHLY_MIN_RUB = 60_000;
const TETRIKA_MONTHLY_MAX_RUB = 100_000;
const TETRIKA_SCHEDULE =
  'Удалённо; частичная занятость, часы по договорённости, основная нагрузка с 14:00 до 21:00 по Москве';
const TETRIKA_PRIORITY_BASE = -5_000;

type TetrikaSubjectConfig = {
  id: number;
  slug: string;
  campaign: string;
  anchor: string;
  titleRole: string;
  subjectAfterPo: string;
  subjectAccusative: string;
  subjectTag: string;
  requirement: string;
  searchTags: string[];
};

const tetrikaSubjectConfigs = [
  {
    id: 31,
    slug: 'tetrika-english-teacher',
    campaign: 'tetrika-english-teacher',
    anchor: 'subject-english',
    titleRole: 'Репетитор по английскому языку',
    subjectAfterPo: 'английскому языку',
    subjectAccusative: 'английский язык',
    subjectTag: 'Английский язык',
    requirement:
      'Уверенное знание английского языка и умение объяснять школьную программу простым языком.',
    searchTags: ['английский', 'английский язык', 'репетитор английского', 'учитель английского'],
  },
  {
    id: 32,
    slug: 'tetrika-physics-teacher',
    campaign: 'tetrika-physics-teacher',
    anchor: 'subject-physics',
    titleRole: 'Репетитор по физике',
    subjectAfterPo: 'физике',
    subjectAccusative: 'физику',
    subjectTag: 'Физика',
    requirement:
      'Уверенное знание физики в рамках школьной программы и умение готовить учеников к занятиям и проверочным работам.',
    searchTags: ['физика', 'репетитор физики', 'учитель физики', 'онлайн физика'],
  },
  {
    id: 33,
    slug: 'tetrika-russian-teacher',
    campaign: 'tetrika-russian-teacher',
    anchor: 'subject-russian',
    titleRole: 'Репетитор по русскому языку',
    subjectAfterPo: 'русскому языку',
    subjectAccusative: 'русский язык',
    subjectTag: 'Русский язык',
    requirement:
      'Глубокое знание русского языка, грамотная речь и умение разбирать школьные темы с учениками разного уровня.',
    searchTags: ['русский язык', 'репетитор русского', 'учитель русского', 'онлайн русский'],
  },
  {
    id: 34,
    slug: 'tetrika-math-teacher',
    campaign: 'tetrika-math-teacher',
    anchor: 'subject-math',
    titleRole: 'Репетитор по математике',
    subjectAfterPo: 'математике',
    subjectAccusative: 'математику',
    subjectTag: 'Математика',
    requirement:
      'Уверенное знание математики в рамках школьной программы и умение объяснять задачи пошагово.',
    searchTags: ['математика', 'репетитор математики', 'учитель математики', 'онлайн математика'],
  },
] satisfies TetrikaSubjectConfig[];

// CITY_DATASET covers the canonical domestic city catalogue. A few live
// vacancy sources also generate city pages from partner-specific spellings
// and international Yandex Go cities, so keep those explicit here until the
// city dataset is regenerated from the full production job set.
const TETRIKA_EXTRA_SITE_CITIES = [
  'Актау',
  'Актобе',
  'Алматы',
  'Алнаши',
  'Вавож',
  'Андижан',
  'Артем',
  'Артемовский',
  'Астана',
  'Атырау',
  'Белев',
  'Белоозерский',
  'Березовский',
  'Бишкек',
  'Бугры',
  'Быково',
  'Венев',
  'Внуковское',
  'Высоцк',
  'Вышний Волочек',
  'Гусиноозерск',
  'Джалал-Абад',
  'Джубга',
  'Железнодорожный',
  'Жигулевск',
  'Заозерск',
  'Каменногорск',
  'Караганда',
  'Колтуши',
  'Королев',
  'Костанай',
  'Кременки',
  'Лопатино',
  'Марфино',
  'Минск',
  'Наманган',
  'Новая Адыгея',
  'Новая Ладога',
  'Новоселье',
  'Новохоперск',
  'Нукус',
  'Озерск',
  'Озеры',
  'Орел',
  'Островцы',
  'Очер',
  'Ош',
  'Павловский посад',
  'Павлодар',
  'пгт. Боброво',
  'Пикалёво',
  'Порошкино',
  'Придорожный',
  'Приозерск',
  'Пугачев',
  'Путилково',
  'с.п. Большелогское',
  'Самарканд',
  'Свердловское',
  'Семенов',
  'Соржа-Рыжики',
  'сп Бугровское',
  'Сухой лог',
  'Сычевка',
  'Ташкент',
  'Тимашевск',
  'Трехгорный',
  'Федино',
  'Фергана',
  'х Ленина',
  'х Хомуты',
  'Хоругвино',
  'Шымкент',
  'Щекино',
  'Щелково',
] as const;

const tetrikaCities = [
  ...new Map(
    [
      ...CITY_DATASET.map((city) => city.name),
      ...TETRIKA_EXTRA_SITE_CITIES,
    ]
      .filter((city) => !isCityBlocked(city))
      .map((city) => [normalizeCityKey(city), city]),
  ).values(),
];

// === Helpers =========================================================

const buildTetrikaApplyLink = (city: string, campaign: string) => {
  const url = new URL(TETRIKA_APPLY_LINK);
  const citySlug = slugifyCity(city);

  url.searchParams.set('utm_source', 'kurerok');
  url.searchParams.set('utm_medium', 'vacancy');
  url.searchParams.set('utm_campaign', campaign);
  url.searchParams.set('utm_content', `${citySlug}-remote`);

  return url.toString();
};

const buildTetrikaPay = (): VacancyOffer['pay'] => {
  const monthlyText =
    `от ${formatRub(TETRIKA_MONTHLY_MIN_RUB)} до ${formatRub(TETRIKA_MONTHLY_MAX_RUB)} ₽/мес`;

  return {
    currency: 'RUB',
    monthly: {
      min: TETRIKA_MONTHLY_MIN_RUB,
      max: TETRIKA_MONTHLY_MAX_RUB,
      text: monthlyText,
    },
    rate:
      `${monthlyText}; вознаграждение зависит от количества онлайн-занятий и нагрузки преподавателя`,
    paymentFrequency: 'Уточняется у партнёра',
  };
};

const buildTetrikaContent = (subject: TetrikaSubjectConfig): VacancyContent => ({
  title: `${subject.titleRole} Тетрики {cityPrep}`,
  shortDescription:
    `Удалённая работа в Тетрике: проводите индивидуальные онлайн-занятия по ${subject.subjectAfterPo}, выбирайте нагрузку и получайте поток учеников от платформы.`,
  description:
    `Тетрика приглашает преподавателей для индивидуальных онлайн-занятий по ${subject.subjectAfterPo}. Нужно проводить диагностику знаний, составлять программу обучения, заниматься с учениками на интерактивной платформе, давать обратную связь родителям и вести отчётность по урокам. Формат полностью удалённый: занятия проходят из дома, а сервис помогает с потоком учеников, расписанием и организационными вопросами.`,
  requirements: [
    'Возраст от 18 лет.',
    subject.requirement,
    'Опыт преподавания, репетиторства или регулярной подготовки учеников будет преимуществом.',
    'Грамотная устная и письменная речь.',
    'Уверенное владение компьютером и базовыми офисными программами.',
    'Тихое место для занятий, компьютер или ноутбук, стабильный интернет и веб-камера.',
    'Готовность брать от 10 часов занятий в неделю.',
  ],
  benefits: [
    `Доход от ${formatRub(TETRIKA_MONTHLY_MIN_RUB)} до ${formatRub(TETRIKA_MONTHLY_MAX_RUB)} ₽ в месяц до вычета налогов.`,
    'Полностью удалённый формат: занятия проходят в интерактивной онлайн-аудитории.',
    'Можно выбирать удобное время и нагрузку, основная активность учеников — с 14:00 до 21:00 по Москве.',
    'Поток учеников от платформы: не нужно самостоятельно искать клиентов.',
    'Самостоятельность в подготовке занятий и выборе методических материалов.',
    'Прозрачная система вознаграждения и онлайн-контроль финансов.',
    'Сотрудничество как самозанятый или ИП, с консультацией по оформлению.',
  ],
  requiredDocuments: [
    'Паспорт.',
    'ИНН.',
    'СНИЛС при необходимости.',
    'Статус самозанятого или ИП либо готовность оформить его перед стартом.',
    'Документы, подтверждающие образование или преподавательский опыт, если партнёр запросит их на этапе проверки.',
  ],
  labels: [
    'Удалённо',
    'Репетитор',
    subject.subjectTag,
    'Самозанятость',
    'Частичная занятость',
  ],
  searchTags: [
    'Тетрика',
    'tetrika',
    'репетитор',
    'преподаватель онлайн',
    'онлайн школа',
    'удалённая работа',
    subject.subjectAccusative,
    ...subject.searchTags,
  ],
});

const buildTetrikaDetailContent = (): VacancyContent => ({
  title: 'Репетитор Тетрики {cityPrep}',
  shortDescription:
    'Удалённая работа в Тетрике: проводите индивидуальные онлайн-занятия по английскому языку, математике, физике или русскому языку, выбирайте нагрузку и получайте поток учеников от платформы.',
  description:
    'Тетрика приглашает преподавателей для индивидуальных онлайн-занятий по английскому языку, математике, физике и русскому языку. Нужно проводить диагностику знаний, составлять программу обучения, заниматься с учениками на интерактивной платформе, давать обратную связь родителям и вести отчётность по урокам. Формат полностью удалённый: занятия проходят из дома, а сервис помогает с потоком учеников, расписанием и организационными вопросами.',
  requirements: [
    'Возраст от 18 лет.',
    'Уверенное знание одного из направлений: английский язык, математика, физика или русский язык.',
    'Опыт преподавания, репетиторства или регулярной подготовки учеников будет преимуществом.',
    'Грамотная устная и письменная речь.',
    'Уверенное владение компьютером и базовыми офисными программами.',
    'Тихое место для занятий, компьютер или ноутбук, стабильный интернет и веб-камера.',
    'Готовность брать от 10 часов занятий в неделю.',
  ],
  benefits: [
    `Доход от ${formatRub(TETRIKA_MONTHLY_MIN_RUB)} до ${formatRub(TETRIKA_MONTHLY_MAX_RUB)} ₽ в месяц до вычета налогов.`,
    'Полностью удалённый формат: занятия проходят в интерактивной онлайн-аудитории.',
    'Можно выбирать удобное время и нагрузку, основная активность учеников — с 14:00 до 21:00 по Москве.',
    'Поток учеников от платформы: не нужно самостоятельно искать клиентов.',
    'Самостоятельность в подготовке занятий и выборе методических материалов.',
    'Прозрачная система вознаграждения и онлайн-контроль финансов.',
    'Сотрудничество как самозанятый или ИП, с консультацией по оформлению.',
  ],
  requiredDocuments: [
    'Паспорт.',
    'ИНН.',
    'СНИЛС при необходимости.',
    'Статус самозанятого или ИП либо готовность оформить его перед стартом.',
    'Документы, подтверждающие образование или преподавательский опыт, если партнёр запросит их на этапе проверки.',
  ],
  labels: [
    'Удалённо',
    'Репетитор',
    '4 предмета',
    'Самозанятость',
    'Частичная занятость',
  ],
  searchTags: [
    'Тетрика',
    'tetrika',
    'репетитор',
    'преподаватель онлайн',
    'онлайн школа',
    'удалённая работа',
    'английский язык',
    'математика',
    'физика',
    'русский язык',
    'репетитор английского',
    'репетитор математики',
    'репетитор физики',
    'репетитор русского',
  ],
});

const buildTetrikaOffers = (subject: TetrikaSubjectConfig): VacancyOffer[] =>
  tetrikaCities.map((city, cityIndex): VacancyOffer => ({
    city,
    transport: 'remote',
    transportProvision: 'not_required',
    pay: buildTetrikaPay(),
    isActive: true,
    updatedAt: TETRIKA_UPDATED_AT,
    sourceUrl: TETRIKA_SOURCE_URL,
    salaryConfidence: 'partner',
    ageFrom: 18,
    citizenship: TETRIKA_CITIZENSHIP,
    medicalBook: 'not_required',
    employmentFormats: [...TETRIKA_EMPLOYMENT_FORMATS],
    schedule: TETRIKA_SCHEDULE,
    applyLink: buildTetrikaApplyLink(city, subject.campaign),
    priority: TETRIKA_PRIORITY_BASE - cityIndex,
  }));

const buildTetrikaDetailOffers = (): VacancyOffer[] =>
  tetrikaCities.map((city, cityIndex): VacancyOffer => ({
    city,
    transport: 'remote',
    transportProvision: 'not_required',
    pay: buildTetrikaPay(),
    isActive: true,
    updatedAt: TETRIKA_UPDATED_AT,
    sourceUrl: TETRIKA_SOURCE_URL,
    salaryConfidence: 'partner',
    ageFrom: 18,
    citizenship: TETRIKA_CITIZENSHIP,
    medicalBook: 'not_required',
    employmentFormats: [...TETRIKA_EMPLOYMENT_FORMATS],
    schedule: TETRIKA_SCHEDULE,
    applyLink: buildTetrikaApplyLink(city, 'tetrika-teacher'),
    priority: TETRIKA_PRIORITY_BASE - cityIndex,
    subjectVariants: tetrikaSubjectConfigs.map((subject) => ({
      id: subject.anchor,
      title: subject.titleRole,
      label: subject.subjectTag,
      requirement: subject.requirement,
      applyLink: buildTetrikaApplyLink(city, subject.campaign),
    })),
  }));

// === Sources =========================================================

const tetrikaListingSources: VacancySource[] = tetrikaSubjectConfigs.map((subject) => ({
  id: subject.id,
  slug: subject.slug,
  company: { name: TETRIKA_COMPANY_NAME, logo: TETRIKA_COMPANY_LOGO },
  content: buildTetrikaContent(subject),
  visibility: 'listing',
  detailRoute: {
    sourceSlug: 'tetrika-teacher',
    anchor: subject.anchor,
  },
  defaults: {
    ageFrom: 18,
    medicalBook: 'not_required',
    employmentFormats: [...TETRIKA_EMPLOYMENT_FORMATS],
    schedule: TETRIKA_SCHEDULE,
    education: 'Профильное образование или подтверждённый опыт преподавания',
    citizenship: TETRIKA_CITIZENSHIP,
    uniform: 'Не требуется',
    os: 'Компьютер или ноутбук, стабильный интернет и веб-камера',
  },
  offers: buildTetrikaOffers(subject),
  incomeCalculator: { mode: 'monthly' },
  howToTemplate: 'remote_operator',
  extraTags: ['tetrika', 'teacher', 'tutor', 'remote', 'education', 'self-employed', 'source:pampadu'],
}));

const tetrikaDetailSource: VacancySource = {
  id: 35,
  slug: 'tetrika-teacher',
  company: { name: TETRIKA_COMPANY_NAME, logo: TETRIKA_COMPANY_LOGO },
  content: buildTetrikaDetailContent(),
  visibility: 'detail',
  defaults: {
    ageFrom: 18,
    medicalBook: 'not_required',
    employmentFormats: [...TETRIKA_EMPLOYMENT_FORMATS],
    schedule: TETRIKA_SCHEDULE,
    education: 'Профильное образование или подтверждённый опыт преподавания',
    citizenship: TETRIKA_CITIZENSHIP,
    uniform: 'Не требуется',
    os: 'Компьютер или ноутбук, стабильный интернет и веб-камера',
  },
  offers: buildTetrikaDetailOffers(),
  incomeCalculator: { mode: 'monthly' },
  howToTemplate: 'remote_operator',
  extraTags: ['tetrika', 'teacher', 'tutor', 'remote', 'education', 'self-employed', 'source:pampadu'],
};

export const tetrikaSources: VacancySource[] = [
  ...tetrikaListingSources,
  tetrikaDetailSource,
];

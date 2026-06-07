/**
 * Pure helpers for the 4 transport/schedule hub pages:
 *   /rabota-peshim-kurerom/   (foot)
 *   /rabota-avtokurerom/      (auto)
 *   /rabota-velokurerom/      (bicycle)
 *   /podrabotka-kurerom/      (flexible)
 *
 * No Astro globals, no module-scope `new Date()`, no side-effects.
 * Every exported function is a pure total function — returns sensible
 * defaults/empty values on bad or empty input, never throws.
 *
 * The ~5% that differs between hubs (H1 copy, FAQ seeds, requirements,
 * the matching category-facet path) lives in HUB_CONFIGS as pure data.
 * All builders consume that config and shared runtime args.
 */

import type { GeneratedJob } from '../data/vacancyTypes';
import type { FaqItem } from './cityListingPage';
import { filterJobsByCriteria } from './jobFilters';
import { buildBreadcrumbSchema } from './schema';
import { cyrillicToLatin } from './transliterate';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TransportHubKey = 'foot' | 'auto' | 'bicycle' | 'flexible';

export type HubConfig = {
  key: TransportHubKey;
  /** URL slug for this hub page, e.g. "rabota-peshim-kurerom" */
  slug: string;
  /** Tag passed to filterJobsByCriteria */
  filter: { tag: string };
  /** Main heading (H1) for the hub page */
  h1: string;
  /** Short eyebrow / kicker above the H1 */
  eyebrow: string;
  /**
   * The matching category-facet slug from [slug].astro pages.
   * Single source of truth for Decision A canonical map and
   * the optional "точная фильтрация" link in HubCrossLinks.
   */
  categoryFacetPath: string;
  /** Seed questions used to build the hub FAQ */
  faqSeeds: string[];
  /** Short income description shown in the income block */
  incomeBlurb: string;
  /** Bullet list for the requirements block */
  requirementsBullets: string[];
};

// ---------------------------------------------------------------------------
// Config registry — the single source of truth for all 4 hubs
// ---------------------------------------------------------------------------

export const HUB_CONFIGS: Readonly<Record<TransportHubKey, HubConfig>> = {
  foot: {
    key: 'foot',
    slug: 'rabota-peshim-kurerom',
    filter: { tag: 'foot' },
    h1: 'Работа пешим курьером',
    eyebrow: 'Вакансии курьера',
    categoryFacetPath: 'rabota-kurerom-peshkom',
    faqSeeds: [
      'Сколько зарабатывает пеший курьер?',
      'Нужен ли опыт для работы пешим курьером?',
      'Какой график у пешего курьера?',
      'Какие документы нужны пешему курьеру?',
    ],
    incomeBlurb:
      'Пешие курьеры получают почасовую ставку плюс доплату за каждый выполненный заказ. ' +
      'Доход зависит от города, компании и интенсивности смен.',
    requirementsBullets: [
      'Возраст от 18 лет (в некоторых компаниях от 16)',
      'Смартфон на Android или iOS',
      'Наличие медкнижки (уточняйте в карточке вакансии)',
      'Готовность работать в любую погоду',
    ],
  },

  auto: {
    key: 'auto',
    slug: 'rabota-avtokurerom',
    filter: { tag: 'auto' },
    h1: 'Работа автокурьером',
    eyebrow: 'Вакансии курьера на авто',
    categoryFacetPath: 'rabota-kurerom-na-avto',
    faqSeeds: [
      'Сколько зарабатывает автокурьер?',
      'Нужна ли своя машина для работы автокурьером?',
      'Какой график у автокурьера?',
      'Нужно ли ИП или самозанятость автокурьеру?',
    ],
    incomeBlurb:
      'Автокурьеры, как правило, зарабатывают больше пеших: зоны доставки шире, ' +
      'заказов больше за смену. Доход зависит от класса автомобиля и региона.',
    requirementsBullets: [
      'Права категории B, стаж от 1 года',
      'Личный автомобиль или готовность использовать авто компании',
      'Смартфон на Android или iOS',
      'Самозанятость или ИП (у большинства работодателей)',
    ],
  },

  bicycle: {
    key: 'bicycle',
    slug: 'rabota-velokurerom',
    filter: { tag: 'bicycle' },
    h1: 'Работа велокурьером',
    eyebrow: 'Вакансии велокурьера',
    categoryFacetPath: 'rabota-kurerom-na-velosipede',
    faqSeeds: [
      'Сколько зарабатывает велокурьер?',
      'Нужен ли свой велосипед или самокат?',
      'Подходит ли работа велокурьером летом и зимой?',
      'Какой возраст нужен для работы велокурьером?',
    ],
    incomeBlurb:
      'Велокурьеры и самокатчики работают в городских зонах с высокой плотностью заказов. ' +
      'Летом доход выше за счёт пиковых смен.',
    requirementsBullets: [
      'Возраст от 18 лет (в некоторых компаниях от 16)',
      'Велосипед, самокат или аренда у компании',
      'Смартфон на Android или iOS',
      'Хорошая физическая форма',
    ],
  },

  flexible: {
    key: 'flexible',
    slug: 'podrabotka-kurerom',
    filter: { tag: 'flexible' },
    h1: 'Подработка курьером',
    eyebrow: 'Частичная занятость',
    categoryFacetPath: 'rabota-kurerom-podrabotka',
    faqSeeds: [
      'Можно ли работать курьером неполный день?',
      'Сколько часов в неделю нужно работать на подработке?',
      'Подходит ли подработка курьером студентам?',
      'Как совмещать подработку курьером с основной работой?',
    ],
    incomeBlurb:
      'Подработка с гибким графиком: выбирайте смены под свой распорядок. ' +
      'Минимальная смена — от 2 часов. Выплаты еженедельно или чаще.',
    requirementsBullets: [
      'Возраст от 16 лет (уточняйте у работодателя)',
      'Смартфон на Android или iOS',
      'Готовность к нерегулярному графику',
    ],
  },
};

// ---------------------------------------------------------------------------
// Title builder
// ---------------------------------------------------------------------------

/**
 * Build the SEO title (<= 70 chars) for a hub page.
 *
 * When the hub is empty the title stays meaningful but omits salary /
 * vacancy count. When maxSalary = 0 the salary phrase is omitted so
 * the string never contains "до 0 ₽".
 */
export function buildHubTitle(
  cfg: HubConfig,
  count: number,
  maxSalary: number,
  isEmpty: boolean,
): string {
  let raw: string;

  if (isEmpty) {
    raw = `${cfg.h1} — следите за обновлениями | КурьерОк`;
  } else if (maxSalary > 0) {
    const salaryStr = new Intl.NumberFormat('ru-RU').format(maxSalary);
    raw = `${cfg.h1} — до ${salaryStr} ₽ · ${count} вак. | КурьерОк`;
  } else {
    raw = `${cfg.h1} 2026: ${count} вакансий | КурьерОк`;
  }

  return raw.slice(0, 70);
}

// ---------------------------------------------------------------------------
// Description builder
// ---------------------------------------------------------------------------

/**
 * Build the meta description (<= 170 chars) for a hub page.
 * companyNames may be empty — in that case the company list phrase is omitted.
 */
export function buildHubDescription(
  cfg: HubConfig,
  count: number,
  companyNames: string[],
  isEmpty: boolean,
): string {
  let raw: string;

  if (isEmpty) {
    raw =
      `Вакансий по запросу «${cfg.h1.toLowerCase()}» сейчас нет — ` +
      `добавьте страницу в избранное и загляните позже.`;
  } else if (companyNames.length > 0) {
    const companies = companyNames.slice(0, 3).join(', ');
    raw = `${count} вак. — ${cfg.h1.toLowerCase()} от ${companies}. Выбирайте по доходу и графику.`;
  } else {
    raw =
      `${count} вакансий — ${cfg.h1.toLowerCase()} от прямых работодателей. ` +
      'Сравните условия и откликайтесь.';
  }

  return raw.slice(0, 170);
}

// ---------------------------------------------------------------------------
// FAQ builder
// ---------------------------------------------------------------------------

/**
 * Build the FAQ items for a hub page.
 * Returns at least 3 well-formed FaqItems for every hub config.
 * Each answer contains real editorial content — no placeholders.
 */
export function buildHubFaqItems(
  cfg: HubConfig,
  count: number,
  companyNames: string[],
): FaqItem[] {
  const companySample =
    companyNames.length > 0
      ? companyNames.slice(0, 3).join(', ')
      : 'Яндекс.Еда, Купер, Озон';

  const seedItems: FaqItem[] = cfg.faqSeeds.map((seed) =>
    buildSeedFaqItem(seed, count, companySample),
  );

  const closingItem: FaqItem = {
    question: 'Нужно ли сразу откликаться?',
    answer:
      'Нет. Откройте карточку вакансии, проверьте требования, город и условия — ' +
      'и только потом переходите по ссылке отклика.',
  };

  return [...seedItems, closingItem];
}

/** Map a single seed question string to a proper FaqItem with a real answer. */
function buildSeedFaqItem(
  seed: string,
  count: number,
  companySample: string,
): FaqItem {
  const answerMap: Record<string, string> = {
    // Foot hub
    'Сколько зарабатывает пеший курьер?':
      'В среднем 60 000–120 000 ₽/мес в зависимости от города и интенсивности смен. ' +
      'Детальные данные — на странице «Сколько зарабатывает курьер».',
    'Нужен ли опыт для работы пешим курьером?':
      'Нет. Большинство работодателей берут без опыта — обучение проходит за 1–2 дня.',
    'Какой график у пешего курьера?':
      `На нашей странице собраны ${count} вакансий с разными графиками: 5/2, 2/2 ` +
      'и полностью свободный — выбирайте подходящий.',
    'Какие документы нужны пешему курьеру?':
      'Паспорт РФ + смартфон на Android/iOS. В ряде компаний нужна медкнижка — ' +
      'смотрите карточку вакансии.',

    // Auto hub
    'Сколько зарабатывает автокурьер?':
      'В среднем 80 000–160 000 ₽/мес. Автокурьеры получают ставку за смену ' +
      'плюс бонусы за количество заказов.',
    'Нужна ли своя машина для работы автокурьером?':
      'Зависит от работодателя. Часть компаний предоставляет корпоративный автомобиль, ' +
      'остальные требуют личный транспорт — смотрите карточку вакансии.',
    'Какой график у автокурьера?':
      `${count} вакансий с разными графиками: смены от 6 часов, 5/2, 2/2 ` +
      'и свободный — фильтруйте по удобному варианту.',
    'Нужно ли ИП или самозанятость автокурьеру?':
      'Большинство крупных агрегаторов работают по самозанятости (НПД). ' +
      'Оформление занимает 15 минут в приложении ФНС «Мой налог».',

    // Bicycle hub
    'Сколько зарабатывает велокурьер?':
      'В среднем 50 000–100 000 ₽/мес. Велокурьеры и самокатчики хорошо зарабатывают ' +
      'в тёплый сезон на пиковых сменах.',
    'Нужен ли свой велосипед или самокат?':
      'Часть компаний предоставляет транспорт в аренду, другие требуют личный. ' +
      'Условия указаны в карточке каждой вакансии.',
    'Подходит ли работа велокурьером летом и зимой?':
      'Летом велокурьеры работают в большинстве городов. Зимой часть компаний ' +
      'переводит на другой формат или снижает интенсивность смен.',
    'Какой возраст нужен для работы велокурьером?':
      'Как правило, от 18 лет. Некоторые компании берут с 16 — уточняйте в карточке.',

    // Flexible hub
    'Можно ли работать курьером неполный день?':
      `Да. На этой странице собраны ${count} вакансий с частичной занятостью — ` +
      'смены от 2 часов, выбирайте удобные дни сами.',
    'Сколько часов в неделю нужно работать на подработке?':
      'Зависит от компании: обычно от 10 до 25 часов в неделю. ' +
      'Гибкий график позволяет комбинировать с учёбой или основной работой.',
    'Подходит ли подработка курьером студентам?':
      'Да. Многие студенты работают курьерами между парами — свободный график ' +
      'и возможность выходить только в удобные часы.',
    'Как совмещать подработку курьером с основной работой?':
      'Выбирайте вечерние или утренние смены, а также выходные дни — ' +
      `среди ${count} вакансий есть предложения с нерегулярным графиком.`,
  };

  const answer =
    answerMap[seed] ??
    `На этой странице ${count} вакансий от работодателей: ${companySample}. ` +
      'Сравните условия и выберите подходящую.';

  return { question: seed, answer };
}

// ---------------------------------------------------------------------------
// Schema graph builder
// ---------------------------------------------------------------------------

export type HubSchemaGraphArgs = {
  cfg: HubConfig;
  jobs: readonly GeneratedJob[];
  faqItems: FaqItem[];
  title: string;
  description: string;
  pageUrlHref: string;
  pageUrlPathname: string;
  siteUrl: URL | string | undefined;
  dateModifiedIso: string;
};

/**
 * Build the @graph array for a hub page.
 * Always returns exactly 4 nodes: CollectionPage, ItemList, FAQPage, BreadcrumbList.
 * ItemList.itemListElement contains up to the first 10 jobs.
 * When jobs = [] the itemListElement is an empty array (not absent).
 */
export function buildHubSchemaGraph(args: HubSchemaGraphArgs): unknown[] {
  const {
    cfg,
    jobs,
    faqItems,
    title,
    description,
    pageUrlHref,
    pageUrlPathname,
    siteUrl,
    dateModifiedIso,
  } = args;

  const slicedJobs = jobs.slice(0, 10);

  const itemListElement = slicedJobs.map((job, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: job.title,
    url: new URL(`/v/${job.slug}/`, siteUrl).toString(),
  }));

  const itemList = {
    '@type': 'ItemList',
    numberOfItems: jobs.length,
    itemListElement,
  };

  const collectionPage = {
    '@type': 'CollectionPage',
    name: title,
    description,
    url: pageUrlHref,
    dateModified: dateModifiedIso,
    mainEntity: itemList,
  };

  const faqPage = {
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  const breadcrumb = buildBreadcrumbSchema(
    [
      { name: 'Главная', url: '/' },
      { name: 'Форматы работы', url: '/cities/' },
      { name: cfg.h1, url: pageUrlPathname },
    ],
    siteUrl,
  );

  return [collectionPage, itemList, faqPage, breadcrumb];
}

// ---------------------------------------------------------------------------
// Hub empty guard
// ---------------------------------------------------------------------------

/**
 * Returns true when the hub has no matching jobs — meaning the page
 * should be noindexed and the sitemap should exclude it.
 *
 * Shared source of truth used by:
 *   - hub page files (robots meta)
 *   - [slug].astro canonical guard (Decision A)
 *   - listingSlugs.ts empty-path emitter
 *
 * Pure function — delegates to filterJobsByCriteria, never re-implements
 * the filtering logic.
 */
export function isHubEmpty(
  jobsData: readonly GeneratedJob[],
  cfg: HubConfig,
): boolean {
  return filterJobsByCriteria(jobsData, cfg.filter).length === 0;
}

// ---------------------------------------------------------------------------
// Hub city filter (bead B15 / Decision H)
// ---------------------------------------------------------------------------

/** A city option for the hub city `<select>`. */
export type HubCity = {
  /** Display name, e.g. "Москва". */
  name: string;
  /** URL-hash-safe latin slug, e.g. "moskva". */
  slug: string;
  /** Number of the hub's jobs in this city. */
  count: number;
};

/** Location tokens that are not real cities and must not become options. */
const NON_CITY_LOCATIONS = new Set(['вся россия', 'крупные города рф']);

/**
 * Unique cities across a hub's already-filtered jobs, for the city
 * `<select>` (bead B15 / Decision H). Splits comma-joined `location`,
 * drops the nationwide markers, sorts by job count desc then name.
 * Pure total function — empty input returns [].
 */
export function extractHubCities(jobs: readonly GeneratedJob[]): HubCity[] {
  const counts = new Map<string, number>();

  for (const job of jobs) {
    for (const part of job.location.split(',')) {
      const name = part.trim();
      if (!name || NON_CITY_LOCATIONS.has(name.toLowerCase())) continue;
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }

  const cities: HubCity[] = [];
  for (const [name, count] of counts) {
    const slug = cyrillicToLatin(name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    // Skip a city whose name yields no usable slug (cannot round-trip a hash).
    if (slug) cities.push({ name, slug, count });
  }

  cities.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ru'));
  return cities;
}

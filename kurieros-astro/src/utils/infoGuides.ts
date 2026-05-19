/**
 * Pure helper for info-guide pages:
 *   /skolko-zarabatyvaet-kurer/
 *   /kak-stat-kurerom/
 *   /usloviya-raboty-kurerom/
 *
 * No Astro globals, no module-scope `new Date()`. Immutable patterns.
 * Guide dates come from config fields — NOT from knowledge-base.json's
 * `generated` date (do not couple freshness signals to KB regen cadence).
 */

import type { FaqItem } from './cityListingPage';
import { buildBreadcrumbSchema } from './schema';

// ---------------------------------------------------------------------------
// Public type exports
// ---------------------------------------------------------------------------

export type InfoGuideKey = 'income' | 'how-to-become' | 'work-conditions';

export type GuideSection = {
  heading: string;
  body: string;
};

export type HowToStep = {
  name: string;
  text: string;
};

export type HowToConfig = {
  name: string;
  steps: HowToStep[];
};

export type InfoGuideConfig = {
  key: InfoGuideKey;
  slug: string;
  h1: string;
  kicker: string;
  lead: string;
  seoTitle: string;
  metaDescription: string;
  sections: GuideSection[];
  faqItems: FaqItem[];
  howTo?: HowToConfig;
  relatedGuideSlugs: string[];
  ctaHubSlug: string;
  showCalculator?: boolean;
  kbTopics: string[];
  publishedDate: string;
  modifiedDate: string;
};

// Re-export so consumers can import from one place if desired.
export type { FaqItem };

// ---------------------------------------------------------------------------
// Known slugs for relatedGuideSlugs validation
// ---------------------------------------------------------------------------

const GUIDE_SLUGS: ReadonlySet<string> = new Set([
  'skolko-zarabatyvaet-kurer',
  'kak-stat-kurerom',
  'usloviya-raboty-kurerom',
]);

const HUB_SLUGS: ReadonlySet<string> = new Set([
  'rabota-peshim-kurerom',
  'rabota-avtokurerom',
  'rabota-velokurerom',
  'podrabotka-kurerom',
]);

/** All slugs that `relatedGuideSlugs` entries may reference. */
export const KNOWN_LINK_SLUGS: ReadonlySet<string> = new Set([
  ...GUIDE_SLUGS,
  ...HUB_SLUGS,
]);

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const INFO_GUIDES: Readonly<Record<InfoGuideKey, InfoGuideConfig>> = {
  income: {
    key: 'income',
    slug: 'skolko-zarabatyvaet-kurer',
    h1: 'Сколько зарабатывает курьер',
    kicker: 'Доходы курьеров',
    lead: 'TODO(OQ2): Реальные цифры заработка курьеров в России в 2026 году: таблицы ставок, формула расчёта дохода и калькулятор.',
    seoTitle: 'Сколько зарабатывает курьер в 2026 — ставки и доход',
    metaDescription:
      'TODO(OQ2): Сколько зарабатывают курьеры пешие, авто и вело. Ставки по часам и заказам, таблица доходов по городам, калькулятор расчёта.',
    sections: [
      {
        heading: 'TODO(OQ2): Раздел 1',
        body: 'TODO(OQ2): Тело раздела 1 — ожидает авторского контента.',
      },
      {
        heading: 'TODO(OQ2): Раздел 2',
        body: 'TODO(OQ2): Тело раздела 2 — ожидает авторского контента.',
      },
    ],
    faqItems: [
      {
        question: 'TODO(OQ2): Вопрос 1',
        answer: 'TODO(OQ2): Ответ на вопрос 1.',
      },
    ],
    howTo: undefined,
    relatedGuideSlugs: ['kak-stat-kurerom', 'usloviya-raboty-kurerom'],
    ctaHubSlug: 'rabota-peshim-kurerom',
    showCalculator: true,
    kbTopics: ['доход', 'выплаты'],
    publishedDate: '2026-05-19',
    modifiedDate: '2026-05-19',
  },

  'how-to-become': {
    key: 'how-to-become',
    slug: 'kak-stat-kurerom',
    h1: 'Как стать курьером',
    kicker: 'Инструкция для новичка',
    lead: 'TODO(OQ2): Пошаговое руководство: документы, оформление, первый рабочий день.',
    seoTitle: 'Как стать курьером в 2026 — пошаговая инструкция',
    metaDescription:
      'TODO(OQ2): Как устроиться курьером: документы, возраст, оформление самозанятости, первые шаги. Пошаговое руководство.',
    sections: [
      {
        heading: 'TODO(OQ2): Раздел 1',
        body: 'TODO(OQ2): Тело раздела 1 — ожидает авторского контента.',
      },
      {
        heading: 'TODO(OQ2): Раздел 2',
        body: 'TODO(OQ2): Тело раздела 2 — ожидает авторского контента.',
      },
    ],
    faqItems: [
      {
        question: 'TODO(OQ2): Вопрос 1',
        answer: 'TODO(OQ2): Ответ на вопрос 1.',
      },
    ],
    howTo: {
      name: 'Как стать курьером: пошаговая инструкция',
      steps: [
        {
          name: 'TODO(OQ2): Шаг 1',
          text: 'TODO(OQ2): Описание шага 1.',
        },
        {
          name: 'TODO(OQ2): Шаг 2',
          text: 'TODO(OQ2): Описание шага 2.',
        },
      ],
    },
    relatedGuideSlugs: ['skolko-zarabatyvaet-kurer', 'usloviya-raboty-kurerom'],
    ctaHubSlug: 'rabota-peshim-kurerom',
    showCalculator: false,
    kbTopics: ['оформление', 'документы', 'возраст'],
    publishedDate: '2026-05-19',
    modifiedDate: '2026-05-19',
  },

  'work-conditions': {
    key: 'work-conditions',
    slug: 'usloviya-raboty-kurerom',
    h1: 'Условия и график работы курьером',
    kicker: 'Работа курьером',
    lead: 'TODO(OQ2): Условия работы, требования и график курьера в 2026 году.',
    seoTitle: 'Условия работы курьером в 2026 — график и требования',
    metaDescription:
      'TODO(OQ2): Условия и график работы курьером: требования к кандидатам, транспорт, рабочие смены и оформление.',
    sections: [
      {
        heading: 'TODO(OQ2): Раздел 1',
        body: 'TODO(OQ2): Тело раздела 1 — ожидает авторского контента.',
      },
      {
        heading: 'TODO(OQ2): Раздел 2',
        body: 'TODO(OQ2): Тело раздела 2 — ожидает авторского контента.',
      },
    ],
    faqItems: [
      {
        question: 'TODO(OQ2): Вопрос 1',
        answer: 'TODO(OQ2): Ответ на вопрос 1.',
      },
    ],
    howTo: undefined,
    relatedGuideSlugs: ['skolko-zarabatyvaet-kurer', 'kak-stat-kurerom'],
    ctaHubSlug: 'rabota-peshim-kurerom',
    showCalculator: false,
    kbTopics: ['график', 'требования', 'транспорт'],
    publishedDate: '2026-05-19',
    modifiedDate: '2026-05-19',
  },
} as const;

// ---------------------------------------------------------------------------
// Schema builder
// ---------------------------------------------------------------------------

const KUREROK_ORG = {
  '@type': 'Organization',
  name: 'КурьерОк',
  url: 'https://kurerok.ru/',
} as const;

/**
 * Build the JSON-LD `@graph` for an info-guide page.
 *
 * Nodes: Article, [HowTo when config.howTo defined], FAQPage, BreadcrumbList.
 *
 * `Article.headline` is capped at 110 chars (Google's documented limit).
 * If `config.h1` exceeds 110 chars it is truncated to 107 chars + "…".
 *
 * Dates come from `config.publishedDate` / `config.modifiedDate`, NOT
 * from knowledge-base.json's `generated` field.
 */
export function buildGuideSchemaGraph(
  config: InfoGuideConfig,
  pageUrl: string,
  siteUrl: string,
): { '@graph': Record<string, unknown>[] } {
  const HEADLINE_MAX = 110;
  const headline =
    config.h1.length <= HEADLINE_MAX
      ? config.h1
      : `${config.h1.slice(0, 107)}…`;

  const articleNode: Record<string, unknown> = {
    '@type': 'Article',
    headline,
    description: config.metaDescription,
    url: pageUrl,
    image: new URL('/og-default.png', siteUrl).toString(),
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': pageUrl,
    },
    inLanguage: 'ru-RU',
    datePublished: config.publishedDate,
    dateModified: config.modifiedDate,
    author: KUREROK_ORG,
    publisher: KUREROK_ORG,
  };

  const faqNode: Record<string, unknown> = {
    '@type': 'FAQPage',
    mainEntity: config.faqItems.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  const breadcrumbNode = buildBreadcrumbSchema(
    [
      { name: 'Главная', url: '/' },
      { name: 'Статьи', url: '/guide/' },
      { name: config.h1, url: `/${config.slug}/` },
    ],
    siteUrl,
  );

  const graph: Record<string, unknown>[] = [articleNode];

  // Emit HowTo node only when config.howTo is defined — never an empty HowTo.
  if (config.howTo !== undefined) {
    const howToNode: Record<string, unknown> = {
      '@type': 'HowTo',
      name: config.howTo.name,
      step: config.howTo.steps.map((step, index) => ({
        '@type': 'HowToStep',
        position: index + 1,
        name: step.name,
        text: step.text,
      })),
    };
    graph.push(howToNode);
  }

  graph.push(faqNode, breadcrumbNode);

  return { '@graph': graph };
}

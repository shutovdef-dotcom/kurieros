import type { KnowledgeItem } from './knowledge';
import type { VacancyHowToStep } from './vacancyHowTo';

type VacancyFaqItem = Pick<KnowledgeItem, 'question' | 'answer_short' | 'answer_long'>;

export const buildVacancyFaqSchema = (items: VacancyFaqItem[]) => ({
  '@type': 'FAQPage' as const,
  mainEntity: items.map((item) => ({
    '@type': 'Question' as const,
    name: item.question,
    acceptedAnswer: {
      '@type': 'Answer' as const,
      text: item.answer_short,
    },
  })),
});

type BuildVacancyHowToSchemaInput = {
  title: string;
  description: string;
  steps: VacancyHowToStep[];
};

export const buildVacancyHowToSchema = ({
  title,
  description,
  steps,
}: BuildVacancyHowToSchemaInput) => ({
  '@type': 'HowTo' as const,
  name: title,
  description,
  totalTime: 'P1D',
  step: steps.map((step, index) => ({
    '@type': 'HowToStep' as const,
    position: index + 1,
    name: step.name,
    text: step.text,
  })),
});

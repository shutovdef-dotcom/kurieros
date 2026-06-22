import { describe, expect, it } from 'vitest';
import {
  buildVacancyFaqSchema,
  buildVacancyHowToSchema,
} from '../src/utils/vacancyStructuredData';

describe('vacancy structured data helpers', () => {
  it('uses visible short FAQ answers in FAQPage schema', () => {
    const schema = buildVacancyFaqSchema([
      {
        question: 'Как часто выплаты?',
        answer_short: 'Еженедельно.',
        answer_long: 'Длинный ответ для страницы гида, который не должен дублироваться в вакансии.',
      },
    ]);

    const entity = schema.mainEntity[0];
    expect(entity.acceptedAnswer.text).toBe('Еженедельно.');
    expect(JSON.stringify(schema)).not.toContain('Длинный ответ');
  });

  it('builds HowTo schema from the same ordered steps shown on the page', () => {
    const schema = buildVacancyHowToSchema({
      title: 'Старт за 3 шага',
      description: 'Пошаговый план выхода на смену.',
      steps: [
        { name: 'Анкета', text: 'Заполните анкету.' },
        { name: 'Обучение', text: 'Пройдите обучение.' },
      ],
    });

    expect(schema).toMatchObject({
      '@type': 'HowTo',
      name: 'Старт за 3 шага',
      description: 'Пошаговый план выхода на смену.',
      totalTime: 'P1D',
    });
    expect(schema.step).toEqual([
      {
        '@type': 'HowToStep',
        position: 1,
        name: 'Анкета',
        text: 'Заполните анкету.',
      },
      {
        '@type': 'HowToStep',
        position: 2,
        name: 'Обучение',
        text: 'Пройдите обучение.',
      },
    ]);
  });
});

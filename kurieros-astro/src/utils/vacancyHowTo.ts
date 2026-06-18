import type {
  GeneratedJob,
  TransportMode,
  VacancyHowToTemplate,
} from '../data/vacancyTypes';

export type VacancyHowToStep = {
  name: string;
  text: string;
};

type VacancyHowToJob = Pick<GeneratedJob, 'company' | 'salary' | 'transport'> & {
  details: Pick<GeneratedJob['details'], 'employment_type' | 'payment_freq'>;
};

type ResolveVacancyHowToTemplateInput = {
  configuredTemplate?: VacancyHowToTemplate;
  sourceSlug?: string;
  transport: TransportMode;
};

type BuildVacancyHowToStepsInput = {
  job: VacancyHowToJob;
  jobCities: string[];
  template: VacancyHowToTemplate;
  employmentTypeText?: string;
};

export const resolveVacancyHowToTemplate = ({
  configuredTemplate,
  sourceSlug,
  transport,
}: ResolveVacancyHowToTemplateInput): VacancyHowToTemplate => {
  if (configuredTemplate) return configuredTemplate;

  if (sourceSlug?.startsWith('alfa-bank') || sourceSlug?.startsWith('efin')) {
    return 'bank_representative';
  }

  if (transport === 'remote') return 'remote_operator';
  if (transport === 'office') return 'office_employee';
  if (transport === 'service') return 'service_worker';

  return 'courier';
};

export const buildVacancyHowToSteps = ({
  job,
  jobCities,
  template,
  employmentTypeText = job.details.employment_type ?? '',
}: BuildVacancyHowToStepsInput): VacancyHowToStep[] => {
  const steps: VacancyHowToStep[] = [
    {
      name: `Заполните анкету на сайте ${job.company}`,
      text: `Перейдите по кнопке отклика в карточке. Укажите контакты, город${jobCities[0] ? ` (${jobCities[0]})` : ''}, удобный формат смен и подтвердите согласие на обработку данных.`,
    },
  ];

  if (template === 'bank_representative') {
    steps.push(
      {
        name: 'Пройдите телефонное собеседование',
        text: `Сотрудник ${job.company} перезвонит в течение 1–2 рабочих дней, обсудит график, район работы и проверит документы.`,
      },
      {
        name: 'Получите оборудование и обучение',
        text: 'В офисе банка выдадут планшет и форму. Обучение оплачиваемое, длится 3–7 дней — изучаются продукты, скрипты и правила безопасности.',
      },
      {
        name: 'Выходите на встречи с клиентами',
        text: `Маршруты приходят в приложение представителя. Выплаты — ${job.details.payment_freq.toLowerCase()}, формат оформления — ${employmentTypeText.toLowerCase()}.`,
      },
    );
  } else if (template === 'call_center') {
    steps.push(
      {
        name: 'Пройдите собеседование и обучение',
        text: `Сотрудник ${job.company} уточнит график, офис, документы и проект голосовой поддержки. Если по вакансии предусмотрено обучение, вам расскажут сроки и порядок выхода на смену.`,
      },
      {
        name: 'Выходите на смену в контакт-центре',
        text: `Приходите в офис контакт-центра в согласованный график и работайте с обращениями клиентов. Выплаты — ${job.details.payment_freq.toLowerCase()}, доход по вакансии — ${job.salary.toLowerCase()}.`,
      },
    );
  } else if (template === 'remote_operator') {
    steps.push(
      {
        name: 'Пройдите собеседование и обучение',
        text: `Сотрудник ${job.company} уточнит график, формат удалённой работы и документы. Если по вакансии предусмотрено обучение, вам расскажут сроки и порядок подключения.`,
      },
      {
        name: 'Подготовьте рабочее место',
        text: `Подготовьте компьютер, гарнитуру и стабильный интернет, затем подключайтесь к рабочей смене. Выплаты — ${job.details.payment_freq.toLowerCase()}, доход по вакансии — ${job.salary.toLowerCase()}.`,
      },
    );
  } else if (template === 'office_employee') {
    steps.push(
      {
        name: 'Пройдите собеседование и обучение',
        text: `Сотрудник ${job.company} уточнит график, формат работы и документы. Если по вакансии предусмотрено обучение, вам расскажут сроки и порядок выхода на смену.`,
      },
      {
        name: 'Выходите на смену в офисе',
        text: `Приходите в офис в согласованный график и работайте по задачам проекта. Выплаты — ${job.details.payment_freq.toLowerCase()}, доход по вакансии — ${job.salary.toLowerCase()}.`,
      },
    );
  } else if (template === 'service_worker') {
    steps.push(
      {
        name: 'Пройдите проверку и инструктаж',
        text: `Сотрудник ${job.company} уточнит город, удобное расписание, опыт и расскажет стандарты выполнения заказов. Если предусмотрено обучение, вам объяснят порядок выхода на первые задания.`,
      },
      {
        name: 'Подготовьте документы и формат сотрудничества',
        text: `Подготовьте документы для оформления и выплат. Формат сотрудничества — ${employmentTypeText.toLowerCase() || 'по условиям вакансии'}, выплаты — ${job.details.payment_freq.toLowerCase()}.`,
      },
      {
        name: 'Берите первые заказы',
        text: `Выбирайте удобные задания и выполняйте их по стандартам сервиса. Доход по этой вакансии — ${job.salary.toLowerCase()}.`,
      },
    );
  } else {
    const requiresSelfEmployedRegistration = /Самозанят/i.test(employmentTypeText);
    const requiresMedicalBookFormat = job.transport === 'foot' || job.transport === 'bicycle';

    if (requiresSelfEmployedRegistration) {
      steps.push({
        name: 'Оформите самозанятость в «Мой налог»',
        text: 'Регистрация бесплатная, занимает 5 минут — нужны паспорт и ИНН. Налог: 4% с дохода от физлиц, 6% с юрлиц. Без отчётности и страховых взносов.',
      });
    }

    if (requiresMedicalBookFormat) {
      steps.push({
        name: 'Оформите медицинскую книжку',
        text: `Обязательна для ${job.transport === 'foot' ? 'пешей' : 'велосипедной'} доставки еды. Стоит 2500–4000 ₽, оформляется за 1 рабочий день в платных клиниках с лицензией Роспотребнадзора.`,
      });
    }

    steps.push(
      {
        name: 'Скачайте приложение и пройдите вводное обучение',
        text: `Получите доступ к приложению курьера ${job.company}. Внутри: 15-минутный инструктаж, тарифы, правила работы со штрафами и поддержкой.`,
      },
      {
        name: 'Выходите на первую смену',
        text: `Открывайте слоты в приложении и принимайте заказы. Выплаты — ${job.details.payment_freq.toLowerCase()}, ставка по этой вакансии — ${job.salary.toLowerCase()}.`,
      },
    );
  }

  return steps.slice(0, 5);
};

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import jobsData from '../src/data/jobs';

type ReviewRecord = {
  id: number;
  jobId: number;
  company: string;
  jobTitle: string;
  name: string;
  city: string;
  pros: string;
  cons: string;
  comment: string;
  rating: number;
  date: string;
};

const REVIEWS_PER_JOB = 4;

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const reviewsFile = resolve(rootDir, 'src/data/reviews.json');

const NAMES = [
  'Иван',
  'Алексей',
  'Максим',
  'Сергей',
  'Дмитрий',
  'Александр',
  'Михаил',
  'Евгений',
  'Николай',
  'Андрей',
  'Азамат',
  'Айбек',
  'Нурлан',
  'Дастан',
  'Руслан',
  'Улан',
  'Жандос',
  'Санжар',
  'Данияр',
  'Алихан',
  'Ерасыл',
  'Арман',
  'Тимур',
  'Бахтиёр',
  'Сардор',
  'Шерзод',
  'Достон',
  'Умид',
];

const DEFAULT_CITIES = [
  'Москва',
  'Санкт-Петербург',
  'Казань',
  'Екатеринбург',
  'Новосибирск',
  'Нижний Новгород',
  'Краснодар',
  'Ростов-на-Дону',
  'Уфа',
  'Самара',
];

const PROS_DB = [
  'Свободный график',
  'Выплаты без задержек',
  'Близко к дому',
  'Удобное приложение',
  'Быстро взяли на работу',
  'Форму выдали',
  'Хорошие чаевые',
  'Оплата всегда приходит вовремя, ни разу не задерживали.',
  'Свободное расписание позволяет совмещать с учебой.',
  'Поддержка отвечает быстро, если есть вопросы по заказу.',
  'Прозрачная система расчетов и понятные условия.',
  'Можно гибко выбирать смены и район доставки.',
];

const PROS_ERRORS_DB = [
  'Свабодный график',
  'Денги вовремя',
  'Зп харошая',
  'Плотят нармально, деньги приходят без задержек',
  'Формут дают бесплатно',
];

const CONS_DB = [
  'Тяжело на ногах',
  'Бывают штрафы',
  'В дождь работать непросто',
  'Мало чаевых в тихие дни',
  'Иногда нет заказов',
  'Бывают тяжелые заказы без лифта',
  'Поддержка иногда отвечает шаблонами',
  'К концу длинной смены чувствуется сильная усталость',
  'Зимой и в дождь нужна хорошая экипировка',
  'Иногда приложение ошибается с километражем',
];

const CONS_ERRORS_DB = [
  'Тежело ходить',
  'Штрафуют не за что',
  'В дожть работать не очень',
  'Сумка тежолая вобще',
  'Инагда мало заказов и просто ждешь',
];

const COMMENTS_DB = [
  'Для подработки пойдет.',
  'Работать можно, если понимать специфику.',
  'Нормальный вариант для гибкого графика.',
  'Если брать хорошие смены, доход устраивает.',
  'На лето или как временная занятость вполне ок.',
  'Главное сразу продумать обувь и пауэрбанк.',
  'Свобода по времени компенсирует сложные смены.',
  'Рекомендую тем, кто ищет подработку рядом с домом.',
];

const COMMENTS_ERRORS_DB = [
  'Вобщще советую.',
  'Работать можна.',
  'Для студентов самае то.',
  'Подработка супер, если не апаздывать.',
];

const RATINGS = [3.8, 4.0, 4.2, 4.5, 4.8, 5.0];
const DAY_MS = 24 * 60 * 60 * 1000;
const BASE_REVIEW_TIMESTAMP = Date.UTC(2025, 0, 1, 9, 0, 0);

const createRandom = (seedValue: number) => {
  let seed = seedValue >>> 0;

  return () => {
    seed += 0x6d2b79f5;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const pickIndex = (length: number, random: () => number) =>
  Math.floor(random() * length);

const shuffle = <T>(input: T[], random: () => number): T[] => {
  const result = [...input];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = pickIndex(index + 1, random);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
};

const getCityOptions = (location: string): string[] => {
  const normalized = location.trim().toLowerCase();
  if (!location || normalized === 'вся россия' || normalized === 'крупные города рф') {
    return DEFAULT_CITIES;
  }

  const cityOptions = location
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return cityOptions.length > 0 ? cityOptions : DEFAULT_CITIES;
};

const createReviewsForJob = (job: (typeof jobsData)[number]): ReviewRecord[] => {
  const random = createRandom(job.id);
  const names = shuffle(NAMES, random);
  const pros = shuffle(PROS_DB, random);
  const cons = shuffle(CONS_DB, random);
  const comments = shuffle(COMMENTS_DB, random);
  const typoPros = shuffle(PROS_ERRORS_DB, random);
  const typoCons = shuffle(CONS_ERRORS_DB, random);
  const typoComments = shuffle(COMMENTS_ERRORS_DB, random);
  const cities = getCityOptions(job.location);

  return Array.from({ length: REVIEWS_PER_JOB }, (_, reviewIndex) => {
    const noisyText = random() < 0.18;
    const rating =
      noisyText && random() < 0.5
        ? 3.5
        : RATINGS[pickIndex(RATINGS.length, random)];

    const dateOffsetDays =
      Math.floor(random() * 330) +
      (reviewIndex * 5) +
      (job.id % 31);

    return {
      id: (job.id * 10) + reviewIndex + 1,
      jobId: job.id,
      company: job.company,
      jobTitle: job.title,
      name: names[reviewIndex % names.length],
      city: cities[pickIndex(cities.length, random)],
      pros: noisyText
        ? typoPros[reviewIndex % typoPros.length]
        : pros[reviewIndex % pros.length],
      cons: noisyText
        ? typoCons[reviewIndex % typoCons.length]
        : cons[reviewIndex % cons.length],
      comment: noisyText
        ? typoComments[reviewIndex % typoComments.length]
        : comments[reviewIndex % comments.length],
      rating,
      date: new Date(BASE_REVIEW_TIMESTAMP + (dateOffsetDays * DAY_MS)).toISOString(),
    };
  });
};

const readIfExists = async (path: string): Promise<string | null> => {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
};

const jobs = [...jobsData].sort((a, b) => a.id - b.id);
const reviews = jobs.flatMap((job) => createReviewsForJob(job));
const nextContent = `${JSON.stringify(reviews, null, 2)}\n`;
const previousContent = await readIfExists(reviewsFile);

if (previousContent === nextContent) {
  console.log(`Reviews are up to date: ${reviews.length} reviews for ${jobs.length} vacancies.`);
} else {
  await writeFile(reviewsFile, nextContent, 'utf8');
  console.log(`Generated ${reviews.length} reviews for ${jobs.length} vacancies.`);
}

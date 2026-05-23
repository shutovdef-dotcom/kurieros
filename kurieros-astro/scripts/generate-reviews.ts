import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import jobsData from '../src/data/jobs';

/**
 * Synthetic review generator — PER BRAND (Flywheel plan §12.1, Decision F).
 *
 * Reviews belong to a brand, not a vacancy. Each brand present in `jobsData`
 * gets a random 10–20 reviews — an honest, early-stage volume — instead of
 * the old `4 × every vacancy` which ballooned to 19 144 rows and a uniform
 * ~4.3 average for every brand.
 *
 * Per-review `jobId`/`jobTitle`/`city` are provenance fields: each review is
 * attached to a randomly-picked vacancy of its brand so the review-card UI
 * keeps role/location context. The aggregate (`/otzyvy/`, `/companies/`,
 * vacancy pages) groups by `company`.
 *
 * Fully deterministic: every draw comes from a string-seeded PRNG and the
 * date window is fixed, so re-running produces a byte-identical file (the
 * `prebuild` hook regenerates it on every build — non-determinism would
 * cause endless churn).
 */

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

// Owner-confirmed 2026-05-20: 10–20 reviews per brand, uniform random.
const MIN_REVIEWS_PER_BRAND = 10;
/** Floor for per-brand average rating (post-clamp). */
const MIN_BRAND_AVG = 3.8;
const MAX_REVIEWS_PER_BRAND = 20;

// Bump this string to deliberately reshuffle the whole dataset.
const SEED = 'kurerok-otzyvy-2026-v2';

// Owner-confirmed 60/40 clean/typo split → 40 % of reviews use the typo pools.
const TYPO_SHARE = 0.4;

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const reviewsFile = resolve(rootDir, 'src/data/reviews.json');

// Reviewer names — Russian + Central-Asian + Caucasus + Belarus/Ukraine.
// ≥ 50 entries so a 20-review brand never repeats a name.
const NAMES = [
  // Russian
  'Иван', 'Алексей', 'Максим', 'Сергей', 'Дмитрий', 'Александр', 'Михаил',
  'Евгений', 'Николай', 'Андрей', 'Артём', 'Павел', 'Виктор', 'Олег', 'Денис',
  // Central Asian
  'Азамат', 'Айбек', 'Нурлан', 'Дастан', 'Руслан', 'Улан', 'Жандос', 'Санжар',
  'Данияр', 'Алихан', 'Ерасыл', 'Арман', 'Тимур', 'Бахтиёр', 'Сардор',
  'Шерзод', 'Достон', 'Умид', 'Жасур', 'Хусан',
  // Caucasus
  'Армен', 'Гайк', 'Давид', 'Тигран', 'Заур', 'Мурат', 'Аслан', 'Рустам',
  // Belarus / Ukraine
  'Тарас', 'Богдан', 'Олесь', 'Святослав', 'Игнат', 'Влад', 'Назар', 'Остап',
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
  'Стабильный поток заказов в будни.',
  'Адекватный менеджер на старте, всё спокойно объяснили.',
];

const PROS_ERRORS_DB = [
  'Свабодный график',
  'Денги вовремя',
  'Зп харошая',
  'Плотят нармально, деньги приходят без задержек',
  'Формут дают бесплатно',
  'Зарплату ни разу ни задерживали',
  'Граффик удобный, можно совмещять с учёбой',
  'Падержка отвечает быстро',
  'Можна работать рядом с домам',
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
  'В час пик заказов сразу слишком много.',
];

const CONS_ERRORS_DB = [
  'Тежело ходить',
  'Штрафуют не за что',
  'В дожть работать не очень',
  'Сумка тежолая вобще',
  'Инагда мало заказов и просто ждешь',
  'Зимой холадно очень',
  'Бывают тижелые заказы',
  'Клиенты инагда грубят',
  'Апять переработка по вечерам',
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
  'За пару недель втянулся, теперь всё привычно.',
  'Доход ровный, без сюрпризов — меня устраивает.',
];

const COMMENTS_ERRORS_DB = [
  'Вобщще советую.',
  'Работать можна.',
  'Для студентов самае то.',
  'Подработка супер, если не апаздывать.',
  'Нармальная подработка на лето.',
  'Если привыкнуть то всё ок.',
  'Думаю папробовать стоит.',
  'За месяц втянулся, тепер норм.',
];

// Integer 1–5 ratings, weighted so the mean ≈ 4.4. Per-brand averages drawn
// from ~10–20 picks cluster naturally in [4.0, 5.0]; an unlucky brand can dip
// below 3.8, so a post-generation floor clamp (MIN_BRAND_AVG, applied inside
// the brand loop) bumps the lowest rating by 1 until the average reaches 3.8.
// Net guarantee: per-brand spread fits in [3.8, 5.0]. 1★ and 2★ stay in the
// pool so distribution bars remain visually rich for the occasional brand.
// Integers (not floats) keep `ratingDistribution` in reviewsAggregate.ts correct.
const RATING_POOL = [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 4, 4, 4, 3, 2, 1];

const DAY_MS = 24 * 60 * 60 * 1000;
// Fixed window — reviews span the ~12 months before this date. Hard-coded so
// the output is deterministic (no `Date.now()`).
const REVIEW_WINDOW_END = Date.UTC(2026, 4, 15, 9, 0, 0);
const REVIEW_WINDOW_DAYS = 365;

/** mulberry32 — small deterministic PRNG. */
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

/** FNV-1a string hash → uint32 seed. */
const hashString = (value: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const pickIndex = (length: number, random: () => number) =>
  Math.floor(random() * length);

const pickFrom = <T>(items: readonly T[], random: () => number): T =>
  items[pickIndex(items.length, random)];

const shuffle = <T>(input: readonly T[], random: () => number): T[] => {
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

// Group every vacancy by its brand (company name).
const jobsByBrand = new Map<string, (typeof jobsData)[number][]>();
for (const job of jobsData) {
  const bucket = jobsByBrand.get(job.company);
  if (bucket) {
    bucket.push(job);
  } else {
    jobsByBrand.set(job.company, [job]);
  }
}

// Stable, deterministic brand order.
const brands = Array.from(jobsByBrand.keys()).sort((a, b) =>
  a.localeCompare(b, 'ru'),
);

const reviews: ReviewRecord[] = [];
let nextId = 1;

for (const brand of brands) {
  const brandJobs = jobsByBrand.get(brand);
  if (!brandJobs || brandJobs.length === 0) continue;

  const random = createRandom(hashString(`${SEED}::${brand}`));
  const span = MAX_REVIEWS_PER_BRAND - MIN_REVIEWS_PER_BRAND + 1;
  const count = MIN_REVIEWS_PER_BRAND + pickIndex(span, random);

  // Unique reviewer names within this brand.
  const brandNames = shuffle(NAMES, random).slice(0, count);

  const brandStartIdx = reviews.length;

  for (let index = 0; index < count; index += 1) {
    const job = brandJobs[pickIndex(brandJobs.length, random)];
    const isTypo = random() < TYPO_SHARE;
    const cityOptions = getCityOptions(job.location);
    const dateOffsetDays = pickIndex(REVIEW_WINDOW_DAYS, random);

    reviews.push({
      id: nextId,
      jobId: job.id,
      company: brand,
      jobTitle: job.title,
      name: brandNames[index],
      city: pickFrom(cityOptions, random),
      pros: isTypo ? pickFrom(PROS_ERRORS_DB, random) : pickFrom(PROS_DB, random),
      cons: isTypo ? pickFrom(CONS_ERRORS_DB, random) : pickFrom(CONS_DB, random),
      comment: isTypo
        ? pickFrom(COMMENTS_ERRORS_DB, random)
        : pickFrom(COMMENTS_DB, random),
      rating: pickFrom(RATING_POOL, random),
      date: new Date(REVIEW_WINDOW_END - dateOffsetDays * DAY_MS).toISOString(),
    });
    nextId += 1;
  }

  // Floor clamp: per-brand average must be >= MIN_BRAND_AVG. If unlucky
  // sampling produced too many low ratings, bump the lowest one by 1 until
  // the constraint holds. Deterministic — always picks the lowest-then-
  // earliest review, so the same SEED yields the same output.
  const brandSlice = reviews.slice(brandStartIdx);
  let brandSum = brandSlice.reduce((acc, r) => acc + r.rating, 0);
  while (brandSum / brandSlice.length < MIN_BRAND_AVG) {
    let minIdx = 0;
    for (let i = 1; i < brandSlice.length; i += 1) {
      if (brandSlice[i].rating < brandSlice[minIdx].rating) minIdx = i;
    }
    if (brandSlice[minIdx].rating >= 5) break;
    brandSlice[minIdx].rating += 1;
    brandSum += 1;
  }
}

const nextContent = `${JSON.stringify(reviews, null, 2)}\n`;
const previousContent = await readIfExists(reviewsFile);

if (previousContent === nextContent) {
  console.log(
    `Reviews are up to date: ${reviews.length} reviews across ${brands.length} brands.`,
  );
} else {
  await writeFile(reviewsFile, nextContent, 'utf8');
  console.log(
    `Generated ${reviews.length} reviews across ${brands.length} brands.`,
  );
}

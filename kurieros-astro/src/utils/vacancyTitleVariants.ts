import type { GeneratedJob } from '../data/vacancyTypes';
import { usesOwnerSuppliedOzonCourierIncome } from '../data/seoTitleIncome';

export const TITLE_ARMS = [
  'role', 'income', 'money_bag', 'banknotes', 'flying_money',
  'income_first', 'benefit', 'lightning',
] as const;
export type VacancyTitleArm = typeof TITLE_ARMS[number];

export const TITLE_ARM_LABELS: Record<VacancyTitleArm, string> = {
  role: 'Роль + бренд + город',
  income: 'Роль + доход',
  money_bag: '💰 Роль + доход при наличии',
  banknotes: '💵 Роль + доход при наличии',
  flying_money: '💸 Роль + доход при наличии',
  income_first: 'Доход в начале',
  benefit: 'Роль + условие работы',
  lightning: '⚡ Роль + доход при наличии',
};

const SHORT_ROLES: Record<string, string> = {
  'ozon-goods-handler': 'Обработчик товаров',
  'ozon-fresh-courier': 'Пеший курьер',
  'tbank-outbound-b2b-operator': 'Оператор B2B-продаж',
  'ruki-door-installer': 'Установщик дверей',
  'yandex-delivery-cargo-driver': 'Водитель грузовика',
};

const shortCompany = (company: string): string => company
  .replace(/\s*\(ex\..*\)$/u, '')
  .replace(/^Сервис «Руки»$/u, 'Руки')
  .trim();

export function getTitleIncome(job: GeneratedJob): string | undefined {
  // Do not upgrade an estimate to employer-confirmed pay. The daily
  // Ozon courier ceiling is an explicit, labelled owner assumption.
  if (job.salaryConfidence === 'estimated' && !usesOwnerSuppliedOzonCourierIncome(job.sourceSlug)) return;
  const salary = job.salary.replace(/\s+/gu, ' ').trim();
  if (!/\d/u.test(salary) || !/(?:₽|BYN|₸|сом|сум)\/(?:мес|день|час|смен)/u.test(salary)) return;
  return salary;
}

export function getTitleBenefit(job: GeneratedJob): string {
  if (job.labels.some((label) => /^без опыта$/iu.test(label.trim()))) return 'Без опыта';
  if (job.transport === 'remote') return 'Удалённо';
  if (/(?:свободн|гибк)/iu.test(job.details.schedule)) return 'Гибкий график';
  if (/еженедел|раз в неделю/iu.test(job.details.payment_freq)) return 'Выплаты еженедельно';
  if (/ежеднев|каждый день/iu.test(job.details.payment_freq)) return 'Выплаты ежедневно';
  return 'Условия и отклик';
}

/** Complete phrases only: never cut off a city, currency or pay period. */
export function buildVacancyTitleVariants(job: GeneratedJob): Partial<Record<VacancyTitleArm, string>> {
  const role = SHORT_ROLES[job.sourceSlug] ?? job.roleTitle;
  if (!role) throw new Error(`No accurate role title for ${job.slug}`);
  const base = `${role} ${shortCompany(job.company)} · ${job.location}`;
  const income = getTitleIncome(job);
  const withIncome = income ? `${base} — ${income}` : base;
  const variants: Partial<Record<VacancyTitleArm, string>> = {
    role: base,
    ...(income ? { income: withIncome, income_first: `${income} — ${base}` } : {}),
    money_bag: `💰 ${withIncome}`,
    banknotes: `💵 ${withIncome}`,
    flying_money: `💸 ${withIncome}`,
    benefit: `${base} — ${getTitleBenefit(job)}`,
    lightning: `⚡ ${withIncome}`,
  };
  // 90 is a text budget, not a guarantee about Google's pixel-based
  // truncation. Exclude a long variant instead of mangling its meaning.
  return Object.fromEntries(Object.entries(variants)
    .filter(([, title]) => [...title].length <= 90));
}

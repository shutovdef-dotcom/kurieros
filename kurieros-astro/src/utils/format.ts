export const parseSalary = (salary: string): number => Number(salary.replace(/[^\d]/g, '')) || 0;

export const formatMoney = (value: number): string => new Intl.NumberFormat('ru-RU').format(value);

export const humanJoin = (items: string[]): string => {
	if (items.length === 0) return '';
	// The `.length` guards make these index accesses safe; the non-null
	// assertions keep the explicit `: string` return type honest even
	// under a future `noUncheckedIndexedAccess` tightening.
	if (items.length === 1) return items[0]!;
	if (items.length === 2) return `${items[0]} и ${items[1]}`;
	return `${items.slice(0, -1).join(', ')} и ${items.at(-1)}`;
};

/**
 * Russian noun pluralization helper.
 *
 * Russian has three plural forms gated by the last 1–2 digits of the
 * count:
 *   one  — 1, 21, 31, … but not 11           («1 вакансия»)
 *   few  — 2-4, 22-24, … but not 12-14       («2 вакансии»)
 *   many — 0, 5-20, 25-30, …                  («5 вакансий»)
 *
 * Pass three forms in [one, few, many] order:
 *   formatRussianPlural(1,   ['вакансия', 'вакансии', 'вакансий']) → 'вакансия'
 *   formatRussianPlural(2,   ['вакансия', 'вакансии', 'вакансий']) → 'вакансии'
 *   formatRussianPlural(11,  ['вакансия', 'вакансии', 'вакансий']) → 'вакансий'
 */
export const formatRussianPlural = (
	count: number,
	forms: readonly [string, string, string],
): string => {
	const abs = Math.abs(count);
	const mod10 = abs % 10;
	const mod100 = abs % 100;
	if (mod10 === 1 && mod100 !== 11) return forms[0];
	if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
	return forms[2];
};

// Back-compat — existing callers keep working. Implemented in terms of
// the generic helper so vacancy plurals stay in sync with the rest.
export const getVacancyPluralText = (count: number): string =>
	formatRussianPlural(count, ['вакансия', 'вакансии', 'вакансий']);

export const parseSalary = (salary: string) => Number(salary.replace(/[^\d]/g, '')) || 0;

export const formatMoney = (value: number) => new Intl.NumberFormat('ru-RU').format(value);

export const humanJoin = (items: string[]) => {
	if (items.length === 0) return '';
	if (items.length === 1) return items[0];
	if (items.length === 2) return `${items[0]} и ${items[1]}`;
	return `${items.slice(0, -1).join(', ')} и ${items.at(-1)}`;
};

export const getVacancyPluralText = (count: number) => {
	const mod10 = count % 10;
	const mod100 = count % 100;
	if (mod10 === 1 && mod100 !== 11) return 'вакансия';
	if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'вакансии';
	return 'вакансий';
};

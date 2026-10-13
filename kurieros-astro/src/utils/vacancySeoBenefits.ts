import type { MedicalBookRequirement } from '../data/vacancyTypes';

export function buildVacancySeoBenefitHooks({
	labels,
	medicalBook,
}: {
	labels: readonly string[];
	medicalBook?: MedicalBookRequirement;
}): string[] {
	const normalizedLabels = labels.map((label) => label.toLowerCase());
	const hooks: string[] = [];
	const noExperience = normalizedLabels.some((label) => label.includes('без опыта'));
	const acceptsAge16 = normalizedLabels.some((label) => label.includes('16'));
	const acceptsAge18 = !acceptsAge16 && normalizedLabels.some((label) => label.includes('18'));
	const isSelfEmployed = normalizedLabels.some((label) => label.includes('самозан'));

	if (noExperience) hooks.push('без опыта');
	if (medicalBook === 'not_required') hooks.push('без медкнижки');
	if (acceptsAge16) hooks.push('от 16 лет');
	else if (acceptsAge18) hooks.push('от 18 лет');
	if (isSelfEmployed && hooks.length < 2) hooks.push('самозанятость');
	return hooks.slice(0, 2);
}

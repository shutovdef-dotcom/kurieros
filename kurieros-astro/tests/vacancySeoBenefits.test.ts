import { describe, expect, it } from 'vitest';
import { buildVacancySeoBenefitHooks } from '../src/utils/vacancySeoBenefits';

describe('buildVacancySeoBenefitHooks', () => {
	it.each([
		['unknown', 'unknown'],
		['undefined', undefined],
		['required', 'required'],
		['compensated', 'compensated'],
	] as const)('does not promise no medical book when requirement is %s', (_name, medicalBook) => {
		expect(buildVacancySeoBenefitHooks({ labels: [], medicalBook })).not.toContain('без медкнижки');
	});

	it('adds the hook only when no medical book is explicitly required', () => {
		expect(
			buildVacancySeoBenefitHooks({ labels: [], medicalBook: 'not_required' }),
		).toEqual(['без медкнижки']);
	});

	it('keeps no-experience first and limits the hooks to two', () => {
		expect(
			buildVacancySeoBenefitHooks({
				labels: ['Без опыта', 'от 16 лет', 'самозанятость'],
				medicalBook: 'not_required',
			}),
		).toEqual(['без опыта', 'без медкнижки']);
	});
});

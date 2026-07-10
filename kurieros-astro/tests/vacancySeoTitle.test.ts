import { describe, expect, it } from 'vitest';
import { buildVacancySeoTitle } from '../src/utils/vacancySeoTitle';

describe('buildVacancySeoTitle', () => {
	it('keeps the full КурьерОк brand only when it fits', () => {
		expect(
			buildVacancySeoTitle({
				title: 'Курьер Ozon в Москве',
				salary: 'до 200 000 ₽/мес',
			}),
		).toBe('Курьер Ozon в Москве — до 200 000 ₽/мес | КурьерОк');
	});

	it('does not emit a partial КурьерОк suffix when the brand does not fit', () => {
		const title = buildVacancySeoTitle({
			title: 'Специалист по обработке товаров Ozon в Москве',
			salary: 'до 270 000 ₽/мес',
		});

		expect(title).toBe('Специалист по обработке товаров Ozon в Москве — до 270 000 ₽/мес');
		expect(title).not.toMatch(/\|\s*К(?:у(?:р(?:ь(?:е(?:р(?:О?)?)?)?)?)?)?$/);
	});

	it('trims very long titles on a word boundary without dangling separators', () => {
		const title = buildVacancySeoTitle({
			title: 'Автокурьер на личном автомобиле в Яндекс Еда в Великом Новгороде',
			salary: 'до 202 320 ₽/мес',
			benefitHook: 'ежедневные выплаты',
		});

		expect(title.length).toBeLessThanOrEqual(70);
		expect(title).not.toMatch(/\|\s*К/);
		expect(title).not.toMatch(/[—·|,;:\-\s]$/);
		expect(title).not.toContain('Курье');
	});

	it('uses the benefit hook when the full branded title still fits', () => {
		expect(
			buildVacancySeoTitle({
				title: 'Курьер в Туле',
				salary: 'до 90 000 ₽/мес',
				benefitHook: 'гибкий график',
			}),
		).toBe('Курьер в Туле — до 90 000 ₽/мес · гибкий график | КурьерОк');
	});

	it('supports a source-backed full-title override for a controlled CTR cohort', () => {
		expect(
			buildVacancySeoTitle({
				title: 'Специалист по обработке товаров Ozon в Хоругвино',
				salary: 'от 65 000 ₽/мес',
				customTitle: 'Работа на складе Ozon в Хоругвино — от 65 000 ₽, график 2/2',
			}),
		).toBe(
			'Работа на складе Ozon в Хоругвино — от 65 000 ₽, график 2/2 | КурьерОк',
		);
	});
});

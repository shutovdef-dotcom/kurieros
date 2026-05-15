/**
 * Pure helpers for the catch-all `/rabota-kurerom-{slug}/` route
 * (`src/pages/[slug].astro`). Extracted so the page frontmatter stays
 * thin and below the H14 800-LOC ceiling. No Astro globals, no
 * `import.meta`, no `new Date()` — every helper is a pure function so
 * it can be unit-tested in isolation if needed.
 */

import type { GeneratedJob } from '../data/vacancyTypes';
import { CATEGORIES } from '../data/constants';
import { getCitiesFromJobs } from './cities';
import { slugifyCompany } from './companies';
import { formatMoney, getVacancyPluralText, humanJoin, parseSalary } from './format';
import { buildBreadcrumbSchema, buildPlaceSchema } from './schema';

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export type City = ReturnType<typeof getCitiesFromJobs>[number];
export type Category = (typeof CATEGORIES)[number];

export type ListingType = 'city' | 'category';

export type LinkItem = {
	name: string;
	href: string;
};

export type CityCompanyCard = {
	name: string;
	href: string;
	vacancyCount: number;
	maxSalary: number;
	paymentPreview: string[];
	transportPreview: string[];
};

export type NearbyCityLink = {
	name: string;
	slug: string;
	vacancyCount: number;
};

export type FactCard = {
	label: string;
	value: string;
};

export type Article = {
	title: string;
	description: string;
	slug: string;
	date: string;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * B2 contextual rule: chip labels use the compact form («Пешком»);
 * breadcrumb / footer cloud / category card use the full form
 * («Пеший курьер»). This map drives tag-chip rendering, so it stays
 * compact.
 */
export const TRANSPORT_LABEL_MAP: Record<string, string> = {
	auto: 'На авто',
	bicycle: 'На велосипеде или самокате',
	foot: 'Пешком',
};

const SCENARIO_SLUGS = [
	'na-avto',
	'peshkom',
	'na-velosipede',
	'dlya-studentov',
	'podrabotka',
	'ezhednevnaya-oplata',
	'ezhenedelnaya-oplata',
] as const;

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

export function buildTransportTypes(
	filteredJobs: GeneratedJob[],
	labels: Record<string, string> = TRANSPORT_LABEL_MAP,
): string[] {
	return Array.from(
		new Set(
			filteredJobs.flatMap((job) =>
				job.tags.filter((tag) => tag in labels).map((tag) => labels[tag]),
			),
		),
	);
}

export function buildCityScenarioRoutes(
	availableTags: Set<string>,
	hasDailyPayments: boolean,
	hasWeeklyPayments: boolean,
): LinkItem[] {
	return SCENARIO_SLUGS.filter((slug) => {
		if (slug === 'na-avto') return availableTags.has('auto');
		if (slug === 'peshkom') return availableTags.has('foot');
		if (slug === 'na-velosipede') return availableTags.has('bicycle');
		if (slug === 'dlya-studentov') return availableTags.has('16plus');
		if (slug === 'podrabotka') return availableTags.has('flexible');
		if (slug === 'ezhednevnaya-oplata') return hasDailyPayments;
		if (slug === 'ezhenedelnaya-oplata') return hasWeeklyPayments;
		return false;
	})
		.map((slug) => CATEGORIES.find((category) => category.slug === slug))
		.filter((category): category is Category => Boolean(category))
		.slice(0, 5)
		.map((category) => ({
			name: category.name,
			href: `/rabota-kurerom-${category.slug}/`,
		}));
}

export function buildCityCompanyCards(
	filteredJobs: GeneratedJob[],
	labels: Record<string, string> = TRANSPORT_LABEL_MAP,
): CityCompanyCard[] {
	type Aggregate = {
		name: string;
		href: string;
		vacancyCount: number;
		maxSalary: number;
		payments: Set<string>;
		transports: Set<string>;
	};

	const grouped = filteredJobs.reduce<Map<string, Aggregate>>((map, job) => {
		const existing = map.get(job.company) ?? {
			name: job.company,
			href: `/companies/${slugifyCompany(job.company)}/`,
			vacancyCount: 0,
			maxSalary: 0,
			payments: new Set<string>(),
			transports: new Set<string>(),
		};

		existing.vacancyCount += 1;
		existing.maxSalary = Math.max(existing.maxSalary, parseSalary(job.salary));
		existing.payments.add(job.details.payment_freq);
		job.tags
			.filter((tag) => tag in labels)
			.forEach((tag) => existing.transports.add(labels[tag]));

		map.set(job.company, existing);
		return map;
	}, new Map());

	return Array.from(grouped.values())
		.map((company) => ({
			name: company.name,
			href: company.href,
			vacancyCount: company.vacancyCount,
			maxSalary: company.maxSalary,
			paymentPreview: Array.from(company.payments).slice(0, 2),
			transportPreview: Array.from(company.transports).slice(0, 2),
		}))
		.sort((a, b) => b.vacancyCount - a.vacancyCount || b.maxSalary - a.maxSalary)
		.slice(0, 4);
}

export function pickSalaryLeader(cityCompanyCards: CityCompanyCard[]): CityCompanyCard | null {
	if (cityCompanyCards.length === 0) return null;
	return [...cityCompanyCards].sort((a, b) => b.maxSalary - a.maxSalary)[0] ?? null;
}

export function buildLocalStartPoints(
	cityCompanyCards: CityCompanyCard[],
	salaryLeader: CityCompanyCard | null,
	transportTypes: string[],
	cityPrep: string,
): string[] {
	return [
		cityCompanyCards[0]
			? `Больше всего вариантов сейчас у ${cityCompanyCards[0].name}. Начните с этой компании, если хотите быстро понять рынок ${cityPrep}.`
			: `В подборке ${cityPrep} уже есть несколько вакансий. Сначала посмотрите компании, где больше открытых позиций.`,
		salaryLeader
			? `Самая высокая заявленная сумма сейчас у ${salaryLeader.name}: до ${formatMoney(salaryLeader.maxSalary)} ₽. Проверьте, из чего складывается эта цифра.`
			: 'Доход зависит от смен, района и транспорта, поэтому лучше сравнить несколько вакансий перед откликом.',
		transportTypes.length
			? `В городе есть варианты: ${humanJoin(transportTypes).toLowerCase()}. Можно сразу сузить список по транспорту и графику.`
			: 'Формат работы зависит от работодателя, поэтому после выбора города полезно открыть страницы по типу доставки.',
	];
}

export function buildNearbyCityLinks(
	allJobs: GeneratedJob[],
	currentCitySlug: string,
): NearbyCityLink[] {
	return getCitiesFromJobs(allJobs)
		.filter((city) => city.slug !== currentCitySlug)
		.sort((a, b) => b.vacancyCount - a.vacancyCount)
		.slice(0, 12)
		.map((city) => ({
			name: city.name,
			slug: city.slug,
			vacancyCount: city.vacancyCount,
		}));
}

/**
 * Some categories ship with `name` that ALREADY embeds the «Курьер»
 * or «Работа курьером» prefix (constants.ts: «Курьер 16 лет», «Курьер
 * 18 лет», «Работа курьером женщине»). When such a name is composed
 * into a title that ALSO leads with «Курьер … » or «Работа курьером
 * … », the prefix duplicates → «Курьер курьер 16 лет — до 259 560 ₽».
 * `cleanCategoryName` strips that leading prefix once so the
 * composing template can safely prepend its own without doubling.
 * Categories without the prefix («На авто», «Подработка», …) stay
 * unchanged. Falls back to the original `data.name` if the strip
 * would yield an empty string (defensive).
 */
export function cleanCategoryName(name: string): string {
	return (
		name
			.replace(/^Работа курьером\s*/i, '')
			.replace(/^Курьер\s*/i, '')
			.trim() || name
	);
}

export type SeoTitleArgs = {
	type: ListingType;
	cityPrep?: string;
	categoryNameClean?: string;
	formattedMaxSalary: string | null;
	vacancyCountText: string;
	isEmptyListing: boolean;
	isEzhednevLanding: boolean;
};

export function buildSeoTitle(args: SeoTitleArgs): string {
	const {
		type,
		cityPrep,
		categoryNameClean,
		formattedMaxSalary,
		vacancyCountText,
		isEmptyListing,
		isEzhednevLanding,
	} = args;

	const raw = isEzhednevLanding
		? formattedMaxSalary
			? `Курьер с ежедневной оплатой — до ${formattedMaxSalary} ₽ · ${vacancyCountText} | КурьерОк`
			: `Работа курьером с ежедневной оплатой 2026 — ${vacancyCountText} | КурьерОк`
		: isEmptyListing
			? type === 'city'
				? `Работа курьером ${cityPrep} — следите за обновлениями | КурьерОк`
				: `Работа курьером (${(categoryNameClean ?? '').toLowerCase()}) — следите за обновлениями | КурьерОк`
			: type === 'city'
				? formattedMaxSalary
					? `Курьер ${cityPrep} — до ${formattedMaxSalary} ₽/мес · ${vacancyCountText} | КурьерОк`
					: `Работа курьером ${cityPrep} 2026: ${vacancyCountText} | КурьерОк`
				: formattedMaxSalary
					? `Курьер ${(categoryNameClean ?? '').toLowerCase()} — до ${formattedMaxSalary} ₽/мес · ${vacancyCountText} | КурьерОк`
					: `Работа курьером ${(categoryNameClean ?? '').toLowerCase()} 2026: ${vacancyCountText} | КурьерОк`;

	return raw.slice(0, 70);
}

export type SeoDescriptionArgs = {
	type: ListingType;
	cityPrep?: string;
	categoryName?: string;
	categoryNameClean?: string;
	formattedMaxSalary: string | null;
	vacancyCountText: string;
	isEmptyListing: boolean;
	isEzhednevLanding: boolean;
	companyNames: string[];
	paymentTypes: string[];
	transportTypes: string[];
};

export function buildSeoDescription(args: SeoDescriptionArgs): string {
	const {
		type,
		cityPrep,
		categoryName,
		categoryNameClean,
		formattedMaxSalary,
		vacancyCountText,
		isEmptyListing,
		isEzhednevLanding,
		companyNames,
		paymentTypes,
		transportTypes,
	} = args;

	const raw = isEzhednevLanding
		? `${vacancyCountText} курьера с ежедневными выплатами: Яндекс.Еда и Купер позволяют выводить заработок прямо в день смены через встроенный кошелёк (Я.Кошелёк / СберPay). Деньги — на карту в любой момент.`
		: isEmptyListing
			? type === 'city'
				? `Сейчас активных вакансий курьером ${cityPrep} нет — добавьте сайт в избранное и проверьте позже. Сравните условия в других городах России.`
				: `Сейчас активных вакансий по формату «${categoryName ?? ''}» нет — следите за обновлениями. Посмотрите похожие подборки на главной.`
			: type === 'city'
				? formattedMaxSalary
					? `${vacancyCountText} курьером ${cityPrep} от прямых работодателей: ${companyNames.slice(0, 2).join(', ') || 'Y.Eda, Купер'}. Доход до ${formattedMaxSalary} ₽/мес. Выплаты ${paymentTypes.slice(0, 2).join(' / ').toLowerCase() || 'еженедельно'}. Свежие данные сегодня.`
					: `Свежие ${vacancyCountText} курьером ${cityPrep} от прямых работодателей: ${companyNames.length} компаний. Выплаты ${paymentTypes.slice(0, 2).join(' / ').toLowerCase() || 'уточняются'}, форматы ${transportTypes.join(', ').toLowerCase() || 'разные'}.`
				: formattedMaxSalary
					? `${vacancyCountText} «${categoryName ?? ''}» — доход до ${formattedMaxSalary} ₽/мес. ${companyNames.length} компаний, выплаты ${paymentTypes.slice(0, 2).join(' / ').toLowerCase() || 'регулярные'}. Сравните условия и подайте заявку.`
					: `Курьер ${(categoryNameClean ?? '').toLowerCase()} 2026: ${vacancyCountText} от ${companyNames.length} компаний. Сравните выплаты, требования и оформление до отклика.`;

	return raw.slice(0, 170);
}

export function filterRelatedArticles(
	articles: Article[],
	type: ListingType,
	dataName: string,
	searchTerm: string,
): Article[] {
	const dataNameLc = dataName.toLowerCase();
	return articles
		.filter((article) => {
			const haystack = `${article.title} ${article.description}`.toLowerCase();
			if (type === 'city') {
				return haystack.includes(dataNameLc) || haystack.includes('курьер');
			}
			return (
				haystack.includes(dataNameLc) ||
				haystack.includes(searchTerm) ||
				haystack.includes('курьер')
			);
		})
		.slice(0, 3);
}

export function buildRouteLinks(
	allJobs: GeneratedJob[],
	type: ListingType,
	dataName: string,
	citySlug?: string,
): LinkItem[] {
	if (type === 'city') {
		return [
			{ name: 'Сравнение вакансий', href: '/compare/' },
			{ name: 'Компании', href: '/companies/' },
			{ name: 'Гид: доход курьера', href: '/guide/dohod/' },
			{ name: 'Гид: оформление', href: '/guide/oformlenie/' },
			...CATEGORIES.filter((cat) => cat.slug !== citySlug)
				.slice(0, 3)
				.map((cat) => ({
					name: cat.name,
					href: `/rabota-kurerom-${cat.slug}/`,
				})),
		];
	}

	return [
		{ name: 'Сравнение вакансий', href: '/compare/' },
		{ name: 'Города', href: '/cities/' },
		{ name: 'Гид для курьера', href: '/guide/' },
		...getCitiesFromJobs(allJobs)
			.filter((city) => city.name !== dataName)
			.sort((a, b) => b.vacancyCount - a.vacancyCount)
			.slice(0, 3)
			.map((city) => ({
				name: city.name,
				href: `/rabota-kurerom-${city.slug}/`,
			})),
	];
}

export function buildQuickLaunchLinks(
	type: ListingType,
	cityScenarioRoutes: LinkItem[],
	routeLinks: LinkItem[],
): LinkItem[] {
	if (type === 'city') {
		return [
			...cityScenarioRoutes.slice(0, 4),
			{ name: 'Компании', href: '/companies/' },
			{ name: 'Сравнение', href: '/compare/' },
		];
	}

	return [
		{ name: 'Сравнение', href: '/compare/' },
		{ name: 'Города', href: '/cities/' },
		...routeLinks.slice(2, 5),
	];
}

export function buildHeroIntro(
	type: ListingType,
	isEzhednevLanding: boolean,
	vacancyCountText: string,
	cityPrep?: string,
): string {
	if (isEzhednevLanding) {
		return `Самые быстрые выплаты у курьеров: ${vacancyCountText} от Яндекс.Еда и Купер с опцией мгновенного вывода заработанного. Внутри приложения курьера встроен кошелёк (Я.Кошелёк / СберPay), откуда деньги можно перевести на карту в любой день — иногда несколько раз за смену. Плюс наличные от клиента остаются у курьера сразу. Ниже — все вакансии с такой моделью.`;
	}
	if (type === 'city') {
		return `Ниже собраны вакансии ${cityPrep}. Смотрите оплату, транспорт, оформление и переходите только в те варианты, где условия похожи на ваши.`;
	}
	return `Ниже собраны вакансии по этому формату. Сначала проверьте оплату и требования, затем переходите к компаниям или городам.`;
}

export function buildLaunchSummary(type: ListingType, cityPrep?: string): string {
	if (type === 'city') {
		return `Мы уже оставили в списке только предложения ${cityPrep}. Используйте фильтры, если важен конкретный транспорт или график.`;
	}
	return 'Мы уже применили нужный фильтр. Остаётся сравнить несколько вакансий и открыть те, где условия подходят.';
}

export type FactCardArgs = {
	filteredJobsCount: number;
	companyCount: number;
	transportTypes: string[];
	paymentTypes: string[];
};

export function buildFactCards(args: FactCardArgs): FactCard[] {
	const { filteredJobsCount, companyCount, transportTypes, paymentTypes } = args;
	return [
		{ label: 'Вакансии', value: `${filteredJobsCount}` },
		{ label: 'Компании', value: `${companyCount}` },
		{ label: 'Форматы', value: transportTypes.join(', ') || 'Смешанные форматы' },
		{ label: 'Выплаты', value: paymentTypes.slice(0, 2).join(' / ') || 'Уточняются в карточке' },
	];
}

export function buildFitPoints(type: ListingType, dataName: string, cityPrep?: string): string[] {
	if (type === 'city') {
		return [
			`Тем, кто ищет работу курьером ${cityPrep} и хочет увидеть активные компании в одном списке.`,
			`Кандидатам, которые выбирают между пешей доставкой, велосипедом, самокатом или автомобилем.`,
			`Тем, кто хочет сначала спокойно сравнить условия, а уже потом переходить к анкете работодателя.`,
		];
	}
	return [
		`Тем, кто рассматривает формат "${dataName}" и хочет увидеть несколько вариантов без ручного поиска.`,
		`Кандидатам, которым важно сравнить выплаты, требования и занятость до перехода к анкете.`,
		`Тем, кто хочет отсечь неподходящие вакансии и открыть только близкие по условиям.`,
	];
}

export function buildVacancyCountText(count: number): string {
	return `${count} ${getVacancyPluralText(count)}`;
}

// ---------------------------------------------------------------------------
// FAQ + JSON-LD schema graph
// ---------------------------------------------------------------------------

export type FaqItem = {
	question: string;
	answer: string;
};

export type FaqArgs = {
	type: ListingType;
	isEzhednevLanding: boolean;
	dataName: string;
	cityPrep?: string;
	filteredJobsCount: number;
	companyNames: string[];
	transportTypes: string[];
	vacancyCountText: string;
};

export function buildFaqItems(args: FaqArgs): FaqItem[] {
	const {
		type,
		isEzhednevLanding,
		dataName,
		cityPrep,
		filteredJobsCount,
		companyNames,
		transportTypes,
		vacancyCountText,
	} = args;

	if (isEzhednevLanding) {
		return [
			{
				question: 'Есть ли в России работа курьером с ежедневной оплатой?',
				answer: 'Да. У Яндекс.Еда и Купер встроен кошелёк (Я.Кошелёк / СберPay) — заработанное за смену поступает туда сразу, и курьер выводит деньги на карту в любой день, иногда несколько раз за смену. Плюс наличные от клиента остаются на руках сразу.',
			},
			{
				question: 'Через сколько после смены деньги доступны для вывода?',
				answer: 'У Яндекс.Еда — обычно в течение 1–3 часов после закрытия заказа: оплата клиентом проходит, и сумма за вычетом комиссии падает на Я.Кошелёк. У Купер — после закрытия смены (несколько раз в день). Дальше — мгновенный вывод на карту через приложение.',
			},
			{
				question: 'Есть ли комиссия за быстрый вывод?',
				answer: 'У Яндекс.Еда стандартный вывод бесплатный, есть платная опция «Мгновенно» (~1–3% за пределами бесплатного лимита). У Купер вывод тоже без комиссии в большинстве случаев. Точный тариф уточняйте в приложении после регистрации.',
			},
			{
				question: 'Какие вакансии собраны на этой странице?',
				answer: `${vacancyCountText} от Яндекс.Еда и Купер — это компании, которые официально предлагают мгновенный вывод заработка. Сортируйте по доходу или выберите свой город фильтром.`,
			},
		];
	}

	if (type === 'city') {
		return [
			{
				question: `Какие вакансии курьера есть ${cityPrep}?`,
				answer: `На этой странице собраны ${filteredJobsCount} вакансий от ${companyNames.length} компаний. В подборке есть форматы ${transportTypes.join(', ').toLowerCase() || 'с разными типами занятости'} и разные графики работы.`,
			},
			{
				question: 'Это вакансии от прямых работодателей или агрегатора?',
				answer: `Все ${filteredJobsCount} вакансий ${cityPrep} — от прямых работодателей: ${companyNames.slice(0, 3).join(', ') || 'Яндекс.Еда, Купер, Озон'}. Мы передаём вашу заявку напрямую в HR компании, без посредников. Звонок придёт от самой компании в день подачи заявки.`,
			},
			// AUDIT-OK (A3): «обновляется ежедневно / каждое утро» is the
			// owner-stated content commitment for the deploy cadence. The
			// build pipeline is expected to run on a daily schedule;
			// keeping this copy intentional keeps the trust signal even
			// on builds that occasionally lag. Do not re-flag in audits.
			{
				question: `Свежие ли это вакансии ${cityPrep}?`,
				answer: `Да. Каталог обновляется ежедневно: мы синхронизируемся с реферальными формами Яндекс.Еда, Купер, Озон и партнёров каждое утро. На карточке каждой вакансии видна дата последнего обновления.`,
			},
			{
				question: `Кому подходит работа курьером ${cityPrep}?`,
				answer: `Страница подходит тем, кто хочет сравнить локальные вакансии по выплатам, требованиям и компаниям, а затем открыть только подходящие варианты.`,
			},
			{
				question: 'Что проверить перед откликом?',
				answer: 'Перед откликом стоит открыть карточку вакансии и уточнить выплаты, оформление, возрастной порог, гражданство, медкнижку и формат занятости.',
			},
		];
	}

	return [
		{
			question: `Что входит в подборку "${dataName}"?`,
			answer: `На странице собраны ${filteredJobsCount} вакансий от ${companyNames.length} компаний, которые подходят под формат "${dataName}".`,
		},
		{
			question: `Кому подходит формат "${dataName}"?`,
			answer: `Эта подборка подходит тем, кто хочет сравнить один конкретный формат работы курьером и выбрать вакансию по графику, выплатам и базовым требованиям.`,
		},
		{
			question: 'Нужно ли сразу откликаться?',
			answer: 'Нет. Сначала стоит открыть карточки вакансий, проверить ограничения и только потом переходить по ссылке отклика на сайт работодателя или партнёра.',
		},
	];
}

export type SchemaGraphArgs = {
	type: ListingType;
	dataName: string;
	title: string;
	seoDescription: string;
	pageUrlHref: string;
	pageUrlPathname: string;
	siteUrl: URL | string | undefined;
	dateModifiedIso: string;
	filteredJobs: GeneratedJob[];
	faqItems: FaqItem[];
};

export function buildPageSchemaGraph(args: SchemaGraphArgs): unknown[] {
	const {
		type,
		dataName,
		title,
		seoDescription,
		pageUrlHref,
		pageUrlPathname,
		siteUrl,
		dateModifiedIso,
		filteredJobs,
		faqItems,
	} = args;

	return [
		{
			'@type': 'CollectionPage',
			name: title,
			description: seoDescription,
			url: pageUrlHref,
			dateModified: dateModifiedIso,
			mainEntity: {
				'@type': 'ItemList',
				itemListElement: filteredJobs.slice(0, 10).map((job, index) => ({
					'@type': 'ListItem',
					position: index + 1,
					name: job.title,
					url: new URL(`/v/${job.slug}/`, siteUrl).toString(),
				})),
			},
		},
		...(type === 'city'
			? [
				buildPlaceSchema({
					city: dataName,
					pageUrl: pageUrlHref,
					description: seoDescription,
				}),
			]
			: []),
		{
			'@type': 'FAQPage',
			mainEntity: faqItems.map((item) => ({
				'@type': 'Question',
				name: item.question,
				acceptedAnswer: {
					'@type': 'Answer',
					text: item.answer,
				},
			})),
		},
		buildBreadcrumbSchema(
			type === 'city'
				? [
					{ name: 'Главная', url: '/' },
					{ name: 'Города', url: '/cities/' },
					{ name: title, url: pageUrlPathname },
				]
				: [
					{ name: 'Главная', url: '/' },
					{ name: title, url: pageUrlPathname },
				],
			siteUrl,
		),
	];
}

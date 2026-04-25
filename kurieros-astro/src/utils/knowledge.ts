import knowledgeBase from '../data/knowledge-base.json';

export type KnowledgeFact = {
	value: string;
	source_id: string;
};

export type KnowledgeItem = {
	id: string;
	topic: string;
	question: string;
	answer_short: string;
	answer_long: string;
	facts: KnowledgeFact[];
	geo_scope: string[];
	company_scope: string[];
	confidence: number;
};

export type KnowledgeSource = {
	id: string;
	name: string;
	kind: string;
	url: string;
};

export type KnowledgeBase = {
	version: string;
	generated: string;
	sources: KnowledgeSource[];
	items: KnowledgeItem[];
};

export const TOPIC_META: Readonly<
	Record<string, { slug: string; title: string; description: string }>
> = {
	возраст: {
		slug: 'vozrast',
		title: 'Возраст курьера',
		description: 'Со скольки лет можно работать курьером в разных сервисах: пеший, вело, авто и банковские форматы.',
	},
	медкнижка: {
		slug: 'medknizhka',
		title: 'Медкнижка курьера',
		description: 'Кому нужна медкнижка курьера, где и за сколько её оформить, как сэкономить время.',
	},
	документы: {
		slug: 'dokumenty',
		title: 'Документы для курьера',
		description: 'Полный список документов курьера для разных форматов: РФ, ЕАЭС и иностранные граждане.',
	},
	гражданство: {
		slug: 'grazhdanstvo',
		title: 'Гражданство курьера',
		description: 'Какие гражданства принимают сервисы доставки и какой формат оформления допустим.',
	},
	оформление: {
		slug: 'oformlenie',
		title: 'Оформление курьера',
		description: 'Самозанятость, ГПХ, ИП, ТК РФ — как оформиться курьером и какой режим выбрать.',
	},
	доход: {
		slug: 'dohod',
		title: 'Доход курьера',
		description: 'Сколько зарабатывает курьер в 2026 году по форматам: пешком, на велосипеде, на авто, в банке.',
	},
	выплаты: {
		slug: 'vyplaty',
		title: 'Выплаты курьеру',
		description: 'Как часто и куда приходят выплаты курьерам: ежедневно, еженедельно, через приложение.',
	},
	график: {
		slug: 'grafik',
		title: 'График курьера',
		description: 'Гибкий график, смены, подработка — как устроен график работы курьера в разных сервисах.',
	},
	штрафы: {
		slug: 'shtrafy',
		title: 'Штрафы курьеру',
		description: 'За что штрафуют курьеров в Яндекс Еде, Купере и других сервисах: список и суммы.',
	},
	транспорт: {
		slug: 'transport',
		title: 'Транспорт курьера',
		description: 'Какой транспорт нужен курьеру и кому его выдают: велосипед, авто, термосумка.',
	},
	требования: {
		slug: 'trebovaniya',
		title: 'Требования к курьеру',
		description: 'Базовые требования к курьеру: возраст, документы, медкнижка, опыт, внешний вид.',
	},
	сравнение: {
		slug: 'sravnenie',
		title: 'Сравнение работодателей',
		description: 'Сравнение курьерских сервисов и работодателей по доходу, выплатам и графику.',
	},
};

export const knowledgeBaseData: KnowledgeBase = knowledgeBase as unknown as KnowledgeBase;

export const getItemsByTopic = (topic: string): KnowledgeItem[] =>
	knowledgeBaseData.items.filter((item) => item.topic === topic);

export const getAllTopicSlugs = (): string[] =>
	Object.values(TOPIC_META).map((meta) => meta.slug);

export const getTopicBySlug = (
	slug: string,
): { topic: string; meta: (typeof TOPIC_META)[string] } | undefined => {
	const entry = Object.entries(TOPIC_META).find(([, value]) => value.slug === slug);
	if (!entry) return undefined;
	const [topic, meta] = entry;
	return { topic, meta };
};

export const getSourceById = (id: string): KnowledgeSource | undefined =>
	knowledgeBaseData.sources.find((source) => source.id === id);

const COMPANY_ROUTE_SLUGS: Readonly<Record<string, string | undefined>> = {
	'yandex-eda': 'yandex-eda',
	kuper: 'kuper-ex-sbermarket',
	samokat: undefined,
	ozon: undefined,
	'alfa-bank': 'alfa-bank',
	't-bank': 't-bank',
	dostavista: undefined,
	'fns-npd': undefined,
};

const COMPANY_DISPLAY_NAMES: Readonly<Record<string, string>> = {
	'yandex-eda': 'Яндекс Еда',
	kuper: 'Купер',
	samokat: 'Самокат',
	ozon: 'Ozon',
	'alfa-bank': 'Альфа-Банк',
	't-bank': 'Т-Банк',
	dostavista: 'Достависта',
	'fns-npd': 'ФНС',
};

export type CompanyLink = {
	id: string;
	name: string;
	href?: string;
};

export const resolveCompanyLinks = (sourceIds: readonly string[]): CompanyLink[] =>
	Array.from(new Set(sourceIds))
		.filter((id) => id !== 'fns-npd')
		.map((id) => {
			const slug = COMPANY_ROUTE_SLUGS[id];
			return {
				id,
				name: COMPANY_DISPLAY_NAMES[id] ?? id,
				...(slug ? { href: `/companies/${slug}/` } : {}),
			};
		});

const GEO_LINKS: Readonly<Record<string, { name: string; href: string }[]>> = {
	all: [
		{ name: 'Москва', href: '/rabota-kurerom-moskva/' },
		{ name: 'Санкт-Петербург', href: '/rabota-kurerom-sankt-peterburg/' },
		{ name: 'Все города', href: '/cities/' },
	],
	msk: [{ name: 'Москва', href: '/rabota-kurerom-moskva/' }],
	spb: [{ name: 'Санкт-Петербург', href: '/rabota-kurerom-sankt-peterburg/' }],
	regions: [
		{ name: 'Екатеринбург', href: '/rabota-kurerom-ekaterinburg/' },
		{ name: 'Казань', href: '/rabota-kurerom-kazan/' },
		{ name: 'Новосибирск', href: '/rabota-kurerom-novosibirsk/' },
	],
};

export const resolveGeoLinks = (
	scope: readonly string[],
): { name: string; href: string }[] => {
	const seen = new Set<string>();
	const out: { name: string; href: string }[] = [];
	for (const entry of scope) {
		const links = GEO_LINKS[entry] ?? [];
		for (const link of links) {
			if (!seen.has(link.href)) {
				seen.add(link.href);
				out.push(link);
			}
		}
	}
	return out;
};

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

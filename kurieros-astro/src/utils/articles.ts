export type ArticleLike = {
	slug: string;
	title: string;
	description: string;
	date: string;
	readTime: string;
	image?: string;
	content?: string;
};

type TopicDefinition = {
	id: string;
	label: string;
	description: string;
	href: string;
	pattern: RegExp;
};

const TOPIC_DEFINITIONS: TopicDefinition[] = [
	{
		id: 'income',
		label: 'Доход и выплаты',
		description: 'Материалы о реальном заработке, выплатах, расходах и чистом доходе.',
		href: '/compare/',
		pattern: /доход|зарабаты|прибыл|выплат|оплат|деньг|расход|учет/i,
	},
	{
		id: 'companies',
		label: 'Компании и бренды',
		description: 'Выбор работодателя, сравнение брендов и разбор компаний доставки.',
		href: '/companies/',
		pattern: /компан|бренд|работодат|яндекс|самокат|ozon|сдэк|вкусвилл|купер|банк/i,
	},
	{
		id: 'formats',
		label: 'Форматы работы',
		description: 'Пеший, вело- и автоформат, а также выбор транспорта под график.',
		href: '/rabota-kurerom-na-avto/',
		pattern: /пеш|вело|авто|электровел|формат|транспорт/i,
	},
	{
		id: 'part-time',
		label: 'Подработка и график',
		description: 'Подработка, выходные, вечерние смены и полный график.',
		href: '/rabota-kurerom-podrabotka/',
		pattern: /подработ|график|выходн|вечер|смен|полный/i,
	},
	{
		id: 'start',
		label: 'Старт и адаптация',
		description: 'Вход в профессию, первые недели и варианты для студентов.',
		href: '/rabota-kurerom-dlya-studentov/',
		pattern: /студент|16|без опыта|первую недел|нача|старт/i,
	},
	{
		id: 'checks',
		label: 'Риски и проверки',
		description: 'Как не ошибиться с вакансией и что проверять до отклика.',
		href: '/compare/',
		pattern: /плох|чек-лист|провер|медкниж|уходят|что делать|ошиб/i,
	},
	{
		id: 'geo',
		label: 'Города и районы',
		description: 'Поиск работы по городам, районам и локальным условиям.',
		href: '/cities/',
		pattern: /город|район|москв|спб|екатеринбург|казан|самар|маленьком городе/i,
	},
];

const tokenize = (value: string) =>
	value
		.toLowerCase()
		.replace(/<[^>]+>/g, ' ')
		.replace(/[^a-zа-я0-9\s-]+/gi, ' ')
		.split(/\s+/)
		.filter((token) => token.length > 3);

const getArticleText = (article: ArticleLike) =>
	`${article.title} ${article.description} ${article.slug} ${article.content || ''}`;

export const getArticleTopics = (article: ArticleLike) => {
	const text = getArticleText(article);
	const matchedTopics = TOPIC_DEFINITIONS.filter((topic) => topic.pattern.test(text));

	return matchedTopics.length ? matchedTopics : [TOPIC_DEFINITIONS[0]];
};

export const getRelatedArticles = (
	articles: ArticleLike[],
	currentArticle: ArticleLike,
	limit = 3,
) => {
	const currentTopics = new Set(getArticleTopics(currentArticle).map((topic) => topic.id));
	const currentTokens = new Set(tokenize(getArticleText(currentArticle)));

	return articles
		.filter((article) => article.slug !== currentArticle.slug)
		.map((article) => {
			const topics = getArticleTopics(article);
			const sharedTopics = topics.filter((topic) => currentTopics.has(topic.id)).length;
			const sharedTokens = tokenize(getArticleText(article)).filter((token) => currentTokens.has(token)).length;
			const score = sharedTopics * 6 + Math.min(sharedTokens, 5);

			return { article, score };
		})
		.sort((a, b) => b.score - a.score || Number(new Date(b.article.date)) - Number(new Date(a.article.date)))
		.slice(0, limit)
		.map((entry) => entry.article);
};

export const getArticleTopicGroups = (articles: ArticleLike[]) =>
	TOPIC_DEFINITIONS.map((topic) => ({
		...topic,
		articles: articles.filter((article) =>
			getArticleTopics(article).some((articleTopic) => articleTopic.id === topic.id),
		),
	}))
		.filter((topic) => topic.articles.length > 0)
		.sort((a, b) => b.articles.length - a.articles.length);

export const getArticleRouteLinks = (article: ArticleLike) => {
	const topics = getArticleTopics(article);
	const links = new Map<string, { title: string; href: string; text: string }>();

	topics.forEach((topic) => {
		if (!links.has(topic.href)) {
			links.set(topic.href, {
				title: topic.label,
				href: topic.href,
				text: topic.description,
			});
		}
	});

	if (!links.has('/compare/')) {
		links.set('/compare/', {
			title: 'Сравнение вакансий',
			href: '/compare/',
			text: 'Проверить тему статьи на реальных вакансиях и условиях.',
		});
	}

	if (!links.has('/companies/')) {
		links.set('/companies/', {
			title: 'Компании',
			href: '/companies/',
			text: 'Выбрать работодателя и открыть брендовые страницы.',
		});
	}

	if (!links.has('/cities/')) {
		links.set('/cities/', {
			title: 'Города',
			href: '/cities/',
			text: 'Перейти в локальные подборки по городам.',
		});
	}

	return Array.from(links.values()).slice(0, 4);
};

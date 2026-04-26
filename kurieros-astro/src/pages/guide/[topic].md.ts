import type { APIRoute, GetStaticPaths } from 'astro';
import {
	TOPIC_META,
	getItemsByTopic,
	getSourceById,
	knowledgeBaseData,
	type KnowledgeItem,
} from '../../utils/knowledge';

// Per-topic Markdown route at /guide/{slug}.md.
// AI assistants and LLM clients can fetch the same KB content as plain
// Markdown without HTML noise. Mirrors /guide/{slug}/ exactly.

export const getStaticPaths: GetStaticPaths = () =>
	Object.entries(TOPIC_META).map(([topic, meta]) => ({
		params: { topic: meta.slug },
		props: { topic, meta },
	}));

const renderItem = (item: KnowledgeItem, slug: string): string => {
	const lines: string[] = [];
	lines.push(`### ${item.question}`);
	lines.push('');
	lines.push(`Permalink: https://kurerok.ru/guide/${slug}/#${item.id}`);
	lines.push('');
	lines.push(`**Кратко:** ${item.answer_short}`);
	lines.push('');
	lines.push(item.answer_long);
	lines.push('');
	if (item.facts.length) {
		lines.push('**Факты:**');
		for (const fact of item.facts) {
			const src = getSourceById(fact.source_id);
			const suffix = src ? ` — *${src.name}* (${src.url})` : '';
			lines.push(`- ${fact.value}${suffix}`);
		}
		lines.push('');
	}
	if (item.geo_scope.length) {
		lines.push(`**География:** ${item.geo_scope.join(', ')}  `);
	}
	if (item.company_scope.length) {
		lines.push(`**Работодатели:** ${item.company_scope.join(', ')}  `);
	}
	lines.push(`**Достоверность:** ${Math.round(item.confidence * 100)}%`);
	return lines.join('\n');
};

export const GET: APIRoute = ({ props }) => {
	const { topic, meta } = props as { topic: string; meta: (typeof TOPIC_META)[string] };
	const items = getItemsByTopic(topic);
	const lines: string[] = [];
	lines.push(`# ${meta.title}`);
	lines.push('');
	lines.push(`> ${meta.description}`);
	lines.push('');
	lines.push(`Полная страница: https://kurerok.ru/guide/${meta.slug}/`);
	lines.push(`Источник: KB ${knowledgeBaseData.version} (обновлён ${knowledgeBaseData.generated})`);
	lines.push('');
	lines.push('---');
	lines.push('');
	for (const item of items) {
		lines.push(renderItem(item, meta.slug));
		lines.push('');
		lines.push('---');
		lines.push('');
	}
	return new Response(lines.join('\n'), {
		headers: {
			'Content-Type': 'text/markdown; charset=utf-8',
			'X-Robots-Tag': 'index, follow',
		},
	});
};

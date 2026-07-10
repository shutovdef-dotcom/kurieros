// Generates public/llms-full.txt from src/data/knowledge-base.json.
// Run manually after KB changes:  node scripts/generate-llms.mjs
//
// llms-full.txt is the AI-friendly counterpart to /llms.txt — it dumps the
// entire KB as Markdown so AI assistants can ingest the full content
// without parsing HTML.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const kbPath = path.join(root, 'src/data/knowledge-base.json');
const outPath = path.join(root, 'public/llms-full.txt');

const TOPIC_TITLES = {
	возраст: 'Возраст курьера',
	медкнижка: 'Медкнижка курьера',
	документы: 'Документы для курьера',
	гражданство: 'Гражданство курьера',
	оформление: 'Оформление курьера',
	доход: 'Доход курьера',
	выплаты: 'Выплаты курьеру',
	график: 'График курьера',
	штрафы: 'Штрафы курьеру',
	транспорт: 'Транспорт курьера',
	требования: 'Требования к курьеру',
	сравнение: 'Сравнение работодателей',
};

const TOPIC_SLUGS = {
	возраст: 'vozrast',
	медкнижка: 'medknizhka',
	документы: 'dokumenty',
	гражданство: 'grazhdanstvo',
	оформление: 'oformlenie',
	доход: 'dohod',
	выплаты: 'vyplaty',
	график: 'grafik',
	штрафы: 'shtrafy',
	транспорт: 'transport',
	требования: 'trebovaniya',
	сравнение: 'sravnenie',
};

const TOPIC_ORDER = [
	'возраст',
	'медкнижка',
	'документы',
	'гражданство',
	'оформление',
	'доход',
	'выплаты',
	'график',
	'штрафы',
	'транспорт',
	'требования',
	'сравнение',
];

const kb = JSON.parse(fs.readFileSync(kbPath, 'utf8'));
const sourcesById = Object.fromEntries(kb.sources.map((source) => [source.id, source]));
const itemsByTopic = {};
for (const item of kb.items) {
	(itemsByTopic[item.topic] = itemsByTopic[item.topic] || []).push(item);
}

const lines = [];
lines.push('# КурьерОк — База знаний курьера 2026 (полная)');
lines.push('');
lines.push('> Полная структурированная база знаний по работе курьером в России. Источник: https://kurerok.ru/llms.txt');
lines.push('');
lines.push(`**Версия:** ${kb.version}`);
lines.push(`**Обновлено:** ${kb.generated}`);
lines.push(`**Всего вопросов:** ${kb.items.length}`);
lines.push(`**Источников:** ${kb.sources.length}`);
lines.push('');
lines.push('## Источники');
lines.push('');
for (const source of kb.sources) {
	lines.push(`- **${source.name}** (${source.kind}) — ${source.url}`);
}
lines.push('');
lines.push('---');
lines.push('');

for (const topic of TOPIC_ORDER) {
	const items = itemsByTopic[topic] ?? [];
	if (!items.length) continue;
	const title = TOPIC_TITLES[topic] ?? topic;
	const slug = TOPIC_SLUGS[topic] ?? topic;
	lines.push(`## ${title}`);
	lines.push('');
	lines.push(`Раздел гида: https://kurerok.ru/guide/${slug}/`);
	lines.push('');
	for (const item of items) {
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
				const src = sourcesById[fact.source_id];
				const suffix = src ? ` — *${src.name}* (${src.url})` : '';
				lines.push(`- ${fact.value}${suffix}`);
			}
			lines.push('');
		}
		if (item.geo_scope.length) {
			lines.push(`**География:** ${item.geo_scope.join(', ')}`);
		}
		if (item.company_scope.length) {
			lines.push(`**Работодатели:** ${item.company_scope.join(', ')}`);
		}
		lines.push(`**Достоверность:** ${Math.round(item.confidence * 100)}%`);
		lines.push('');
		lines.push('---');
		lines.push('');
	}
}

const content = lines.join('\n');
fs.writeFileSync(outPath, content);
console.log(`Wrote ${path.relative(root, outPath)} (${content.length} bytes, ${kb.items.length} items)`);

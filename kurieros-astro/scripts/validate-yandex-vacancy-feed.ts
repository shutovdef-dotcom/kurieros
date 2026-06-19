import {
	buildYandexVacancyFeed,
	renderYandexVacancyFeedXml,
	validateYandexVacancyFeed,
	YANDEX_VACANCY_FEED_PATH,
} from '../src/utils/yandexVacancyFeed';

const siteUrl = process.env.SITE_URL || 'https://kurerok.ru';
const feed = buildYandexVacancyFeed({ siteUrl });
const validation = validateYandexVacancyFeed(feed);
const xml = renderYandexVacancyFeedXml(feed);
const xmlBytes = Buffer.byteLength(xml, 'utf8');

for (const warning of validation.warnings) {
	console.warn(`Warning: ${warning}`);
}

if (!validation.ok) {
	console.error('Yandex vacancy feed validation failed:');
	for (const error of validation.errors) {
		console.error(`- ${error}`);
	}
	process.exit(1);
}

console.log(`Yandex vacancy feed OK: ${feed.offers.length} offers, ${feed.sets.length} sets, ${xmlBytes} bytes.`);
console.log(`Feed URL after deploy: ${siteUrl.replace(/\/+$/, '')}${YANDEX_VACANCY_FEED_PATH}`);

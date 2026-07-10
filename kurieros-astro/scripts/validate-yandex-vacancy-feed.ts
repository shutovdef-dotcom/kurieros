import {
	buildYandexVacancyFeed,
	renderYandexVacancyFeedXml,
	validateYandexVacancyFeed,
	YANDEX_VACANCY_FEED_PATH,
} from '../src/utils/yandexVacancyFeed';
import {
	buildYandexVacancyFeedPilot,
	validateYandexVacancyFeedPilot,
} from '../src/utils/yandexVacancyFeedPilot';

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

const pilot = buildYandexVacancyFeedPilot({ siteUrl });
const pilotValidation = validateYandexVacancyFeedPilot(pilot, { mode: 'structure' });

for (const warning of pilotValidation.warnings) {
	console.warn(`Pilot warning: ${warning}`);
}

if (!pilotValidation.ok) {
	console.error('Yandex vacancy feed pilot validation failed:');
	for (const error of pilotValidation.errors) {
		console.error(`- ${error}`);
	}
	process.exit(1);
}

console.log(
	`Yandex vacancy feed pilot structure OK: ${pilot.offers.length} offers, ${pilot.sets.length} qualified city sets.`,
);
console.log(`Pilot exclusions: ${JSON.stringify(pilot.report.exclusionsByReason)}.`);
const publishability = validateYandexVacancyFeedPilot(pilot);
if (!publishability.ok) {
	console.warn('Pilot is NOT publishable:');
	for (const error of publishability.errors) console.warn(`- ${error}`);
	if (process.env.YANDEX_PILOT_REQUIRE_PUBLISHABLE === 'true') process.exit(1);
}
console.log(
	'Pilot is validation-only; production remains legacy and any switch requires owner approval plus YANDEX_PILOT_REQUIRE_PUBLISHABLE=true.',
);

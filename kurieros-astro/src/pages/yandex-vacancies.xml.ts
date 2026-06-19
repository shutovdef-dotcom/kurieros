import type { APIRoute } from 'astro';
import {
	buildYandexVacancyFeed,
	renderYandexVacancyFeedXml,
	validateYandexVacancyFeed,
} from '../utils/yandexVacancyFeed';

export const prerender = true;

export const GET: APIRoute = () => {
	const siteUrl = import.meta.env.SITE_URL || 'https://kurerok.ru';
	const feed = buildYandexVacancyFeed({ siteUrl });
	const validation = validateYandexVacancyFeed(feed);

	if (!validation.ok) {
		throw new Error(`Yandex vacancy feed validation failed:\n${validation.errors.join('\n')}`);
	}

	return new Response(renderYandexVacancyFeedXml(feed), {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			'Cache-Control': 'public, max-age=600, s-maxage=3600',
			'X-Robots-Tag': 'index, follow',
		},
	});
};

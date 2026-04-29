// Shared crawler for Ozon's sigma-bff-api recruitment endpoints.
// Used by both `fetch-ozon-vacancies.mjs` (ref-courier-sklad) and
// `fetch-ozon-fresh-vacancies.mjs` (fresh-referral-office).
//
// The two upstream forms differ in the *vacancy-discriminator field*
// they accept on `GetCitiesV2` / `GetHireObjectsV2`:
//   • sklad : `combineCustomerVacancy: 'ff:operator'`
//   • Fresh : `customer: 'express', vacancy: 'courier'`
//
// `crawlVacancyCatalogue()` abstracts both. Pass the appropriate
// `buildPayload(vacancy)` for your fetcher; everything else (HTTP,
// fail-fast empty-city check, JSON output) is shared.

import fs from 'node:fs/promises';

const API = 'https://sigma-bff-api.ozon.ru/v1/actions';

/**
 * Low-level HTTP wrapper around the sigma-bff-api action endpoint.
 * Both `GetCitiesV2` and `GetHireObjectsV2` use the same outer
 * envelope (`{action, body}`) and double-JSON-encode the inner body.
 */
export async function callAction({ action, inner, referer }) {
	const res = await fetch(API, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Origin': 'https://recruitment.ozon.ru',
			'Referer': referer,
		},
		body: JSON.stringify({ action, body: JSON.stringify(inner) }),
	});
	const text = await res.text();
	if (!res.ok) {
		throw new Error(`${action} failed: ${res.status} ${text.slice(0, 200)}`);
	}
	const wrap = JSON.parse(text);
	return JSON.parse(wrap.body);
}

/**
 * Crawl one full (vacancy → city → hire-object) matrix and return it.
 * Caller decides the payload shape via `buildPayload(vacancy)`.
 *
 * @param {object} cfg
 * @param {string} cfg.referer  Form URL — must match upstream Origin.
 * @param {Array<{slug: string, label: string}>} cfg.vacancies  List to crawl.
 * @param {(vacancy: object) => object} cfg.buildPayload  Returns the
 *   discriminator subset for this vacancy. Will be merged with the
 *   shared `utm_source` / `fullpath` keys before submission.
 * @param {(vacancy: object, citiesEntries: Array) => object} cfg.shapeResult
 *   Build the final JSON shape for one vacancy.
 */
export async function crawlVacancyCatalogue({
	referer,
	vacancies,
	buildPayload,
	shapeResult,
}) {
	const sharedKeys = { utm_source: 'referral_campaign', fullpath: referer };

	const result = [];
	for (const vacancy of vacancies) {
		const payload = { ...sharedKeys, ...buildPayload(vacancy) };
		const citiesOut = await callAction({
			action: 'GetCitiesV2',
			inner: payload,
			referer,
		});
		const cities = citiesOut.data;

		console.error(`[${vacancy.slug}] ${cities.length} cities`);

		const cityEntries = [];
		for (const city of cities) {
			let hireObjects = [];
			try {
				const out = await callAction({
					action: 'GetHireObjectsV2',
					inner: { ...payload, cityID: city.value },
					referer,
				});
				hireObjects = out.data;
			} catch (e) {
				console.error(`  ! ${city.label}: ${e.message}`);
			}
			cityEntries.push({
				cityName: city.label,
				cityID: city.value,
				hireObjects: hireObjects.map((h) => ({
					name: h.label,
					uuid: h.value,
				})),
			});
		}
		result.push(shapeResult(vacancy, cityEntries));
	}
	return result;
}

/**
 * Fail fast on transient API errors: if any city ended up with zero
 * hire objects, the upstream API hiccupped during this run. Writing
 * an "empty city" to the JSON would later trip ozonOffers.ts at build
 * time with a misleading error. Better to abort here, leave the
 * previous JSON untouched, and let the operator re-run.
 *
 * @param {object} cfg
 * @param {string} cfg.outPath  Path to write JSON on success.
 * @param {Array} cfg.result    Crawl result.
 * @param {(vacancy: object, cityName: string) => string} cfg.formatLabel
 *   Format a "<vacancy> → <city>" label for the error message.
 *   The two fetchers produce different vacancy keys (sklad uses
 *   `slug`, Fresh uses `customer:vacancy`), so this is delegated.
 */
export async function writeOrAbort({ outPath, result, formatLabel }) {
	const failedCities = result.flatMap((v) =>
		v.cities
			.filter((c) => c.hireObjects.length === 0)
			.map((c) => formatLabel(v, c.cityName)),
	);
	if (failedCities.length > 0) {
		console.error(
			`\nAborting: ${failedCities.length} cities returned zero hire objects (transient API failure?). Re-run after Ozon recovers. Affected:`,
		);
		for (const f of failedCities) console.error(`  - ${f}`);
		process.exit(1);
	}
	await fs.writeFile(outPath, JSON.stringify(result, null, 2), 'utf8');
	console.error(`\nWrote ${outPath}`);
	const totalCities = result.reduce((a, v) => a + v.cities.length, 0);
	const totalHireObjects = result.reduce(
		(a, v) => a + v.cities.reduce((b, c) => b + c.hireObjects.length, 0),
		0,
	);
	console.error(
		`Vacancies: ${result.length}, total cities: ${totalCities}, total hire objects: ${totalHireObjects}`,
	);
}

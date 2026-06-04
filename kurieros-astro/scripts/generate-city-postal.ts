/**
 * Generates `src/data/cityPostal.json` — a REAL central postal code per
 * city, for the JobPosting `jobLocation.address.postalCode` field. Keyed by
 * exact city name (matches CITY_DATASET / the names passed to
 * `buildJobLocationAddress`).
 *
 * Source: GeoNames RU postal export (open data, real codes, Cyrillic place
 * names). For each of our cities we pick the GeoNames place that matches by
 * normalised name AND whose region (admin_name1) matches the city's cityGeo
 * region — this disambiguates same-named settlements (e.g. the city Орёл,
 * 302000, vs a like-named village in Pskov oblast) — then take the lowest
 * (central) code. We NEVER fabricate: a city with no GeoNames+region match
 * is simply omitted, and `getCityPostalCode` returns undefined for it.
 *
 * A small SUPPLEMENT covers high-traffic places GeoNames RU lacks (Crimea,
 * Sochi districts, Zelenograd).
 *
 * Static data — NOT part of the build pipeline. Refresh:
 *   curl -s -o /tmp/RU.zip https://download.geonames.org/export/zip/RU.zip \
 *     && unzip -o /tmp/RU.zip RU.txt -d /tmp/geonames-ru
 *   npx tsx scripts/generate-city-postal.ts /tmp/geonames-ru/RU.txt
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CITY_DATASET } from '../src/data/cities-dataset';
import cityGeo from '../src/data/cityGeo.json' with { type: 'json' };

const GEO = cityGeo as Record<string, { region: string }>;

/** Real central codes for high-traffic places absent from GeoNames RU. */
const SUPPLEMENT: Readonly<Record<string, string>> = {
	Адлер: '354340',
	Лазаревское: '354200',
	Севастополь: '299011',
	Симферополь: '295000',
	Зеленоград: '124460',
};

const normName = (s: string): string =>
	s.toLowerCase().replace(/ё/g, 'е').replace(/[«»"]/g, '').trim();

/** Region comparison key — strips type words so naming order/case differences
 *  («Орловская область» vs «Орловская Область», «Республика Татарстан» vs
 *  «Татарстан Республика») still match on the distinctive root. */
const regionCore = (region: string): string =>
	region
		.toLowerCase()
		.replace(/ё/g, 'е')
		.replace(/республик\w*|областью?|область|обл\.?|край|автономн\w*|округ\w*|город|—|-/g, ' ')
		.replace(/[^а-я ]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();

interface Candidate {
	postal: string;
	regionCore: string;
}

const main = (): void => {
	const txtPath = process.argv[2] ?? '/tmp/geonames-ru/RU.txt';
	const candidatesByName = new Map<string, Candidate[]>();

	for (const line of readFileSync(txtPath, 'utf8').split('\n')) {
		const f = line.split('\t');
		if (f.length < 5) continue;
		const [, postal, place, admin1] = f;
		if (!/^\d{6}$/.test(postal)) continue;
		const key = normName(place);
		const list = candidatesByName.get(key) ?? [];
		list.push({ postal, regionCore: regionCore(admin1) });
		candidatesByName.set(key, list);
	}

	const pick = (name: string, slug: string): string | undefined => {
		const list = candidatesByName.get(normName(name));
		if (!list) return undefined;
		const cityRegion = GEO[slug]?.region;
		const rc = cityRegion ? regionCore(cityRegion) : '';
		let pool = list;
		if (rc) {
			const matched = list.filter(
				(c) => c.regionCore && (c.regionCore.includes(rc) || rc.includes(c.regionCore)),
			);
			if (matched.length) pool = matched;
		}
		return pool.map((c) => c.postal).sort()[0];
	};

	const out: Record<string, string> = {};
	for (const city of CITY_DATASET) {
		const postal = SUPPLEMENT[city.name] ?? pick(city.name, city.slug);
		if (postal) out[city.name] = postal;
	}

	const sorted = Object.fromEntries(
		Object.entries(out).sort((a, b) => a[0].localeCompare(b[0], 'ru')),
	);
	const dest = fileURLToPath(new URL('../src/data/cityPostal.json', import.meta.url));
	writeFileSync(dest, `${JSON.stringify(sorted)}\n`);
	console.log(
		`cityPostal.json: ${Object.keys(out).length}/${CITY_DATASET.length} cities ` +
			`(${Math.round((Object.keys(out).length / CITY_DATASET.length) * 100)}%)`,
	);
};

main();

/**
 * Generates `src/data/cityGeo.json` — per-city region, federal district
 * and coordinates for the Z1.1 city-insights block («где находится» +
 * nearest «соседние города»). Keyed by city slug.
 *
 * Source: pensnarik/russian-cities (open dataset), matched by exact city
 * name against CITY_DATASET (~923/937 matched; unmatched micro-localities
 * degrade gracefully to no geo). Static data — NOT part of the build
 * pipeline.
 *
 * Refresh:
 *   npx tsx scripts/generate-city-geo.ts                 # fetch from source
 *   npx tsx scripts/generate-city-geo.ts /tmp/raw.json   # use a local copy
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CITY_DATASET } from '../src/data/cities-dataset';

const SOURCE =
	'https://raw.githubusercontent.com/pensnarik/russian-cities/master/russian-cities.json';

interface RawCity {
	name: string;
	subject: string;
	district: string;
	coords: { lat: string; lon: string };
}

const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

const loadRaw = async (localPath?: string): Promise<RawCity[]> => {
	if (localPath) {
		return JSON.parse(readFileSync(localPath, 'utf8')) as RawCity[];
	}
	const res = await fetch(SOURCE);
	if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
	return (await res.json()) as RawCity[];
};

const main = async (): Promise<void> => {
	const raw = await loadRaw(process.argv[2]);
	const byName = new Map(raw.map((entry) => [entry.name, entry]));

	const out: Record<
		string,
		{ name: string; region: string; district: string; lat: number; lon: number }
	> = {};
	let matched = 0;

	for (const city of CITY_DATASET) {
		const geo = byName.get(city.name);
		if (!geo) continue;
		const lat = Number(geo.coords.lat);
		const lon = Number(geo.coords.lon);
		if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
		out[city.slug] = {
			name: city.name,
			region: geo.subject,
			district: geo.district,
			lat: round4(lat),
			lon: round4(lon),
		};
		matched += 1;
	}

	const dest = fileURLToPath(new URL('../src/data/cityGeo.json', import.meta.url));
	writeFileSync(dest, `${JSON.stringify(out)}\n`);
	console.log(`cityGeo.json: ${matched}/${CITY_DATASET.length} cities matched`);
};

void main();

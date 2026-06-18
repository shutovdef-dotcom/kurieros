import { performance } from 'node:perf_hooks';

import cityGeoRaw from '../../src/data/cityGeo.json';
import { citiesFromJobs } from '../../src/utils/citiesIndex';
import { nearestByDistance } from '../../src/utils/geoDistance';

const WARMUP_ITERATIONS = Number(process.env.BENCH_WARMUP_ITERATIONS ?? '5');
const ITERATIONS = Number(process.env.BENCH_ITERATIONS ?? '40');
const P95_THRESHOLD_MS = Number(process.env.CITY_NEIGHBOURS_P95_MS ?? '150');
const NEIGHBOUR_COUNT = 6;

type CityGeo = {
	name: string;
	lat: number;
	lon: number;
};

type GeoPageCity = CityGeo & {
	slug: string;
	vacancyCount: number;
};

const cityGeo = cityGeoRaw as Record<string, CityGeo>;
const geoPageCities: GeoPageCity[] = citiesFromJobs.flatMap((city) => {
	const geo = cityGeo[city.slug];
	return geo
		? [{ slug: city.slug, name: geo.name, lat: geo.lat, lon: geo.lon, vacancyCount: city.vacancyCount }]
		: [];
});

function buildNeighbours(): Map<string, GeoPageCity[]> {
	const map = new Map<string, GeoPageCity[]>();
	for (const origin of geoPageCities) {
		const candidates = geoPageCities.filter((city) => city.slug !== origin.slug);
		map.set(origin.slug, nearestByDistance(origin, candidates, NEIGHBOUR_COUNT));
	}
	return map;
}

function percentile(values: readonly number[], p: number): number {
	const sorted = [...values].sort((a, b) => a - b);
	const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
	return sorted[index] ?? 0;
}

for (let i = 0; i < WARMUP_ITERATIONS; i++) {
	buildNeighbours();
}

const durations: number[] = [];
let peakHeapDelta = 0;
for (let i = 0; i < ITERATIONS; i++) {
	globalThis.gc?.();
	const heapBefore = process.memoryUsage().heapUsed;
	const start = performance.now();
	const out = buildNeighbours();
	const duration = performance.now() - start;
	const heapAfter = process.memoryUsage().heapUsed;
	if (out.size !== geoPageCities.length) {
		throw new Error(`Expected ${geoPageCities.length} neighbour buckets, got ${out.size}`);
	}
	durations.push(duration);
	peakHeapDelta = Math.max(peakHeapDelta, heapAfter - heapBefore);
}

const p50Ms = percentile(durations, 50);
const p95Ms = percentile(durations, 95);
const p99Ms = percentile(durations, 99);
const result = {
	geoPageCities: geoPageCities.length,
	iterations: ITERATIONS,
	p50Ms: Number(p50Ms.toFixed(3)),
	p95Ms: Number(p95Ms.toFixed(3)),
	p99Ms: Number(p99Ms.toFixed(3)),
	peakHeapDeltaMb: Number((peakHeapDelta / 1024 / 1024).toFixed(3)),
	p95ThresholdMs: P95_THRESHOLD_MS,
};

console.log(JSON.stringify(result, null, 2));

if (p95Ms > P95_THRESHOLD_MS) {
	throw new Error(`City neighbours p95 ${p95Ms.toFixed(3)}ms exceeded ${P95_THRESHOLD_MS}ms`);
}

/**
 * Pure great-circle distance helpers for the city-insights neighbour
 * ranking (Z1.1). No data imports — unit-testable in isolation.
 */

const EARTH_RADIUS_KM = 6371;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

/** Great-circle distance in kilometres between two lat/lon points. */
export function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
	const dLat = toRadians(bLat - aLat);
	const dLon = toRadians(bLon - aLon);
	const lat1 = toRadians(aLat);
	const lat2 = toRadians(bLat);
	const h =
		Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
	return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export type GeoPoint = { lat: number; lon: number };

/**
 * The `k` candidates closest to `origin`, nearest first. Callers exclude
 * the origin itself from `candidates`.
 */
export function nearestByDistance<T extends GeoPoint>(
	origin: GeoPoint,
	candidates: readonly T[],
	k: number,
): T[] {
	return candidates
		.map((candidate) => ({
			candidate,
			distance: haversineKm(origin.lat, origin.lon, candidate.lat, candidate.lon),
		}))
		.sort((a, b) => a.distance - b.distance)
		.slice(0, k)
		.map((entry) => entry.candidate);
}

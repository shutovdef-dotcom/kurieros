// FNV-1a 32-bit hash for deterministic, lightweight pseudo-randomness.
// Used to derive a stable jitter from a string key (e.g. slug-city-transport)
// so the same input always maps to the same output across builds.
//
// Not cryptographic — DO NOT use for anything security-sensitive.
// Range: returns a non-negative integer in [0, 2^31]. The upper bound
// is 2^31 (not 2^31 - 1): `hash | 0` can be INT32_MIN, and
// `Math.abs(INT32_MIN)` is 2^31 — one past the signed-int32 max. This
// is a documented quirk, not a bug; the implementation is intentionally
// frozen (changing it would re-baseline every derived job ID).
//
// Reference: http://www.isthe.com/chongo/tech/comp/fnv/

const FNV_OFFSET_BASIS_32 = 2166136261;
const FNV_PRIME_32 = 16777619;

export function fnv1a(input: string): number {
	let hash = FNV_OFFSET_BASIS_32;
	for (let i = 0; i < input.length; i++) {
		hash ^= input.charCodeAt(i);
		hash = Math.imul(hash, FNV_PRIME_32);
	}
	// `| 0` coerces to int32 (handles overflow correctly), then Math.abs
	// flips the sign bit for callers that want a non-negative result.
	return Math.abs(hash | 0);
}

// --- Ozon hourly-rate fallback jitter -------------------------------
//
// Ozon's referral form publishes monthly placeholders, not per-hour
// rates. Two surfaces backfill a missing Ozon `pay.hourly` from the
// best known hourly rate in the same city, dropped a few percent via a
// deterministic FNV-1a-derived jitter so two Ozon offers in one city
// visually differ but stay reproducible across builds (ID stability):
//   • build side  — `src/data/sources/ozon-hourly-fallback.ts`
//   • render side — `src/pages/v/[slug].astro`
// They previously carried a byte-identical inline copy of the formula
// with bare magic numbers; `applyHourlyJitter` is the single owner
// (audit ref v3 M4). The two callers key the hash differently
// (`slug-city-transport` vs bare `slug`) — that is intentional, so the
// hash key is a parameter and each caller passes its own.

/** Modulo applied to the FNV-1a hash — yields a jitter bucket 0..99. */
const HOURLY_JITTER_BUCKETS = 100;
/** Lower bound of the jitter ratio band (bucket 0 → 88.0% of best). */
const HOURLY_JITTER_BASE_RATIO = 0.88;
/** Divisor turning a 0..99 bucket into a 0.000..0.099 ratio addend. */
const HOURLY_JITTER_SPREAD_DIVISOR = 1000;

/**
 * Derive a deterministic Ozon fallback hourly rate from a city's best
 * known hourly rate. The result is `round(bestHourly * ratio)` where
 * `ratio` lands in the band 0.880..0.979 — picked by `fnv1a(key) % 100`,
 * so the same `key` always maps to the same rate across builds.
 *
 * `key` is caller-supplied (`slug-city-transport` on the build side,
 * bare `slug` on the render side) — the difference is deliberate.
 *
 * @param bestHourly - highest non-Ozon hourly rate in the city
 * @param key        - stable string the jitter bucket is hashed from
 * @returns the rounded fallback hourly rate
 */
export function applyHourlyJitter(bestHourly: number, key: string): number {
	const jitter = fnv1a(key) % HOURLY_JITTER_BUCKETS; // 0..99
	const ratio =
		HOURLY_JITTER_BASE_RATIO + jitter / HOURLY_JITTER_SPREAD_DIVISOR; // 0.880..0.979
	return Math.round(bestHourly * ratio);
}

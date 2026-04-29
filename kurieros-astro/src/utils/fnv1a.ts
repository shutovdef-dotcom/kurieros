// FNV-1a 32-bit hash for deterministic, lightweight pseudo-randomness.
// Used to derive a stable jitter from a string key (e.g. slug-city-transport)
// so the same input always maps to the same output across builds.
//
// Not cryptographic — DO NOT use for anything security-sensitive.
// Range: returns a non-negative 32-bit integer in [0, 2^31 - 1].
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

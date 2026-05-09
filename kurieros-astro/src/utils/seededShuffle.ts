// Deterministic shuffle for stable, per-build content ordering.
//
// Used wherever we want a "random-looking" but reproducible order
// across builds — e.g. picking 3 reviews for the home page, picking
// banner rotations, or any other content that should not flicker on
// each rebuild.
//
// Pipeline:
//   1. fnv1a(seed) → 32-bit unsigned integer
//   2. mulberry32(uint32) → PRNG yielding numbers in [0, 1)
//   3. Fisher-Yates shuffle driven by that PRNG
//
// Returns a NEW array — input is never mutated (see ../../.claude/
// rules/common/coding-style.md → "Immutability").
//
// Not cryptographic — DO NOT use for anything security-sensitive.

import { fnv1a } from './fnv1a';

/**
 * mulberry32 — small, fast, statistically-decent 32-bit PRNG.
 * Reference: https://gist.github.com/tommyettinger/46a3b3017f1b3c4d8e10
 */
function mulberry32(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/**
 * Returns a new array with `items` shuffled deterministically using
 * `seed`. Same seed + same input → same output, every build.
 *
 * @example
 *   seededShuffle(reviewsData, 'reviews-home')
 *   seededShuffle(banners, `${city}-${transport}`)
 */
export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
	const out = [...items];
	const rng = mulberry32(fnv1a(seed));
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[out[i], out[j]] = [out[j], out[i]];
	}
	return out;
}

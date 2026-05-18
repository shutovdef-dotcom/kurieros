/**
 * Reviews catalogue — validated and bucketed ONCE at module load.
 *
 * `reviews.json` is the 9.5 MB / 19,144-row generated review dataset
 * (`scripts/generate-reviews.ts`, also appended to by user-submitted
 * reviews). Per the v2 H5 boundary it is validated with a Zod schema
 * at build time rather than rendered through `any[]`.
 *
 * Astro compiles every non-`import` frontmatter statement into the
 * per-page render function, so a `z.array(reviewSchema).parse(...)`
 * written inside a `.astro` frontmatter re-runs once per generated
 * page. `<ReviewsBlock>` renders on all 4,786 `/v/` pages plus the
 * home page, so the parse fired ~4,787× per build — re-validating the
 * full 19k-row dataset every time. Only `import` statements are
 * genuinely module-scoped.
 *
 * This module performs the Zod parse at module scope (once) and also
 * pre-builds `reviewsByJobId` so per-page consumers do an O(1) Map
 * lookup instead of an O(19k) `.filter()`. The results are
 * module-cached and shared across every page that imports them. It
 * mirrors `./citiesIndex` for the city-catalogue projection.
 *
 * Audit ref v5: P-H1.
 */

import { z } from 'zod';
import reviewsRaw from '../data/reviews.json';

/** Shape of a single review record. A renamed/missing field would
 *  otherwise reach the render loop as `undefined` with zero
 *  compile-time signal (and `renderStars(rating)` would silently
 *  `parseFloat(undefined) → NaN`). */
export const reviewSchema = z.object({
  id: z.number(),
  jobId: z.number(),
  company: z.string(),
  jobTitle: z.string(),
  name: z.string(),
  city: z.string(),
  pros: z.string(),
  cons: z.string(),
  comment: z.string(),
  rating: z.number(),
  date: z.string(),
});

export type Review = z.infer<typeof reviewSchema>;

/** Full review dataset, validated once at module load and shared
 *  across every page that imports this binding. */
export const reviewsData: Review[] = z.array(reviewSchema).parse(reviewsRaw);

/** Reviews bucketed by `jobId`, built once at module load. Lets a
 *  per-page consumer replace an O(19k) `.filter()` with an O(1)
 *  lookup. */
export const reviewsByJobId: ReadonlyMap<number, Review[]> = (() => {
  const map = new Map<number, Review[]>();
  for (const review of reviewsData) {
    const bucket = map.get(review.jobId);
    if (bucket) {
      bucket.push(review);
    } else {
      map.set(review.jobId, [review]);
    }
  }
  return map;
})();

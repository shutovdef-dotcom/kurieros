/**
 * Decision A — canonical override map for the 4 category-facet pages whose
 * content is fully subsumed by the corresponding transport-hub page.
 *
 * Keys:   bare category slugs as found in CATEGORIES[n].slug (data.slug in
 *         [slug].astro) — NOT the full route params.slug like
 *         "rabota-kurerom-peshkom".
 * Values: hub root paths with trailing slash, matching the site's
 *         `trailingSlash: 'always'` convention.
 *
 * OQ#6: na-samokate, svobodny-grafik, vecherom, nochyu, na-vyhodnye deferred
 */

export const CATEGORY_CANONICAL_HUB: Readonly<Record<string, string>> = {
  peshkom:         '/rabota-peshim-kurerom/',
  'na-avto':       '/rabota-avtokurerom/',
  'na-velosipede': '/rabota-velokurerom/',
  podrabotka:      '/podrabotka-kurerom/',
  // OQ#6: na-samokate, svobodny-grafik, vecherom, nochyu, na-vyhodnye deferred
};

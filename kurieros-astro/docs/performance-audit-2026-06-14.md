# Performance Audit — 2026-06-14

Scope: code/runtime performance only. No vacancy copy, slugs, domains, DNS, or
referral identifiers were changed.

## Baseline

Commands:

```sh
npm run build
npm test
npm run lint
npm run typecheck
npm run test:coverage
/usr/bin/time -l npm run bench:city-neighbours
node --cpu-prof --cpu-prof-dir .perf-profile --expose-gc --import tsx scripts/perf/bench-city-neighbours.ts
```

Observed results:

- Build: 8702 pages in 53.44s.
- Tests: 671 passed, 4 skipped.
- Coverage: statements 93.9%, branches 82.2%, functions 92.72%, lines 95.21%.
- `bench:city-neighbours`: 923 cities, 40 iterations, p50 39.443ms, p95 52.457ms, p99 61.427ms, peak heap delta 13.124 MB, p95 threshold 150ms.
- `/usr/bin/time -l bench:city-neighbours`: 3.20s real, max RSS 199,917,568 bytes.

## HTML Size Snapshot

- `dist/index.html`: 539,612 bytes.
- `dist/rabota-kurerom-podrabotka/index.html`: 444,707 bytes.
- `dist/rabota-kurerom-na-avto/index.html`: 451,930 bytes.
- `dist/rabota-kurerom-peshkom/index.html`: 423,258 bytes.
- `dist/rabota-kurerom-ezhednevnaya-oplata/index.html`: 397,020 bytes.
- `dist/v/ozon-courier-moskva-auto/index.html`: 291,871 bytes.

Largest HTML pages:

- `dist/companies/kuper-ex-sbermarket/index.html`: 2,186,608 bytes.
- `dist/companies/alfa-bank/index.html`: 1,871,991 bytes.
- `dist/companies/efin/index.html`: 1,203,004 bytes.
- `dist/companies/t-bank/index.html`: 1,167,613 bytes.

Largest bundled JS:

- `dist/_astro/compare.astro_astro_type_script_index_0_lang.*.js`: 99,062 bytes.

## CPU Profile

The `city-neighbours` CPU profile is dominated by distance math, as expected:

- `haversineKm` in `src/utils/geoDistance.ts`.
- `buildNeighbours` in `scripts/perf/bench-city-neighbours.ts`.
- `nearestByDistance` in `src/utils/geoDistance.ts`.

The existing bounded top-k implementation is healthy: p95 is roughly one third
of the current 150ms guardrail.

## Opportunity Matrix

| Candidate | Impact | Confidence | Effort | Decision |
|---|---:|---:|---:|---|
| Company pages initial HTML weight | High | High | Medium | Do not change in this pass. Requires product/SEO choice: keep every company job in initial HTML or add company-specific lazy batches. |
| City-neighbour lookup | Medium | High | Done | Existing benchmark guard passes with p95 52.457ms. |
| Vacancy detail `selectTopN` helpers | Medium | High | Done | Pure bounded top-N is extracted and covered by parity tests. |
| GA4 delegated listeners | Low | Medium | Done | Event delegation is lightweight; no per-card listeners added. |

## Proposed Follow-Up

The next performance change worth implementing is company-page lazy batching:
render the first 24-48 company jobs in initial HTML and expose the rest via a
static company batch endpoint. Isomorphism proof target: the ordered job list
must remain identical after loading all batches, and every job detail page must
remain linked from either initial HTML or a deterministic batch endpoint.

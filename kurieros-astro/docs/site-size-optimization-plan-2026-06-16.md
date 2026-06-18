# Site size optimization plan, 2026-06-16

## Goal

Reduce the generated `dist/` footprint without reducing the SEO catalogue,
changing vacancy content, changing slugs, or removing useful landing pages.

The strategy is to remove duplicated bytes repeated across thousands of static
HTML files first, then consider heavier representation changes for technical
fragment routes.

## Current baseline

Measured from the local `dist/` before this plan:

- `dist/`: about `1.8 GB`.
- `dist/v/`: about `1.3 GB`.
- `dist/api/`: about `256 MB`.
- `dist/vacancy-translations/`: about `57 MB`.
- Vacancy detail pages: `5011` generated HTML pages.
- API HTML fragments: `3041` generated HTML files.
- Total HTML files: `9124`.

Representative page measurements:

| File | Total HTML | Inline CSS | Inline script |
| --- | ---: | ---: | ---: |
| `dist/v/qlean-cleaner-moskva-service/index.html` | `254,463` bytes | `96,954` bytes | `66,092` bytes |
| `dist/v/yandex-eda-courier-moskva-foot/index.html` | `259,932` bytes | `96,954` bytes | `67,411` bytes |
| `dist/companies/kuper-ex-sbermarket/index.html` | `529,780` bytes | `54,000` bytes | `386,828` bytes |
| `dist/podrabotka-kurerom/index.html` | `368,617` bytes | `69,252` bytes | `48,588` bytes |
| `dist/index.html` | `483,622` bytes | `103,050` bytes | `71,457` bytes |

Current Astro config forces CSS duplication:

```js
build: {
  format: 'directory',
  inlineStylesheets: 'always'
}
```

Astro 6.3.3 supports `inlineStylesheets: 'always' | 'auto' | 'never'`.

## Non-goals

- Do not reduce the number of vacancy pages.
- Do not remove city/category/company/guide pages for size reasons.
- Do not change vacancy copy, salaries, partner links, domain, DNS, email,
  referral identifiers, canonical URLs, or slugs.
- Do not manually edit `dist/`.

## Phase 1: externalize CSS

Status: completed on 2026-06-16.

Change:

- Set `build.inlineStylesheets` to `'never'` in `astro.config.mjs`.
- Keep `build.format: 'directory'`.
- Add/adjust build-output tests so generated pages are guarded against
  reintroducing large inline style blocks.

Expected impact:

- Remove roughly `95 KB` of duplicated CSS from each vacancy detail page.
- With `5011` vacancy pages, expected raw saving is about `450-500 MB` from
  vacancy pages alone.
- Additional savings should apply to listing, company, guide, and content
  pages that currently inline shared CSS.
- Browser cache improves because shared `_astro/*.css` assets are downloaded
  once per deploy instead of repeated in every HTML document.

Risks:

- First page view may require an additional CSS request.
- If a hosting/CDN layer serves stale HTML with missing new CSS assets, pages
  can briefly render unstyled.
- Any test that assumed inline CSS must be updated to assert the new invariant.

Acceptance:

- `npm run build` passes.
- Representative vacancy page keeps all expected external stylesheet links.
- Representative vacancy page inline CSS is near zero or at least below `8 KB`.
- `dist/_astro/*.css` exists.
- Key routes return `200` in local preview.
- Browser smoke confirms pages are styled on homepage, listing, company, and
  vacancy routes.

Actual result:

| Metric | Before | After Phase 1 |
| --- | ---: | ---: |
| `dist/` | `1.8 GB` | `1.3 GB` |
| `dist/v/` | `1.3 GB` | `867 MB` |
| `dist/api/` | `256 MB` | `237 MB` |
| `dist/_astro/` | tiny JS-only output | `428 KB` shared CSS/JS assets |
| Generated pages | about `9124` HTML files | `9123` pages in Astro build output |

Representative post-change page measurements:

| File | Total HTML | Inline CSS | Inline script | External CSS links |
| --- | ---: | ---: | ---: | ---: |
| `dist/v/qlean-cleaner-moskva-service/index.html` | `177,776` bytes | `0` bytes | `66,092` bytes | `7` |
| `dist/v/yandex-eda-courier-moskva-foot/index.html` | `185,056` bytes | `0` bytes | `67,411` bytes | `7` |
| `dist/companies/kuper-ex-sbermarket/index.html` | `540,070` bytes | `0` bytes | `386,828` bytes | `5` |
| `dist/podrabotka-kurerom/index.html` | `336,038` bytes | `0` bytes | `48,588` bytes | `8` |
| `dist/index.html` | `426,223` bytes | `0` bytes | `71,457` bytes | `9` |

Notes:

- The largest confirmed win is the vacancy catalogue: `dist/v/` fell by about
  `450-500 MB` without reducing the number of vacancy pages.
- API fragments also got smaller because their repeated scoped CSS is no
  longer inlined.
- Inline script is now the next largest repeated byte source, especially on
  company pages and vacancy detail pages.

## Phase 2: externalize repeated inline scripts

Status: partially completed on 2026-06-16.

Candidates:

- Header/bottom navigation behavior.
- Vacancy sticky apply behavior.
- Vacancy share behavior.
- Vacancy sidebar calculator behavior.
- Any repeated page-independent modal/controller code still using
  `is:inline`.

Keep inline intentionally:

- Critical anti-FOUC theme bootstrap in `BaseLayout.astro`.
- Small per-page JSON-LD blocks.
- Per-page or per-build JSON config where externalization would add more
  complexity than it saves.

Expected impact:

- Reduce duplicated inline script bytes on vacancy pages.
- Current representative vacancy pages carry about `66-67 KB` inline script.
- Not all of that is safely removable, but moving repeated controllers to
  bundled modules may save `150-250 MB` raw across the full static output.

Completed substep:

- Converted the shared `Header.astro` controller from `is:inline` to a bundled
  Astro script. This covers color-mode toggle behavior, compare badges, and
  the mobile bottom-nav vacancy reveal dispatch.
- Kept the critical theme bootstrap in `BaseLayout.astro` inline, so first
  paint still receives the stored/system color mode before bundled scripts run.
- Added a build-output guard that representative pages do not inline the
  repeated Header controller.

Actual result after this substep:

| Metric | After Phase 1 | After Header controller externalization |
| --- | ---: | ---: |
| `dist/` | `1.3 GB` | `1.3 GB` |
| `dist/v/` | `867 MB` | `840 MB` |
| Representative vacancy inline JS | `66,092` bytes | `60,875` bytes |
| Representative listing inline JS | `48,588` bytes | `43,371` bytes |
| Representative homepage inline JS | `71,457` bytes | `66,240` bytes |

Remaining high-value script candidates:

- `kurieros-i18n-config` JSON is still about `9.3 KB` per full page.
- `OzonLeadModal` controller is still about `6.9 KB` per full page.
- Vacancy detail share/sidebar/sticky scripts still repeat across vacancy pages.
- Large company-page JSON-LD remains the dominant inline block on some company
  pages; optimize only after an SEO schema review.

Risks:

- Runtime regressions in compare state, sticky CTA, lead modal, share UI,
  calculator, language switching, or analytics events.
- Anti-FOUC regressions if theme bootstrap is moved too aggressively.

Acceptance:

- Scripts that do not need page-specific data are bundled modules.
- Parity tests or smoke tests cover key selectors/events.
- Browser smoke confirms vacancy apply/share/calculator/sticky behavior.
- Build output tests guard against reintroducing large repeated inline scripts
  where practical.

## Phase 3: optimize technical HTML fragments

Status: planned, higher risk.

Candidates:

- `/api/grid/[citySlug]/`
- `/api/grid-batch/[listingSlug]/[page]/`
- `/api/company-vacancies/[companySlug]/[page]/`

Options:

1. Keep HTML fragments but make their card markup smaller.
2. Serve JSON and render cards client-side.
3. Reduce the number of prebuilt batch fragments by changing batch size.
4. Split crawler-facing links from interactive rich-card markup.

Preferred first experiment:

- Keep HTML fragments, because they preserve current no-template-duplication
  and sanitizer architecture.
- Measure exact repeated bytes in fragment cards before considering JSON.

Risks:

- JSON rendering would duplicate `JobCard` templates in JavaScript or require a
  new client renderer, increasing maintenance and XSS review surface.
- Larger batch sizes reduce file count but increase per-request payloads.
- Smaller card markup can hurt UX or SEO if user-visible content disappears.

Acceptance:

- `JobCard` and company vacancy ordering remain deterministic.
- Loading all batches reproduces the same ordered list as the source data.
- Fragment routes stay out of sitemap and blocked in `robots.txt`.
- Mobile and desktop reveal-more flows still work.

## Phase 4: translation assets

Status: deferred.

Current weight:

- `dist/vacancy-translations/`: about `57 MB`.

This is not the first priority because it is much smaller than duplicated HTML
in `dist/v/` and the technical fragments in `dist/api/`.

Possible later work:

- Audit per-language/source fragment sizes.
- Add compression-aware deploy settings if the host supports it.
- Consider shared defaults/delta encoding only if current fragment shape still
  carries large repeated strings after Phase 1 and Phase 2.

## Verification checklist

After each implemented phase:

```sh
npm run build
npm test
npm run lint
npm run typecheck
npm run check:worker
npm run check:perf
git diff --check
```

For Phase 1 and Phase 2, also verify local preview:

- `/`
- `/v/qlean-cleaner-moskva-service/`
- `/podrabotka-kurerom/`
- `/companies/kuper-ex-sbermarket/`
- `/api/grid/moskva/`
- `/api/grid-batch/podrabotka-kurerom/2/`
- `/api/company-vacancies/kuper-ex-sbermarket/2/`

## Phase 1 verification log

Executed on 2026-06-16 for Phase 1 and the Header-controller Phase 2 substep:

- `npm run build` passed; Astro reported `9123 page(s) built`.
- `npm run lint` passed.
- `npm run typecheck` passed with `0 errors`, `0 warnings`, `0 hints`.
- `npm run test` passed: `49` files passed, `1` skipped; `710` tests passed,
  `4` skipped after Phase 1. After the Header-controller substep, `711` tests
  passed and `4` skipped.
- Targeted build-output tests passed:
  `npx vitest run tests/build-output.test.ts tests/companyVacancyBatches.test.ts`.
- `npm run check:perf` passed when run alone:
  final `p95Ms: 69.471`, threshold `150`.
- `git diff --check` passed.
- Local preview returned `200` for `/`, `/podrabotka-kurerom/`,
  `/v/qlean-cleaner-moskva-service/`, and
  `/companies/kuper-ex-sbermarket/`.
- Visual browser QA passed in Chrome and WebKit for mobile `390x844`, tablet
  `768x1024`, and desktop `1366x768` on the same representative routes.
  Report:
  `output/visual-browser-qa/20260615T213852Z/report.md`.
- Header interaction smoke passed in Chrome:
  theme toggle changed `dark-mode` and updated `body.dataset.colorMode` to
  `dark`; mobile bottom-nav `Вакансии` dispatched
  `kurieros:reveal-more-jobs` on `/podrabotka-kurerom/`.
- Representative screenshots from that QA run were visually inspected; pages
  were styled, non-blank, and had no obvious layout break from external CSS.

## Success metric

The practical target is to reduce local `dist/` from about `1.8 GB` to about
`1.0-1.2 GB` without changing catalogue size or user-facing content.

Phase 1 plus the low-risk Header-controller externalization reduced `dist/` to
about `1.3 GB` and `dist/v/` to `840 MB`, capturing the largest safe win.
Reaching the `1.0-1.2 GB` band likely requires deeper Phase 2 inline-script
externalization and/or Phase 3 fragment optimization.

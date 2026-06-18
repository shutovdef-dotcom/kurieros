# Proposed Code File Reorganization Plan

## Scope

This plan intentionally stays in code-only territory. It does not modify
vacancy copy, generated vacancy content, translations, slugs, domains, DNS,
referral identifiers, or visual UI text.

The first conservative pass around the `workers/ozon-lead` surface has already
been applied in this worktree: the Worker exposes testable helpers, has focused
tests, and package scripts include Worker checks. The next no-brainer
reorganization is to extract pure vacancy-detail computations from
`src/pages/v/[slug].astro`.

Out of scope for this pass:

- Vacancy text, generated vacancy data, translations, slugs, domains, DNS, and
  referral identifiers.
- Visual/UI changes to the Astro site.
- Large `JobGrid.astro` extraction. That remains the next worthwhile
  reorganization, but it needs browser QA because it touches city hot-swap,
  compare state, filters, and lazy batches.

## Current Worker Structure

```text
workers/ozon-lead/
  README.md
  wrangler.toml
  src/
    index.js       # request handling, validation, Ozon submit, Telegram alert
    whitelist.js   # generated Set exports, do not edit by hand
```

`src/index.js` mixes pure helpers with the Cloudflare Worker fetch entrypoint.
That makes the code harder to test without invoking the whole request flow.
It also means Worker regressions are easy to miss because the repository's
Vitest include pattern does not cover `workers/**/*.test.*` today.

## Proposed Structure

```text
workers/ozon-lead/src/
  index.js       # Worker entrypoint only exports default fetch handler + helpers
  whitelist.js   # generated whitelist, unchanged

tests/
  ozonLeadWorker.test.ts
```

For the first pass, do not split files physically yet. Instead, export the
already-pure helper functions from `index.js` so tests can exercise them:

- `formatPhone`
- `corsHeaders`
- `jsonResponse`
- `escapeHtml`
- `submitToOzon`
- `notifyTelegram`

This is a deliberately conservative step. It improves testability without
moving Cloudflare Worker files or touching `wrangler.toml` paths.

## Call-Site Changes

- `workers/ozon-lead/src/index.js`
  - Add named exports to pure helpers.
  - Keep the existing default export shape unchanged for Wrangler.
  - Keep the generated `whitelist.js` import unchanged.

- `tests/ozonLeadWorker.test.ts`
  - Import the Worker default export and helper functions.
  - Test phone normalization, CORS origin behavior, malformed request
    rejection, whitelist rejection, and the missing-secret failure path.
  - Stub `globalThis.fetch` only when a test reaches downstream network code.

- `package.json`
  - Add a focused Worker check script that runs the Worker tests.

## Why This Is The Right First Move

- It addresses a real reliability gap found during the audit: the Worker is
  production code but not part of the normal test surface.
- It avoids risky URL, content, schema, or front-end changes.
- It creates a pattern for future Worker or edge-function code without adding
  nesting or a new framework.
- It keeps the generated whitelist untouched, preserving the Ozon tuple
  contract.

## Follow-Up Reorganization Candidates

1. Extract pure vacancy-detail computations from `src/pages/v/[slug].astro`
   into `src/utils/vacancyPage.ts`:
   - salary and amount parsing;
   - hourly-rate resolution;
   - fallback hourly-rate selection;
   - bounded top-N selection.
   This is safe because these helpers are deterministic and already have clear
   inputs/outputs. The Astro page remains the composition layer.
2. Add `tests/vacancyPage.test.ts` to lock behavioral parity for the extracted
   helpers, including intentionally legacy parsing behavior that affects sort
   order.
3. Split the large `JobGrid.astro` inline controller into a bundled
   `src/scripts/jobGridController.ts`, replacing the hand-copied sanitizer twin
   with the tested sanitizer module.
4. Extract `BaseLayout.astro` i18n runtime into a separately testable browser
   module where Astro constraints allow it.
5. Add a single top-level `npm run check` script that combines test, lint,
   typecheck, Worker tests, and diff checks.

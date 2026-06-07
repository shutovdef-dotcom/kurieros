---
name: visual-browser-qa
description: Use after visual, frontend, routing, content, SEO-rendering, or serious browser-observable functionality changes in this Astro project. Runs cross-browser visual QA against local preview in Google Chrome and Safari/WebKit across desktop, tablet, and especially multiple mobile viewport sizes; checks screenshots, scrolling, console warnings, horizontal overflow, blank screens, and changed user flows before final handoff.
---

# Visual Browser QA

Use this after changes a user can inspect in a browser, especially layout, copy, navigation, listing grids, filters, lazy loading, scroll behavior, popups, cards, headers/footers, or any substantial client-side interaction.

## Workflow

1. Make sure `local-preview-handoff` has already built/refreshed `dist/` and confirmed the preview URL.
2. Pick affected routes. Include the exact page the user is viewing and 1-2 representative sibling routes when a shared component changed.
3. Run the QA runner:

```bash
PATH='/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin' \
QA_BASE_URL='http://127.0.0.1:4323' \
QA_ROUTES='/podrabotka-kurerom/' \
.agents/skills/visual-browser-qa/scripts/run-visual-browser-qa.sh
```

4. Inspect the generated screenshots in `output/visual-browser-qa/<timestamp>/screenshots/`. Do not rely only on automated metrics.
5. For serious interactions, reproduce the changed flow in Chrome and WebKit/Safari proxy after the runner. Examples: click "Показать ещё", change a filter, open/close a modal, scroll down and reload.
6. Fix failures, rerun only the failed browser/viewport/route set, then do a final smoke on the main affected route.

## Required Matrix

Mobile gets priority. If time is constrained, run every mobile viewport in both browsers before desktop.

- Browsers: `chrome` and `webkit`.
- Treat `webkit` as the automatable Safari-engine check. If WebKit is missing, install it once with the runner or `playwright_cli.sh install-browser webkit`; report clearly if installation is blocked.
- Mobile/tablet viewports: `360x740`, `375x667`, `390x844`, `414x896`, `430x932`, `768x1024`.
- Desktop/laptop viewports: `1366x768`, `1440x900`, `1920x1080`.

## Runner Options

- `QA_BASE_URL`: preview origin, default `http://127.0.0.1:4323`.
- `QA_ROUTES`: space-separated routes, default `/`.
- Positional args override `QA_ROUTES`: `run-visual-browser-qa.sh /podrabotka-kurerom/ /rabota-peshim-kurerom/`.
- `QA_BROWSERS`: space-separated browser list, default `chrome webkit`.
- `QA_VIEWPORTS`: space-separated `name:width:height` list for focused reruns.
- `QA_OUT_DIR`: artifact directory. Default is `output/visual-browser-qa/<timestamp>`.
- `QA_HEADED=1`: open visible browser windows for hands-on inspection.
- `QA_AUTO_INSTALL=0`: do not auto-install missing Playwright browsers.

## Acceptance Gates

Do not hand off as "done" while any of these are unresolved:

- Browser console has errors or unexpected warnings.
- Page is blank or main content is missing.
- Horizontal overflow is greater than 2 px on mobile.
- Important text/buttons/cards overlap or are cut off in screenshots.
- Changed interaction fails in Chrome or WebKit.
- Mobile screenshots are not inspected for the affected route.

When a failure is pre-existing or outside scope, say that plainly and include the artifact path.

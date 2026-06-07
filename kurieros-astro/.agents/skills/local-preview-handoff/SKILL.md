---
name: local-preview-handoff
description: Use after any visual, frontend, routing, content, SEO metadata, or browser-observable website change in this Astro project. Ensures the site is built, local preview is running, affected localhost links are verified, and the final response includes the exact URLs the user should open to inspect the change.
---

# Local Preview Handoff

Use this skill after changes the user can inspect in a browser: UI, layout, copy, filters, navigation, routing, page data, SEO tags, sitemap output, API fragments used by pages, or anything visible at `localhost`.

## Workflow

1. Identify affected routes from the changed files.
   - `src/pages/[slug].astro` or `src/components/JobGrid.astro`: include representative listing/hub URLs.
   - Shared layout/header/footer/style changes: include `/` plus one deep page.
   - Component changes used by a specific page type: include 1-3 representative pages.
   - Technical fragments such as `/api/grid-batch/.../` are secondary links; include them only when useful for debugging.

2. Build or refresh `dist/`.
   - Prefer:
     ```bash
     PATH='/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin' npx astro build
     ```
   - Use full `npm run build` only when data-generation inputs or generated artifacts intentionally changed.
   - Do not edit `dist/` manually.

3. Ensure preview is reachable.
   - Check the expected port:
     ```bash
     lsof -nP -iTCP:4323 -sTCP:LISTEN || true
     curl -I http://127.0.0.1:4323/
     ```
   - If it is not running, start:
     ```bash
     PATH='/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin' npm run preview -- --host 127.0.0.1 --port 4323
     ```
   - If `4323` is occupied by something else, use the next free port (`4324`, then `4325`) and make all links use that port.

4. Verify the exact URLs before handing off.
   - Run `curl -I` for each main URL and expect `200`.
   - For visual/interactive changes, use Playwright or the in-app browser to verify the user-visible state or one key interaction.
   - If the user already has a page open, mention whether they should refresh it.

5. Final response format.
   - State that preview is running and give the base URL.
   - Give only the relevant inspection links, not a giant route list.
   - Add one short “what to check” line per link when helpful.
   - Mention failed checks or pre-existing warnings plainly.

## Link Selection Examples

- Job grid/listing changes:
  - `/podrabotka-kurerom/`
  - `/rabota-peshim-kurerom/`
  - `/rabota-avtokurerom/`
- Homepage/shared chrome:
  - `/`
  - `/podrabotka-kurerom/`
- Vacancy card/detail changes:
  - one representative `/v/.../` page
  - one listing containing that card

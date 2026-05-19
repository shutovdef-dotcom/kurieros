# Design Doc — User-Submitted Reviews (`kurerok.ru`)

> Status: DESIGN ONLY — research + architecture. No source code is changed by
> this document. Implementation is broken into beads in §9.
>
> Author scope: this resolves Open Question #4 from `docs/flywheel/plan.md`
> §3.4 ("is `reviews.json` genuine UGC?"). Today it is **not** — it is
> synthetic seed data from `scripts/generate-reviews.ts`. This feature makes a
> *subset* genuine, and that subset (only that subset) earns `Review` JSON-LD.

---

## 1. Goal & end-to-end user workflow

### 1.1 Goal

Let real courier candidates submit real reviews on `kurerok.ru`, display those
real reviews **above** the existing synthetic seed reviews, and, as real
reviews accumulate per brand, phase the synthetic ones out. Only real reviews
get marked up as schema.org `Review` JSON-LD; synthetic reviews remain
display-only. This closes the structured-data-safety gap: today
`companies/[slug].astro` emits `Review` + `AggregateRating` JSON-LD computed
from 100% synthetic data (`src/pages/companies/[slug].astro` lines 77-120),
which is a real Google "misleading structured data" exposure.

### 1.2 Constraint that shapes everything

The site is `output: 'static'` (Astro SSG) on GitHub Pages — **no server, no
database, no runtime write path**. The build is a pure function of the
committed repo. Any user-submitted datum must (a) be captured by external
infrastructure and (b) re-enter the repo as a commit before it can appear on
the site. There is direct precedent: `workers/ozon-lead/` is a Cloudflare
Worker that already accepts a browser form POST and notifies the owner via
Telegram. The reviews feature reuses that pattern.

### 1.3 End-to-end workflow (MVP)

```
1. Candidate visits a page with the review form (e.g. /otzyvy/, a /v/ page).
2. Candidate fills the form (existing ReviewModal.astro fields: name, city,
   pros, cons, comment, rating 1-5) — plus a hidden brand/jobId context.
3. Browser POSTs JSON to a NEW Cloudflare Worker  →  kurerok-reviews.
4. Worker validates input (length caps, rating range, brand whitelist,
   per-IP rate limit), exactly mirroring the ozon-lead Worker's discipline.
5. Worker sends the owner a Telegram message containing the full review text
   and a ready-to-paste JSON object.
6. Browser shows "отзыв отправлен, появится после модерации" (the success
   copy already exists in ReviewModal.astro line 58).
7. Owner reads Telegram, decides approve / reject.
8. On approve: owner pastes the JSON object into a committed file
   (src/data/reviews-real.json) and pushes. CI rebuilds; GitHub Pages
   redeploys.
9. The real review now renders ABOVE synthetic reviews for that brand/job,
   and is included in Review JSON-LD.
```

The only non-automated step is #7-#8 (owner curation). That is deliberate for
the MVP — it is the cheapest possible moderation model and needs zero storage
infrastructure. v2 (§2.4) automates ingestion but keeps a human approval gate.

---

## 2. Architecture

### 2.1 The static-site problem, stated precisely

`reviews.json` is consumed at **build time only**. `src/utils/reviewsIndex.ts`
does `import reviewsRaw from '../data/reviews.json'` and Zod-parses it once at
module load; `ReviewsBlock.astro` reads the resulting `reviewsByJobId` Map.
Nothing reads reviews at runtime. So a new review is invisible until it is
*in the repo at the next build*. There is no way around this without either
(a) adding a runtime data source (rejected — turns a static site into an app)
or (b) a human/automated commit step (chosen).

**Critical build-pipeline fact (verified, must not be missed):**
`package.json` runs `prebuild → generate:data → generate:reviews`, and
`scripts/generate-reviews.ts` ends with `writeFile(reviewsFile, nextContent)`
— it **fully overwrites `src/data/reviews.json` on every build** from
`jobsData`. Therefore **real reviews can NOT be appended to `reviews.json`** —
the next build would erase them. Real reviews must live in a **separate
committed file the generator never touches**. This design uses
`src/data/reviews-real.json`.

### 2.2 The `ozon-lead` pattern (what we are reusing — grounded in code)

`workers/ozon-lead/src/index.js` establishes a reusable shape. The reviews
Worker copies it almost verbatim, minus the Ozon-API leg:

| `ozon-lead` mechanism | Code reference | Reused for reviews? |
|---|---|---|
| CORS allow-list from `ALLOWED_ORIGINS` env | `corsHeaders()`, lines 81-94 | **Yes — verbatim** |
| `OPTIONS` preflight → 204 | lines 208-210 | Yes |
| Method gate (POST only → 405) | lines 211-213 | Yes |
| Path gate (`/lead` only → 404) | lines 214-217 | Yes (path `/review`) |
| Per-IP rate limit, 5/60s, Cloudflare `RATE_LIMITER` binding | lines 219-240; `wrangler.toml` lines 12-16 | **Yes — same binding, tighter limit** |
| `request.json()` wrapped in try/catch → 400 `invalid_json` | lines 242-247 | Yes |
| Field extraction with `String(...).trim().slice(0, N)` length caps | lines 249-263 | **Yes — the core discipline** |
| Format/shape validation before use (`UUID_RE`, `formatPhone`) | lines 55, 72-79, 270-290 | Yes (rating range, brand slug) |
| Whitelist `Set` membership check (`ALLOWED_VACANCIES`) | lines 310-322 | **Yes — brand whitelist** |
| `notifyTelegram()` best-effort, `escapeHtml()`, failure logged not thrown | lines 101-140 | **Yes — verbatim, this is the MVP delivery channel** |
| Secrets via `wrangler secret put`, never in `wrangler.toml` | `wrangler.toml` lines 28-32; README §4 | Yes |
| `{ ok: true }` / `{ ok: false, error }` envelope | `jsonResponse()`, lines 96-99 | Yes |

The reviews Worker is **simpler** than `ozon-lead`: it has no third-party API
to call and no referrer secret to protect. Its entire job is validate →
notify. That makes the MVP genuinely small.

### 2.3 MVP architecture (RECOMMENDED — ship this first)

```
[Browser: ReviewModal form]
   │  POST JSON { name, city, pros, cons, comment, rating, brand, jobId }
   ▼
[Cloudflare Worker: kurerok-reviews]   ← new, ~150 lines, mirrors ozon-lead
   │  • CORS allow-list   • rate limit 3/60s   • validate + length caps
   │  • brand whitelist   • rating ∈ {1..5}
   ▼
[Telegram] ── owner receives review text + a paste-ready JSON object
   ▼
[Owner] manually approves → pastes object into src/data/reviews-real.json → push
   ▼
[GitHub Actions build] reviewsIndex.ts merges reviews-real.json + reviews.json
   ▼
[GitHub Pages] real reviews render above synthetic; real reviews get JSON-LD
```

**No database. No KV. No D1.** Storage is "the owner's Telegram history +
git". The owner is the moderation queue. This is acceptable at low submission
volume (a new site; tens of reviews/month expected) and is identical in spirit
to how Ozon leads are already handled.

**MVP cost:** Cloudflare Workers free tier (100k req/day — README §"Лимиты").
Zero incremental infra cost over what `ozon-lead` already requires.

**MVP weakness (accepted):** if a submission's Telegram message is missed or
deleted, the review is lost — there is no durable store. This is the single
reason v2 exists. It is an acceptable MVP trade because (a) the owner already
relies on Telegram for Ozon leads and (b) losing an occasional unsolicited
review is low-harm. Mitigation in the MVP: the Worker `console.log`s an
audit line for every accepted submission, so Cloudflare's Worker logs (tail)
are a secondary, short-retention record.

### 2.4 v2 architecture (later — when volume justifies it)

Add durable storage and a build-time ingest, keeping the human approval gate:

```
[Browser form] → [Worker /review]
   │  • same validation
   ├─→ writes a row to Cloudflare KV or D1 with status="pending"
   └─→ Telegram notification WITH inline approve/reject buttons
          │
   [Owner taps "approve" in Telegram]
          ▼
   [Telegram webhook → same Worker /moderate route] flips status="approved"
          ▼
   [Build-time ingest step: scripts/ingest-reviews.ts]
     • runs in prebuild, fetches all status="approved" rows via an
       authenticated Worker GET /export (Bearer token = a build secret)
     • merges them into src/data/reviews-real.json
     • optionally commits the file back (GitHub Action with write token)
          ▼
   [Build proceeds as in MVP]
```

**Storage choice for v2 — KV vs D1:**

| | Cloudflare KV | Cloudflare D1 (SQLite) |
|---|---|---|
| Model | key→value, eventually consistent | relational, queryable |
| Fit | fine: key = `review:<uuid>`, value = JSON blob | better if owner ever wants a moderation dashboard with filters |
| List/scan | `list()` by prefix — adequate for export | `SELECT ... WHERE status='pending'` |
| Free tier | 100k reads/day, 1k writes/day | 5M rows read/day, 100k writes/day |
| Recommendation | **Sufficient for v2** — review volume is low, access is "write one / scan all" | Pick only if a query-driven admin UI is also planned |

**Recommendation: ship the MVP, defer v2.** v2 is only justified once
submission volume makes manual Telegram-to-JSON copying tedious (rule of
thumb: >~5 approvals/day) or once a missed review becomes a real complaint.
The MVP and v2 share the same Worker, the same validation, the same
`reviews-real.json` target file and the same front-end — v2 is strictly
additive, so shipping the MVP first incurs no rework.

---

## 3. Data model

### 3.1 The `source` discriminator

Add one field to every review record: **`source: 'real' | 'synthetic'`**.

- `scripts/generate-reviews.ts` is updated to stamp `source: 'synthetic'` on
  every record it generates (one-line change in the returned object).
- Real reviews in `src/data/reviews-real.json` carry `source: 'real'`.
- `reviewSchema` in `src/utils/reviewsIndex.ts` gains:
  `source: z.enum(['real', 'synthetic']).default('synthetic')`.
  The `.default` keeps the schema backward-compatible if any record predates
  the field.

Real reviews also carry provenance metadata that synthetic ones lack and that
moderation needs:

```jsonc
// one element of src/data/reviews-real.json (synthetic placeholder values)
{
  "id": 90000001,            // see §3.2 — disjoint ID range
  "jobId": 100011,           // 0 / null allowed = brand-level, not job-specific
  "company": "Яндекс Еда",   // MUST be a byte-exact reviews.json brand string
  "jobTitle": "",            // optional; "" when brand-level
  "name": "Имя",
  "city": "Город",
  "pros": "...",
  "cons": "...",
  "comment": "...",
  "rating": 4,               // integer 1..5 for real reviews
  "date": "2026-05-19T10:00:00.000Z",  // ISO 8601 UTC, matches reviews.json
  "source": "real",
  "submittedAt": "2026-05-18T22:14:00.000Z",  // ISO 8601, from Worker, audit only
  "moderatedBy": "owner"     // audit only
}
```

`submittedAt` / `moderatedBy` are NOT required by the build. Either extend the
schema with `.optional()` fields or add `.passthrough()` to the schema so
`reviews-real.json` can stay a superset — decided in the bead.

### 3.2 ID collision avoidance

Synthetic IDs are `job.id * 10 + reviewIndex + 1` (`generate-reviews.ts`) —
e.g. `1000111`. Real-review IDs MUST NOT collide. Reserve a disjoint range:
**real-review `id` ≥ 90_000_000**. The ingest/owner assigns the next integer.
A build-time assertion in `reviewsIndex.ts` (`id` uniqueness across the merged
array) catches any mistake loudly.

### 3.3 Merge + real-first sorting

`src/utils/reviewsIndex.ts` becomes the single merge point:

```
import reviewsRaw      from '../data/reviews.json';        // synthetic
import reviewsRealRaw  from '../data/reviews-real.json';   // real (may be [])

const synthetic = z.array(reviewSchema).parse(reviewsRaw);
const real      = z.array(reviewSchema).parse(reviewsRealRaw);
export const reviewsData = [...real, ...synthetic];   // real-first, globally
```

Per-job and per-brand buckets are built from this merged array. Within a
bucket, ordering rule:

1. `source: 'real'` before `source: 'synthetic'` (primary key).
2. Within the same `source`, newest `date` first (secondary key).

This guarantees real reviews always render above synthetic ones in
`ReviewsBlock.astro`, on `/companies/[slug]/`, and on `/otzyvy/`. The current
homepage `seededShuffle` path (`ReviewsBlock.astro` line 38) should be changed
to: show real reviews first (newest), then fill remaining slots from a
`seededShuffle` of synthetic — so the homepage also surfaces genuine UGC as
soon as it exists.

### 3.4 Synthetic phase-out logic

A pure, deterministic, build-time function — call it `applyPhaseOut(bucket)`:

```
THRESHOLD = SYNTHETIC_PHASE_OUT_THRESHOLD   // proposed: 8 (tunable constant)

realCount = bucket.filter(r => r.source === 'real').length
if realCount >= THRESHOLD:
    return bucket.filter(r => r.source === 'real')   // drop all synthetic
else:
    keep all real + enough synthetic to reach a sensible display floor
    (e.g. min 4 visible total, matching today's REVIEWS_PER_JOB density)
```

Properties:
- **Per scope.** Applied per `jobId` bucket for `/v/` pages and per `company`
  bucket for `/companies/` and `/otzyvy/`. A brand with many real reviews
  loses its synthetic ones; a quiet brand keeps them.
- **Monotonic & gradual.** As real reviews accrue, synthetic ones are
  *displaced*, not deleted from the repo. Synthetic data stays in
  `reviews.json` (regenerated anyway) until the owner decides to retire the
  generator entirely (a future, separate decision once most brands cross the
  threshold).
- **Deterministic.** No randomness in the cut — required by the existing "D3:
  reviews must be STABLE across builds" rule (`ReviewsBlock.astro` lines
  19-26).
- **JSON-LD interaction.** Phase-out is about *display*. JSON-LD is governed
  separately by §7 (only `source: 'real'` is ever marked up), so a brand below
  the threshold simply shows a mix but marks up only the real subset.

`THRESHOLD = 8` is a starting value; it lives as a named constant
(`SYNTHETIC_PHASE_OUT_THRESHOLD`) so the owner can tune it. Open Question
OQ-R3.

---

## 4. Where the submission form lives

The form UI already exists: `ReviewModal.astro` (a modal) is opened by any
`.open-review-modal` button, and `ReviewsBlock.astro` already renders an
"Оставить отзыв" button (line 65) carrying `data-job-id`. So "placing the
form" mostly means: deciding which pages expose that button, and rewiring the
modal's submit handler to POST to the Worker.

| Candidate location | Today | Recommendation |
|---|---|---|
| `/v/{slug}` vacancy pages (4 786 pages) | `ReviewsBlock` already mounted with `jobId` (`[slug].astro` line 688) | **YES** — highest-intent surface; reviewer has a concrete job in mind, so `jobId` context is accurate |
| Homepage `/` | `ReviewsBlock` mounted, no `jobId` | **YES** — but submissions here are brand-level (`jobId` null); keep the button |
| `/companies/{slug}` brand pages | Renders reviews, **no submit button today** | **YES — add the button** — natural place for a brand-level review; pre-fills `company`, `jobId` null |
| `/otzyvy/` reviews index (bead 011, planned) | Will render brand sections | **YES — primary destination** — the page is literally about reviews; put a prominent CTA per brand section |

**Recommendation: expose the form on all four**, because the modal is a single
shared component (`ReviewModal.astro`) — incremental cost per page is one
button. The form's hidden context fields differ by page:

- `/v/` page → `jobId` = the job's id, `company` = the job's company (exact
  string), `jobTitle` = job title. Most precise.
- `/companies/` page → `company` = brand (exact string), `jobId` = null.
- `/otzyvy/` per-brand section → `company` = that brand, `jobId` = null.
- Homepage → `company` = null (or a required picker), `jobId` = null. A
  homepage review with no brand is low-value; recommend the homepage modal
  *requires* the user to pick a brand from a `<select>` of the known brand
  list before the form submits.

**Primary destination is `/otzyvy/`** (it is the topical hub and bead 011 is
already planned), but the `/v/` pages will realistically generate the most
submissions because that is where intent is highest.

---

## 5. Moderation & trust

User reviews are **untrusted input**: spam, ad/link injection, profanity,
defamation, competitor sabotage, and payload injection (`</script>`, HTML,
control chars) must all be assumed. Two defense layers: the Worker (automated,
pre-acceptance) and the owner (human, pre-publication).

### 5.1 Worker-side input validation (mirrors `ozon-lead` discipline)

`ozon-lead` already demonstrates every primitive needed — reuse them:

1. **Length caps on every field**, the `String(x).trim().slice(0, N)` pattern
   from `ozon-lead` lines 255-263. Proposed caps:
   - `name` 2-60 chars (reject `< 2` → `name_too_short`, the exact check at
     `ozon-lead` line 277; cap upper like line 284).
   - `city` 2-60.
   - `pros` / `cons` 0-600 each.
   - `comment` 10-2000 (require a real comment — it is the `Review.reviewBody`
     source).
   - `company` ≤ 80, `jobTitle` ≤ 200.
2. **`rating`** — coerce to number, reject unless an integer in `1..5`
   (`invalid_rating`). Same spirit as `ozon-lead`'s `UUID_RE` shape gate
   (line 55, 270-275): validate shape *before* use.
3. **`jobId`** — if present, must be a positive integer ≤ a sane bound;
   else null.
4. **Brand whitelist** — `company` must be one of the ~8 known
   `reviews.json` brand strings, checked against a `Set` exactly like
   `ALLOWED_VACANCIES.has(...)` (`ozon-lead` lines 310-315). A submission for
   an unknown brand is rejected (`invalid_company`). This both blocks junk and
   guarantees the review can be grouped by `companiesIndex` / `reviewsByJobId`.
5. **Character / injection hygiene** — strip control chars; cap consecutive
   newlines. Note: HTML/`</script>` is *not* dangerous at submission time
   because Astro auto-escapes `{expression}` slots and `BaseLayout` serializes
   JSON-LD via `JSON.stringify` (plan §8 "set:html prohibition", bead 011
   edge-cases). Still strip obvious markup to keep the Telegram message and
   the eventual JSON clean.
6. **`request.json()` in try/catch** → 400 `invalid_json` (`ozon-lead`
   242-247).
7. **CORS allow-list** — `corsHeaders()` verbatim; only `https://kurerok.ru`
   (+ `www`) may POST from a browser.
8. **Cheap spam heuristics (best-effort, soft):** reject if `comment`
   contains a URL (`http`, `://`, `www.`, `t.me/`, `@`-handles) or is mostly
   non-Cyrillic — couriers write in Russian; link-bearing reviews are ~always
   spam. Borderline cases still go to the owner. A simple honeypot field
   (a hidden input real users never fill) is a cheap bot filter and should be
   added to the form + checked by the Worker.

### 5.2 Rate limiting

Reuse the Cloudflare `RATE_LIMITER` unsafe binding from
`workers/ozon-lead/wrangler.toml` (lines 12-16) and the `env.RATE_LIMITER`
guard block from `ozon-lead/src/index.js` lines 219-240 **verbatim**, with a
**tighter limit**: reviews are not time-sensitive, so **3 submissions / 60 s
per IP** (vs. 5 for leads). Keyed on `CF-Connecting-IP`. The same caveat the
`wrangler.toml` comment notes applies (beta, eventually consistent, first
burst may slip) — acceptable: the owner is still the final gate.

### 5.3 Moderation model

- **MVP:** every accepted submission becomes a Telegram message containing the
  full review and a paste-ready JSON object (§6). The owner reads it and
  decides. Approve = paste into `reviews-real.json` + push. Reject = ignore.
  No state machine, no storage. This is the same human-in-the-loop model
  `ozon-lead` already uses for leads.
- **v2:** Telegram inline buttons (approve/reject) write a `status` back to KV
  via a `/moderate` Worker route (Telegram webhook). The build-time ingest
  pulls only `approved` rows. Still a human gate — automation only removes the
  copy-paste, never the judgment.
- **Editorial guidance for the owner (belongs in the Worker README):** reject
  reviews that name individuals, contain unverifiable specific accusations,
  contain contact info, or are obviously fake/duplicated. Light typo fixes are
  fine; do not invent content. Keep the review's `date` realistic.

### 5.4 Trust signaling on-page

`/otzyvy/` already plans an honest-content disclaimer (bead 011 §5). Once real
reviews exist, refine it: real reviews may carry a subtle "отзыв пользователя"
marker; the page disclaimer should state that real reviews are user-submitted
and lightly moderated, and that legacy/sample reviews are shown for context.
Exact copy is OQ-R5.

---

## 6. How approved real reviews flow into the static build

### 6.1 MVP flow (manual, deliberate)

1. Worker's Telegram message is **paste-optimized**. It contains the review
   in human-readable form *and* a fenced JSON object already shaped for
   `reviews-real.json` — every field filled except `id` (owner assigns) and
   with `date` defaulted to "now". Example message body:

   ```
   🆕 Новый отзыв на kurerok.ru
   👤 Андрей · Москва · ★★★★☆ (4)
   💼 Яндекс Еда — jobId 100011
   ➕ Плюсы: ...
   ➖ Минусы: ...
   💬 ...
   ──────────
   Вставить в src/data/reviews-real.json:
   { "id": <СЛЕДУЮЩИЙ>, "jobId": 100011, "company": "Яндекс Еда",
     "jobTitle": "...", "name": "Андрей", "city": "Москва",
     "pros": "...", "cons": "...", "comment": "...",
     "rating": 4, "date": "2026-05-19T10:00:00.000Z", "source": "real" }
   ```

   This is the `escapeHtml` + templated-message technique from
   `ozon-lead`'s `notifyTelegram()` (lines 105-122), extended with a
   code-block payload.

2. Owner appends the object to the `src/data/reviews-real.json` array, assigns
   the next `id` (≥ 90_000_000), commits, pushes.

3. `git push` triggers the existing GitHub Actions build. `prebuild` runs
   `generate-reviews.ts` (regenerates `reviews.json` — untouched by this) and
   then the build imports both files via `reviewsIndex.ts` (§3.3).

4. GitHub Pages redeploys. The real review now renders real-first and is in
   JSON-LD.

`src/data/reviews-real.json` ships in the repo initialized as `[]`. Because
`generate-reviews.ts` only writes `reviews.json`, this file is **safe from the
generator** — that is the whole reason it is a separate file.

### 6.2 v2 flow (semi-automated)

Add `scripts/ingest-reviews.ts`, run in `prebuild` (before `astro build`):
it authenticates to the Worker's `GET /export` route with a build-time Bearer
secret, pulls all `status:'approved'` rows, dedupes by `id`, and rewrites
`src/data/reviews-real.json`. A GitHub Action with a write-scoped token then
commits the refreshed file (or the ingest writes it as an untracked build
input and a scheduled Action commits it daily). The human approval still
happens in Telegram; ingestion just removes manual copy-paste.

### 6.3 Why a separate file (not appending to `reviews.json`)

Stated again because it is the most likely implementation mistake:
`scripts/generate-reviews.ts` does `writeFile(reviewsFile, nextContent)` on
every `prebuild`/`pregenerate`/`predev` run — it **overwrites** `reviews.json`
wholesale. Any real review appended there is destroyed at the next build.
`reviews-real.json` is never written by the generator. (If a single-file model
is ever required, `generate-reviews.ts` must instead *merge* — read existing
real rows, regenerate synthetic rows, write the union — which is strictly more
fragile than two files. Two files is the recommendation.)

---

## 7. JSON-LD — real reviews marked up, synthetic display-only

### 7.1 The problem this solves

Today `src/pages/companies/[slug].astro` builds `reviewSchemas` (`@type:
'Review'`) and an `aggregateRating` (lines 77-120) from `company.reviews` —
which is **100% synthetic data**. Emitting `Review`/`AggregateRating` for
fabricated reviews is exactly the "misleading structured data" case Google's
review-snippet policy prohibits, and it is plan Open Question #4. Bead 011 for
`/otzyvy/` was deliberately written conservative because of this.

### 7.2 The rule

**A review is eligible for `Review` JSON-LD if and only if
`source === 'real'`.** Concretely:

- **`/companies/[slug]/`** — change `reviewSchemas` to be built only from
  `featuredReviews.filter(r => r.source === 'real')`. If a brand has zero real
  reviews, emit **no** `review` array and **no** `aggregateRating` on the
  `Organization` node. Synthetic reviews still render visually (they are
  display content), they are just absent from structured data.
- **`AggregateRating`** — compute `ratingValue` / `reviewCount` from the
  **real subset only**. A brand with 3 real reviews gets an `aggregateRating`
  over those 3, not over 3 real + 200 synthetic. Apply a
  `MIN_REAL_REVIEWS_FOR_AGGREGATE` floor (proposed 3, consistent with bead
  011's `MIN_REVIEWS_PER_BRAND`) so a single review can't mint an
  `AggregateRating`. Below the floor: no `aggregateRating` node at all.
- **`/otzyvy/`** (bead 011) — same: per-brand `Organization` +
  `aggregateRating` + bounded `Review[]` only over `source: 'real'` reviews
  meeting the floor. This *tightens* bead 011's already-conservative Decision
  C: the gate becomes "has a company page AND has ≥3 real reviews".
- **`/v/{slug}`** — vacancy pages do not currently emit `Review`/`Rating`
  JSON-LD (`buildJobPostingSchema` only). If a future change adds review
  markup there, the same `source === 'real'` gate applies.
- **Honest-content guards from bead 011 still hold**: clamp `ratingValue` to
  `[1,5]`, never emit `NaN`/`0`/`Infinity`/`>5`, escape `</script>`.

### 7.3 Why this resolves the safety concern

After this change, every `Review` and `AggregateRating` node the site emits
corresponds to a genuine, owner-moderated, user-submitted review. Synthetic
reviews remain on-page as visual/UX content (clearly framed by the disclaimer)
but contribute **nothing** to structured data — so there is no fabricated
structured data anywhere. The site moves from "marks up 19 144 fake reviews"
to "marks up only what is real," which is the compliant state. It also makes
the rich-result eligibility *grow honestly*: as real reviews accumulate, more
brands cross the `MIN_REAL_REVIEWS_FOR_AGGREGATE` floor and legitimately gain
star snippets.

This is a behavior change to existing pages, so it is a distinct bead (B-R8)
and the owner should be told it may *remove* currently-emitted (illegitimate)
rich-result markup until real reviews accumulate — a correction, not a
regression.

---

## 8. Infrastructure the owner must set up

The owner already did the equivalent for `ozon-lead`, so this is familiar.
Explicit checklist:

### 8.1 MVP — required

1. **Cloudflare account** — free plan. Already exists if `ozon-lead` is
   deployed; reuse it. (`workers/ozon-lead/README.md` §2.)
2. **`wrangler` CLI** — `npm install -g wrangler` then `wrangler login`
   (README §1). Already installed if `ozon-lead` was deployed.
3. **Create the new Worker directory** `workers/reviews/` with its own
   `wrangler.toml` (`name = "kurerok-reviews"`), `src/index.js`,
   `src/brands.js` (the brand whitelist `Set`), and `README.md`.
4. **Deploy:** `cd workers/reviews && wrangler deploy` → yields
   `https://kurerok-reviews.<account>.workers.dev`.
5. **Telegram** — the `ozon-lead` bot can be **reused**. Decide: same chat
   (review alerts mixed with lead alerts) or a separate chat/topic (cleaner).
   Recommend a **separate chat or a Telegram topic** so review moderation is
   not buried under lead alerts.
6. **Worker secrets** (`wrangler secret put`, never in `wrangler.toml` — same
   rule as `ozon-lead/wrangler.toml` lines 28-32):
   - `TELEGRAM_BOT_TOKEN` — same bot token as `ozon-lead`.
   - `TELEGRAM_CHAT_ID` — destination chat/topic for review alerts.
7. **Rate-limiter binding** — copy the `[[unsafe.bindings]]` block from
   `ozon-lead/wrangler.toml` (a distinct `namespace_id`, e.g. `1002`;
   `limit = 3, period = 60`).
8. **`[vars]`** in `wrangler.toml` — `ALLOWED_ORIGINS =
   "https://kurerok.ru,https://www.kurerok.ru"`.
9. **GitHub Actions Variable** — add `PUBLIC_REVIEWS_API =
   https://kurerok-reviews.<account>.workers.dev/review` (mirrors how
   `PUBLIC_OZON_LEAD_API` is wired — `ozon-lead/README.md` §5). The front-end
   reads it via `import.meta.env.PUBLIC_REVIEWS_API`.
10. **Seed file** — commit `src/data/reviews-real.json` containing `[]`.
11. **Trigger a redeploy** of `kurerok.ru` so the build picks up
    `PUBLIC_REVIEWS_API` (empty-commit trick, `ozon-lead/README.md` §5).

### 8.2 v2 — additional

12. **KV namespace** (if KV chosen): `wrangler kv namespace create
    REVIEWS_KV`, add the returned `id` as a `[[kv_namespaces]]` binding in
    `workers/reviews/wrangler.toml`. (Or `wrangler d1 create kurerok-reviews`
    + a `[[d1_databases]]` binding + a schema migration if D1 chosen.)
13. **Build-export secret** — a shared Bearer token: `wrangler secret put
    EXPORT_TOKEN` on the Worker, and the same value as a GitHub Actions
    **secret** `REVIEWS_EXPORT_TOKEN` for `scripts/ingest-reviews.ts`.
14. **Telegram webhook** — register the bot's webhook to the Worker's
    `/moderate` route so inline approve/reject buttons work
    (`setWebhook` API call, one-time).
15. **GitHub Actions write permissions** — if the ingest auto-commits
    `reviews-real.json`, the workflow needs `permissions: contents: write` and
    a scheduled trigger.

### 8.3 Secret rotation

Same procedure as `ozon-lead/README.md` §"Ротация секретов": revoke via
`@BotFather`, `wrangler secret put TELEGRAM_BOT_TOKEN` — picked up without
redeploy.

---

## 9. Bead-style work breakdown

Beads are self-contained tasks. Dependencies in parentheses. Suggested IDs use
the `B-R*` (reviews) namespace so they don't clash with the plan's beads.

| Bead | Title | Deliverable | Depends on |
|---|---|---|---|
| **B-R1** | Reviews Worker — skeleton | `workers/reviews/{wrangler.toml, src/index.js, README.md}`. CORS, OPTIONS/POST/path gates, `request.json()` guard, `{ok}` envelope — copied from `ozon-lead`. Path `/review`. No business logic yet. | — |
| **B-R2** | Worker — input validation | Field extraction with length caps; `rating` 1-5 integer check; `jobId` check; control-char strip; spam/URL heuristic; honeypot check. Mirrors `ozon-lead` lines 249-290. | B-R1 |
| **B-R3** | Worker — brand whitelist | `workers/reviews/src/brands.js` exporting `ALLOWED_BRANDS` `Set` of the ~8 byte-exact `reviews.json` brand strings; membership check (`ozon-lead` lines 310-315). Document how the list is kept in sync with `reviews.json`. | B-R1 |
| **B-R4** | Worker — rate limit | `RATE_LIMITER` unsafe binding in `wrangler.toml` (new `namespace_id`, 3/60s) + the guarded limit block from `ozon-lead` lines 219-240. | B-R1 |
| **B-R5** | Worker — Telegram notify | `notifyTelegram()` with `escapeHtml`, best-effort try/catch, the paste-ready JSON code block (§6.1). | B-R2, B-R3 |
| **B-R6** | Data model — schema + merge | Add `source` to `reviewSchema`; create `src/data/reviews-real.json` = `[]`; `reviewsIndex.ts` imports + Zod-parses both files, exports real-first merged `reviewsData`; build-time `id`-uniqueness assertion. Update `scripts/generate-reviews.ts` to stamp `source:'synthetic'`. | — |
| **B-R7** | Real-first sort + phase-out | `applyPhaseOut()` + the real-first/newest-first comparator; wire into `reviewsByJobId`, the per-brand buckets, and the homepage `ReviewsBlock` path. `SYNTHETIC_PHASE_OUT_THRESHOLD` constant. | B-R6 |
| **B-R8** | JSON-LD gating | In `companies/[slug].astro`: build `Review`/`aggregateRating` only from `source:'real'` meeting `MIN_REAL_REVIEWS_FOR_AGGREGATE`; emit nothing when none. Same gate documented for `/otzyvy/` (feeds bead 011). | B-R6 |
| **B-R9** | Front-end — wire the modal | Rewire `ReviewModal.astro` submit handler to POST to `PUBLIC_REVIEWS_API` (replace the current `setTimeout` fake at lines 305-312); add hidden context fields (`company`, `jobId`, `jobTitle`); add honeypot field; keep the existing success screen. Remove/replace the `localStorage` faux-persistence in `ReviewsBlock.astro` (lines 429-619) — it shows reviews only to their own author and is misleading. | B-R6 |
| **B-R10** | Front-end — form placement | Add the "Оставить отзыв" button + context wiring to `/companies/[slug]/` and to each `/otzyvy/` brand section; add the brand `<select>` to the homepage modal path. | B-R9, (bead 011 for `/otzyvy/`) |
| **B-R11** | Worker deploy + env docs | Verify `wrangler deploy`; document the §8 owner checklist in `workers/reviews/README.md`; confirm `PUBLIC_REVIEWS_API` GitHub Variable + redeploy. | B-R1..B-R5 |
| **B-R12** | Tests | Worker unit tests (validation, rate-limit, whitelist); `reviewsIndex` merge/sort/phase-out unit tests; build-output test: real reviews precede synthetic, JSON-LD `Review` nodes only for real reviews, no `AggregateRating` below the floor. | B-R6, B-R7, B-R8 |
| **B-R13** (v2) | Durable storage | KV (or D1) binding; Worker writes `pending` rows; `/export` route behind `EXPORT_TOKEN`. | B-R5 |
| **B-R14** (v2) | Telegram moderation buttons | Inline approve/reject buttons; `/moderate` webhook route flipping `status`. | B-R13 |
| **B-R15** (v2) | Build-time ingest | `scripts/ingest-reviews.ts` in `prebuild`; pulls `approved` rows → `reviews-real.json`; GitHub Action auto-commit. | B-R13 |

**Critical path for MVP launch:** B-R1 → B-R2/B-R3/B-R4 → B-R5 → B-R11
(Worker live), in parallel with B-R6 → B-R7/B-R8 (data + display), then B-R9 →
B-R10 (front-end), then B-R12 (tests). v2 beads B-R13-B-R15 are deferred.

---

## 10. Open questions for the owner

- **OQ-R1 — Provenance disclosure.** This feature confirms `reviews.json` is
  synthetic (plan OQ#4). The MVP fixes the *structured-data* exposure (§7).
  Separately: is showing synthetic reviews as on-page UX content acceptable
  while real ones accumulate, given the `/otzyvy/` disclaimer? Or should
  synthetic reviews be dialed down faster / removed sooner?
- **OQ-R2 — Telegram routing.** Reuse the `ozon-lead` bot and the same chat,
  or a separate chat / topic for review moderation? (Recommendation: separate
  topic.)
- **OQ-R3 — Phase-out threshold.** `SYNTHETIC_PHASE_OUT_THRESHOLD` proposed at
  8 real reviews per scope, and `MIN_REAL_REVIEWS_FOR_AGGREGATE` at 3. Confirm
  or set preferred values. And: at what point retire `generate-reviews.ts`
  entirely?
- **OQ-R4 — MVP durability tolerance.** The MVP has no durable store — a
  missed/deleted Telegram message loses a review (Cloudflare Worker logs are a
  short-retention backstop). Acceptable to launch with, or is v2 storage a
  launch blocker?
- **OQ-R5 — Disclaimer / labeling copy.** Final Russian wording for: the
  `/otzyvy/` disclaimer once real reviews exist, the post-submit "на
  модерации" message, and whether real reviews show a visible "проверенный
  отзыв"-type marker.
- **OQ-R6 — Moderation SLA & volume.** Expected submission volume, and how
  fast the owner can realistically moderate? This is the trigger that decides
  when to build v2.
- **OQ-R7 — Identity / abuse policy.** Should the form ask for anything
  weakly identifying (e.g. optional contact, kept private and never published)
  to deter fake reviews? Couriers may be reluctant — trade-off for the owner.
- **OQ-R8 — `localStorage` review hack.** `ReviewsBlock.astro` currently
  persists "submitted" reviews to `localStorage` and shows them back only to
  the same browser (lines 429-619). B-R9 proposes removing it as misleading.
  Confirm removal.

# Design tokens reference

Single source of truth for **colors, typography, spacing, radii, shadows and motion** on kurerok.ru. Source file: [`src/styles/themes.css`](../src/styles/themes.css). Aesthetic: warm trust-green primary, coral accent, stone neutrals. All foreground/background pairs verified at WCAG AA (≥ 4.5 : 1).

> **TL;DR for new code:**
> - Never use raw `#16734c` / `#ffffff` / `rgba(255,255,255,0.82)`.
> - Always use `var(--brand-700)` / `var(--ink-0)` / a translucent surface token (see § Surfaces).
> - Dark-mode just works — every token is overridden in `:where(html, body).dark-mode {…}`.

---

## Colors

### Brand (warm trust-green)

Buttons, primary CTAs, links, focus rings, success accents.

| Token          | Light value | Dark value | Suggested use |
| -------------- | ----------- | ---------- | ------------- |
| `--brand-50`   | `#ecf5ef`   | `#1d3a26`  | Faint tint backgrounds (chips, hover states) |
| `--brand-100`  | `#d4ebda`   | `#234a31`  | Selected-state pills, secondary surfaces |
| `--brand-200`  | `#a8d6b6`   | `#2d6041`  | Borders on green surfaces, dividers |
| `--brand-300`  | `#74bb8b`   | (light)    | Inactive icons on dark surfaces |
| `--brand-400`  | `#4ba26a`   | (light)    | Hover state of secondary buttons |
| **`--brand-500`** | `#2f8851` | `#6fd093` | **Primary CTA fill, link color** |
| `--brand-600`  | `#256d41`   | `#8adfa9`  | Primary CTA hover, focus ring outer |
| `--brand-700`  | `#1d5634`   | `#b1ebc4`  | Headings on green chips, dark CTA text |
| `--brand-800`  | `#163f27`   | (light)    | Footer / nav background (legacy) |
| `--brand-900`  | `#0e2818`   | (light)    | Reserved for AAA-contrast cases |

**Migrations from hardcoded:**
- `#16734c` → `var(--brand-700)` ❌→✅ (occurs 43× in repo)
- `#2f8851` → `var(--brand-500)` ❌→✅ (occurs 10×)
- `#2eb37a` → `var(--brand-400)` ❌→✅ (occurs 9×)

### Accent (sun-warm coral, used for hot CTAs, urgency tags)

| Token            | Light       | Dark        | Suggested use |
| ---------------- | ----------- | ----------- | ------------- |
| `--accent-50`    | `#fdf1ec`   | `#3a1f15`   | Faint coral tint |
| `--accent-100`   | `#fbdfd2`   | `#4a2618`   | "🔥 ТОП" badge background, hover-coral |
| `--accent-200`   | `#f6bca5`   | (light)     | — |
| `--accent-300`   | `#ee9476`   | (light)     | — |
| `--accent-400`   | `#e57352`   | `#ff9c7c`   | Hover variant of `--accent-500` |
| **`--accent-500`** | `#d95a35` | `#ff8862`   | **Primary accent (urgency, "🔥 ТОП", sticky CTA)** |
| `--accent-600`   | `#b8471f`   | `#ffb59c`   | — |
| `--accent-700`   | `#903517`   | (light)     | Reserved |

### Neutrals — warm stone (NOT cold slate)

| Token        | Light     | Dark      | Suggested use |
| ------------ | --------- | --------- | ------------- |
| **`--ink-0`** | `#ffffff` | `#131110` | **Page background, card surface (top layer)** |
| `--ink-50`   | `#f3eee4` | `#1a1714` | Body background (section-rest), inset cards |
| `--ink-100`  | `#e9e1d2` | `#221e1a` | Secondary surface, sub-card |
| `--ink-150`  | `#ddd2bd` | `#2c2722` | Divider lines, soft borders |
| `--ink-200`  | `#cabea3` | `#3a342d` | Card border (default), input outline |
| `--ink-300`  | `#b0a386` | `#544c42` | Inactive icon, placeholder |
| `--ink-400`  | `#8a7e62` | `#7d7264` | Disabled-state text |
| `--ink-500`  | `#65594a` | `#a89c8a` | Muted body copy, captions |
| `--ink-600`  | `#4a4036` | `#c8bca8` | Secondary body copy |
| **`--ink-700`** | `#332b24` | `#e2d8c6` | **Default body copy color** |
| `--ink-800`  | `#211c17` | `#f1ead9` | Headings (h2-h4) |
| `--ink-900`  | `#13100d` | `#fbf6e8` | Large headings (h1, hero) |

**Migrations:**
- `#ffffff` / `#fff` → `var(--ink-0)` (occurs 47× in repo — biggest single replacement)
- `#0f172a` (slate-900) → `var(--ink-900)` (occurs 26×)
- `#0e1622` (near-black) → `var(--ink-900)` (occurs 12×)
- `#e7eaf0` → `var(--ink-100)` or `--ink-150` (occurs 21×, eyeball-pick)
- `#d4dae3` → `var(--ink-150)` (occurs 15×)
- `#6c7785` (slate-500) → `var(--ink-500)` (occurs 12×)
- `#2c3440` / `#2a3441` (slate-800-ish) → `var(--ink-800)` (occurs 18×)

### Semantic (success / warning / danger / info)

Both `-bg` and `-fg` exist for each — paired backgrounds and foregrounds for inline status pills, toasts, banners.

| Pair    | `-bg` light | `-fg` light | `-bg` dark | `-fg` dark |
| ------- | ----------- | ----------- | ---------- | ---------- |
| success | `#e3f2e8`   | `#1d5634`   | `#1f3a28`  | `#a8d6b6`  |
| warning | `#fcefd5`   | `#7a4a0a`   | `#3a2f15`  | `#f0c97a`  |
| danger  | `#fbe2dc`   | `#903517`   | `#3a221c`  | `#f0a48a`  |
| info    | `#e2ecf6`   | `#1f4a78`   | `#1f2d3a`  | `#a8c4e0`  |

Use as: `background: var(--success-bg); color: var(--success-fg)`. Never mismatch (e.g. `--success-bg` with `--ink-700`).

---

## Typography

### Font families

| Token            | Value |
| ---------------- | ----- |
| `--font-main`    | `'Manrope', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif` |
| `--font-heading` | `var(--font-main)` (alias — same family) |
| `--font-mono`    | `ui-monospace, 'SF Mono', Menlo, Consolas, monospace` |

### Sizes (with paired line-height)

Always use both: `font-size: var(--fs-16); line-height: var(--lh-16)`.

| `--fs-` token | rem      | px equiv | `--lh-` token | Suggested role |
| ------------- | -------- | -------- | ------------- | -------------- |
| `--fs-12`     | 0.75     | 12       | `--lh-12` 1.4 | Tiny labels (eyebrow, badge) |
| `--fs-13`     | 0.8125   | 13       | `--lh-13` 1.45 | Captions, meta |
| `--fs-14`     | 0.875    | 14       | `--lh-14` 1.5 | Secondary copy, form labels |
| `--fs-16`     | 1        | 16       | `--lh-16` 1.55 | **Default body copy** |
| `--fs-18`     | 1.125    | 18       | `--lh-18` 1.5 | Card titles, lead paragraphs |
| `--fs-20`     | 1.25     | 20       | `--lh-20` 1.4 | h4 |
| `--fs-24`     | 1.5      | 24       | `--lh-24` 1.3 | h3 |
| `--fs-30`     | 1.875    | 30       | `--lh-30` 1.25 | h2 |
| `--fs-36`     | 2.25     | 36       | `--lh-36` 1.2 | h1 |
| `--fs-48`     | 3        | 48       | `--lh-48` 1.1 | Hero |

---

## Spacing (4 px base)

Use only these increments. No `12.5px`, no `padding: 17px 11px`.

| Token       | Value | Common use                  |
| ----------- | ----- | --------------------------- |
| `--space-1` | 4 px  | Tight inline gap (icon ↔ text) |
| `--space-2` | 8 px  | Form-field internal padding (Y) |
| `--space-3` | 12 px | Card-inner padding (Y), button (Y) |
| `--space-4` | 16 px | Default gap inside cards, button (X) |
| `--space-5` | 20 px | Section-internal vertical rhythm |
| `--space-6` | 24 px | Card-outer padding |
| `--space-8` | 32 px | Section heading ↔ body |
| `--space-10`| 40 px | Section ↔ section (small) |
| `--space-12`| 56 px | Section ↔ section (default) |
| `--space-16`| 80 px | Section ↔ section (large), hero padding |

---

## Radii

| Token           | Value | Use |
| --------------- | ----- | --- |
| `--radius-sm`   | 6 px  | Inline pills, badges, small chips |
| `--radius-md`   | 10 px | Inputs, buttons, secondary cards |
| `--radius-lg`   | 14 px | Primary cards (JobCard), modals |
| `--radius-xl`   | 20 px | Hero blocks, calculator |
| `--radius-pill` | 999 px | Round buttons, sliders, status pills |

---

## Shadows (warm tint, not pure black)

Stack two shadows on `-sm`, `-md`, `-lg` for layered depth.

| Token            | Value (light) | Use |
| ---------------- | ------------- | --- |
| `--shadow-xs`    | `0 1px 2px rgba(38,29,18,0.05)` | Pressed / active button |
| `--shadow-sm`    | tiny stack | Default card shadow |
| `--shadow-md`    | medium stack | Hovered card, popover |
| `--shadow-lg`    | tall stack | Modal, top-of-stack overlay |
| `--shadow-focus` | `0 0 0 2px var(--ink-0), 0 0 0 4px var(--brand-600)` | Keyboard focus ring (always pair with `outline: none`) |

In dark mode `-sm`/`-md`/`-lg` are re-declared with stronger black opacity for visibility on dark surfaces.

---

## Motion

| Token               | Value | Use |
| ------------------- | ----- | --- |
| `--transition`      | `160ms cubic-bezier(.2,.7,.3,1)` | Default for hover, focus, color changes |
| `--transition-slow` | `240ms` (same easing) | Modal slide-in, drawer, large transforms |

`@media (prefers-reduced-motion: reduce)` overrides both to `0ms` — animations don't need to be removed manually.

---

## Component-specific tokens

### Glass (translucent surfaces — backdrops, navs)

| Token           | Light            | Dark            |
| --------------- | ---------------- | --------------- |
| `--glass-bg`    | `var(--ink-0)`   | `var(--ink-100)` |
| `--glass-border`| `var(--ink-200)` | `var(--ink-200)` |
| `--shadow-glass`| `var(--shadow-sm)` | `var(--shadow-sm)` |

Used in `.bottom-nav` (Header.astro) and the sticky filter toolbar. Don't reach in with a fresh `rgba(255,255,255,0.82)` — that's exactly what we're trying to remove.

### Dark-mode green surfaces (LanguageSwitcher, ReviewsBlock)

| Token                       | Dark value (only) |
| --------------------------- | ----------------- |
| `--dm-green-surface`        | `var(--brand-50)` |
| `--dm-green-surface-strong` | `var(--brand-100)` |
| `--dm-green-surface-hover`  | `var(--brand-200)` |
| `--dm-green-border`         | `var(--brand-200)` |
| `--dm-green-focus`          | `var(--brand-500)` |
| `--dm-green-text`           | `var(--ink-800)` |

Use these instead of inline `body.dark-mode .x { background: ... }` rules. Currently still mixed — cleanup in PR #5 of the design-tokens migration.

---

## Legacy aliases (deprecated — migrate when touched)

These aliases existed before the new token system. New code should not use them. Existing CSS that references them keeps working — they're just aliases pointing at the new tokens.

| Old alias          | New canonical | Note |
| ------------------ | ------------- | ---- |
| `--primary-color`  | `var(--brand-500)` | "primary" was ambiguous — now explicit |
| `--primary-hover`  | `var(--brand-600)` | |
| `--bg-color`       | `var(--ink-50)` | Body bg |
| `--surface-color`  | `var(--ink-0)` | Card bg |
| `--text-main`      | `var(--ink-700)` | |
| `--text-muted`     | `var(--ink-500)` | |
| `--border-color`   | `var(--ink-200)` | |
| `--accent-color`   | `var(--accent-500)` | |
| `--shadow-glass`   | `var(--shadow-sm)` | |

---

## Migration plan (PR series)

This file lands first. Then, in order:

1. **PR `cleanup/inline-hex-colors`** — replace hardcoded `#xxxxxx` and `#fff` with the matching tokens above. ~150 occurrences.
2. **PR `cleanup/page-backgrounds`** — introduce a small set of `--surface-translucent-*` tokens (currently missing) and replace 60+ `rgba(255,255,255,0.82)`-style declarations. Fixes the visible mismatch between home and `/v/[slug]/` backgrounds.
3. **PR `refactor/buttons-canonical`** — collapse `.apply-btn` definitions across 9 files into a single canonical block in `index.css` with modifier variants.
4. **PR `refactor/dark-mode-tokens`** — eliminate stray `body.dark-mode .x { … }` overrides (currently 75+ across 8 files) by ensuring every surface uses tokens that already auto-flip in `themes.css`.
5. **PR `cleanup/rgba-tokens`** — translucent overlays (`rgba(148,163,184,0.16)` × 20, etc.) → `--scrim-*` tokens.

After all five, every page on kurerok.ru renders from a consistent token set, and a future colour-scheme tweak is a one-file edit in `themes.css`.

---

## Quick rule for new code reviewers

If you see in a diff:
- Any 6-digit hex (`#xxxxxx`) → ❌ rejected unless documented why no token fits.
- `rgba(...)` outside `themes.css` → ❌ rejected (use a token from § Glass or § Surfaces).
- A new `body.dark-mode .x { … }` rule → ❌ rejected (the underlying tokens should handle it).

Exception: gradient stops in a one-off illustrative element (sticky-bar background, hero glow) may use raw hex. Keep them rare and inside the component's scoped `<style>`.

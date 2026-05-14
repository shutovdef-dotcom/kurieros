# i18n Translation Workflow (Clause-Level)

Workflow for translating Russian vacancy content into the 11 supported languages
(`uk`, `be`, `kk`, `ky`, `tg`, `hy`, `uz`, `az`, `hi`, `vi`, `zh`).

The translation layer is **clause-level**: each Russian sentence/clause is
hashed into a stable content-based ID (`c_<sha256[:8]>`), translated once per
language, and reassembled at build time into per-source translation files.
This deduplicates repeated phrases ("Возраст 18+", "Гибкий график") across
sources so they're translated only once.

## Pipeline Overview

```
vacancies.ts (RU sources)
    │
    │  npm run i18n:extract
    ▼
src/data/i18n/
    ├── ru-clauses.json           Unique RU clauses, {clauseId → text}
    └── source-to-clauses.json    Per-source field assembly map
    │
    │  Translators fill in 11 lang dictionaries below
    ▼
src/data/i18n/clauses/
    ├── uk.json    (Ukrainian — Cyrillic)
    ├── be.json    (Belarusian — Cyrillic)
    ├── kk.json    (Kazakh — Cyrillic)
    ├── ky.json    (Kyrgyz — Cyrillic)
    ├── tg.json    (Tajik — Cyrillic)
    ├── hy.json    (Armenian — Armenian script)
    ├── uz.json    (Uzbek — Latin)
    ├── az.json    (Azerbaijani — Latin)
    ├── hi.json    (Hindi — Devanagari)
    ├── vi.json    (Vietnamese — Latin + diacritics)
    └── zh.json    (Chinese — Han)
    │
    │  npm run i18n:assemble
    ▼
src/data/vacancy-translations-source/<lang>.json    Reassembled per-source fragments
```

Build pipeline: `prebuild` → `generate:data` → `i18n:assemble` → astro build.

## NPM Scripts

| Script | Purpose |
|---|---|
| `npm run i18n:extract` | Tokenize RU sources into clauses, write `ru-clauses.json` + `source-to-clauses.json`. Prunes orphan IDs from lang dictionaries. Run after editing `vacancies.ts`. |
| `npm run i18n:analyze` | Dedup report. Exits 1 if dedup ratio drops below 30%. Diagnostic only — not in build chain. |
| `npm run i18n:assemble` | Reassemble RU + lang clauses into `vacancy-translations-source/<lang>.json`. Round-trip checks RU is perfectly reconstructible. Wired into `prebuild`. |
| `npm run i18n:test` | Quality gate: hard checks (placeholders, abbreviations, brands, numbers, length, no empty, Cyrillic-leakage) + sample 10 random vacancy×lang coverage. Run before merging. |

## Adding a New Vacancy

1. Add the `VacancySource` to `src/data/vacancies.ts` with full Russian content
   (`shortDescription`, `description`, `requirements`, `benefits`,
   `requiredDocuments`).
2. Run `npm run i18n:extract` — new RU clauses appear in `ru-clauses.json` with
   their content-hash IDs; `source-to-clauses.json` is updated.
3. Run `npm run i18n:analyze` — see how much of the new content already has
   reused clauses from existing vacancies (sometimes 100%).
4. Open each `clauses/<lang>.json` and add translations for any new clause IDs.
   The diff will be small if the new vacancy reuses a lot of stock phrases.
5. Run `npm run i18n:test` — verify hard checks + sample coverage ≥9/10.
6. Run `npm run build` — astro sync + full validation.

## Editing an Existing Vacancy

When you edit the RU text of an existing clause:

1. The old clause becomes orphan — its `c_<oldhash>` ID is no longer
   referenced.
2. The new text gets a new `c_<newhash>` ID.
3. `npm run i18n:extract` automatically prunes orphans from every
   `clauses/<lang>.json`, so stale translations don't persist.
4. The new ID needs fresh translations for all 11 languages.
5. Hard checks will catch the gap if you forget — `i18n:assemble` falls back
   to RU for any missing translation, which fails the build under
   `STRICT_TRANSLATION_COVERAGE`.

## Translation Rules (Hard Constraints)

Enforced by `scripts/i18n/test-translations.ts`. Failure aborts the build.

1. **Placeholders preserved**: every `{city}` and `{cityPrep}` in RU must
   appear the same number of times in the translation.
2. **Abbreviations preserved** (stay Cyrillic in every target language):
   `РФ`, `ЕАЭС`, `СНГ`, `СНИЛС`, `ИНН`, `СТС`, `ПТС`, `ТК`, `ГПХ`, `ИП`,
   `РВП`, `ВНЖ`.
3. **Brand names preserved**: each brand from the `BRAND_VARIANTS` table must
   appear in one accepted form. For non-Cyrillic-script targets, Latin
   transliterations are accepted:
   - `Купер` → `Kuper`
   - `Я.Про` → `Ya.Pro`
   - `Бургер Кинг` → `Burger King`
   - `Альфа-Банк` → `Alfa-Bank`
   - `Т-Банк` → `T-Bank`
   - `Яндекс Еда` → `Yandex Eda`
   - `Ozon`, `Ozon fresh`, `Efin` — already Latin, stay as-is
4. **Numbers preserved**: every digit-token (e.g., `120 000`, `2/2`, `30–60`)
   in RU must appear in the translation. Currency `₽` stays.
5. **Length sanity**: translation length in `[0.3×, 4.0×]` of RU length.
6. **No empty translations** after `trim()`.
7. **No Cyrillic leakage** (only for non-Cyrillic targets: `uz`, `hy`, `az`,
   `hi`, `vi`, `zh`): no run of 4+ Cyrillic letters that isn't in the
   abbreviation/brand allowlist. So `Москва` must be transliterated
   (`Moskva`) — but `РФ`, `Купер`, etc. are allowed via the allowlist.

## Style Conventions

- **Tone**: formal "Вы" (use the formal-you equivalent in every target
  language: `Siz`, `Ви`, `您`, `आप`, `Quý vị`, etc.).
- **Voice**: neutral business — these are job descriptions, not marketing
  copy.
- **City names**: in Cyrillic-script targets keep the Russian form
  (`Москва`). In non-Cyrillic targets transliterate (`Moskva`,
  `Sankt-Peterburg`). Never translate `{city}` / `{cityPrep}` — those are
  filled in at runtime.
- **Quality bar**: functional, not professional-translator. The user
  explicitly accepted "понятно носителю языка" over "literary perfection."

## Soft Sample Quality Check

`npm run i18n:test` runs 10 random vacancy×lang samples (Mulberry32
PRNG seed=42 — deterministic). Each sample gets a coverage score:
- `0`: under 10% of clauses translated → unacceptable
- `1`: 10–90% translated → acceptable
- `2`: ≥90% translated → strong

Threshold: ≥9 of 10 must score ≥1. Below that, exit 1.

## Reference: Tokenizer Rules

`extract-clauses.ts` splits RU strings into clauses using:
- Sentence boundary: `[.;]` followed by whitespace
- Newlines: `\n`
- `Я.Про` is preserved (the lookahead requires whitespace after `.`)

Each clause is trimmed of trailing `.;`, hashed via SHA-256, and keyed as
`c_<first8hex>`. Collisions are extremely unlikely at 4 billion possible
keys for ~300 clauses, but the extractor throws on detection.

## Round-Trip Validation

`assemble-translations.ts` reassembles `(lang, source, field)` from the
clause dictionary using the per-source assembly map (which records the
terminator after each clause: `.`, `;`, `\n`, or empty). For RU it then
asserts the reassembled string is byte-equal to the original RU field. If
tokenization is lossy for any clause, the build fails immediately rather
than silently shipping mangled RU pages.

## Adding a New Language

1. Add the lang code to `SUPPORTED_LANGUAGES` in `src/data/translations.ts`.
2. Create `src/data/i18n/clauses/<lang>.json` with translations for all
   clauseIds in `ru-clauses.json`.
3. Decide if it's Cyrillic-script or not:
   - Cyrillic-script: no special handling needed.
   - Non-Cyrillic-script: add to `NON_CYRILLIC_TARGETS` in
     `test-translations.ts`. Brand variants and Cyrillic-leakage check apply.
4. Run `i18n:assemble` and `i18n:test`.

## Common Pitfalls

- **Forgetting to run `i18n:extract` after editing `vacancies.ts`**: new
  clauses won't appear in `ru-clauses.json`, and `i18n:assemble` will fall
  back to RU for the new text, failing the strict-mode coverage check.
- **Translating an abbreviation**: `СНИЛС` translated as
  `Соціальне страхування` will fail the abbreviation check — leave it as
  `СНИЛС`.
- **Missing brand**: if RU has `Купер` and the translation drops it
  entirely, the brand check fails. Use either canonical Cyrillic or a Latin
  variant from the table.
- **Length over-run**: if a clause becomes 5× longer (common with overly
  literal translations from terse RU), the length check fails. Prefer
  natural target-language phrasing.

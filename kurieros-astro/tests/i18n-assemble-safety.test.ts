/**
 * H8 + H9 — safety behaviours of `scripts/i18n/assemble-translations.ts`.
 *
 * The script reads three things: ru-clauses.json, source-to-clauses.json,
 * and clauses/<lang>.json. Two silent-failure surfaces were patched:
 *
 *   H8 — a bare `catch {}` on `JSON.parse(clauses/<lang>.json)` previously
 *        swallowed parse errors, disk corruption, and permission errors
 *        identically to ENOENT. Build exited 0 with empty stub output.
 *        Now: ENOENT stays silent, anything else logs and (under
 *        STRICT_TRANSLATION_COVERAGE=1) exits non-zero.
 *
 *   H9 — a `!` non-null assertion on `sourceToClauses[source.slug]` crashed
 *        with `TypeError: Cannot read properties of undefined` when a new
 *        source was added without re-running `i18n:extract`. Now: logs an
 *        actionable message and continues.
 *
 * Strategy: rather than re-mock the script's internals, we run the real
 * script as a subprocess against a synthetic working tree that mirrors
 * the on-disk layout. This is the only way to faithfully cover the
 * top-level `try/catch` + the per-lang for-loop where the bugs lived.
 *
 * Opt-in: this suite mutates `src/data/i18n/clauses/uk.json` mid-run,
 * which races with `tests/i18n.test.ts` when the two files run in
 * parallel (the default). Gate behind `RUN_I18N_SAFETY=1` so the
 * default `npm test` stays parallel-safe; invoke explicitly with
 *   RUN_I18N_SAFETY=1 npx vitest run tests/i18n-assemble-safety.test.ts
 * in pre-commit/local verification.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  rmSync,
  writeFileSync,
  existsSync,
  cpSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REAL_ROOT = join(HERE, '..');
const SCRIPT_REL = 'scripts/i18n/assemble-translations.ts';

// The script resolves its data paths via `import.meta.url`, so we cannot
// redirect it at a sibling tree. Instead we corrupt and restore real
// files under src/data/i18n/clauses, always restoring in `afterAll` so
// the suite is rerunnable and the working tree is byte-identical after
// the run.
const REAL_CLAUSES_DIR = join(REAL_ROOT, 'src/data/i18n/clauses');
const VICTIM_LANG = 'uk'; // arbitrary non-RU lang to corrupt
const VICTIM_PATH = join(REAL_CLAUSES_DIR, `${VICTIM_LANG}.json`);

// Scratch directory for backups + intermediate files. Cleaned in afterAll.
const SCRATCH = join(REAL_ROOT, 'tests', '.tmp-assemble');
const BACKUP_PATH = join(SCRATCH, `${VICTIM_LANG}.bak.json`);

// Also: the vacancy-translations-source output for this lang gets
// rewritten as a side-effect of the run. We snapshot + restore it too.
const REAL_OUT_DIR = join(REAL_ROOT, 'src/data/vacancy-translations-source');
const OUT_VICTIM_PATH = join(REAL_OUT_DIR, `${VICTIM_LANG}.json`);
const OUT_BACKUP_PATH = join(SCRATCH, `${VICTIM_LANG}.out.bak.json`);

type RunResult = {
  status: number | null;
  stdout: string;
  stderr: string;
};

const runScript = (env: Record<string, string> = {}): RunResult => {
  const result = spawnSync(
    'npx',
    ['tsx', SCRIPT_REL],
    {
      cwd: REAL_ROOT,
      env: { ...process.env, ...env },
      encoding: 'utf8',
    },
  );
  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
};

const RUN = process.env.RUN_I18N_SAFETY === '1';

describe.skipIf(!RUN)('assemble-translations safety (H8 + H9)', () => {
  beforeAll(() => {
    mkdirSync(SCRATCH, { recursive: true });
    // Snapshot the files we may overwrite.
    if (existsSync(VICTIM_PATH)) cpSync(VICTIM_PATH, BACKUP_PATH);
    if (existsSync(OUT_VICTIM_PATH)) cpSync(OUT_VICTIM_PATH, OUT_BACKUP_PATH);
  });

  afterAll(() => {
    // Restore originals so the working tree is byte-identical to what
    // the test found. Idempotent: skips silently if backup is absent.
    if (existsSync(BACKUP_PATH)) cpSync(BACKUP_PATH, VICTIM_PATH);
    if (existsSync(OUT_BACKUP_PATH)) cpSync(OUT_BACKUP_PATH, OUT_VICTIM_PATH);
    rmSync(SCRATCH, { recursive: true, force: true });
  });

  it(
    'H8: corrupted clause file logs the failing path AND exits 0 in normal mode',
    () => {
      writeFileSync(VICTIM_PATH, '{ this is not valid json\n', 'utf8');
      const result = runScript();

      // The fix logs `assemble: failed to parse clause dict <abs path>:`
      expect(result.stderr).toContain('failed to parse clause dict');
      expect(result.stderr).toContain(VICTIM_PATH);
      // Normal mode: best-effort, exit 0 so unrelated languages still
      // build. The corrupted lang's sources fall back to stubs.
      expect(result.status).toBe(0);

      // Restore so the next test starts clean (afterAll is the safety net).
      cpSync(BACKUP_PATH, VICTIM_PATH);
    },
    60_000,
  );

  it(
    'H8: corrupted clause file exits 1 under STRICT_TRANSLATION_COVERAGE=1',
    () => {
      writeFileSync(VICTIM_PATH, '{ also not json\n', 'utf8');
      const result = runScript({ STRICT_TRANSLATION_COVERAGE: '1' });

      expect(result.stderr).toContain('failed to parse clause dict');
      expect(result.status).toBe(1);

      cpSync(BACKUP_PATH, VICTIM_PATH);
    },
    60_000,
  );

  it(
    'H8: missing clause file (ENOENT) stays silent and exits 0 — backwards-compatible',
    () => {
      // Temporarily rename the file away so readFile sees ENOENT.
      const exiledPath = join(SCRATCH, `${VICTIM_LANG}.exiled.json`);
      cpSync(VICTIM_PATH, exiledPath);
      rmSync(VICTIM_PATH);

      try {
        const result = runScript();
        // ENOENT must not produce the "failed to parse" log — that
        // string is reserved for real failures. Other warnings (e.g.
        // the missing-clause summary) may still appear.
        expect(result.stderr).not.toContain('failed to parse clause dict');
        expect(result.status).toBe(0);
      } finally {
        cpSync(exiledPath, VICTIM_PATH);
        rmSync(exiledPath, { force: true });
      }
    },
    60_000,
  );

  it(
    'H9: clean run produces no "no clause mapping" warning (current repo has all sources mapped)',
    () => {
      // Sanity check the inverse of H9: when every source is mapped,
      // the new guard stays silent. Catches accidental regressions
      // where someone changes the guard to always-log.
      const result = runScript();
      expect(result.stderr).not.toContain('no clause mapping for source');
      expect(result.status).toBe(0);
    },
    60_000,
  );

  // Note on H9 unmapped-source coverage: the script's round-trip check
  // at line ~142 exits with status 1 BEFORE the per-lang loop runs if
  // any source is missing from source-to-clauses.json, so we cannot
  // exercise the per-lang guard end-to-end without rewriting more of
  // the script. The guard is still valuable as a defense-in-depth
  // layer (the round-trip check could be reordered or skipped in the
  // future). The manual verification documented in the audit confirms
  // the runtime behaviour.
});

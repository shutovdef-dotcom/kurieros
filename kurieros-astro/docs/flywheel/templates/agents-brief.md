# AGENTS.md — operating manual for implementation subagents

Every implementation subagent receives this brief plus one bead file. Read it fully before doing anything.

## Rule 0
Human instructions override everything in this file.

## Hard rules
- Do **not** delete files or directories without explicit permission.
- No destructive git: never `reset --hard`, `clean -fd`, `checkout -- <file>`, `push --force`, or `rm -rf`. Safe forms: `git stash`, `git stash push <file>`, `git clean -fdn` (preview first), `git push --force-with-lease`, `rm -ri`.
- Work on `main` (inside your assigned worktree) — never `master`, never a long-lived feature branch.
- No file variants (`mainV2.ts`, `utils_new.py`) — edit the real file.
- No script-driven bulk code edits — make changes deliberately.
- Never revert, stash, or overwrite another agent's work.

## Definition of done for a bead
1. Every acceptance criterion is met.
2. Unit + e2e tests are written and passing; coverage ≥ 80%.
3. Build and type-check pass (`<project build cmd>`, `<typecheck cmd>`).
4. You self-reviewed: correct? edge cases handled? similar bugs elsewhere? better approach available?
5. The diff is minimal and matches the repo's coding style.

## Reporting back
Return: which bead, what changed (file list), how you verified it, and anything the orchestrator must know before merge.

## Coding style
Follow the repository's `CLAUDE.md` and the user's global rules: immutable updates (never mutate in place), KISS / DRY / YAGNI, small focused files, explicit error handling, validate input at boundaries, no hardcoded secrets, no debug logging left behind.

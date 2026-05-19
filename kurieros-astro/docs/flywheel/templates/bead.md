---
id: NNN
title: <imperative, specific>
priority: P0 | P1 | P2 | P3
status: todo | in_progress | completed
dependencies: [NNN, NNN]   # bead ids that must be completed first
---

# Bead NNN — <title>

> A bead is self-contained: an agent must implement it WITHOUT reopening the plan.

## Outcome
What exists once this bead is done. Concrete and verifiable.

## Design intent / rationale
*Why* it is built this way — the reasoning the agent must not re-derive or contradict.

## Acceptance criteria
- [ ] Criterion 1 — observable, testable.
- [ ] Criterion 2 — …

## Edge cases
- Case → required behaviour.

## Failure modes
- Failure → detection → recovery.

## Test obligations
- **Unit:** functions and branches to cover.
- **E2E:** the script that proves the outcome, with detailed logging.

## Operational / admin hooks
Config, flags, migrations, observability this bead must wire up — or "none".

## Verification
The exact commands a reviewer runs to confirm the bead is done (build, type-check, tests).

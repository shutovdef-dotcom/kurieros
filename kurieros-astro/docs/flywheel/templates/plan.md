# <Project> — Flywheel Plan

> Living markdown plan. Phase A artifact. Refine 4–5 rounds before converting to beads.
> Status: DRAFT | REFINING (round N) | STABLE

## 1. Intent
- **Problem:** what is broken or missing today.
- **Goal:** what success looks like.
- **Target users:** who uses this and why.
- **Non-goals:** explicitly out of scope.
- **Success criteria:** measurable signals that the project is done.

## 2. User workflows
Walk every primary workflow end to end — one subsection per workflow.

## 3. Architecture
- High-level component map (prose or ASCII diagram).
- Key technical decisions and their rationale.
- Tech stack, with a reason for each choice.

## 4. Components
One subsection per component: responsibility, public interface, dependencies, data it owns.

## 5. Data model
Entities, fields, relationships, invariants.

## 6. Edge cases & failure modes
Enumerate exhaustively — this is where frontier reasoning earns its keep.
- Edge case → expected behaviour.
- Failure mode → detection → recovery.

## 7. Security & trust boundaries
Where untrusted input enters; authentication and authorization; what each boundary must enforce.

## 8. Testing strategy
Unit / integration / e2e split; coverage target (≥80%); how the swarm keeps tests green.

## 9. Open questions
Unresolved decisions. The plan is not STABLE until this section is empty.

## 10. Refinement log
- Round 1 — <date> — <what changed>.
- Round 2 — …

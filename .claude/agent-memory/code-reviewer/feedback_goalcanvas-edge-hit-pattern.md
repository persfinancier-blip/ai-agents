---
name: feedback-goalcanvas-edge-hit-pattern
description: GoalCanvas.tsx has an established edge-delete idiom (gc-edge-hit + action chooser + shared busy state) — verify new edge/mutation UI reuses it instead of flagging as novel
metadata:
  type: feedback
---

Confirmed clean (not a finding) in Ф5 (`feat/frontend-kpi-factor-editing`, prompt #30): new
interactive SVG edges for deletion (KPI-link edges since Ф4, KPI-factor edges added in Ф5) use a
transparent wide-stroke overlay line/path with `className="gc-edge-hit"` (CSS already defined in
`os.css`, includes `:focus-visible` outline — don't flag as a missing accessibility outline),
`role="button"`, `tabIndex={0}`, `onKeyDown` handling only `Enter`, and a descriptive
`aria-label` naming the specific relationship being removed (e.g. `Разорвать связь «...»` /
`Убрать фактор «...»`). Delete handlers mirror each other exactly: `window.confirm` RU prompt →
guard on a *shared* `busy`/`actionError` state (not a new per-feature flag) →
`deleteX(id).then(reload).catch(setActionError).finally(() => setBusy(false))`.

Also established: an "action chooser" popover (`ActionChoice` state) now sits in front of
KPI-click handling so multiple flows (link vs factor) can branch from one entry point; and
"draft" state shapes (`LinkDraft`, `FactorDraft`) deliberately mirror each other's field
progression (source/composite → target goal → target/factor KPI → [weight]).

**Why:** Without this memory, each new edge-mutation feature on `GoalCanvas.tsx` looks like it's
introducing new CSS/ARIA/state patterns worth flagging, when it's actually reusing a
well-established, already-reviewed idiom. Re-flagging it as "new" wastes review cycles and risks
suggesting the author invent a different pattern.

**How to apply:** When reviewing new interactive SVG elements or draft-flow state in
`GoalCanvas.tsx`, check first whether they match this idiom (reuse `gc-edge-hit`, shared busy
state, action-chooser branching, draft-mirroring). Only flag as a finding if a new feature
diverges from this idiom without a stated reason (e.g. defines its own hit-path CSS class, its
own busy flag where the shared one would do, or skips the Enter-key handler / aria-label).

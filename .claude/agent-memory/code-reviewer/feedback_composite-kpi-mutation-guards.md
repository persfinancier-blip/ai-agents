---
name: feedback-composite-kpi-mutation-guards
description: When reviewing UI for composite/computed sub-entities, check every mutation affordance (edit AND delete), not just the one named in the task brief
metadata:
  type: feedback
---

In `feat/frontend-goal-editing` (prompt-22, Ф3), `frontend/src/os/RealGoalCard.tsx` correctly guards
click-to-edit against composite KPIs (`k.computed_value != null` → `startEditKpi` no-ops, row isn't
`role="button"`), matching the explicit review brief. But the delete ("×") button on the same KPI row
only checked `k.id` — not `!composite` — so a composite/computed KPI could still be deleted in one
click with no confirmation, silently cascading through `kpi_service.delete_kpi` and wiping its
`kpi_factor` weight/factor relations, even though composite KPI lifecycle is supposed to be owned by
the dedicated `/kpi-factors` route (per BACKLOG.md Шаг 3b: "Составные KPI не встраиваются в
POST/PATCH /goals — отдельный роут /kpi-factors").

**2026-07 update:** `RealGoalCard.tsx` was deleted in F7a (`b6d8f3a`, prompt #35) — the goal card is
now a popup, `frontend/src/os/GoalPopup.tsx`. The guard pattern survived the move correctly: KPI rows
there compute `const composite = k.computed_value != null` (line ~783), gate click-to-edit on
`editable = !composite && !!k.id`, and gate the delete button on `k.id && !composite` (line ~813) —
both affordances guarded consistently. Re-verified current on this pass.

**Why:** A review brief that calls out "editing must be guarded for computed values" tends to make you
check only the specific interaction named (click → edit). The same computed-value entity usually has
other mutation affordances (delete, reorder, bulk actions) on the same row that need the identical
guard and are easy to miss.

**How to apply:** Whenever a task highlights that composite/computed/derived entities must not be
directly editable, enumerate *all* mutation affordances rendered on that row/card (edit, delete,
drag, bulk-select, context menu) and verify each one is guarded consistently — not just the one
explicitly named in the brief.

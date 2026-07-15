---
name: project-goal-map-f-series
description: The Ф1-Ф5 frontend goal-map slices are frontend-only layers atop a Goal/KPI API that was already complete before Ф1 started
metadata:
  type: project
---

The "Ф-series" prompts (`prompts/_done/prompt-17-frontend-goal-map-binding.md` = Ф1,
`prompt-18-real-goal-card.md` = Ф2, `prompt-22-goal-editing.md` = Ф3,
`prompt-23-goal-canvas.md` = Ф4, `prompt-30-kpi-factor-editing.md` = Ф5) are successive
frontend-only vertical slices built on top of a Goal/KPI backend (CRUD, diff-sync KPI, `parent_id`
tree, cycle detection, composite KPI via `kpi_factor`, `kpi_link`) that was already fully built in
earlier backend-focused steps (Step 1 through 3b/3c, tracked in BACKLOG.md). Ф1 was read-only map
binding, Ф2 added the read-only goal card (`RealGoalCard.tsx`), Ф3 (`feat/frontend-goal-editing`)
added inline create/patch/delete from the UI, Ф4 (`feat/frontend-goal-canvas`) added the radial
`GoalCanvas.tsx` with the KPI-link graph (create/delete link via popover, `gc-edge-hit` hit-path),
Ф5 (`feat/frontend-kpi-factor-editing`) extended `GoalCanvas.tsx` with composite-KPI factor
create/delete via an "action chooser" popover — all without touching backend, since
`POST/DELETE /kpi-factors` and `/kpi-links` routes already existed since Step 3a/3b.

**Why:** Explains why "backend not touched" is expected and correct for these branches rather than a
scope gap — the vertical-slice work for the backend already happened; these PRs are the frontend half
of a slice that was split across multiple prior PRs.

**How to apply:** When reviewing a `feat/frontend-*` branch in this repo whose docs (BACKLOG.md/DEVLOG)
reference a Ф-numbered prompt, verifying "backend not modified" via `git diff --name-only | grep
backend` returning empty is the expected/correct state, not a red flag — don't treat it as an
incomplete vertical slice unless the prompt/task description itself calls for new backend surface.
See [[feedback_composite-kpi-mutation-guards]] for the mutation-guard pattern this series follows,
and the Ф5-specific reusable UI patterns (action chooser, draft-flow mirroring, edge hit-path,
shared busy/error state) worth checking against in future Ф6+ diffs rather than re-deriving from
scratch.

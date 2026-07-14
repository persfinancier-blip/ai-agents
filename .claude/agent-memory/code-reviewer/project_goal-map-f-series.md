---
name: project-goal-map-f-series
description: The Ф1-Ф3 frontend goal-map slices are frontend-only layers atop a Goal API that was already complete before Ф1 started
metadata:
  type: project
---

The "Ф-series" prompts (`prompts/_done/prompt-17-frontend-goal-map-binding.md` = Ф1,
`prompt-18-real-goal-card.md` = Ф2, `prompt-22-goal-editing.md` = Ф3) are successive frontend-only
vertical slices built on top of a Goal/KPI backend (CRUD, diff-sync KPI, `parent_id` tree, cycle
detection, composite KPI via `kpi_factor`) that was already fully built in earlier backend-focused
steps (Step 1 through 3b, tracked in BACKLOG.md). Ф1 was read-only map binding, Ф2 added the
read-only goal card (`RealGoalCard.tsx`), Ф3 (`feat/frontend-goal-editing`) added inline
create/patch/delete from the UI without touching backend at all.

**Why:** Explains why "backend not touched" is expected and correct for these branches rather than a
scope gap — the vertical-slice work for the backend already happened; these PRs are the frontend half
of a slice that was split across multiple prior PRs.

**How to apply:** When reviewing a `feat/frontend-*` branch in this repo whose docs (BACKLOG.md/DEVLOG)
reference a Ф-numbered prompt, verifying "backend not modified" via `git diff --name-only | grep
backend` returning empty is the expected/correct state, not a red flag — don't treat it as an
incomplete vertical slice per [[feedback... vertical slice]] rule unless the prompt/task description
itself calls for new backend surface.

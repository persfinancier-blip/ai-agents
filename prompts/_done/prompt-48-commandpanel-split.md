# prompt-48 — Split CommandPanel.tsx: extract RealGoalMap, DemoGoalMap, icon cluster

**For:** Claude Code (GitHub Actions worker, `task/**` push path).
**Branch:** the dispatched `task/prompt-48-*` branch. **Commit type:** `chore:` (pure refactor, no behavior change).
**Read scope:** `frontend/src/os/CommandPanel.tsx` and the new files only. Pattern reference: the previous slice did the same to GoalPopup (see `prompts/_done/prompt-47-goalpopup-split.md`).

## Why

`frontend/src/os/CommandPanel.tsx` is ~50 KB / 1209 lines — the largest file in the frontend; every pass touching it reads it all. Second slice of the god-file series (after GoalPopup; GoalCanvas remains for a later prompt).

## Scope

DO: move these top-level pieces from `CommandPanel.tsx` into new files under `frontend/src/os/`:

1. **`RealGoalMap`** (function at ~line 237, ends before `DemoGoalMap` at ~line 682) → `frontend/src/os/RealGoalMap.tsx`. Move with it the constants used only by it (check usage before moving: `DRAG_THRESHOLD` ~line 235, `BRANCH_STYLES` ~line 132, `FOG_ICON` ~139, `SEL_ICON` ~140).
2. **`DemoGoalMap`** (~line 682–788) → `frontend/src/os/DemoGoalMap.tsx`.
3. **Icon cluster** — `Icon` (~31), `HumanDot` (~105), `AiDot` (~111), `RailButton` (~117), `HoverGlyph` (~171) and the `STROKE` constant (~22) → one file `frontend/src/os/panelIcons.tsx` with named exports.

Mechanics:
- Each new file carries ONLY the imports it needs; shared pieces used by both the extracted components and the remaining `CommandPanel` get exported from their new home and imported where needed — pick the direction that minimizes the diff, do not create new shared modules beyond the three files above.
- `CommandPanel.tsx` imports what it lost; rendered behavior stays identical — this is a move, not a rewrite. Preserve all existing comments in moved code. Russian UI strings untouched.
- The advisor constants (~lines 789–795) stay in `CommandPanel.tsx`.

DO NOT: change logic, props, styling, state, or exports of `CommandPanel` itself; touch `GoalCanvas.tsx`, `GoalPopup.tsx`, `backend/`, canon docs, `.github/`.

## Definition of Done

- `CommandPanel.tsx` no longer defines the extracted pieces; three new files exist and are imported; file is substantially smaller (the moved code is roughly half the file).
- `cd frontend && npm run lint && npm run build` both green (the DoD gate runs these).
- No diff outside `frontend/src/os/` (plus prompt archive + DEVLOG).
- Prompt archived to `prompts/_done/`, DEVLOG entry, one `chore:` commit.

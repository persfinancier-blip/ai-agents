# prompt-49 — GoalCanvas.tsx: extract the geometry toolkit into canvasGeometry.ts

**For:** Claude Code (GitHub Actions worker, `task/**` push path).
**Branch:** the dispatched `task/prompt-49-*` branch. **Commit type:** `chore:` (pure refactor, no behavior change).
**Read scope:** `frontend/src/os/GoalCanvas.tsx` and the new file only. Pattern reference: `prompts/_done/prompt-47-goalpopup-split.md`, `prompt-48-commandpanel-split.md` (same series, final slice).

## Why

`frontend/src/os/GoalCanvas.tsx` (~41 KB, 960 lines) is the last god-file. Unlike the previous two it contains no extractable components — it is one big component plus a self-contained geometry toolkit. This slice moves the toolkit out; deeper component surgery is deliberately OUT of scope (too risky for a mechanical pass).

## Scope

DO: create `frontend/src/os/canvasGeometry.ts` and move into it, verbatim:

1. Layout constants (~lines 42–55): `CX, CY, CANVAS_W, CANVAS_H, KPI_R0, SUB_R0, ROW_STEP, SAT_EXTRA, MAX_KPI_ROW, MAX_SAT_ROW, CENTER_GAP, KPI_GAP, SUB_GAP, SAT_GAP`.
2. The `Pt` interface (~line 57).
3. Geometry helpers (~lines 62–117): `polar`, `arcPositions`, `chunkRows`, `trimLine`, `curvedPath`.

All become named exports. `GoalCanvas.tsx` imports them from `./canvasGeometry`. Nothing else in the repo uses these symbols (verified — only GoalCanvas.tsx references them), so no other imports change.

Also move the KPI-link constants `LINK_TYPE_LABEL`, `LINK_TYPE_CLASS`, `LINK_TYPES` (~lines 28–40) ONLY IF they carry no JSX and no component dependencies — they are Record/array constants, so they should move; put them in the same `canvasGeometry.ts` (bottom section) to avoid a second new file. If moving them would drag along type imports that create a cycle, leave them in place — no forcing.

DO NOT: split the `GoalCanvas` component itself; change any logic, values, styling, or exports of `GoalCanvas`; touch other components, `backend/`, canon docs, `.github/`. This is a move, not a rewrite; preserve comments.

## Definition of Done

- `frontend/src/os/canvasGeometry.ts` exists; the moved symbols are gone from `GoalCanvas.tsx` and imported instead.
- `cd frontend && npm run lint && npm run build` both green (the DoD gate runs these).
- No diff outside `frontend/src/os/` (plus prompt archive + DEVLOG).
- Prompt archived to `prompts/_done/`, DEVLOG entry (mark the god-file series closed: 47 GoalPopup, 48 CommandPanel, 49 GoalCanvas), one `chore:` commit.

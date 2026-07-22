# prompt-47 — Split GoalPopup.tsx: extract KpiFieldsRow, ParentPicker, OwnerPicker

**For:** Claude Code (GitHub Actions worker, `task/**` push path).
**Branch:** the dispatched `task/prompt-47-*` branch. **Commit type:** `chore:` (pure refactor, no behavior change).
**Read scope:** `frontend/src/os/GoalPopup.tsx` and the new files only. Token economy: do not scan other components; `docs/MAP.md` exists if orientation is needed.

## Why

`frontend/src/os/GoalPopup.tsx` is ~42 KB — every pass that touches it pays to read the whole file. Three self-contained components live inside it and can move out cleanly, cutting the file roughly in half. First slice of the god-file series (CommandPanel and GoalCanvas follow in later prompts).

## Scope

DO: move these three top-level function components from `GoalPopup.tsx` into their own files under `frontend/src/os/`:

1. `KpiFieldsRow` (currently at ~line 43) → `frontend/src/os/KpiFieldsRow.tsx`
2. `ParentPicker` (~line 129, with its restoration comment) → `frontend/src/os/ParentPicker.tsx`
3. `OwnerPicker` (~line 173, with its provenance comment referencing prompt 45 / ADR-0007) → `frontend/src/os/OwnerPicker.tsx`

Mechanics:
- Each new file: the component as default or named export (match how GoalPopup references it), its props type, and ONLY the imports it actually needs. Move component-specific helpers/constants used by exactly one extracted component along with it (e.g. if `QUADRANTS` at ~line 120 is used only by one of them, it moves; if shared, it stays in GoalPopup and gets exported or moved to an existing shared module — pick the smallest change).
- `GoalPopup.tsx` imports the three components; its rendered output must be byte-identical in behavior — this is a move, not a rewrite. Preserve all existing comments (including the RealGoalCard restoration note) in the moved code.
- Russian UI strings stay untouched.

DO NOT: change any logic, props, styling, or state; touch `CommandPanel.tsx`, `GoalCanvas.tsx`, `backend/`, canon docs, or `.github/`. No renames of the components themselves.

## Issue cleanup (rides along)

The final commit message must include the footer line:

```
Closes #51
```

(#51 is a stale `worker-failure` alarm from the prompt-46 run whose retry actually succeeded — merging this PR to main auto-closes it.)

## Definition of Done

- `GoalPopup.tsx` no longer defines the three components and is substantially smaller (~<25 KB); the three new files exist and are imported.
- `cd frontend && npm run lint && npm run build` both green (the DoD gate runs these).
- No diff outside `frontend/src/os/` (plus prompt archive + DEVLOG).
- Commit footer `Closes #51` present. Prompt archived to `prompts/_done/`, DEVLOG entry, one `chore:` commit.

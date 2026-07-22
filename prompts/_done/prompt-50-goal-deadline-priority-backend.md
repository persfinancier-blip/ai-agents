# prompt-50 — Goal deadline + importance/urgency: ADR + backend slice

**For:** Claude Code (GitHub Actions worker, `task/**` push path).
**Branch:** the dispatched `task/prompt-50-*` branch. **Commit type:** `feat:`.
**Canon:** new `docs/adr/0008-goal-deadline-importance-urgency.md`; pattern references: ADR-0006/0007 style, backend zone rules in `.claude/rules/`, `docs/MAP.md` for orientation. Owner decisions (2026-07-22): deadline is a **date** (no time); importance and urgency are **each a yes/no flag** (Eisenhower quadrant is derived in UI, never stored).

## Why

`GoalPopup` sections «СРОК» and «ВАЖНОСТЬ · СРОЧНОСТЬ» are dashed stubs waiting for backend fields (owner decision 2026-07-15: "это задача для бэкенда", BACKLOG item). This is the backend half; the popup UI comes in the next prompt (51).

## Scope

DO:

1. **ADR-0008** (`docs/adr/0008-goal-deadline-importance-urgency.md`, Russian, style of 0006/0007): fields on Goal — `deadline: date | null`, `importance: bool | null`, `urgency: bool | null`. Record: null = «не задано» (distinct from false = «неважно/несрочно»); the Eisenhower quadrant (делать/планировать/делегировать/отложить) is DERIVED from the two flags in the UI and not stored; deadline does NOT participate in `compute_definiteness` (fog/defined logic unchanged — an open question can note whether деделайн должен влиять на «определённость», решение отложено).
2. **Migration** (Alembic): three nullable columns on the `goal` table. No data backfill (all existing goals get null).
3. **Model/schemas**: `Goal` model + `GoalRead`/`GoalCreate`/`GoalPatch` extended; PATCH semantics — field absent = untouched, explicit null = unset (same diff-style the API already uses for other optional fields; follow the existing pattern in `patch_goal`).
4. **Validation**: `importance`/`urgency` accept only bool/null (pydantic handles it); `deadline` accepts ISO date. No range limits on deadline (past dates allowed — retro goals exist).
5. **Tests** (pytest, existing style): create with/without new fields; patch set/unset each field; patch absent = untouched; GoalRead returns them; `compute_definiteness` unaffected by all three.
6. **Seed**: extend `scripts/seed_demo_goals.py` so a couple of demo goals carry a deadline and flags (visual material for prompt-51).
7. **BACKLOG**: mark the backend half of the item done, note UI half goes to prompt-51.

DO NOT: touch `frontend/` (popup wiring is prompt-51), `compute_definiteness` logic, KPI/link/unit code paths, `.github/`. One vertical slice, one `feat:` commit.

## Definition of Done

- ADR-0008 exists; migration applies (`alembic upgrade head`); schemas/service/tests extended.
- `ruff check`, `ruff format --check`, `python -m mypy app`, `pytest` all green (the DoD gate runs these).
- No frontend diff. Prompt archived to `prompts/_done/`, DEVLOG entry, one `feat:` commit.

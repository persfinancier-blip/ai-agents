# Prompt #32: Step F6 — goal decomposition from the goal card and canvas

### `feat/frontend-goal-decomposition`, `feat: goal decomposition from goal card and canvas`

> **For:** Claude Code. Owner's product request: a manager opens a goal card and sees no obvious tool to break the goal into subgoals; the card must split into "context above" (parents) and "decomposition below" (subgoals + add). Backend is NOT touched — `POST /goals` with `parent_id` exists (F3, `createGoal`/`GoalCreate` in `frontend/src/api.ts` / `types.ts`); verify before starting.
> **Model/mode:** Sonnet, normal mode (guardrails in `.claude/settings.json` — do not touch).
> **Canon:** `Management_Model.md` §3 (goal setting; decomposition = child goals via `parent_id`); `Visual_Reference.md` Part II tokens only. Owner decisions (2026-07-15): parent context = **parent + grandparent (2 levels), not the full chain to root**; «+ подцель» entry — **both card and canvas**.
> **Precondition:** main at PR #13 (`1a0ba42`) or later, clean tree. Step 0 — preflight: `git status` + `git log origin/main..HEAD`; anything dirty/unpushed — surface and untangle deliberately, no blind merges.

## Scope

**Do:**

1. **«+ подцель» in the goal card** (`frontend/src/os/RealGoalCard.tsx`): in the subgoals list (currently the «СТРУКТУРА — РОДИТЕЛЬ И ПРЯМЫЕ ПОДЦЕЛИ» section) add a `radd`-style button «+ подцель» that opens an inline name input (the F3 pattern, prompt #22: `Enter` → commit, `Escape`/empty name → cancel without a request, real `input` with `aria-label`). Commit → `createGoal({ name, parent_id: <current goal id> })` → full `reload()` (no optimism, as everywhere since F3). The new goal is honestly born in fog (no owner, no KPI) — expected, don't compensate.
2. **Card restructure** (`RealGoalCard.tsx`): split the single structure section into two:
   - **«КОНТЕКСТ» (chain up, 2 levels):** grandparent (if any) above parent, then the current goal implied below. Extend `fetchGoalData` to also fetch the grandparent (`parent.parent_id` → `getGoal`, same silent-null error handling as the parent fetch today). Rows keep the existing `wstage` click-to-navigate pattern (`goTo`). If the parent chain is deeper than 2 levels, do NOT fetch further — 2 levels is the owner's decision, note it in a comment.
   - **«ДЕКОМПОЗИЦИЯ» (chain down):** direct subgoals (existing `children` rows) + the «+ подцель» affordance from item 1. Empty state: keep an honest empty row («подцелей нет — добавьте первую») instead of the current combined "no related goals" row when a parent exists.
   - The «РОДИТЕЛЬ И РАЗМЕЩЕНИЕ» section (parent picker + backlog toggle) stays as is — it is the *editing* tool; «КОНТЕКСТ» is the *reading* tool. Don't merge them in this slice.
3. **«+ подцель» on the canvas** (`frontend/src/os/GoalCanvas.tsx`): render one extra node in the subgoal sector styled like `gc-sub` but visually a draft (dashed border — draft semantics per the design canon; new class in the `gc-*` style if needed), labeled «+ подцель». Click → inline name input (same commit/cancel semantics as item 1; place the input where the node is or in a small popover — follow the existing draft-popover pattern from F5). Commit → `createGoal({ name, parent_id })` → full canvas reload (`fetchCanvasData`). `Escape` closes the draft first, then falls through to the existing Escape chain (factor → link → action-choice → back).
4. **BACKLOG.md — two new lines in the same PR** (owner's decision, do not implement either):
   - execution business process for goals (requires an ADR pair + a backend slice);
   - goal-map layout: node overlap on dense maps (separate layout slice).

**Don't (deliberately):**

- Backend untouched — no new routes, no schema/service/migration changes.
- No execution/business-process UI — BACKLOG line only.
- No map-layout work (node overlap) — BACKLOG line only.
- Full parent chain to root — no (owner fixed 2 levels for this slice).
- General goal map (`buildGoalForest` view): no «+ подцель» entry there; card + canvas only.
- Demo components (`GoalCard.tsx`, `data.ts`, `goals.ts`) untouched.

## Constraints

- UI text Russian; existing v2 tokens/classes only (new classes in the `gc-*`/card style; divergences → "Открытые вопросы" of Part II). Dashed = draft/future — don't repurpose state semantics.
- Accessibility as in F3–F5: real inputs with `aria-label`, Enter/Escape, focus outlines, reduced-motion respected.
- PowerShell 5.1 — one command at a time; in venv only `python -m X`. After merge — `git push origin main`.

## Definition of Done

- [ ] `cd frontend`: `npm run build`, `npm run lint` — green; `cd backend`: pytest, ruff check, ruff format --check, `python -m mypy app` — green (control, nothing should change there).
- [ ] Playwright pass (seeded DB): goal card shows «КОНТЕКСТ» (grandparent + parent, both navigate on click; root goal → no context rows) and «ДЕКОМПОЗИЦИЯ»; «+ подцель» in card creates a child in fog and it appears in the list after reload; «+ подцель» on canvas creates a child and the node appears after reload; Escape cancels both drafts without a request; deeper-than-2 chains show exactly 2 levels.
- [ ] `docs/DEVLOG.md` — entry; `BACKLOG.md` — F6 line («Декомпозиция цели из карточки») → `[x]` with branch reference + the two new lines from Scope item 4.
- [ ] One commit on `feat/frontend-goal-decomposition`, PR merged into `main`, pushed, clean tree (`git status` empty, origin synced).
- [ ] This prompt file committed to `prompts/_done/` as part of the same PR; `prompts/README.md` table updated.

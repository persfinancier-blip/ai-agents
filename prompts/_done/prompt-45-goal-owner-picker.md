# Prompt #45: slice 45 — goal owner picker in GoalPopup (assign unit OR group, with search)

### commit type `feat:`, e.g. `feat: goal owner picker — assign unit or group from popup (slice 45)`

> **For:** Claude Code worker (unattended, file-driven dispatch → `task/**` branch → one PR → DoD gate → auto-merge). **Frontend zone → the auto-merge gate runs only `npm run lint` + `npm run build`** (Playwright is your own self-check, NOT gate-enforced) — so make sure the picker actually renders and assigns at runtime before finishing; don't merge a compiling-but-broken picker.
> **Milestone:** UI-юниты — the assignment half of «список, назначение из попапа». Slice 43 shipped the read-only units list; slice 44 (ADR-0007) shipped the grouping backend. This slice makes goal ownership **editable from the goal popup**, and ownership can now be an atomic unit **or** a group (department/team).
> **Owner's intent:** in the goal card popup, assign «отв.» (owner) by picking from a searchable list of units and groups. This is exactly the search/quick-select the owner asked for.
> **Model/mode:** Sonnet, effort medium. Frontend only; backend (slices 41/44) is done and **not touched**.
> **Canon:** ADR-0006 (unit = owner via `goal.unit_id`), ADR-0007 (owner may be a unit or a group; `goal.unit_id` → any workforce Entity); `Visual_Reference.md` Part II — D9 overlay/bubble pattern, D10 identity colors, mono only for numbers/codes.
> **Precondition:** main at `6609044`, clean tree. **Step 0:** `git log -1 --name-only` to find this prompt file; `git status`.
> **Turn economy (soft):** `GoalPopup.tsx` is ~35KB — don't read it whole; `grep` for the existing **slice-37 parent-assignment row** («родитель…» + picker-bubble) and mirror that exact pattern for the owner row. Don't re-read all of `CommandPanel.tsx`.

## Backend contract (already shipped — read, don't change)

- `GET /api/v1/units` → `UnitRead[]` = `{ entity_id, name, kind, description, created_at }`. `kind ∈ {employee, agent, external, device}`.
- `GET /api/v1/unit-groups` → `UnitGroupRead[]` = `{ entity_id, name, kind, description, parent_id, created_at }`. `kind ∈ {department, team}`.
- Assign owner: `PATCH /api/v1/goals/{id}` with `{ "unit_id": "<entity_id>" }` where the id is a unit's OR a group's `entity_id`. Clear owner: `{ "unit_id": null }`. Backend validates (unit or group → ok; unknown id → 404; other entity → 422). On success `GoalRead.unit_id`/`unit_name` reflect the choice (`unit_name` resolves from unit **or** group).

## Scope

**Do:**

1. **Types** (`frontend/src/types.ts`): add
   ```ts
   export type UnitGroupKind = 'department' | 'team'
   export interface UnitGroupRead {
     entity_id: string
     name: string
     kind: string
     description: string | null
     parent_id: string | null
     created_at: string
   }
   ```
2. **API client** (`frontend/src/api.ts`): add `export const listUnitGroups = () => request<UnitGroupRead[]>('/unit-groups')` (import `UnitGroupRead`), mirroring `listUnits`. `patchGoal` already exists and already accepts `{ unit_id }` (GoalPatch) — reuse it, no change.
3. **Labels** (`frontend/src/os/units.ts`): add `GROUP_KIND_LABEL: Record<UnitGroupKind, string>` = `department: 'Департамент'`, `team: 'Команда'`, plus a `groupKindLabel(kind: string)` fallback helper mirroring the existing `unitKindLabel`.
4. **Owner picker in `GoalPopup.tsx`** — mirror the **slice-37 parent-assignment** row+bubble:
   - Turn the owner line («отв. …») into an actionable row. Current owner = `GoalRead.unit_name` (or «— не назначен»). Clicking opens a picker-bubble (same `.gpop`/`.ov` overlay pattern, D9).
   - The bubble loads units (`listUnits`) and groups (`listUnitGroups`) once, and shows a **search/filter `<input>`** that filters both by name (case-insensitive substring). Group options into labelled sections: «Юниты», «Департаменты», «Команды» (only non-empty sections). Each option shows the name + a small kind chip (`unitKindLabel`/`groupKindLabel`, D10 color if available). React key = `entity_id`.
   - Selecting an option → `patchGoal(goalId, { unit_id: entity_id })` → on success call the popup's existing `onChanged`/refresh so the map + popup reflect the new owner (and definiteness may flip fog↔defined). Include a «Снять» / «— не назначен» choice → `patchGoal(goalId, { unit_id: null })`.
   - Honest failure: on `ApiError` show an inline message (reuse the popup's existing error idiom), leave state unchanged. Loading + empty («нет юнитов и групп») states handled.
   - **Edit mode required.** If the slice-37 parent pattern also covers create mode trivially, include it; otherwise leave create-mode owner-setting out of scope (the goal can be created then assigned).
5. **Playwright self-verification** on a seeded DB (a few units + at least one department and one team, and a goal): open the goal popup → open the owner picker → type in the search to filter → pick a **group** → assert the owner row now shows that group's name; reopen and pick a **unit** → assert it updates; use «Снять» → assert owner clears. Screenshot the open picker (search + sections visible) → `renders/slice45-owner-picker.png`.

**Don't (deliberately):**

- **No department tree / team-membership UI in the units panel** — that's the next slice.
- No unit/group **creation or editing** from this UI (no forms); owner picking only.
- No backend changes; no new deps; no new tokens/animations. Don't touch the demo mock (`data.ts`) or `compute_definiteness`.

## Constraints

- UI text Russian; code / comments / commits English. Existing tokens only (`src/index.css`, `src/os/os.css`); mono reserved for numbers/codes.
- PowerShell 5.1 — one command at a time; venv Python as `python -m X`.

## Definition of Done

- [ ] `npm run build` + `npm run lint` green (the hard auto-merge gate). Backend untouched.
- [ ] Playwright scenario from Scope item 5 passes; screenshot at `renders/slice45-owner-picker.png`.
- [ ] **Tail cleanup:** move this prompt file to `prompts/_done/prompt-45-goal-owner-picker.md`; update `prompts/README.md`. `docs/DEVLOG.md` entry (`/devlog`); `BACKLOG.md`: close the owner-picker line, keep «дерево департаментов/команды в панели юнитов» open as the next slice.
- [ ] One commit; worker opens the PR; gate green → auto-merge; clean tree.
- [ ] Report back with the screenshot path and confirm the next slice is «department tree + teams in the units panel».

# Prompt #46: slice 46 — department tree + teams in the units panel (read-only)

### commit type `feat:`, e.g. `feat: department tree and teams in units panel (slice 46)`

> **For:** Claude Code worker (unattended, file-driven dispatch → `task/**` branch → one PR → DoD gate → auto-merge). **Frontend zone → the auto-merge gate runs only `npm run lint` + `npm run build`** (Playwright is your own self-check, NOT gate-enforced) — make sure the tree actually renders at runtime before finishing.
> **Milestone:** UI-юниты, final display slice. Slice 43 shipped the flat units list; slice 44 (ADR-0007) shipped the grouping backend; slice 45 shipped the goal owner picker. This slice makes the **units panel** show the department **tree** (units under their home department) and the **teams** with their members. Read-only — no membership editing in this slice.
> **Owner's intent:** see the unit hierarchy — which units live in which department (nested), and who is on which team.
> **Model/mode:** Sonnet, effort medium. Frontend only; backend (slices 41/44) is done and **not touched** — it already exposes everything needed.
> **Canon:** ADR-0007 (department = strict single-parent tree via `unit.department_id` + `unit_group.parent_id`; team = m2m overlay); `Visual_Reference.md` Part II — D10 identity colors, mono only for numbers/codes.
> **Precondition:** main at `665e88c`, clean tree. **Step 0:** `git log -1 --name-only` to find this prompt file; `git status`.
> **Turn economy (soft):** the file to edit is small (`frontend/src/os/UnitsPanel.tsx`, ~85 lines). Read it + `os/units.ts` + the relevant `api.ts`/`types.ts` lines; don't sweep the whole repo.

## Backend contract (already shipped — read, don't change)

- `GET /api/v1/units` → `UnitRead[]` = `{ entity_id, name, kind, description, department_id, created_at }`. `department_id` is the unit's **home department** (a `unit_group.entity_id` of kind `department`), or `null`.
- `GET /api/v1/unit-groups` → `UnitGroupRead[]` = `{ entity_id, name, kind, description, parent_id, created_at }`. `kind ∈ {department, team}`; `parent_id` nests departments (null = root department).
- `GET /api/v1/unit-groups/{team_id}/members` → `string[]` (unit `entity_id`s on that team).

## Scope

**Do:**

1. **Types** (`frontend/src/types.ts`): add `department_id: string | null` to the existing `UnitRead` interface (backend already returns it; the field is currently missing on the frontend type). `UnitGroupRead` already exists (slice 45).
2. **API client** (`frontend/src/api.ts`): add `export const listTeamMembers = (teamId: string) => request<string[]>(\`/unit-groups/${encodeURIComponent(teamId)}/members\`)`. `listUnits` + `listUnitGroups` already exist.
3. **Rework `UnitsPanel.tsx`** (keep the `.ov`/`gpop-col units-col` overlay shell + close button + loading/error states; replace the flat list body):
   - On mount, `Promise.all([listUnits(), listUnitGroups()])`; then for every group of `kind === 'team'`, fetch its members (`Promise.all(teams.map(t => listTeamMembers(t.entity_id)))`) and build a `teamId → unitId[]` map. One combined loading state; one error state («Не удалось загрузить юнитов»).
   - **Department tree section** «Департаменты»: build a forest from groups where `kind === 'department'`, nested by `parent_id` (root = `parent_id === null`). Render recursively with indentation (nesting depth → left padding). Under each department, list the units whose `department_id === department.entity_id` (name + kind chip via `unitKindLabel`/`unitKindColor`). A department with no units and no children still shows (empty department is valid).
   - **«Без департамента»** section: units with `department_id === null` (or pointing at a non-existent / non-department id) — flat list, after the tree.
   - **Teams section** «Команды»: each team (flat) with its member unit names (resolve ids via a `unitId → UnitRead` map). Team with no members → «— пусто».
   - Empty overall (no units and no groups) → keep «Юнитов пока нет».
   - Read-only: no add/remove/assign controls in this slice.
4. **Styles:** reuse existing `unit-row`/`unit-chip`/`unit-name`/`hint` classes; add minimal indentation/section-caption CSS in `os.css` only if needed (no new tokens/colors).
5. **Playwright self-verification** on a seeded DB: create a nested department (parent + child), units with home departments (incl. one in the child dept and one with no department), and a team with ≥2 members. Open the panel → assert: the child department renders indented under its parent; a unit appears under its home department; the «Без департамента» unit appears in that section; the team lists its member names. Screenshot the open panel → `renders/slice46-units-tree.png`.

**Don't (deliberately):**

- **No membership editing** — no assigning a unit's home department, no add/remove-to-team, no group create/edit/delete. Display only. (Editing is a possible later slice.)
- No goal-owner picker changes (slice 45 is done). No backend changes; no new deps; no new tokens.

## Constraints

- UI text Russian; code / comments / commits English. Existing tokens only; mono reserved for numbers/codes.
- PowerShell 5.1 — one command at a time; venv Python as `python -m X`.

## Definition of Done

- [ ] `npm run build` + `npm run lint` green (the hard auto-merge gate). Backend untouched.
- [ ] Playwright scenario from Scope item 5 passes; screenshot at `renders/slice46-units-tree.png`.
- [ ] **Tail cleanup:** move this prompt file to `prompts/_done/prompt-46-units-panel-tree.md`; update `prompts/README.md`. `docs/DEVLOG.md` entry (`/devlog`); `BACKLOG.md`: close the «дерево департаментов/команды в панели» line — the units UI milestone (list → grouping backend → owner picker → tree) is complete.
- [ ] One commit; worker opens the PR; gate green → auto-merge; clean tree.
- [ ] Report back with the screenshot path; note the units-UI milestone is complete (membership-editing UI is the only remaining optional follow-up).

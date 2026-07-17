# Prompt #43: slice 43 — units list panel (read-only) wired to `/api/v1/units`

### commit type `feat:`, e.g. `feat: units list panel wired to /api/v1/units (slice 43)`

> **For:** Claude Code worker (unattended, file-driven dispatch → `task/**` branch → one PR → DoD gate → auto-merge). Fallback: owner-run `Выполни prompts/prompt-43-unit-list-panel.md по шагам, строго в рамках Scope`.
> **Milestone:** UI-юниты, срез 1 of the roadmap line «UI-милестон юнитов (список, назначение из попапа)» (`prompts/README.md` → «Что дальше по плану», п. 3). This slice does the **list** only; unit **assignment from the goal popup** is a later slice — do not start it here.
> **Owner's intent:** show the real Unit entities from the backend as a readable list in the OS shell, with Russian labels for the four atomic kinds. Read-only — no create/edit/delete of units in this slice.
> **Model/mode:** Sonnet, effort medium. Frontend-only; backend is already done (slice 41) and is **not touched**.
> **Canon:** `Management_Model.md` §2 and §6 (Unit = atomic executor: сотрудник / агент / вне контура / устройство; ADR-0006); `docs/adr/0006-unit-entity-and-goal-ownership.md`; `Visual_Reference.md` Part II — identity colors (D10), rail/HUD patterns, mono only for numbers/codes.
> **Backend contract (already shipped, slice 41 — read, don't change):** `backend/app/api/v1/units.py` exposes `GET /api/v1/units` → `list[UnitRead]`; `UnitRead = { entity_id: str, name: str, kind: str, description: str | null, created_at: datetime }` (`backend/app/schemas/unit.py`). `kind ∈ {employee, agent, external, device}` (`UnitKind`, `backend/app/models/unit.py`).
> **Precondition:** main at `7798b3a`, clean tree. **Step 0 — preflight:** `git status` + `git log origin/main..HEAD`; if dirty/unpushed — surface and untangle deliberately, don't blind-merge.

## Scope

**Do:**

1. **Types** (`frontend/src/types.ts`): add `UnitKind = 'employee' | 'agent' | 'external' | 'device'` and `UnitRead` mirroring the pydantic schema above (`entity_id`, `name`, `kind: string`, `description: string | null`, `created_at: string`). Mirror the existing comment style («зеркало … backend/app/schemas/unit.py»).
2. **API client** (`frontend/src/api.ts`): add `listUnits = () => request<UnitRead[]>('/units')` (and `getUnit` if trivially symmetric with the goals client — optional). Follow the exact pattern of `listGoals`/`getGoal`.
3. **Kind labels:** a small RU label map `UNIT_KIND_LABEL: Record<UnitKind, string>` — `employee → 'Сотрудник'`, `agent → 'Агент'`, `external → 'Вне контура'`, `device → 'Устройство'`. Put it beside the units UI (a new `frontend/src/os/units.ts` helper, in the spirit of `goalFormat.ts`/`goalTree.ts`), not inline-scattered.
4. **Units panel** (new component in `frontend/src/os/`, e.g. `UnitsPanel.tsx`): read-only list that calls `listUnits()` on mount, renders each unit as a row — name, RU kind label, optional description; identity color per kind (D10) if the token system already carries one, otherwise a neutral chip. Handle the three states: loading, empty («Юнитов пока нет» — RU), and error (honest inline message, reuse `ApiError` like the goal code does).
5. **Surface it in the OS shell** (`frontend/src/os/CommandPanel.tsx`): reach the panel from the existing rail/HUD as a non-intrusive overlay/toggle, following current patterns (see how `AdvisorOrb`/other rail elements are mounted). It must be reachable and must **not** disturb the goal map or existing interactions. Exact placement is your call within existing patterns.
6. **Playwright self-verification** on a DB seeded with a few units (seed via `POST /api/v1/units`, or an existing seed helper if one is present): open the shell → open the units panel → assert the seeded unit names and their RU kind labels are visible; assert the empty-state renders when no units exist. Screenshot the open panel → `renders/slice43-units-panel.png`. If the panel errors at runtime, fix before finishing — do not merge a blank/broken panel.

**Don't (deliberately):**

- **No unit assignment to goals** (no popup `unit_id` picker, no `patchGoal({unit_id})`) — that's the next slice.
- **No create / edit / delete of units** from the UI; no forms. Read-only.
- **Don't touch the demo mock** `UNITS` in `frontend/src/os/data.ts` or the resource-load logic in `goals.ts`/`goalTree.ts` that depends on it — the demo canvas keeps its old mock (old kinds `human|digital|…`) for now; this slice adds a *separate* real-data panel. Reconciling the demo mock with real units is a later, explicitly-scoped slice.
- No backend changes; no new dependencies; no new design tokens/animations beyond what's already defined.

## Constraints

- UI text Russian; code / comments / commits English. Existing tokens only (`src/index.css`, `src/os/os.css`); mono reserved for numbers/codes.
- Entity-subtype note: `UnitRead.entity_id` is the unit's stable id (it *is* the entity id) — use it as the React key.
- PowerShell 5.1 — one command at a time; venv Python as `python -m X`.

## Definition of Done

- [ ] `npm run build` + `npm run lint` green (this is the hard auto-merge gate for the frontend zone). Backend suite untouched — control-run only if you touched anything under `backend/` (you shouldn't).
- [ ] Playwright scenario from Scope item 6 passes; screenshot at `renders/slice43-units-panel.png`.
- [ ] `docs/DEVLOG.md` entry (`/devlog`); `BACKLOG.md`: add/close the slice-43 line, keep the «назначение юнита из попапа» line open as the next slice.
- [ ] One PR (worker opens it; gate green → auto-merge). Prompt file committed into `prompts/_done/prompt-43-unit-list-panel.md` as part of the same PR; `prompts/README.md` «Активные»/history updated. Finish with a clean tree, `origin` synced.
- [ ] Report back with the screenshot path and confirm the next slice is «unit assignment from the goal popup».

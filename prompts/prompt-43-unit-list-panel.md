# Prompt #43 (take 2): slice 43 — units list panel (read-only) wired to `/api/v1/units`

### commit type `feat:`, e.g. `feat: units list panel wired to /api/v1/units (slice 43)`

> **For:** Claude Code worker (unattended, file-driven dispatch → `task/**` branch → one PR → DoD gate → auto-merge).
> **Retry note:** the first dispatch of this slice died at the old `--max-turns 40` cap having committed **zero** code (only the dispatcher's own prompt-file commit). That cap is now **1000 turns / 60 min** (`claude.yml` on `main`, `1bddc95`), so turns are no longer the constraint — but **stay strictly inside Scope**; more turns is not licence to widen the slice.
> **Milestone:** UI-юниты, срез 1 of «UI-милестон юнитов (список, назначение из попапа)» (`prompts/README.md` → «Что дальше по плану», п. 3). This slice does the **list** only; unit **assignment from the goal popup** is the next slice — do not start it here.
> **Owner's intent:** show the real Unit entities from the backend as a readable list in the OS shell, with Russian labels for the four atomic kinds. Read-only — no create/edit/delete of units.
> **Model/mode:** Sonnet, effort medium. Frontend-only; backend (slice 41) is **not touched**.
> **Canon:** `Management_Model.md` §2 and §6 (Unit = atomic executor: сотрудник / агент / вне контура / устройство; ADR-0006); `docs/adr/0006-unit-entity-and-goal-ownership.md`; `Visual_Reference.md` Part II — identity colors (D10), rail/HUD patterns, mono only for numbers/codes.
> **Backend contract (already shipped, slice 41 — read, don't change):** `GET /api/v1/units` → `list[UnitRead]`; `UnitRead = { entity_id: str, name: str, kind: str, description: str | null, created_at: datetime }` (`backend/app/schemas/unit.py`). `kind ∈ {employee, agent, external, device}` (`UnitKind`, `backend/app/models/unit.py`). Routes in `backend/app/api/v1/units.py`.
> **Precondition:** main at `7536785`, clean tree. **Step 0 — preflight:** `git log -1 --name-only` to find this prompt file; `git status`.
> **Turn economy (soft):** don't read the whole 49KB `CommandPanel.tsx` — `grep` for the rail/HUD mount points and the overlay/toggle pattern (e.g. how `AdvisorOrb` is mounted) and read only those regions.

## Scope

**Do:**

1. **Types** (`frontend/src/types.ts`): add, mirroring the pydantic schema (comment style «зеркало … backend/app/schemas/unit.py»):
   ```ts
   export type UnitKind = 'employee' | 'agent' | 'external' | 'device'
   export interface UnitRead {
     entity_id: string
     name: string
     kind: string
     description: string | null
     created_at: string
   }
   ```
2. **API client** (`frontend/src/api.ts`): add `export const listUnits = () => request<UnitRead[]>('/units')` (import `UnitRead`), following the exact pattern of `listGoals`. `getUnit` optional if trivially symmetric.
3. **Kind labels** — new `frontend/src/os/units.ts` helper (spirit of `goalFormat.ts`):
   ```ts
   import type { UnitKind } from '../types'
   export const UNIT_KIND_LABEL: Record<UnitKind, string> = {
     employee: 'Сотрудник', agent: 'Агент', external: 'Вне контура', device: 'Устройство',
   }
   ```
4. **Units panel** — new `frontend/src/os/UnitsPanel.tsx`: read-only list calling `listUnits()` on mount; each unit row shows name, RU kind label (via `UNIT_KIND_LABEL`, fall back to raw `kind` if unknown), optional description; identity color per kind (D10) if a token exists, else a neutral chip. Handle three states: loading, empty («Юнитов пока нет»), error (honest inline message, reuse `ApiError` like the goal code). React key = `entity_id`.
5. **Surface it in the OS shell** (`frontend/src/os/CommandPanel.tsx`): reach the panel from the existing rail/HUD as a non-intrusive overlay/toggle, following current patterns. Must be reachable and must **not** disturb the goal map or existing interactions. Placement is your call within existing patterns.
6. **Playwright self-verification** on a DB seeded with a few units (seed via `POST /api/v1/units`, or an existing seed helper): open shell → open units panel → assert seeded unit names and their RU kind labels are visible; assert the empty-state renders with no units. Screenshot the open panel → `renders/slice43-units-panel.png`. If the panel errors at runtime, fix before finishing — do not merge a blank/broken panel.

**Don't (deliberately):**

- **No unit assignment to goals** (no popup `unit_id` picker, no `patchGoal({unit_id})`) — next slice.
- **No create / edit / delete of units** from the UI; no forms. Read-only.
- **Don't touch the demo mock** `UNITS` in `frontend/src/os/data.ts` or the resource-load logic in `goals.ts`/`goalTree.ts` — the demo canvas keeps its old mock for now; this slice adds a *separate* real-data panel.
- No backend changes; no new dependencies; no new design tokens/animations.

## Constraints

- UI text Russian; code / comments / commits English. Existing tokens only (`src/index.css`, `src/os/os.css`); mono reserved for numbers/codes.
- PowerShell 5.1 — one command at a time; venv Python as `python -m X`.

## Definition of Done

- [ ] `npm run build` + `npm run lint` green (the hard auto-merge gate for the frontend zone). Backend untouched.
- [ ] Playwright scenario from Scope item 6 passes; screenshot at `renders/slice43-units-panel.png`.
- [ ] **Tail cleanup:** move this prompt file to `prompts/_done/prompt-43-unit-list-panel.md` (this removes the stray root copy that a prior merge left on `main`); update `prompts/README.md` («Активные» → empty, add slice-43 to history). `docs/DEVLOG.md` entry (`/devlog`); `BACKLOG.md`: close the slice-43 line, keep «назначение юнита из попапа» open as the next slice.
- [ ] One commit; worker opens the PR; gate green → auto-merge. Finish with a clean tree.
- [ ] Report back with the screenshot path and confirm the next slice is «unit assignment from the goal popup».

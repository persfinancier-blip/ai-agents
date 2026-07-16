# Prompt #38 (v2): slice 38 — hover controls on map nodes and edges

> Replaces the v1 draft of prompt #38 (node «+» only). Owner extended the slice: BOTH hover mechanisms in one pass. Drag-edges remain slice 39 (separate prompt). Queue: 37 parent (done, PR #20) → **38 this** → 39 drag.

### `feat/frontend-map-hover-controls`, `feat: hover controls on map nodes and edges (slice 38)`

> **For:** Claude Code. Owner's spec, verbatim intent:
> — hover on a **node** (goal tile) → icon row **«+ ‖ ⬡ ×»**: add child / pause / assign process (stub) / delete goal;
> — hover on an **edge** → **«+ ×»**: insert a goal between the two / remove the link (null the child's parent).
> Creation always goes through **the ordinary goal card (GoalPopup), empty** — no mini-forms; the goal exists in the DB only after the name is committed.
> **Model/mode:** Sonnet, effort medium — hover affordances + a create mode + one two-phase mutation; no backend. The insert-between flow is the only genuinely tricky part — do it carefully.
> **Canon:** `Management_Model.md` §3; `Visual_Reference.md` Part II — D9 «один оверлей-паттерн», D6 (dashed = draft/future/no-data), identity colors (D10) only for branch identity.
> **Precondition:** main at PR #20 (`daf0134`), clean tree. **Step 0 — preflight:** `git status` + `git log origin/main..HEAD`; untangle anything dirty deliberately.

## Scope

**Do:**

### A. Node hover — icon row «+ ‖ ⬡ ×»

1. Pointer over / keyboard focus on a real-map node (`RealGoalMap` in `CommandPanel.tsx`; demo map untouched) → a compact row of bare-glyph icon buttons appears by the node (bare glyphs + tooltips, exactly the card's icon-row discipline; each a real `<button>` with `aria-label`, visible focus, `prefers-reduced-motion` respected). Icons must not intercept the node's own click (open card) or the canvas double-click.
2. **«+» — добавить подцель:** opens `GoalPopup` in **create mode** with `parentId` = node id:
   - Card renders empty in the usual overlay: name field already in edit mode with focus; description/owner as dashed empty affordances; KPI «+ добавить KPI», status icons, parent row, risk — inert dashed/disabled placeholders (goal doesn't exist yet); orb in fog style.
   - Commit of a non-empty name (Enter/blur) → `createGoal({ name, parent_id })` → fog child; popup switches seamlessly to normal edit mode of the created goal (controls enable, real badges, branch color), map refreshes — node+edge appear immediately. Then the normal «слёту заполняешь» PATCH flow.
   - Escape/✕/backdrop before name commit → close, zero requests. Empty name = cancel, not create. `createGoal` failure → honest inline error («Не удалось создать цель» / «Нет связи с сервером»), name stays editable for retry.
3. **«‖» — пауза:** toggles `is_backlog` via PATCH (no popup): active goal shows ‖ («пауза — в бэклог»), a backlogged goal shows ▶ («вернуть на карту») — same semantics as the card's play/pause pair; map refreshes after.
4. **«⬡» — назначить бизнес-процесс:** stub, muted/dashed, inert — the process entity doesn't exist in the model yet (BACKLOG, needs ADR). Owner wants an **active/inactive indication by "process assigned"** — impossible until the field exists; implement the icon as always-inactive now with `title` «назначить процесс — скоро», and record in BACKLOG: «после ADR процесса иконка на узле показывает активно/неактивно по признаку назначенного процесса». Use the same glyph the card uses for process.
5. **«×» — удалить цель:** the card's delete flow verbatim: `window.confirm`, on 409 — cascade confirm; on success map refreshes (and the card closes if it was open on that goal).

### B. Edge hover — «+ ×»

6. Real-map edges are SVG lines; give each a comfortable hover zone (e.g. an invisible wider stroke overlay) → near the edge midpoint two small buttons appear: «+» and «×» (HTML buttons positioned over the SVG, or SVG `foreignObject` — pick the simpler that passes a11y: `aria-label`, focusable).
7. **«+» — вставить цель между** parent P and child C: opens `GoalPopup` in create mode, variant **insert-between**:
   - On name commit — **two mutations in order:** `createGoal({ name, parent_id: P })` → new goal N; then `patchGoal(C, { parent_id: N })`. Result: P → N → C.
   - **Honest failure handling (critical):** if the second PATCH fails, N already exists under P but C hasn't moved — do NOT pretend otherwise and do NOT auto-delete N. Show in the popup: «Цель создана, но перенос ветки не удался — привяжите „<имя C>" вручную», refresh the map (N visible under P), leave the popup on N in normal edit mode. No transactional illusions.
   - Escape before name commit → nothing happens, zero requests.
8. **«×» — удалить связь:** `patchGoal(C, { parent_id: null })` — the child becomes a root (fog rules apply naturally). No confirm (the action is cheap to reverse via the parent row / future drag), map refreshes, edge disappears.

### C. Verification

9. Playwright on seeded DB, end-to-end: node hover shows «+ ‖ ⬡ ×»; «+» → empty card → Esc before name → node count unchanged; again «+» → name+Enter → fog child+edge appear → add a KPI in the same popup; «‖» toggles backlog and back; «⬡» inert; «×» deletes with confirm (and cascade path on a goal with children); edge hover shows «+ ×»; edge «+» → name → P→N→C order verified on the map; edge «×» → child becomes root; existing flows intact (node click card, double-click draft, slice-37 parent row). Screenshot `renders/slice38-map-hover-controls.png` (edge controls visible, or two shots if one can't show both).

**Don't (deliberately):**

- No drag-created/reconnected edges (slice 39, next prompt). No edge types (этап/подцель…) — BACKLOG, ADR first.
- No hover controls on the demo map; demo components untouched.
- No mini-forms — the card is the only creation window. No confirm dialogs beyond delete.
- Backend untouched (`POST /goals` + `PATCH parent_id` cover everything).

## Constraints

- UI text Russian; code/comments/commits English. Existing tokens only; bare glyphs + tooltips, no legends; dashed = future/no-data; identity colors only for branch identity (D10); D6 traffic-light only for states.
- Accessibility as established. PowerShell 5.1 — one command at a time; venv `python -m X`. After merge — `git push origin main`.

## Definition of Done

- [ ] `npm run build` + `npm run lint` green; backend suite green (control).
- [ ] Full Playwright scenario from Scope C passes, including the insert-between failure-path logic reviewed in code (not necessarily simulated live) and the «Esc creates nothing» checks. Screenshot(s) at `renders/slice38-map-hover-controls.png`.
- [ ] `docs/DEVLOG.md` entry; `BACKLOG.md`: close slice-38 line; add «process icon active/inactive after process ADR»; slice 39 (drag) stays queued.
- [ ] One commit on `feat/frontend-map-hover-controls`, PR merged into `main`, pushed, clean tree; prompt file committed to `prompts/_done/`; `prompts/README.md` updated.
- [ ] Report back with the screenshot path — do NOT start slice 39 without a separate prompt.

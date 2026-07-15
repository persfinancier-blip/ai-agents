# Prompt #35 (final): Step F7a — goal card popup over the map, `RealGoalCard` page removed

> Replaces both earlier drafts of prompt #35. Owner signed off on the visual render (session 2026-07-15, v3): popup in the advisor-overlay style, borderless icon row, no jargon terms in UI. The tree is rendered in ONE place only — the goal map in `CommandPanel.tsx`; the goal card is a popup over it, and the old full-page card is deleted in this same slice (owner's call: cleaner than migrating it).

### `feat/frontend-goal-popup`, `feat: goal card popup over map, remove RealGoalCard page (F7a)`

> **For:** Claude Code.
> **Model/mode:** Sonnet, effort medium — one new component written fresh against an approved mockup + a clean deletion; patterns copied from existing code, no backend.
> **Canon:** `Management_Model.md` §3 (goal hierarchy); `Visual_Reference.md` Part II — D2 tokens, D5 catalog, D6 state semantics (green=done/ok, yellow=active/attention, red=risk/deficit, dashed=draft/future/no-data), D9: purple/cyan/orange/blue = branch/agent identity only, never state.
> **Precondition:** main at PR #17 (`96d05eb`) or later, clean tree. **Step 0 — preflight:** `git status` + `git log origin/main..HEAD`; if dirty/unpushed — surface and untangle deliberately (right branch, Conventional commit, no `git add .`), don't blind-merge. If untracked agent-memory feedback files from a prior session are present and harmless — separate `chore:` PR first; if unclear, leave them and note in DEVLOG.

## Scope

**Do:**

1. **New component `frontend/src/os/GoalPopup.tsx`** — written from scratch against the approved mockup, for **real goals only**. Demo map (`DemoGoalMap` → `GoalCard.tsx`, `data.ts`/`goals.ts`) keeps its current page flow, untouched.
   - **Overlay style = the advisor-orb overlay** (`.ov`/`.ov-bg`/`.ov-orb`/`.ov-name` in `os.css` ~657–703): darkened backdrop `rgba(8,9,14,.6)` over the stage, fade-in like `os-ov-in`. Left side — the goal's "orb": a large hex outline in the node's branch-identity color (reuse `branchStyle()` from `CommandPanel.tsx`) with a name pill under it (`.ov-name` pattern, border in the same identity color). Right side — the card panel: `var(--sf)` surface, `1px solid var(--ln)` border, `var(--r-card)` radius.
   - Wiring: clicking a `RealGoalMap` node sets `popupGoalId` state and renders the popup **inside `CommandPanel`** (no route change). Closing: `✕`, `Escape`, click on the backdrop. Double-click-to-create on empty canvas keeps working when the popup is closed.
   - Data: fetch fresh `getGoal(id)` on open (don't trust the map list); honest loading/404/error texts («Загрузка…» / «Цель не найдена — возможно, её удалили.» / «Не удалось загрузить цель»). After every successful mutation: re-fetch the goal AND `listGoals()` → refresh the map so node name/tone/backlog stay in sync. Mutations go through one `saveField(patch)` helper (PATCH → reload, no optimistic updates) — same discipline as the old card.
2. **Panel header — one row:** mono caption «КАРТОЧКА ЦЕЛИ»; then right-aligned: definiteness badge («ОПРЕДЕЛЕНА» green-tint / «ТУМАН» dashed-neutral), read-only risk badge («риск: низкий/средний/высокий» from `risk_level`; low=green, medium=yellow, high=red tints — D6; **not patchable, render only**); then the **icon row — bare glyphs, NO borders/boxes, NO text labels, tooltips (`title`) + `aria-label` only**, matching the `✕` close glyph in weight:
   - **активна** (play): highlighted `var(--op)` yellow when `is_backlog === false` (yellow = active per D6); click sets `is_backlog: false`.
   - **пауза**: click sets `is_backlog: true` (existing field, no new backend); when paused, pause is the highlighted one and play goes muted.
   - **назначить процесс**: disabled stub, muted (~25% ink), `title` «назначить процесс — скоро» — future execution-process slice, needs its own ADR.
   - **канвас постановки** (node/links glyph): opens the existing `GoalCanvas` screen for this goal — this becomes the ONLY entry to Ф4 after the page is deleted, do not lose it.
   - **удалить** (trash, `var(--rk)` red): existing delete flow — `window.confirm`, on 409 offer cascade confirm with descendant count (fetch `getGoalSubtree` for the count at delete time, or accept a simpler «Удалить со всеми подцелями?» without the number — keep it honest either way); on success close popup + refresh map.
   - **✕** — close.
3. **Characteristics block:** name (larger, 500 weight), description, «отв. <owner>» — each inline-editable with a **dashed underline** affordance: click → input (`.edit` style), Enter/blur → PATCH, Escape → cancel. Copy the F3 pattern (`startField`/`commitField`/`fieldKeyDown`/`fieldBlur`) from the current `RealGoalCard.tsx` before deleting it. Owner stays a free-text string (a person); unit-entity assignment is future work — no text-convention hacks.
4. **KPI section** — caption «KPI ЦЕЛИ · N ШТ.», flat list of rows (name / ПЛАН|РАСЧЁТ / value / red `×`), inline editing only, **no nested popups**: clicking a row swaps it in place for the three-input editor row (name/target/unit), «+ добавить KPI» (dashed row) swaps itself the same way; the row in edit mode gets a yellow `var(--op)` border (attention). Copy `KpiFieldsRow` + diff-sync-by-id logic (`kpisToWrite`, commit/cancel handlers) from the old card verbatim. Composite KPIs (`computed_value != null`) — read-only «РАСЧЁТ» rows, no edit, no delete (ADR-0004).
5. **«СРОК» section** — dashed no-data stub row (clock glyph + «не задан»), `title` «появится позже». No backend field yet.
6. **«ВАЖНОСТЬ · СРОЧНОСТЬ» section** — 2×2 grid of dashed quadrant tiles: «важно · срочно / делать», «важно · несрочно / планировать», «неважно · срочно / делегировать», «неважно · несрочно / отложить». All dashed no-data stubs (clickable-looking but inert for now). **Do NOT use the words "SMART" or "Эйзенхауэр" anywhere in UI, and no explanatory footnote lines** — tooltips only. When the backend fields land (see BACKLOG below), clicking a quadrant will set both values at once — not in this slice.
7. **Footer** — single muted hint line «Esc / клик мимо — закрыть». Nothing else (no text buttons).
8. **Delete the old page:** remove `frontend/src/os/RealGoalCard.tsx` and its route branch in `App.tsx` (`goalSource === 'real'` page path). Keep: the demo `GoalCard` flow, `GoalCanvas.tsx` (now opened from the popup icon — rewire `canvasOpen` handling so it works without the deleted page; lift the popup's goal id to whatever level makes the canvas route work cleanly), `goalFormat.ts` (shared helpers — reuse in the popup). Do NOT hunt dead CSS: leave now-orphaned `.os-goal` page rules in `os.css`, add one BACKLOG line «css: прибраться в осиротевших .os-goal-правилах».
9. **CSS:** new scope class for the popup (suggest `.gpop`) in `os.css`. Where the popup reuses existing looks (`.rrow`, `.radd`, `.rdel`, `.edit`, `.bdg`, `.note` — currently scoped under `.os-goal`), extend the existing selectors with a comma (`.os-goal .rrow, .gpop .rrow {`) — no copy-pasted duplicate blocks, no new colors, only tokens from `src/index.css :root`. New rules only for the popup container/orb/icon-row/quadrant-grid layout.
10. **Screenshot for sign-off:** Playwright pass on the seeded DB (`scripts/seed_demo_goals.py`), one screenshot of the open popup over the map → `renders/f7a-goal-popup.png` (goal with KPIs and non-empty owner so all blocks show).

**Don't (deliberately):**

- **No decomposition UI anywhere in the popup** — no «+ подцель», no «изменить родителя». They disappear from UI with the page; that's the accepted gap until slice B («+» affordances on map edges near the selected node — separate prompt after owner sign-off). Record in BACKLOG.
- **Backend untouched** — no routes/schemas/migrations. `risk_level` read-only. Срок/важность/срочность are render-only dashed stubs — the fields (`deadline`, `importance`, `urgency`) are a **future backend slice: ADR + migration first**; add this as its own BACKLOG line (owner: «это задача для бэкенда»).
- No jargon in UI (no "SMART", no "Эйзенхауэр"), no legend/footnote lines — tooltips carry the explanations.
- Demo components and `GoalCanvas.tsx` internals untouched (only the entry-point rewiring in `App.tsx`/`CommandPanel.tsx`).
- No new colors, no new animations (reuse `os-ov-in`/`os-pulse`/`os-flow`, respect `prefers-reduced-motion`), identity colors never encode state (D9).

## Constraints

- UI text in Russian; code/comments/commits in English. Only existing v2 tokens.
- D6 semantics fixed: green = done/ok, yellow = active/attention, red = risk/deficit, dashed = draft/future/no data.
- Accessibility as in F3–F6: real buttons, `aria-label` on every icon, keyboard (`Enter` activates, `Escape` closes), visible focus.
- PowerShell 5.1 — one command at a time; in venv only `python -m X`. After merge — `git push origin main`.

## Definition of Done

- [ ] `cd frontend`: `npm run build`, `npm run lint` — green; `cd backend`: pytest, ruff check, ruff format --check, `python -m mypy app` — green (control, nothing changes there).
- [ ] Playwright on seeded DB: node click opens the popup (no route change); name/description/owner inline-edit saves and the map node updates; pause icon PATCHes `is_backlog: true` and highlight switches; KPI add/edit/delete inline works, composite row is inert; risk badge read-only; «СРОК» and the 2×2 grid render dashed, inert, without SMART/Эйзенхауэр wording; process icon inert; canvas icon opens `GoalCanvas` and back works; delete flow removes the goal, closes popup, map refreshes; Esc/✕/backdrop close; `RealGoalCard.tsx` gone and no dangling imports. Screenshot at `renders/f7a-goal-popup.png`.
- [ ] `docs/DEVLOG.md` — entry; note the F6 Playwright debt (BACKLOG «Хвост Ф6») is closed as obsolete — the page flow it was checking is removed. `BACKLOG.md` — lines for: backend slice `deadline`/`importance`/`urgency` (ADR + migration, then wire СРОК + quadrants), «назначить процесс» slice (ADR), unit-entity for owner assignment, slice B — edge «+» decomposition (restores subgoal/parent editing), orphaned `.os-goal` CSS cleanup.
- [ ] One commit on `feat/frontend-goal-popup`, PR merged into `main`, pushed, clean tree (`git status` empty, origin synced).
- [ ] This prompt file committed to `prompts/_done/` as part of the same PR; `prompts/README.md` table updated.
- [ ] Report back with the screenshot path — do NOT start slice B without a separate prompt.

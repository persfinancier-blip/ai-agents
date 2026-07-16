# Prompt #37: slice 37 — parent assignment in the goal popup

### `feat/frontend-popup-parent`, `feat: parent assignment in goal popup (slice 37)`

> **For:** Claude Code. Owner's pain (live use): a goal created by double-click on empty canvas is born a root in fog, drifts to the bottom of the map, and there is currently NO way to attach it to anything — parent editing was dropped together with the old `RealGoalCard` page (accepted gap, BACKLOG). This slice returns parent assignment as a row in the goal popup. It is the first of the agreed queue: **37 parent → 38 node "+" (empty-card create) → 39 drag edges** — do only 37 here.
> **Model/mode:** Sonnet, effort medium — one row + one picker bubble in an existing component, patterns exist in git history; no backend.
> **Canon:** `Management_Model.md` §3 (hierarchy via `parent_id`); `Visual_Reference.md` Part II — **D9 «один оверлей-паттерн»** (bubbles on dimmed backdrop, identity-tinted borders; note: D-sections were renumbered in PR #19 — identity rules are now D10), D6 traffic-light for states, dashed = no-data/future.
> **Precondition:** main at PR #19 (`281382b`), clean tree. **Step 0 — preflight:** `git status` + `git log origin/main..HEAD`; untangle anything dirty deliberately before branching.

## Scope

**Do:**

1. **Parent row in `GoalPopup.tsx`**, in the characteristics bubble right under the «отв. …» line, for EVERY goal (fog and defined alike — the owner explicitly wants one shared principle):
   - Display: `родитель: <имя>` when set, `родитель: —` when root. The value gets the same **dashed-underline inline-edit affordance** as name/description/owner.
   - Click → a **picker bubble** in the overlay style (D9: same species as the popup's other облачка, identity-tinted border) listing all goals via `listGoals()`, excluding the goal itself; first entry — **«сделать корневой»** (`parent_id: null`). Reuse the `.rpool` scrolling-list look (CSS still in `os.css`; the old picker markup can be recovered from git history of `RealGoalCard.tsx`, `openParentPicker`/`chooseParent`). Escape / click outside closes the picker without changes.
   - Choose → `patchGoal(id, { parent_id })` through the popup's existing `saveField` discipline (no optimism, reload after PATCH). On 409 show the existing honest error «Нельзя: цикл в дереве» — the backend already rejects cycles, don't pre-filter descendants client-side beyond excluding self.
   - After success: re-fetch the goal AND refresh the map (`listGoals()` → map state) — the new edge must appear on the map immediately, and the ex-orphan must join its branch (this is the acceptance scenario).
2. **Loading/error honesty** in the picker: «загрузка…» while fetching, «Не удалось загрузить список» on failure — same tone as existing states.
3. **Screenshot for sign-off:** Playwright on seeded DB (`scripts/seed_demo_goals.py`): create a goal by double-click on empty canvas (it lands root/fog), open its popup, assign a parent via the new row, verify the edge appears on the map; save `renders/slice37-popup-parent.png` showing the open picker.

**Don't (deliberately — next slices, separate prompts):**

- No «+» affordances on nodes/edges (slice 38: click on selected node's "+" opens an EMPTY goal popup, goal is created in DB only after the name is committed — do not build any of that now).
- No edge dragging/reconnecting/deleting (slice 39 — all `parent_id` ops via drag).
- No edge types (этап/подцель, последовательно/параллельно) — future ADR first, stays in BACKLOG.
- Backend untouched; no new fields, no new routes.
- No restyling of anything else in the popup; D9 overlay rule already satisfied by PR #19 — follow it, don't reinvent.

## Constraints

- UI text Russian; code/comments/commits English. Only existing tokens; no new colors/animations; icons stay bare glyphs with tooltips, no legends.
- Accessibility as established: the parent value is a real button (`aria-label`, Enter opens picker), picker entries are buttons, focus visible, Escape closes.
- PowerShell 5.1 — one command at a time; venv `python -m X`. After merge — `git push origin main`.

## Definition of Done

- [ ] `npm run build` + `npm run lint` green; backend suite green (control, nothing changes there).
- [ ] Playwright on seeded DB: orphan-in-fog scenario from Scope item 3 passes end-to-end (assign → edge on map); change parent to another goal works; «сделать корневой» works; self is absent from the list; cycle attempt shows «Нельзя: цикл в дереве» and leaves state intact; Esc/outside-click closes the picker; popup's other functions untouched (spot-check name edit + pause). Screenshot at `renders/slice37-popup-parent.png`.
- [ ] `docs/DEVLOG.md` entry; `BACKLOG.md` — close/adjust the «parent assignment gap» line, keep slices 38/39 lines as agreed queue.
- [ ] One commit on `feat/frontend-popup-parent`, PR merged into `main`, pushed, clean tree; prompt file committed to `prompts/_done/`; `prompts/README.md` updated.
- [ ] Report back with the screenshot path — do NOT start slice 38 without a separate prompt.

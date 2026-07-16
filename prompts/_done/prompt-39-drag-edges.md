# Prompt #39: slice 39 — drag edges on the goal map (create / reconnect parent links)

### `feat/frontend-map-drag-edges`, `feat: drag edges on goal map (slice 39)`

> **For:** Claude Code. Last slice of the agreed queue (37 parent ✓ PR #20, 38 hover controls ✓ PR #21 → **39 this**). Owner's intent: «тянуть рёбра от цели к цели; схватил — переподключил». All operations are `parent_id` mutations — backend untouched, no ADR needed. Edge deletion already exists (edge «×», slice 38) — don't duplicate it.
> **Convention (Cowork/owner):** drag direction follows the map's edge direction — **from parent to child**. Dragging A → drop on B means «A становится родителем B». Reconnecting grabs the **parent end** of an existing edge.
> **Model/mode:** Sonnet, effort medium-high attention on pointer math — drag interactions over the existing SVG+HTML map; no backend.
> **Canon:** `Management_Model.md` §3; `Visual_Reference.md` Part II — D9 overlay pattern (not directly used here), D6 (dashed = draft/future — the drag preview line is exactly this), identity colors (D10).
> **Precondition:** main at PR #21 (`826b273`), clean tree. **Step 0 — preflight:** `git status` + `git log origin/main..HEAD`.

## Scope

**Do:**

1. **Drag-create a link (node → node):** on node hover, alongside the «+ ‖ ⬡ ×» row, show a small **port** (dot/ring at the node's right edge — where outgoing edges start). Pointer-down on the port → drag a **dashed preview line** (D6: future/no-data) following the cursor; nodes under the cursor highlight as drop targets; release on node B → `patchGoal(B, { parent_id: A })`. Map refreshes; the real edge replaces the preview.
   - Release on empty canvas / Escape mid-drag → cancel, zero requests.
   - Self-drop — ignore. Cycle attempt → backend 409 → honest toast/inline «Нельзя: цикл в дереве» (same wording as the popup), state intact.
   - If B already had a parent, this is a re-parenting — allowed silently (cheap to reverse; the parent row and edge «×» exist).
   - Drag must not conflict with: node click (opens popup), hover icon row, double-click-create, edge hover controls. Use a movement threshold (~4px) before treating pointer-down as drag rather than click.
2. **Reconnect an existing edge:** the edge hover zone (`.ehov` hotspot from slice 38) additionally exposes a grab affordance at the **parent end** of the edge (small ring). Pointer-down there → the edge detaches visually into a dashed preview anchored to the child; drop on node P2 → `patchGoal(C, { parent_id: P2 })`. Escape/empty drop → cancel, zero requests. 409 → honest error, edge snaps back.
3. **Pointer events discipline:** use pointer events (`setPointerCapture`) so the drag works with mouse and pen; touch may degrade gracefully (drag optional on touch — the popup parent row remains the universal path). Keyboard path for these operations already exists (slice-37 parent row) — state this in code comments; no fake keyboard-drag needed.
4. **Playwright verification** on seeded DB: drag from root's port to an orphan fog node → edge appears (orphan joins the branch); re-drag the same edge's parent end to another node → child moves; drop on empty canvas → nothing (node count and edges unchanged); cycle attempt (drag descendant's port onto its ancestor... i.e. make ancestor the child) → «Нельзя: цикл в дереве», intact; Escape mid-drag cancels; existing interactions still work (node click, hover rows, edge «+ ×», double-click draft). Screenshot mid-drag with the dashed preview visible → `renders/slice39-drag-edges.png` (Playwright can hold the pointer down while screenshotting).

**Don't (deliberately):**

- No edge types / labels (этап-подцель, последовательно/параллельно) — BACKLOG, ADR first.
- No changes to edge «×»/«+» behavior from slice 38; no demo-map drag; no backend changes; no new colors/animations (preview line = existing dashed stroke style).
- No drag of nodes themselves (map layout is auto — `goalTree.ts` stays the boss).

## Constraints

- UI text Russian; code/comments/commits English. Existing tokens; dashed strictly for the preview/future semantics; D6 traffic-light only for states.
- PowerShell 5.1 — one command at a time; venv `python -m X`. After merge — `git push origin main`.

## Definition of Done

- [ ] `npm run build` + `npm run lint` green; backend suite green (control).
- [ ] Full Playwright scenario from Scope item 4 passes; screenshot at `renders/slice39-drag-edges.png`.
- [ ] `docs/DEVLOG.md` entry; `BACKLOG.md`: close the slice-39 line — the 37–39 queue is complete; edge-types ADR line stays open.
- [ ] One commit on `feat/frontend-map-drag-edges`, PR merged into `main`, pushed, clean tree; prompt file committed to `prompts/_done/`; `prompts/README.md` updated.
- [ ] Report back with the screenshot path. The 37–39 queue ends here — next milestone only after owner's direction.

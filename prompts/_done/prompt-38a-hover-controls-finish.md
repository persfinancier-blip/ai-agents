# Prompt #38a: finish slice 38 — apply review fixes, then ship

### Branch `feat/frontend-map-hover-controls` (already exists, uncommitted work), commit `feat: hover controls on map nodes and edges (slice 38)`

> **For:** Claude Code (fresh session). Slice 38 (`prompts/prompt-38-node-plus-create.md` — read it first, it stays the source of Scope/DoD) was implemented in the previous session but NOT committed. A 5-agent review swept the diff; this prompt carries the verdict. Finish the pass: fix, verify, ship.
> **Model/mode:** Sonnet, effort medium — point fixes on an existing uncommitted diff.
> **Precondition / Step 0:** `git status` — expect uncommitted slice-38 work on `feat/frontend-map-hover-controls` (or stashed/working tree per previous session). Inventory it before touching anything; if anything looks missing relative to prompt-38 Scope, say so — don't re-implement blindly.

## Fix before commit (Scope/a11y violations)

1. **✕ in create mode commits instead of cancelling** (`GoalPopup.tsx` header close button): clicking ✕ while the name input holds uncommitted text fires blur → `commitCreate` → goal created, then `onClose`. Scope says «Escape/✕/backdrop до коммита имени → close, zero requests». Fix with the existing skip-blur pattern (`skipFieldBlur`-style flag) so ✕ is a clean cancel. Check the backdrop click path for the same leak while at it.
2. **Edge controls unreachable by keyboard** — hover-only via `onMouseEnter`, no focus path. Prompt-38 Scope item 6 requires focusable controls with `aria-label`. Add a keyboard path (e.g. controls render when any element of the edge group has focus-within, or edges get a focusable representative element).

## Fix at executor's judgment (real, non-blocking)

3. Delete-cascade logic duplicated between `CommandPanel.handleDeleteGoal` and `GoalPopup.handleDelete` — extract a shared helper if it stays readable.
4. `commitCreate` lacks a cancelled/unmount guard (async setState risk).
5. `CommandPanel.handleDeleteGoal` swallows non-409 errors silently — surface an honest error.

## Leave as-is (recorded, not for this pass)

6. SVG glyph duplication (`HoverGlyph` vs inline in GoalPopup), CSS `.nhov`/`.ehov` duplication. 7. Hover via React state instead of CSS `:hover`. 8. Dead variant `{ kind: 'create', parentId: null }`. — If any of these bothers future work, add one BACKLOG line instead of fixing now.

## Definition of Done

- [ ] Fixes 1–2 applied; 3–5 applied or consciously skipped with a one-line reason in the PR description.
- [ ] Full prompt-38 DoD holds: build+lint green, backend suite green, the complete Playwright scenario from prompt-38 Scope C passes — **re-run it after the fixes**, explicitly re-checking: ✕ with uncommitted name → zero requests, and edge controls operable via keyboard. Screenshot(s) at `renders/slice38-map-hover-controls.png`.
- [ ] DEVLOG entry; BACKLOG per prompt-38 (+ line for items 6–8 if warranted).
- [ ] One commit on `feat/frontend-map-hover-controls`, PR merged into `main`, pushed, clean tree; **both** prompt files (`prompt-38-node-plus-create.md`, `prompt-38a-hover-controls-finish.md`) committed to `prompts/_done/`; `prompts/README.md` updated.
- [ ] Report back with the screenshot path — slice 39 (drag edges) only via a separate prompt.

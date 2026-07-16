# Prompt #38b: fix — paused goals stay on the map

### `fix/frontend-paused-on-map`, `fix: paused (backlog) goals stay visible on the map (38b)`

> **For:** Claude Code. Owner hit this live after slice 38: the node's «‖» pause instantly removes the goal from the map with no visible way back — `buildGoalForest` (`goalTree.ts`) deliberately drops `is_backlog` goals («отложенные идеи, на карте не размещаются»). That design predates pause-on-the-node. Owner's decision: **пауза/плей — переключатель активна/неактивна; паузнутые цели остаются на карте**, приглушённые, с меткой паузы.
> **Model/mode:** Sonnet, effort medium — small presentational fix in tree-building + node styling.
> **Canon:** `Visual_Reference.md` Part II D6 — do NOT reassign traffic-light or dashed semantics: пауза ≠ туман (fog keeps its dashed/hazy code), пауза = приглушение + явная метка.
> **Precondition:** main at PR #21 (`826b273`), clean tree. **Step 0 — preflight:** `git status` + `git log origin/main..HEAD`.

## Scope

**Do:**

1. **`goalTree.ts`:** include `is_backlog` goals in the forest (they occupy their normal place in the hierarchy; children stay attached). Update the file's comment — the old «на карте не размещаются» rule is repealed by the owner (2026-07-16).
2. **Node rendering (`RealGoalMap`):** a paused goal's tile is visibly inactive — dimmed ink (reuse an existing muted treatment; do not use the fog hazy/dashed code and do not touch traffic-light colors), plus an explicit «‖» mark on the tile (e.g. in the meta line: `пауза` or the glyph, with `title`). Edges to/from paused nodes render normally (dimming the node is enough).
3. **Consistency checks:** node hover row already flips ‖/▶ by state (slice 38) — verify it now visually matches (paused node shows ▶ «вернуть»); popup badges/icons already handle `is_backlog` — no changes expected there, just verify.
4. **Playwright:** pause a mid-tree goal from the node hover row → node stays in place, dimmed, marked; its children still visible and attached; ▶ returns it to normal; same via the popup's pause icon. Screenshot `renders/slice38b-paused-on-map.png`.

**Don't:**

- No backend changes; no new colors/animations; no fog-code reuse for pause; demo map untouched; no zone/panel for backlog (owner rejected the alternatives).

## Definition of Done

- [ ] `npm run build` + `npm run lint` green; backend suite green (control).
- [ ] Playwright scenario from Scope item 4 passes; screenshot at `renders/slice38b-paused-on-map.png`.
- [ ] `docs/DEVLOG.md` entry (record the repealed «backlog not on map» rule and the owner's decision); `BACKLOG.md` — adjust if any line referenced the old behavior.
- [ ] One commit on `fix/frontend-paused-on-map`, PR merged into `main`, pushed, clean tree; prompt to `prompts/_done/`; `prompts/README.md` updated.
- [ ] Report back with the screenshot path.

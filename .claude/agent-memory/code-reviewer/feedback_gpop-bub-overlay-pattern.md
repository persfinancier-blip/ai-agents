---
name: gpop-bub-overlay-pattern
description: GoalPopup .gpop-col/.gpop-bub bubble-column overlay pattern (F7a fix-up, prompt 36) is the codified D9 "Оверлеи" standard — reference, not a one-off
metadata:
  type: project
---

As of prompt #36 (branch `fix/frontend-goal-popup-style`, 2026-07-16), `GoalPopup.tsx`
was restyled from a monolithic `.gpop-card` panel (`var(--sf)` background + `var(--ln)`
border wrapping all content) to a column of floating "bubbles" (`.gpop-col` > multiple
`.gpop-bub`), matching the advisor overlay's `.omsg`/`.topic` bubble style. This was
codified as a repo-wide rule in `Visual_Reference.md` new section **D9 "Оверлеи"**
(old D9→D10, D10→D11 renumbered) — owner decision: "one overlay pattern for the whole
product," any modal layer must use this scheme, not invent its own frame.

Key established facts, don't re-flag as issues:
- `.gpop-bub` background `rgba(24, 22, 34, 0.72)` / `border-radius: 16px` is a **direct
  reuse** of the pre-existing `.omsg` (line ~801) advisor-bubble rule — genuine pattern
  reuse, not a new hardcode. See [[ru-accent-rgba-hardcode]] for the sibling purple-accent
  rgba convention.
- Bubble border color is deliberately identity-colored (`branch.bd` inline style per
  bubble), per D9 rule (c): "рамки облачков — цвет идентичности контекста," not the
  neutral `--ln` token. This is intentional, not a token-bypass violation — `--ln` is
  reserved for genuinely neutral inner rows (e.g. `.gpop-bub .rc` KPI list).
  `.gpop-bub .rc` zeroes out the base `.gpop .rc` box-styling (background/border/padding)
  to avoid a "box in a box," and correctly wins on specificity (2-class selector).
- `.gpop-card`/`.gpop-body` classes were fully removed and are dead — confirmed no
  remaining references anywhere in `frontend/` after the F7a fix-up diff.
- BACKLOG.md already tracks migrating other modal surfaces (`GoalCanvas.tsx` `gc-popover`)
  onto this same D9 pattern — expect that as a future PR, not scope creep in this one.

**Why:** confirmed correct via full read of the diff + line-level cross-check against
`.omsg` source (2026-07-16 review of `fix/frontend-goal-popup-style`).

**How to apply:** on future overlay/popup reviews, check new modal surfaces against
D9's checklist (dim layer reuse, no monolithic bordered panel, identity-colored bubble
borders, semaphore/dashed unchanged, unified gap rhythm, standard exits) rather than
against generic brand-book token rules. See [[project_goal-map-f-series]].

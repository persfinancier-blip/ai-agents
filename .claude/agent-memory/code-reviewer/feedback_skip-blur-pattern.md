---
name: feedback-skip-blur-pattern
description: Repo-validated ref-guard idiom for inline-edit Escape/Enter vs blur double-commit in frontend/src/os components
metadata:
  type: feedback
---

The `skipBlur`/`skipFieldBlur`/`skipDraftBlur` ref-flag idiom (set `true` right before an
Enter/Escape-triggered state change, consumed-and-reset by the subsequent `onBlur` handler) is a
validated, working pattern in this repo for preventing double PATCH/POST requests and lost input in
inline-edit fields. Originally seen in `frontend/src/os/RealGoalCard.tsx` (`fieldBlur`/`fieldKeyDown`,
`KpiFieldsRow`) and `frontend/src/os/CommandPanel.tsx` (draft goal node), first introduced in
`feat/frontend-goal-editing` (prompt-22, Ф3).

**2026-07 update:** `RealGoalCard.tsx` was deleted in F7a (`b6d8f3a`, prompt #35); the goal-card
editing UI moved into `frontend/src/os/GoalPopup.tsx`, which carries the same idiom under
`skipBlur` (goal name/description field, line ~56) and `skipFieldBlur` (KPI fields row, line ~207).
`CommandPanel.tsx`'s `skipDraftBlur` (draft goal node) is unchanged. Re-verified current on this pass.

**Why:** Removing a focused input from the DOM (on Enter/Escape → unmount) reliably fires a native
`blur` before removal completes, which bubbles to React's root listener — without the guard this
double-fires the commit/cancel logic. DEVLOG for this branch records manual Playwright QA confirming
no double-PATCH and no lost input across name/description/owner/KPI edits.

**How to apply:** Don't flag this idiom itself as a double-submit risk in future reviews — it's an
intentional, tested repo convention. DO still check each new usage for two things: (1) that the ref is
set to `true` *before* the state change that causes unmount/disable, and (2) whether the input is
unmounted immediately (`RealGoalCard.tsx` field/KPI editors clear draft state before calling save, so
the input unmounts) vs kept mounted-but-`disabled` during the async request (`CommandPanel.tsx` draft
node keeps the input alive with `disabled={draft.saving}`). The latter causes the browser to blur a
focused-but-disabled input, so on a failed request the input re-enables without focus — a minor but
real UX papercut worth flagging (not a correctness bug, input value itself isn't lost).

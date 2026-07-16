---
name: rpool-css-duplication
description: New .rpool-styled picker components tend to copy-paste the .os-goal .rpool ruleset instead of reusing it — check for this on every new picker/dropdown
metadata:
  type: feedback
---

Prompt #37 (`feat/frontend-popup-parent`, GoalPopup.tsx ParentPicker) scoped its list
styling as `.gpop-parent-picker .rpool` and duplicated the entire button/hover/
last-child/`b` ruleset from `.os-goal .rpool` (os.css ~line 1826) verbatim, rather than
just using the bare `.rpool` class. It also dropped the container framing
(`border/border-radius/background/margin-top`) the original has, relying on the
enclosing `.gpop-bub` for framing instead — inconsistent but not necessarily wrong,
just undocumented.

**Why:** `.rpool` is already an established reusable "scrolling option list" component
class (used by the KPI-unit picker in `.os-goal` and `.gc-popover`, os.css:2276). Every
new modal/overlay list keeps reinventing scoped copies (`X .rpool`) instead of adding to
or reusing the base rule, causing silent CSS drift.

**How to apply:** on any future review of a new picker/dropdown/overlay list component,
check whether its `.rpool`-style CSS block is a genuine reuse (bare `.rpool`, or a small
diff via a modifier class) or a full copy-paste under a new parent selector. Flag
copy-pasted blocks as minor — suggest consolidating into the shared `.rpool` rule or
using a documented modifier. Related: [[gpop-bub-overlay-pattern]].

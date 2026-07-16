---
name: ru-accent-rgba-hardcode
description: rgba(168, 85, 247, x) accent hardcodes throughout os.css are pre-existing repo convention, not a brand-book violation to flag on new diffs
metadata:
  type: feedback
---

`frontend/src/os/os.css` uses raw `rgba(168, 85, 247, 0.x)` (purple accent) directly in
dozens of pre-existing rules instead of a CSS custom property — e.g. `.gc-lt`, popovers,
focus rings, and (as of F6) `.gc-sub-draft:hover`. This is the established repo pattern
for the accent color's varying-opacity states, not a new bypass of `index.css` tokens.
Real token bypasses to flag are new *base* colors (grays, semantic state colors) that
don't match `--i25`/`--i45`/`--rk`/etc. or this pre-existing purple-accent rgba idiom.

**Why:** confirmed on F6 review (2026-07-15) — checked history via grep, found 15+
prior instances of the identical rgba triplet across os.css predating this diff.

**How to apply:** don't cite Visual_Reference Part II token rules against
`rgba(168, 85, 247, *)` usage specifically; do still flag genuinely new/unrelated
hardcoded colors.

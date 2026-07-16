---
name: dual-arc-position-computation
description: GoalCanvas draft-node placement recomputes chunkRows/arcPositions separately from the real subPos map — established pattern for F6, not a bug
metadata:
  type: feedback
---

In `frontend/src/os/GoalCanvas.tsx` (F6, `+ подцель` draft node), the subgoal-sector
layout is computed twice: once as `subPos` (real children, used for rendering existing
subgoal nodes) and once as `draftSubPos` (children + `'__draft__'` sentinel, used only
to read the draft node's own position via `draftSubPos.get('__draft__')`). This is
intentional — it lets the draft node participate in the same row-wrapping arc math
(`chunkRows`/`arcPositions`) as real children so it visually falls into the same sector
without needing a bespoke last-slot formula. The `'__draft__'` sentinel cannot collide
with a real goal id (ids are UUIDs from the backend). Do not flag this duplication as
a bug — it is the chosen way to keep single source of truth for the arc-layout function
while giving the draft node a position.

**Why:** confirmed correct/intentional on first F6 review (2026-07-15); the two maps
serve different purposes (`subPos` for real nodes, `draftSubPos` only for the synthetic
sentinel) and are not meant to be merged.

**How to apply:** on future GoalCanvas passes, only flag this pattern if a real goal id
could ever literally be the string `__draft__`, or if a third parallel map is added
without similar justification — otherwise treat the recompute as established idiom.
See [[project_goal-map-f-series]].

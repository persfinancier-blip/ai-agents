---
name: batch-alter-table-sqlite-precedent
description: op.batch_alter_table for adding FK/index columns to existing tables is an established, sanctioned pattern in this repo's Alembic migrations, not a hand-editing violation
metadata:
  type: project
---

Migrations that add a nullable FK column + index to an existing table (e.g. `goal.parent_id` in
`20cd74dc490c`, `goal.unit_id` in `0f9898942202`) use `op.batch_alter_table(...)` with an explanatory
comment: "SQLite can't ALTER a table to add a FK constraint outside of batch mode (copy-and-move
strategy), unlike the other dialects autogenerate assumes." This is a known, cited autogeneration
quirk under CONTRIBUTING/`backend.md`'s "don't hand-edit migrations (except known autogeneration
quirks)" carve-out — don't flag it as a rule-8 violation.

**Why:** SQLite has no native `ALTER TABLE ADD CONSTRAINT`; Alembic's batch mode is the correct,
autogenerate-adjacent way to handle it, and the repo has done this twice already with the same
comment.

**How to apply:** When reviewing a migration diff, check for the batch-mode explanatory comment
and compare against `20cd74dc490c_add_goal_parent_id.py` as precedent before flagging hand-edits.
One-time hand-written **data migrations** (e.g. backfilling `unit` rows from `goal.owner` text in
the same file) are separately justified — there's no autogenerate equivalent for data backfills,
so these always require hand-written code; review them for correctness (dedup keys, batch/txn
semantics) rather than flagging the fact that they're hand-written at all.

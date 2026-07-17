# ops-08 — Finalize DEVLOG headers + fix /devlog so it stops recurring

**Type:** docs/command-only pass. Do NOT touch `.github/workflows/**`.
No backend/frontend code changes — DoD gate is the trivial docs path.

## Problem
Several DEVLOG entries were written pre-merge and their headers were never
finalized after merge — they still read `... · не закоммичено (промпт …)` with a
branch name instead of the merged state. This is a recurring gap: the `/devlog`
flow does not finalize the header once the PR merges.

## Do
1. In `docs/DEVLOG.md`, fix the header of every entry that is ALREADY MERGED but
   still marked `не закоммичено`. As of now these are, top of file down:
   - slice `#41b` (unit backend) → merged as **PR #28**
   - `ops-05` (auto-merge) → merged as **PR #36**
   - `ops-06` (no-prompt-echo) → merged as **PR #38**
   - `ops-07` (process canon) → merged as **PR #39**

   For each, set the header to the repo's standard finalized form (keep Russian,
   keep the existing wording style):
   `## <date> · main · <merge-sha> (промпт <id>, PR #<n>)`

   Derive `<merge-sha>` from git history — do NOT guess. Use the actual merge
   commit of each PR, e.g. `gh pr view <n> --json mergeCommit -q .mergeCommit.oid`
   (or `git log --oneline --merges`). Bodies («Что сделано»/«Дальше») stay
   unchanged.

2. Re-check the older tail: entries **№39** and **№40**. Confirm №39 has its own
   header (`## 2026-07-16 · main · 0b8f6e6 (промпт №39, PR #23)`) and is not
   merged into №40's body, and that №40 reads `main · 71d4eff (PR #25)` rather
   than `не закоммичено`. Fix if still wrong.

3. Fix the `/devlog` command in `.claude/commands/` so it FINALIZES the entry
   header to the merged state (`main · <merge-sha> (PR #<n>)`) as part of its
   flow, instead of leaving `не закоммичено`. The goal: after this, a merged
   entry never keeps a pre-merge header.

## Done when
- `docs/DEVLOG.md` has zero `не закоммичено` headers on entries whose PR is
  already merged.
- Each fixed header carries the correct merge SHA + PR number.
- `.claude/commands/*devlog*` updated so header finalization is part of the
  command, with a one-line note on the change.
- Docs/command-only diff; no `.github/workflows/**`, no backend/frontend code.

Commit/PR in English (Conventional Commits `docs:`); DEVLOG content stays Russian.

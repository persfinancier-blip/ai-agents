# Prompt ops-06 — Never echo prompt bodies to the owner (token economy)

**For:** Claude Code worker (arrives via the task-dispatch pipeline; docs-only change — the DoD gate passes trivially and this PR auto-merges per the 2026-07-17 owner decision)
**Branch:** the `task/*` branch this file arrives on → PR → auto-merge on green gate
**Commit type:** `docs:`
**Canon:** `COWORK.md`, `.claude/rules/github-automation.md`, `CLAUDE.md` (Token economy)

## Problem

After kickoffs were retired, Cowork sessions started showing the owner full prompt-file texts in chat. The owner explicitly does not want prompt bodies in his messages — it wastes limits and his attention. The existing rule («Don't duplicate the whole prompt text in chat») predates the pipeline and needs updating.

## Scope

1. `COWORK.md`, section «Working with the `prompts/` folder» — replace/extend the "Don't duplicate the whole prompt text in chat" clause with an explicit rule (English, keep the file's style):
   - **Prompt bodies never appear in chat with the owner.** Not on dispatch, not in reports, not «for reference».
   - On dispatching a task (dropping the file), the owner gets ONE line: prompt name + what it does in a few words (e.g. «ops-06 ушёл: запрет показа промптов в чате»). The pipeline does the rest; the watchdog reports the outcome.
   - Reports to the owner are conclusions and actions only — no file contents, no diffs, no prompt quotes (this mirrors CLAUDE.md «Reports stay short» and applies to Cowork sessions too).
2. `.claude/rules/github-automation.md` — one-line addition in the dispatch section: «Dispatch notice to the owner = one line; prompt bodies are never echoed in chat.»
3. DEVLOG entry; move this prompt file to `prompts/_done/` in the same PR.

**NOT in scope:** anything else — no workflow changes, no code.

## Definition of Done

- [ ] COWORK.md + rules updated as above; DEVLOG entry; prompt archived to `_done/`
- [ ] PR opened; docs-only gate → auto-merge (this is the first live end-to-end run of the full pipeline including auto-merge — if the merge is blocked by anything, leave the PR open and state the blocker plainly in a PR comment)

# Prompt ops-05 — Auto-merge for worker PRs (owner decision 2026-07-17: full auto)

**For:** Claude Code (lead, LOCAL pass — this prompt edits `.github/workflows/**`, which the cloud worker cannot push: `GITHUB_TOKEN` lacks the `workflows` permission; confirmed on run 29559783511)
**Branch:** `chore/auto-merge` off `origin/main`, via a temporary worktree (owner's checkout may be busy — do not switch its branches) → PR
**Commit type:** `chore:`
**Canon:** `.claude/rules/github-automation.md`, `.claude/rules/commits.md`, `CLAUDE.md` (Token economy)

## Owner decision (2026-07-17)

Full auto-merge: a worker PR whose checks are green merges itself; the owner presses no buttons. Cowork's verification moves to POST-merge (report + revert if bad). The «принимаем» gate is removed for worker PRs.

## Context / constraints discovered earlier

- PRs created and merges performed with the default `GITHUB_TOKEN` do NOT trigger other workflows (GitHub anti-recursion): CI (`ci.yml`) will likely never run on worker PRs, and won't run on main after a bot merge. Therefore the gate must be computed INSIDE the worker job itself, not delegated to CI. Record observed behavior in the rules file.
- `GITHUB_TOKEN` cannot push changes to `.github/workflows/**` («refusing to allow a GitHub App to create or update workflow ... without `workflows` permission»). Fix the rule file: tasks touching `.github/workflows/**` must run as LOCAL passes, never via the task-dispatch pipeline.

## Scope

1. `.github/workflows/claude.yml`, `claude-task-push` job — after the existing «Push and open the PR» step:
   - **DoD gate step (plain shell, no Claude):** determine touched zones via `git diff --name-only origin/main...HEAD`; if `backend/` touched → `pip install -e ".[dev]"`, `ruff check .`, `ruff format --check .`, `python -m mypy app`, `pytest`; if `frontend/` touched → `npm ci`, `npm run lint`, `npm run build`; docs/prompts-only diff → gate passes trivially.
   - **Auto-merge step:** gate green → `gh pr merge --merge --delete-branch` (use `GH_TOKEN`). Gate red → leave the PR open and post a comment «🔴 Проверки не прошли: <какие>» so the watchdog reports it; do NOT merge.
   - If repo settings block bot merges, print the exact blocker in the log and list the setting in the PR description for the owner (do not change repo settings without the owner's word).
2. `.claude/rules/github-automation.md` + `COWORK.md` — record: (a) the owner decision — worker PRs auto-merge on green, Cowork verifies post-merge, rollback = revert PR, issue/`@claude` fallback paths stay manual-merge; (b) the `workflows`-permission limitation — `.github/workflows/**` changes go through local passes only.
3. DEVLOG entry; move this prompt file from `prompts/_dispatched/` to `prompts/_done/` as part of the PR.

**NOT in scope:** `claude-issue`/`claude-comment` jobs, `ci.yml`, product code, branch-protection rules.

## EXCEPTION for THIS pass

This PR itself changes the process — it must NOT auto-merge. Leave it open with a clear description: it is the owner's LAST manual merge; merging it activates auto-merge for all subsequent worker PRs.

## Definition of Done

- [ ] Gate + auto-merge steps in `claude-task-push`; valid YAML
- [ ] Gate covers backend/frontend/docs-only cases; failure path leaves PR open + comment
- [ ] Rules + COWORK.md updated (auto-merge decision + workflows-permission rule); DEVLOG entry
- [ ] Prompt archived to `_done/` in the same PR
- [ ] This PR left OPEN for the owner (exception above); owner's checkout untouched; clean handover

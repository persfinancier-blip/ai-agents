# Prompt ops-03 — Make the dispatcher standalone (survive branch switches)

**For:** Claude Code (lead, local pass — touches the owner's machine: installed script copy, Task Scheduler)
**Branch:** `chore/standalone-dispatcher` → PR (leave open for owner review, do NOT merge)
**Commit type:** `chore:`
**Canon:** `.claude/rules/github-automation.md`, `.claude/rules/commits.md`, `CLAUDE.md` (Token economy)

## Problem (found at ops-02 acceptance)

`scripts/dispatch-tasks.ps1` lives inside the working tree, and the Task Scheduler job points at `C:\Dev\ai-agents\scripts\dispatch-tasks.ps1`. The working tree is shared across branches: when the owner's parallel session checks out a branch that predates PR #27, the file vanishes and the watcher silently fails to start at logon. The autostarted copy must live OUTSIDE the repo.

## IMPORTANT — parallel work protection

The owner's product session may be mid-pass in this checkout (dirty tree, feature branch). Do NOT switch branches and do NOT touch the current working tree state. Do this pass from a temporary `git worktree` off `origin/main` (create branch there, commit, push, open PR, remove worktree). Local install steps (copy file, schtasks) don't need the working tree at all.

## Scope

1. `scripts/dispatch-tasks.ps1` — add a `-RepoRoot <path>` parameter. Default stays as today (derive from `$PSScriptRoot`), so in-repo usage is unchanged; when the script runs from an installed copy outside the repo, `-RepoRoot` points it at the checkout. All internal paths (`prompts/`, `_dispatched/`, log) derive from `$RepoRoot`; the log for the installed copy goes NEXT TO the installed script (e.g. `<install dir>\dispatch.log`), not into the repo, so it works even when the repo path is on a branch without `scripts/`.
2. **Install step (local machine, not a repo change):** copy the updated script to `%LOCALAPPDATA%\ai-agents-ops\dispatch-tasks.ps1` (create the dir).
3. **Retarget the Task Scheduler job** `ai-agents-task-dispatch` to: `powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File %LOCALAPPDATA%\ai-agents-ops\dispatch-tasks.ps1 -RepoRoot C:\Dev\ai-agents` (expand `%LOCALAPPDATA%` to the real path). Try `schtasks /Change /TN "ai-agents-task-dispatch" /TR "..."`; if access is denied (needs admin), PRINT the exact ready-to-paste command and tell the owner to run it in an admin PowerShell — do not ask for passwords, do not retry with /RU /RP.
4. Start the watcher now from the installed copy (background, hidden) and verify: process alive, `dispatch.log` created next to the installed copy.
5. Docs: `.claude/rules/github-automation.md` — installed-copy location, `-RepoRoot`, and the update rule: any future change to `scripts/dispatch-tasks.ps1` must end with re-copying it to the install dir (add to that rule file). DEVLOG entry.

**NOT in scope:** `backend/`, `frontend/`, `ci.yml`, `claude.yml`, `.claude/settings.json`; no changes to dispatch logic beyond the `-RepoRoot` parameter and log location.

## Constraints

- Temp worktree only; the owner's checkout stays untouched (branch, dirty files — as is).
- Kill any already-running watcher processes from the old path before starting the new one (avoid double dispatch); mention in the report if one was found.
- No secrets, no passwords, no /RU /RP.

## Definition of Done

- [ ] Script accepts `-RepoRoot`, defaults preserve old behavior; installed-copy log lives outside the repo
- [ ] Installed copy at `%LOCALAPPDATA%\ai-agents-ops\dispatch-tasks.ps1`; watcher running from it (verified: process + log)
- [ ] Scheduler job retargeted (or the exact admin command printed for the owner)
- [ ] Rules file updated (install location + re-copy rule); DEVLOG entry
- [ ] This prompt file committed to `prompts/_done/` in the same PR (from the temp worktree)
- [ ] PR open (not merged), owner's working tree untouched

Tail cleanup: Step 0 preflight — but report-only for the owner's checkout (do not untangle his in-flight work; just note it).

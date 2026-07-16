# Prompt ops-02 — File-driven task dispatch (drop a prompt → worker wakes up)

**For:** Claude Code (lead, local pass — this pass touches the owner's machine: Task Scheduler)
**Branch:** `chore/file-task-dispatch` → PR (leave open for owner review, do NOT merge)
**Commit type:** `chore:`
**Canon:** `CLAUDE.md` (Token economy), `COWORK.md`, `.claude/rules/github-automation.md`, `.claude/rules/commits.md`

## Goal

Zero-touch task dispatch: Cowork drops `prompts/prompt-*.md` into the local working copy → an event-driven watcher (FileSystemWatcher, no polling) instantly ships it to GitHub as a `task/*` branch → the Actions worker wakes on push, executes the prompt, opens a PR. The owner's only manual step left is approving PRs.

## Scope

1. `.github/workflows/claude.yml` — add a `push` trigger for `task/**` branches + fix the prompt-scoping defect (below) + failure protection (timeout, dead-run alarm).
2. `scripts/dispatch-tasks.ps1` — dispatch logic + event-driven watcher mode (Windows PowerShell 5.1-compatible).
3. Register a Windows Task Scheduler job that starts the watcher at user logon and keeps it running (ask the owner's permission before running `schtasks`).
4. `.gitignore` — add `prompts/_dispatched/`.
5. Short updates to `.claude/rules/github-automation.md` and COWORK.md (the new dispatch path).

**NOT in scope:** `backend/`, `frontend/`, `ci.yml`, `.claude/settings.json`; no changes to the issue-label path other than the prompt-scoping fix.

## 1. Workflow changes (`.github/workflows/claude.yml`)

a) **New trigger:** `push` with `branches: ['task/**']`. Job step for this event runs the action with prompt (English, in the workflow):
   "This branch was created by the task dispatcher: its latest commit adds exactly one task prompt file under prompts/ (not in _done). Find it via `git log -1 --name-only`, read it, and execute it following CLAUDE.md and .claude/rules/. Use THIS branch as the working branch (rename is not needed). Satisfy the DoD for the touched zone. Move the prompt file to prompts/_done/ in the same work. Open a PR to main titled per the prompt, and leave it open for owner review."

b) **Fix from the review of PR #26:** the current `prompt` input is passed on every trigger. Scope it so that: `issues: labeled` event → the existing implement-prompt; `push` (task/**) → the new prompt from (a); `issue_comment` / `pull_request_review_comment` → NO prompt at all (action's default tag mode). Use separate jobs or a conditional expression — whichever is cleaner and valid per current claude-code-action docs.

c) Concurrency for the push job: `concurrency: claude-${{ github.ref }}`.

d) **Failure protection (dead-run alarm).** The worker may die silently (subscription limits exhausted, crash) — the pipeline must surface that without any AI involvement:
   - `timeout-minutes: 30` on every job (a run longer than that = hung).
   - A final safety-net step with `if: failure() || cancelled()` that uses plain `gh` / `actions/github-script` (NO Claude tokens): if the run was triggered by an issue → comment on that issue «⚠️ Исполнитель не завершил задачу (лимиты/сбой). Ссылка на запуск: <run URL>»; if triggered by a `task/**` push (no issue exists) → create an issue titled `Worker failed: <branch>` with the run URL, labeled `worker-failure`. Create the `worker-failure` label (any red color); it must NOT trigger the worker (only `ai-task` does — verify the `if` conditions exclude it).

## 2. Dispatch script `scripts/dispatch-tasks.ps1`

Two modes in one script: `-Once` (single sweep, for manual runs/tests) and default watcher mode — a `System.IO.FileSystemWatcher` on `prompts/` (filter `prompt-*.md`, Created/Renamed events, 60 s debounce per file so Cowork finishes writing), which calls the same sweep. On watcher startup, run one initial sweep to catch files dropped while it wasn't running. The process must be resilient: wrap the loop so a single failed dispatch doesn't kill the watcher.

Sweep logic (must not disturb the owner's working tree — he works in this checkout in parallel):

- Repo root: `C:\Dev\ai-agents` (derive from script location, don't hardcode twice).
- Candidates: files matching `prompts/prompt-*.md` in the working tree, excluding `_done/`, `README.md`. Skip files modified < 60 seconds ago (Cowork may still be writing). Skip files already tracked by git (`git ls-files`) — only NEW (untracked) files are dispatchable.
- For each candidate (loop, normally one):
  1. `git fetch origin main`.
  2. Create a temp worktree from `origin/main`: `git worktree add <tempdir> origin/main --detach`.
  3. Copy the file into `<tempdir>/prompts/`, commit there (`chore: dispatch <filename>`), push as branch `task/<filename-slug>-<yyyyMMddHHmmss>` (`git -C <tempdir> push origin HEAD:refs/heads/task/...`).
  4. Remove the worktree (`git worktree remove --force`), move the local file to `prompts/_dispatched/` (create dir; it is gitignored) so it is never dispatched twice.
  5. Append a line to `scripts/dispatch.log` (timestamp · file · branch · ok/error). On push failure: leave the file in place (retry next run), log the error.
- No output/popups; must run fine headless. Do not touch anything outside `prompts/_dispatched/`, the temp worktree, and the log.

## 3. Task Scheduler registration (watcher autostart)

Register `schtasks /Create /SC ONLOGON /TN "ai-agents-task-dispatch" /TR "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File C:\Dev\ai-agents\scripts\dispatch-tasks.ps1" /F` — confirm with the owner before executing; verify with `schtasks /Query /TN "ai-agents-task-dispatch"`, then START it once for the current session (`schtasks /Run /TN ...`) so the owner doesn't need to re-logon. Note in the PR description that the job exists on this machine only and starts the event-driven watcher (no polling).

## 4. Docs

- `.claude/rules/github-automation.md`: add the dispatch path (prompt file → `task/*` branch → worker; one file = one branch = one PR; `prompts/_dispatched/` is local-only).
- COWORK.md («Working with the `prompts/` folder»): Cowork drops the file into `prompts/` as before — dispatch to the cloud worker is instant and event-driven (watcher); the kickoff line is needed only as a fallback when the owner's machine is off.

## Constraints

- The script must never commit/push from the owner's working tree itself (temp worktree only), never touch main, never force-push.
- No secrets anywhere; the script relies on the owner's existing git credentials.
- Don't break the existing label/`@claude` paths.

## Definition of Done

- [ ] `claude.yml`: task/** push trigger works, prompt-scoping fixed (comment events → tag mode), valid YAML
- [ ] Failure protection in place: `timeout-minutes: 30` on all jobs; failure/cancelled → issue comment or `worker-failure` issue with run URL (token-free step); `worker-failure` label exists and does not wake the worker
- [ ] `scripts/dispatch-tasks.ps1` present; `-Once` sweep AND watcher mode dry-run tested locally (create a dummy `prompt-ops-test-*.md`, watch it ship to a `task/*` branch within seconds, then delete the branch and the dummy)
- [ ] Scheduler job (ONLOGON, watcher) registered, verified, and started for the current session (with owner's consent)
- [ ] `.gitignore`, rules file, COWORK.md updated; DEVLOG entry (`/devlog`)
- [ ] This prompt file committed to `prompts/_done/` in the same PR
- [ ] PR left open for owner review; clean tree otherwise

Tail cleanup: standard Step 0 preflight applies. The owner works in a parallel session — leave his uncommitted changes untouched.

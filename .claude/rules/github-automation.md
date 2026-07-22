# GitHub Actions automation (Claude worker)

- Task = a GitHub issue labeled `ai-task`, **or** a prompt file dropped into
  `prompts/` and dispatched to a `task/**` branch (see "File-driven dispatch"
  below). The worker runs on a GitHub Actions runner (`.github/workflows/claude.yml`),
  not on the owner's machine.
- One PR per issue/dispatch, opened by the worker and linked back (`Closes #N`
  for issues; the prompt filename for `task/**` pushes).
- Rework happens only via explicit `@claude <note>` comments on the issue or PR, from
  the owner or Cowork. No bot-to-bot loops, no autonomous Claude↔Claude review.
- All token-economy rules from `CLAUDE.md` (model pin, minimal read scope, short
  reports) apply on the runner exactly as they do locally.
- **`.github/workflows/**` changes are LOCAL-only.** The default `GITHUB_TOKEN`
  cannot push changes under `.github/workflows/**` ("refusing to allow a GitHub
  App to create or update workflow ... without `workflows` permission" —
  confirmed on run 29559783511). Any task touching that path must be run as a
  local pass by Claude Code, never dispatched through `task/**`/the issue-label
  pipeline.

## Auto-merge for worker PRs (owner decision, 2026-07-17)

- **Full auto-merge:** a worker PR (`claude-task-push` job) whose DoD gate
  passes merges itself (`gh pr merge --merge --delete-branch`) — the owner
  presses no buttons. The «принимаем» gate that used to require the owner's
  explicit approval before merge is removed **for worker PRs only**; the
  `claude-issue` and `claude-comment` paths, and any manually-opened PR, still
  merge only on the owner's word.
- **PRs/merges made with `GITHUB_TOKEN` don't trigger other workflows**
  (GitHub's anti-recursion protection): `ci.yml` will not run on a worker PR,
  and won't run on `main` after a bot merge either. Because of this the DoD
  gate cannot be delegated to CI — it's computed as a plain-shell step inside
  `claude-task-push` itself (see the "DoD gate" step in `claude.yml`), zone-
  scoped from `git diff --name-only origin/main...HEAD` (backend → ruff/mypy/
  pytest, frontend → lint/build, docs/prompts-only → passes trivially).
- **Gate red:** the PR is left open with a `🔴 Проверки не прошли: <what>`
  comment; the watchdog/Cowork reports it. No merge happens.
- **Verification moves post-merge:** Cowork checks the merged result (read
  the files, don't take the report on faith) instead of gating the merge
  itself. Rollback path = revert the merge PR.
- If repo branch-protection settings block a bot from merging, the workflow
  logs the exact blocker and the PR description states the setting for the
  owner — settings are never changed by the agent without the owner's word.

## File-driven dispatch (prompt file → `task/*` branch → worker)

- **Primary path — Cowork direct push (2026-07-22):** during a session Cowork
  commits the new `prompts/prompt-*.md` file straight to a
  `task/<slug>-<timestamp>` branch from its own sandbox, pushed over HTTPS
  with the fine-grained PAT at `.secrets/gh_token` (`Contents: Read and
  write`). SSH does not work from the sandbox; HTTPS does. The `push` trigger
  in `claude.yml` picks the branch up exactly as before — the worker is
  unchanged, and the owner's machine is not in the loop. After the push
  Cowork confirms sync by comparing local vs cloud commit hashes. The Task
  Scheduler watcher below is the **fallback** for files dropped while Cowork
  is closed.
- **Fallback watcher.** The **installed copy** at `%LOCALAPPDATA%\ai-agents-ops\dispatch-tasks.ps1`
  is what actually runs (via Task Scheduler) — not `scripts/dispatch-tasks.ps1`
  in the repo. The repo copy lives outside the working tree because the
  checkout is shared across branches: if the owner's parallel session has an
  older branch checked out (predating this script), an in-repo path would
  vanish and the watcher would silently fail at logon. The script takes a
  `-RepoRoot <path>` parameter (defaults to its own parent dir for in-repo
  use); the installed copy is invoked with `-RepoRoot C:\Dev\ai-agents` so it
  always watches the real checkout regardless of which branch is on disk. Its
  log (`dispatch.log`) lives next to the installed copy, not in the repo.
- **Update rule:** any change to `scripts/dispatch-tasks.ps1` must end with
  re-copying it to `%LOCALAPPDATA%\ai-agents-ops\dispatch-tasks.ps1` — the
  installed copy does not auto-update from the repo.
- Dispatch notice to the owner = one line; prompt bodies are never echoed in chat.
- It watches `prompts/` on the owner's machine (event-driven
  `FileSystemWatcher`, no polling) and ships any new `prompts/prompt-*.md`
  file to GitHub as its own `task/<slug>-<timestamp>` branch, which the
  `push` trigger in `claude.yml` picks up.
- One file = one branch = one PR. The dispatched file is moved locally to
  `prompts/_dispatched/` (gitignored, local-only) so it's never sent twice.
- Registered as a Windows Task Scheduler job (`ai-agents-task-dispatch`,
  `ONLOGON`) on the owner's machine only — it is not part of CI and has no
  effect if that machine is off (the issue-label path still works as a fallback).
- Failure protection: every job in `claude.yml` has `timeout-minutes: 30`; a
  dead/failed run posts an issue comment (label path) or opens a
  `worker-failure`-labeled issue with the run URL (task-push path), via a
  token-free `github-script` step. `worker-failure` never triggers the worker.
- **The `claude-task-push` job does not use `anthropics/claude-code-action@v1`**
  (found in ops-04: the action rejects the `push` event outright —
  "Unsupported event type: push" — and neither `workflow_dispatch` nor
  `repository_dispatch` bridges work around it, since the default
  `GITHUB_TOKEN` cannot trigger a second workflow run). Instead this job
  installs `@anthropic-ai/claude-code` and runs `claude -p "<prompt>"`
  directly, authenticated via `CLAUDE_CODE_OAUTH_TOKEN`, with `gh` (`GH_TOKEN`)
  for PR creation. The `claude-issue` and `claude-comment` jobs are unaffected
  — their trigger events are supported by the action.

## Prompt-file naming

- Product prompts: `prompt-NN-*.md` (sequential, product track).
- Infrastructure/process prompts: `prompt-ops-NN-*.md` (sequential, independent
  numbering). Both archive to `prompts/_done/` the same way.

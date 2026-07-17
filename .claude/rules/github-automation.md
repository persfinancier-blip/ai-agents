# GitHub Actions automation (Claude worker)

- Task = a GitHub issue labeled `ai-task`, **or** a prompt file dropped into
  `prompts/` and dispatched to a `task/**` branch (see "File-driven dispatch"
  below). The worker runs on a GitHub Actions runner (`.github/workflows/claude.yml`),
  not on the owner's machine.
- One PR per issue/dispatch, opened by the worker and linked back (`Closes #N`
  for issues; the prompt filename for `task/**` pushes). CI (`ci.yml`) runs the
  same DoD checks as local.
- Rework happens only via explicit `@claude <note>` comments on the issue or PR, from
  the owner or Cowork. No bot-to-bot loops, no autonomous Claude↔Claude review.
- Merge only after the owner's explicit approval («принимаем»). The worker never
  merges its own PR.
- All token-economy rules from `CLAUDE.md` (model pin, minimal read scope, short
  reports) apply on the runner exactly as they do locally.

## File-driven dispatch (prompt file → `task/*` branch → worker)

- The **installed copy** at `%LOCALAPPDATA%\ai-agents-ops\dispatch-tasks.ps1`
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

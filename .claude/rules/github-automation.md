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

- `scripts/dispatch-tasks.ps1` watches `prompts/` on the owner's machine
  (event-driven `FileSystemWatcher`, no polling) and ships any new
  `prompts/prompt-*.md` file to GitHub as its own `task/<slug>-<timestamp>`
  branch, which the `push` trigger in `claude.yml` picks up.
- One file = one branch = one PR. The dispatched file is moved locally to
  `prompts/_dispatched/` (gitignored, local-only) so it's never sent twice.
- Registered as a Windows Task Scheduler job (`ai-agents-task-dispatch`,
  `ONLOGON`) on the owner's machine only — it is not part of CI and has no
  effect if that machine is off (the issue-label path still works as a fallback).
- Failure protection: every job in `claude.yml` has `timeout-minutes: 30`; a
  dead/failed run posts an issue comment (label path) or opens a
  `worker-failure`-labeled issue with the run URL (task-push path), via a
  token-free `github-script` step. `worker-failure` never triggers the worker.

## Prompt-file naming

- Product prompts: `prompt-NN-*.md` (sequential, product track).
- Infrastructure/process prompts: `prompt-ops-NN-*.md` (sequential, independent
  numbering). Both archive to `prompts/_done/` the same way.

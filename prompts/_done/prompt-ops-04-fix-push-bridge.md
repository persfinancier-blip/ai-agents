# Prompt ops-04 — Fix the task/** push path (worker doesn't support push events)

**For:** Claude Code (lead, local pass)
**Branch:** `chore/fix-push-bridge` → PR (leave open for owner review, do NOT merge)
**Commit type:** `chore:`
**Canon:** `.claude/rules/github-automation.md`, `.claude/rules/commits.md`, `CLAUDE.md` (Token economy)

## Problem (found during ops-03)

A `task/**` push wakes `claude-task-push` in `.github/workflows/claude.yml`, but `anthropics/claude-code-action@v1` fails immediately: `Unsupported event type: push`. The whole file-dispatch → worker path is dead on `main`. (Evidence: the accidental dispatch during ops-03 testing; cleaned up — branch deleted, false `worker-failure` issue #29 closed.)

## IMPORTANT — parallel work protection

The owner's checkout may be mid-pass on a product branch. Work from a temporary `git worktree` off `origin/main`; do not switch branches or touch the owner's tree.

## Scope

Rework the `claude-task-push` job so a `task/**` push reliably ends with the worker executing the prompt file from that branch. FIRST check the current claude-code-action docs (https://github.com/anthropics/claude-code-action — supported events/modes change). Options in order of preference; take the first that verifiably works:

1. **Action supports push now / in a newer release** → upgrade pin, keep the job shape.
2. **workflow_dispatch bridge:** the push job (plain `actions/github-script`, no Claude) calls `createWorkflowDispatch` on a new `claude-task-run` workflow/job (inputs: branch name), which runs the action in agent-with-prompt mode on `ref: <task branch>`. VERIFY in the smoke test that a dispatch fired with the default `GITHUB_TOKEN` actually starts the run (GitHub restricts some token-triggered events); if it doesn't — fall back to option 3.
3. **Direct CLI:** the push job installs Claude Code (`npm install -g @anthropic-ai/claude-code`) and runs `claude -p "<the existing task-push prompt>"` with env `CLAUDE_CODE_OAUTH_TOKEN` from the secret; PR creation via `gh` with `GITHUB_TOKEN`. Cap turns (`--max-turns 40`).

Keep on whichever job actually runs the worker: `timeout-minutes: 30`, the dead-run alarm step (`worker-failure` issue with run URL), concurrency per ref.

## Mandatory live smoke test (this was skipped in ops-02 acceptance — never again)

Push-triggered workflows execute the YAML from the pushed branch, so test BEFORE merge: create a throwaway task branch based on the ops-04 branch (so it carries the fixed `claude.yml`) whose latest commit adds `prompts/prompt-ops-smoke-test.md` with a trivial task («create docs/smoke-test.md containing one line, open a PR»). Verify end to end: run starts → worker executes → PR opens. Then close that PR, delete both throwaway branches, delete any artifacts. If the run fails — iterate here, do not hand over a broken bridge.

## Docs

- `.claude/rules/github-automation.md` — describe the working bridge (which option won and why).
- DEVLOG entry; this prompt file → `prompts/_done/` in the same PR.

## Constraints

- Don't touch `claude-issue` / `claude-comment` jobs' behavior, `ci.yml`, product code.
- No secrets in logs/echo. No passwords, no /RU /RP anywhere.
- Smoke-test worker run counts against subscription limits — keep the smoke task trivial (one file, one line).

## Definition of Done

- [ ] `task/**` push → worker executes the prompt file → PR opens (proven by the smoke run, link in PR description)
- [ ] Dead-run alarm + timeout + concurrency preserved on the worker job
- [ ] Smoke artifacts fully cleaned up (branches, PR, files, issues)
- [ ] Rules file + DEVLOG updated; prompt archived to `_done/`
- [ ] PR open (not merged); owner checklist in the PR: merge → run `schtasks /Run /TN "ai-agents-task-dispatch"` to start the watcher (retargeted in ops-03) → drop a real prompt to go live
- [ ] Owner's working tree untouched

Tail cleanup: Step 0 preflight — report-only for the owner's checkout.

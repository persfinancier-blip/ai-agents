# Prompt ops-01 — GitHub Actions automation (Claude Worker)

> Naming note: `ops-` prefix = infrastructure/process prompts (Cowork ↔ Claude Code pipeline), numbered independently from the product prompt line (`prompt-NN-*`). Archive to `prompts/_done/` as usual.

**For:** Claude Code (lead)
**Branch:** `chore/github-actions-automation` → PR (leave open for owner review)
**Commit type:** `chore:` (workflow + rules); COWORK.md change in the same PR as `docs:` commit
**Canon:** `CLAUDE.md` (Token economy), `COWORK.md` (process), `.claude/rules/commits.md`

## Goal

Move pass execution from the owner's machine to GitHub Actions. Target flow: an issue labeled `ai-task` wakes Claude Code on a GitHub runner → it implements the task on a feature branch → opens a PR linked to the issue → CI runs DoD checks → rework only via explicit `@claude <note>` comments on the PR → owner approves the merge.

## Scope

1. `.github/workflows/claude.yml` — the worker workflow.
2. `.claude/rules/github-automation.md` — short rules file for the new flow.
3. `COWORK.md` — update the task-creation process (Cowork may create issues).
4. `ai-task` label in the repo.

**NOT in scope:** no changes to `backend/`, `frontend/`, `.github/workflows/ci.yml`, `.claude/settings.json` guardrails; no autonomous Claude↔Claude review loop; no Playwright.

## 1. Workflow `.github/workflows/claude.yml`

Before writing, check the CURRENT docs of `anthropics/claude-code-action` (https://github.com/anthropics/claude-code-action) — the API changes; use the latest major version (v1 at time of writing). Requirements:

- **Triggers:**
  - `issues: [labeled]` — job runs only when the added label is `ai-task` (`if: github.event.label.name == 'ai-task'`);
  - `issue_comment: [created]` and `pull_request_review_comment: [created]` — job runs only when the comment body contains `@claude` (default tag mode of the action).
- **Auth:** `claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}`. The owner adds the secret manually; NEVER put a token value in any file.
- **Public repo note:** rely on the action's default actor-permission check (only users with write access can trigger it); do not weaken it.
- **Job permissions:** `contents: write`, `pull-requests: write`, `issues: write`, `id-token: write`, `actions: read`.
- **Prompt for the labeled-issue job** (English, in the workflow):
  "Read this issue and implement it following CLAUDE.md and .claude/rules/. Work on a feature branch off main. Satisfy the DoD for the touched zone (backend: ruff check, ruff format --check, python -m mypy app, pytest; frontend: npm run lint, npm run build). Open a PR that references the issue (Closes #N) and post a short summary comment on the issue in Russian."
- `claude_args`: `--max-turns 40`. Do NOT override the model — the `.claude/settings.json` pin (Sonnet) applies on the runner too.
- **Concurrency guard:** `concurrency: claude-${{ github.event.issue.number }}` — no parallel runs on the same issue.
- `actions/checkout@v4` with `fetch-depth: 0` before the action step.

## 2. Rules file `.claude/rules/github-automation.md`

≤ 25 lines, English. Content: task = GitHub issue labeled `ai-task`; the worker runs on GitHub Actions; result = one PR per issue + CI checks; rework only via explicit `@claude` comments from the owner or Cowork; merge only after the owner's approval («принимаем»); no bot-to-bot loops; the token-economy rules of CLAUDE.md fully apply on the runner. Also fix the prompt-naming convention: product prompts `prompt-NN-*`, infrastructure/process prompts `prompt-ops-NN-*` (independent numbering).

## 3. COWORK.md update

In «Working with the `prompts/` folder» add (English, keep style): Cowork may create the task directly as a GitHub issue labeled `ai-task` via GitHub MCP — the issue body uses the same prompt format (Scope / Constraints / DoD); the prompt file still lands in `prompts/` as the archive copy. Creating issues and PR comments is NOT a git write and is allowed to Cowork; branches/commits/merges remain exclusively Claude Code's zone. The kickoff line in chat becomes optional — the label itself starts the pass. Also document the `prompt-ops-NN-*` naming convention.

## 4. Label

Create the `ai-task` label (`gh label create ai-task --color 5319E7 --description "Task for the Claude worker on GitHub Actions"`). If `gh` is unavailable, list it in the PR description as an owner action.

## Constraints

- Don't touch `.claude/settings.json`, `ci.yml`, `backend/`, `frontend/`.
- Don't touch the product prompt line (`prompts/prompt-40-*` etc. belong to the product track and may be in flight in a parallel session).
- No secret values anywhere in the diff.
- `claude.yml` must be valid YAML and match the action's current documented inputs.

## Definition of Done

- [ ] `claude.yml` in place, valid, uses `CLAUDE_CODE_OAUTH_TOKEN` secret, max-turns capped
- [ ] `.claude/rules/github-automation.md` created; `COWORK.md` updated (incl. ops-naming)
- [ ] `ai-task` label exists (or explicitly delegated to the owner in the PR description)
- [ ] PR description contains the owner checklist: (1) secret `CLAUDE_CODE_OAUTH_TOKEN` already added, (2) merge, (3) create a small test issue labeled `ai-task` to smoke-test the loop
- [ ] DEVLOG entry (`/devlog`); this prompt file committed to `prompts/_done/` in the same PR
- [ ] Exception to the standard tail: do NOT merge the PR — leave it open for the owner's explicit review (this pass changes process)
- [ ] Clean tree, everything pushed

Tail cleanup: standard Step 0 preflight (`git status` + `git log origin/main..HEAD`) applies. Careful: the owner works in a parallel session — if the tree has his uncommitted changes, leave them untouched and work only on this prompt's files.

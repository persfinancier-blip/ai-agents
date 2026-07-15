# Prompt 29 — Self-enforcing token guardrails (chore)

**Executor:** Claude Code (lead, single-threaded — no subagents needed except `merger` at the end).
**Branch:** `chore/token-guardrails` off `main`. **Commit type:** `chore:`.
**Canon:** CLAUDE.md "Token economy" (owner decision 2026-07-14). Docs reference: https://docs.claude.com/en/docs/claude-code/settings (keys `model`, `alwaysThinkingEnabled`, `effortLevel`, env `MAX_THINKING_TOKENS`).

## Why

The owner burns the 5-hour limit in ~1 hour. Root causes found: extended thinking ON, effort High, model not pinned (UI default can drift), merger subagent on `inherit`. These must be enforced by repo config, not by the owner remembering to toggle UI settings.

## Scope

1. `.claude/settings.json` — add top-level keys (keep everything existing intact):
   ```json
   "model": "claude-sonnet-5",
   "alwaysThinkingEnabled": false,
   "effortLevel": "medium"
   ```
   and extend the existing `env` block with:
   ```json
   "MAX_THINKING_TOKENS": "0"
   ```
   (`MAX_THINKING_TOKENS=0` hard-disables thinking on the Anthropic API regardless of UI toggles; `model` pins Sonnet 5 project-wide; `effortLevel: medium` replaces the current High. `/model` and `/effort` still allow a one-session override when the owner explicitly wants more power.)

2. `.claude/agents/merger.md` — frontmatter `model: inherit` → `model: haiku`. Git mechanics (status/add/commit/push/PR/merge) does not need Sonnet.

3. New hook `.claude/hooks/session-budget.sh` + registration in `settings.json` under `hooks.UserPromptSubmit`:
   - Read stdin JSON, take `transcript_path`.
   - If the transcript file exceeds **1.5 MB**, emit JSON on stdout:
     ```json
     {"hookSpecificOutput": {"hookEventName": "UserPromptSubmit", "additionalContext": "SESSION BUDGET WARNING: this session's transcript exceeds 1.5 MB. Finish the current step only, then tell the owner (in Russian, first line of your reply): «Сессия раздулась — закрой её: /clear и новый kickoff». Do not start new work in this session."}}
     ```
   - Otherwise exit 0 with no output. POSIX sh, same style as `statusline.sh` (python3 for JSON parsing is fine). Must never block (always exit 0).

4. CLAUDE.md — in "Token economy", add one line: `Guardrails are enforced by .claude/settings.json (model pin, thinking off, effort medium, session-budget hook) — do not weaken them without the owner's instruction.`

5. `docs/DEVLOG.md` entry (`/devlog`).

## NOT in scope

- backend/, frontend/, graphify — untouched.
- No changes to protect-main.sh / block-secrets.sh / format-code.sh logic.
- No changes to other agents' models (test-runner and doc-keeper are already haiku; reviewers stay inherit).
- BACKLOG.md — only if you spot a directly related leftover.

## Constraints

- `settings.json` must remain valid JSON (validate with `python3 -m json.tool` before committing).
- Hook must be non-blocking and silent below the threshold.

## Definition of Done

- [ ] `python3 -m json.tool .claude/settings.json` passes.
- [ ] `merger.md` frontmatter says `model: haiku`.
- [ ] `session-budget.sh` exists, is executable, registered under `UserPromptSubmit`; manual test: `echo '{"transcript_path":"/dev/null"}' | bash .claude/hooks/session-budget.sh` exits 0 silently.
- [ ] CLAUDE.md line added; DEVLOG entry added.
- [ ] This prompt file committed to `prompts/_done/prompt-29-token-guardrails.md` in the same PR (tail cleanup, Step 0 preflight per `.claude/rules/commits.md`).
- [ ] One PR, merged into `main` via `merger`, clean tree at the end.

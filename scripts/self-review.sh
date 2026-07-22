#!/usr/bin/env bash
# Independent second pass: does the committed diff actually satisfy the task
# prompt's Scope + Definition of Done? A fresh Claude invocation reviews the
# diff against the prompt (it did NOT write the code, so it is not grading its
# own homework). Prints ONE line: "PASS" or "FAIL: <reason>".
#
# Fail-open by design: if the reviewer errors or is silent, print PASS so a
# flaky reviewer never stalls the pipeline — the objective DoD gate still
# blocks real breakage. Requires CLAUDE_CODE_OAUTH_TOKEN in the environment.
set -uo pipefail

PROMPT=$(git log -1 --name-only --pretty="" | grep -E '^prompts/_done/prompt-' | head -1)
if [ -z "${PROMPT:-}" ]; then
  echo "PASS (no task prompt in last commit — nothing to review)"
  exit 0
fi

TMP=$(mktemp)
{
  echo "You are an INDEPENDENT reviewer. A task prompt and the diff that claims to"
  echo "implement it follow. Judge ONLY whether the diff satisfies the prompt's Scope"
  echo "and Definition of Done. Ignore style and nits. Do not run anything."
  echo "Reply with EXACTLY one line: 'PASS' if satisfied, or 'FAIL: <short reason>'."
  echo
  echo "===== TASK PROMPT: $PROMPT ====="
  git show "HEAD:$PROMPT" 2>/dev/null || cat "$PROMPT"
  echo
  echo "===== DIFF (origin/main...HEAD, truncated to 120k) ====="
  git diff origin/main...HEAD | head -c 120000
} > "$TMP"

# Strict match (PASS alone / FAIL: reason) + sanitize: no quote, backtick,
# dollar or backslash may survive into the verdict — it travels into workflow
# outputs and PR comments (ops-14, injection crash fix).
VERDICT=$(claude -p "$(cat "$TMP")" --max-turns 30 --dangerously-skip-permissions 2>/dev/null \
  | grep -E '^(PASS$|PASS |FAIL: )' | head -1 | tr -d '`"$\\' | cut -c1-300)
rm -f "$TMP"

if [ -z "${VERDICT:-}" ]; then
  echo "PASS (reviewer produced no verdict — not blocking)"
else
  echo "$VERDICT"
fi
exit 0

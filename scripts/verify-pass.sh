#!/usr/bin/env bash
# Objective, per-pass structural checks. The worker runs this inside the DoD gate.
# Exit 0 = ok; non-zero = a check failed (blocks auto-merge).
# Rule: only flag things that are UNAMBIGUOUSLY wrong — no style opinions, no
# false positives that would stall the pipeline.
set -uo pipefail
fail=0

# 1. The dispatched task prompt must be archived to prompts/_done/, not left
#    loose in prompts/ root (the common "forgot to move it" mistake).
loose=$(git ls-files -- prompts | grep -E '^prompts/prompt-[^/]+\.md$' || true)
if [ -n "$loose" ]; then
  echo "verify-pass: task prompt not archived to prompts/_done/:" >&2
  echo "$loose" >&2
  fail=1
fi

# 2. No merge-conflict markers slipped into tracked files.
if git grep -nI -E '^(<<<<<<< |>>>>>>> )' -- . >/dev/null 2>&1; then
  echo "verify-pass: conflict markers present in tracked files" >&2
  fail=1
fi

# 3. Workflow files must not be modified through the task/** pipeline (the
#    worker's GITHUB_TOKEN can't push them anyway — fail early with a clear msg).
if git diff --name-only origin/main...HEAD | grep -q '^\.github/workflows/'; then
  echo "verify-pass: .github/workflows/** changed — must go through the owner-merged bootstrap PR, not a task/** dispatch" >&2
  fail=1
fi

exit $fail

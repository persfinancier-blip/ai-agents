#!/usr/bin/env bash
# Cowork's dispatch step, standardized: push a prompt file to its own task/**
# branch and CONFIRM it reached the cloud byte-for-byte. Runs from the Cowork
# sandbox — always via a fresh clone, NEVER the mount's .git (the mount blocks
# .git writes). This is the up-sync + sync-confirmation the owner wants encoded
# in the repo instead of re-derived each session.
#
# Usage:   bash scripts/dispatch-prompt.sh <path-to-prompt-file.md>
# Auth:    fine-grained PAT at .secrets/gh_token (Contents: Read and write).
#          Override the token path with GH_TOKEN_FILE=/path/to/token.
# Exit:    0 = pushed and confirmed (совпадает); 2 = pushed but hash mismatch.
set -euo pipefail

REPO_URL="https://github.com/persfinancier-blip/ai-agents.git"

SRC="${1:?usage: dispatch-prompt.sh <prompt-file.md>}"
[ -f "$SRC" ] || { echo "no such prompt file: $SRC" >&2; exit 1; }
BASENAME=$(basename "$SRC")

# Locate the PAT: explicit override, else walk up from the prompt file and cwd.
TOKENFILE="${GH_TOKEN_FILE:-}"
if [ -z "$TOKENFILE" ]; then
  for start in "$(cd "$(dirname "$SRC")" && pwd)" "$PWD"; do
    d="$start"
    while [ "$d" != "/" ]; do
      if [ -f "$d/.secrets/gh_token" ]; then TOKENFILE="$d/.secrets/gh_token"; break; fi
      d=$(dirname "$d")
    done
    [ -n "$TOKENFILE" ] && break
  done
fi
[ -n "${TOKENFILE:-}" ] && [ -f "$TOKENFILE" ] || { echo "PAT not found (.secrets/gh_token)" >&2; exit 1; }
export TOKEN
TOKEN=$(tr -d ' \r\n' < "$TOKENFILE")

SLUG=$(printf '%s' "${BASENAME%.md}" | tr -c 'a-zA-Z0-9-' '-')
BR="task/${SLUG}-$(date +%Y%m%d%H%M%S)"

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
git clone --quiet --depth 1 "$REPO_URL" "$WORK/repo"
cd "$WORK/repo"
mkdir -p prompts
cp "$SRC" "prompts/$BASENAME"
git add "prompts/$BASENAME"
git -c user.name="Cowork" -c user.email="persfinancier@gmail.com" \
    commit -q -m "chore: dispatch $BASENAME"
LOCAL=$(git rev-parse HEAD)

HELPER='!f() { echo username=x-access-token; echo "password=$TOKEN"; }; f'
git -c credential.helper="$HELPER" push -q "$REPO_URL" "HEAD:refs/heads/$BR"

# Confirm cloud == local; retry for transient proxy/network hiccups.
CLOUD=""
for _ in 1 2 3 4 5; do
  CLOUD=$(git ls-remote "$REPO_URL" "refs/heads/$BR" 2>/dev/null | cut -f1)
  [ -n "$CLOUD" ] && break
  sleep 3
done

echo "branch: $BR"
echo "local : $LOCAL"
echo "cloud : $CLOUD"
if [ "$LOCAL" = "$CLOUD" ]; then
  echo "SYNC OK — совпадает"
  exit 0
fi
echo "SYNC MISMATCH — расходится" >&2
exit 2

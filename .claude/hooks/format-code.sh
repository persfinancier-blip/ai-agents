#!/bin/sh
# PostToolUse(Edit|Write): автоформат изменённого файла. Best-effort, никогда не блокирует (всегда exit 0).
# *.py под backend/ -> ruff format + ruff check --fix из backend/.venv
# *.ts|*.tsx|*.jsx под frontend/ -> oxlint --fix, если бинарь установлен

INPUT=$(cat)

F=$(printf '%s' "$INPUT" | python3 -c "import json,sys;d=json.load(sys.stdin);print((d.get('tool_response') or {}).get('filePath') or (d.get('tool_input') or {}).get('file_path') or '')" 2>/dev/null) || exit 0
[ -z "$F" ] && exit 0

PROJ="${CLAUDE_PROJECT_DIR:-.}"
NORM=$(printf '%s' "$F" | tr '\\' '/')

case "$NORM" in
  */backend/*.py)
    RUFF="$PROJ/backend/.venv/Scripts/ruff.exe"
    [ -x "$RUFF" ] || RUFF="$PROJ/backend/.venv/bin/ruff"
    [ -x "$RUFF" ] && { "$RUFF" format "$F" >/dev/null 2>&1; "$RUFF" check --fix "$F" >/dev/null 2>&1; }
    ;;
  */frontend/*.ts|*/frontend/*.tsx|*/frontend/*.jsx)
    OX="$PROJ/frontend/node_modules/.bin/oxlint"
    [ -e "$OX" ] && "$OX" --fix "$F" >/dev/null 2>&1
    ;;
esac
exit 0

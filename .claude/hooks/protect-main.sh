#!/bin/sh
# PreToolUse(Edit|Write|NotebookEdit): блокирует правки файлов репозитория на ветке main.
# Per CONTRIBUTING: работа только в фиче-ветках. Блокировка = exit 2, причина в stderr.

INPUT=$(cat)

FILE=$(printf '%s' "$INPUT" | python3 -c "import json,sys;d=json.load(sys.stdin);t=d.get('tool_input',{});print(t.get('file_path') or t.get('notebook_path') or '')" 2>/dev/null) || exit 0
[ -z "$FILE" ] && exit 0

PROJ=$(printf '%s' "${CLAUDE_PROJECT_DIR:-$PWD}" | tr '\\' '/' | tr '[:upper:]' '[:lower:]')
NORM=$(printf '%s' "$FILE" | tr '\\' '/' | tr '[:upper:]' '[:lower:]')

# Файлы вне репозитория (scratchpad, память, temp) не трогаем
case "$NORM" in
  "$PROJ"/*) ;;
  *) exit 0 ;;
esac

BRANCH=$(git -C "${CLAUDE_PROJECT_DIR:-.}" branch --show-current 2>/dev/null) || exit 0
if [ "$BRANCH" = "main" ]; then
  echo "Правки на ветке main запрещены (CONTRIBUTING: trunk-based, только фиче-ветки). Создай ветку: git checkout -b feat/<веха>-<суть> (или chore/..., docs/...) и повтори правку." >&2
  exit 2
fi
exit 0

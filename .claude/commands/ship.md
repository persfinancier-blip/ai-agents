---
description: Прогнать Definition of Done — проверки обеих сторон, гигиена доков, предложить Conventional Commit
allowed-tools: Bash, Read, Grep, Glob, Edit
---

Прогони Definition of Done текущей работы, по шагам, с полным отчётом:

1. **Backend** (из `backend/`, через `.venv`): `ruff check .`, `ruff format --check .`, `mypy app`, `pytest -q`. Все четыре обязаны быть зелёными.
2. **Frontend** (из `frontend/`): `npm run build`, `npm run lint`.
3. **Доки**: если проход трогал `docs/` — проверь, что обновлены `docs/full-vision/INDEX.md` и `docs/full-vision/00_CHANGELOG_docs_cleanup.md`; в любом случае предложи запись в `docs/DEVLOG.md` (как в `/devlog`).
4. **Дифф**: покажи `git status --short` и суть диффа; убедись, что в него не попал мусор (кэши, .env, случайные файлы) и что ветка — не `main`.
5. **Коммит**: предложи сообщение по Conventional Commits (`feat:`/`fix:`/`chore:`/`docs:`/`test:` + короткое тело: что и зачем). Сам коммит делай только после подтверждения пользователя.

Если какой-то шаг красный — остановись на нём, покажи ошибку и предложи починку; не предлагай коммит поверх красных проверок. $ARGUMENTS — уточнение объёма (например, «только backend»).

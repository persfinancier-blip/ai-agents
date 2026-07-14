---
description: Assemble a context-handoff prompt for a new session (close out a bloated session, start clean)
allowed-tools: Read, Bash(git branch *), Bash(git log *), Bash(git status *)
---

Assemble a **handoff prompt** — a compact, self-contained kickoff for a new session, replacing the current bloated one.

Principle: only carry over what **can't be pulled from the repo** — decisions, rationale, the next step. Anything that lives in files, don't copy — **link by path**, the new session will read it itself. Target ~15–20 lines, not a recap of the dialogue.

Take the branch, last commit, and state from `git branch --show-current`, `git log -1 --format="%h %s"`, `git status --short`. The other fields come from the current conversation's context ("Цель/веха" = the session goal declared at the start).

**Verification gate (mandatory before output):**
- "Состояние" (branch/commit/uncommitted-ready) — ONLY from actual `git`/`DEVLOG`/`BACKLOG`. If a git command fails (e.g. `improper chunk offset`) — write `состояние не подтверждено: <error text>`, do NOT make it up from memory.
- "Решения" — take from the current conversation (these are decisions NOT yet in the files), but only ones actually made in this session, not inferred.
- For files, give a path + an open question for the new session ("check `prompts/prompt-NN.md` yourself"), NOT a verdict ("this is junk", "ready to commit"). The new session reads and decides — it doesn't inherit a verdict on faith.

Output exactly one block, in this format:

```
# Перенос контекста

**Отвечай мне только по-русски. Коротко: не пересказывай этот блок — подтверди готовность одной строкой и сразу дай строку-запуск следующего шага.**

## Bootstrap — настройка новой сессии
Папка:       подключить C:\Dev\ai-agents
Язык:        общение со мной — по-русски (код/коммиты — английский)
Читать 1-м:  CLAUDE.md и COWORK.md; затем .claude/rules/<зона> под задачу
Ориентиры:   docs/DEVLOG.md (что сделано), BACKLOG.md (что дальше), git log
Скан кода:   только git-tracked; .venv и кэши не трогать
graphify:    только для вопросов о связях; иначе grep/чтение
Канон:       PRD.md → Management_Model.md → Visual_Reference.md (по мере нужды, не целиком)

## Задача
Цель/веха:     <цель этой сессии>
Состояние:     <ветка, последний коммит, что готово / uncommitted>
Решения:       <решения сессии, которых ещё НЕТ в файлах>
Следующий шаг: <одно ближайшее действие>
Файлы в фокусе: <3–6 путей>
НЕ трогать:    <границы scope>

## Что от тебя сейчас
Ответь по-русски и коротко. Контекст не пересказывай. Выдай одну строку-запуск для «Следующего шага» (формат: `Выполни prompts/prompt-NN-имя.md строго по Scope`, либо точную команду) — и жди.
```

If $ARGUMENTS were passed — factor them in as a refinement of the goal/next step. After the block, remind in one line: next is `/clear`, then paste the handoff into the new session.

---
description: Add an entry for the current pass to docs/DEVLOG.md
allowed-tools: Read, Edit, Bash(git log *), Bash(git branch *), Bash(git status *)
---

Add an entry to the top of the `docs/DEVLOG.md` journal (right after the `# DEVLOG` heading, newest entries on top), in this format:

```
## ГГГГ-ММ-ДД · <ветка> · <короткий hash последнего коммита или «не закоммичено»>

- **Что сделано:** 2–5 пунктов, по фактам этой сессии (не пересказывай план — только сделанное).
- **Дальше:** 1–3 пункта следующих шагов; задачи, которые не берём сейчас, — перенеси в BACKLOG.md.
```

Take the date as today's, the branch and hash from `git branch --show-current` and `git log -1 --format=%h`. Fill the bullets from the current conversation's context — what was actually done in this pass. If the user passed arguments ($ARGUMENTS), use them as the basis for "Что сделано"/"Дальше".

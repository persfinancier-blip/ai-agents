---
description: Create a new ADR from the docs/adr/0000-template.md template
allowed-tools: Read, Write, Edit, Glob
---

Create a new Architecture Decision Record:

1. Find the next free number: `Glob docs/adr/*.md`, take the max `NNNN` + 1 (the `0000` template doesn't count).
2. Take the decision topic from the arguments: "$ARGUMENTS". If the arguments are empty — ask the user for the topic.
3. Create `docs/adr/NNNN-<short-latin-slug>.md` following the structure of `docs/adr/0000-template.md` (Контекст / Решение / Статус / Последствия), in Russian. The new ADR's status is «Предложено», dated today. Fill in Контекст and Решение from the current conversation's discussion; leave anything unknown marked `<заполнить>` — don't invent it.
4. Add a row to the «Индекс» table in `docs/adr/README.md`.
5. Remind the user: ADRs must not contradict the PRD/Management_Model — resolve conflicts with the owner first.

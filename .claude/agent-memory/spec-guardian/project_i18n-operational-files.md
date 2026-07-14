---
name: i18n-operational-files
description: Repo split — operational/agent-facing files translated to English, product canon stays Russian; exact exceptions
metadata:
  type: project
---

As of 2026-07-15, a batch translation moved operational/agent-facing files (root `CLAUDE.md`, `.claude/CLAUDE.md`, `COWORK.md`, `.claude/rules/*.md`, `.claude/agents/*.md`, `.claude/commands/*.md`) from Russian to English for token economy. Product canon (`docs/**`, `README.md`, `CONTRIBUTING.md`) was deliberately NOT touched and stays Russian — this is the authoritative split, documented in `COWORK.md` → "Язык файлов" bullet (kept in Russian on purpose) and referenced from `.claude/rules/commits.md`.

Known intentional exceptions inside the now-English operational files (do not flag these as untranslated leftovers or drift):
- `.claude/commands/devlog.md` — the DEVLOG entry template (`## ГГГГ-ММ-ДД · ...`, `**Что сделано:**`, `**Дальше:**`) stays Russian verbatim — it's the literal output format.
- `.claude/commands/handoff.md` — the whole ```# Перенос контекста``` fenced block (Bootstrap/Задача/Что от тебя сейчас) stays Russian verbatim — it's the literal output format.
- `.claude/commands/adr.md` — ADR structure literals (Контекст / Решение / Статус / Последствия, status value «Предложено», the «Индекс» table name) stay Russian, and generated ADR files remain Russian.
- `COWORK.md` → "Push and responsibility (brief)" section has one bullet, "**Язык файлов:**", deliberately left fully in Russian even though its siblings are English — it's the canonical statement of this very English/Russian file split.
- `.claude/rules/frontend.md` still mandates **product UI strings** stay in Russian ("Все строки UI — на русском") — that rule's content is unchanged; only the instructional prose around it was translated.

Also as part of this same batch, a real process rule changed (not translation drift): prompt files are now committed directly into `prompts/_done/` in the same PR as the work (no separate post-merge move step). This is reflected consistently in `COWORK.md` ("Работа с папкой prompts/" + "Хвост-уборка" callout) and `.claude/agents/merger.md` step 3. If asked to check for canon/process consistency later, treat "commit prompt directly into `prompts/_done/`, no post-merge move" as current expected behavior, not the older "move after merge" description.

**Why:** confirmed via full line-by-line diff review (i18n-diff.patch, 2026-07-15) that this translation pass preserved rule meaning (obligations, conditionals, enumerations all intact) — zero real drift found, only the documented intentional exceptions above.
**How to apply:** when doing future spec-guardian passes that touch `.claude/**`, `CLAUDE.md`, or `COWORK.md`, don't flag English prose there as a canon/localization violation — canon localization rules (RU UI, RU docs) apply to `docs/**` and product UI, not to these operational/agent instruction files.

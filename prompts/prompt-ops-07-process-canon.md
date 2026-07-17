# Prompt ops-07 — docs/PROCESS.md: the process canon (extract the implicit rules)

**For:** Claude Code worker (via the task-dispatch pipeline; docs-only → auto-merge on green gate)
**Branch:** the `task/*` branch this file arrives on → PR → auto-merge
**Commit type:** `docs:`
**Canon:** `COWORK.md`, `CLAUDE.md`, `.claude/rules/*`, `prompts/README.md`

## Goal

One document — `docs/PROCESS.md` (in Russian, like all `docs/**`) — describing the ENTIRE development cycle as a protocol (RFC-style): so a new Cowork session, a replacement executor, or a second developer can be onboarded from this one file, and so rules stop living «in tradition». This is the distilled-value slice of the owner's methodology-formalization plan (2026-07-17).

## Sources (token economy — read selectively, do not scan the repo)

Primary: `COWORK.md`, `CLAUDE.md`, `.claude/rules/` (all four+ files), `prompts/README.md`. Secondary: skim `docs/DEVLOG.md` headers for entries marked «решение владельца» / process decisions (don't read every entry in full); open 3–5 recent files from `prompts/_done/` only to describe the prompt format by example. Do NOT read the full-vision archive, backend/, frontend/.

## Structure of docs/PROCESS.md (target ≤ 250 lines; link to sources instead of copying them)

1. **Роли:** владелец (желания, продуктовые решения, вето) · Cowork-архитектор (промпты, постановка, пост-merge верификация, канон) · исполнитель Claude Code (единственный, кто пишет в git; облачный воркер + локальный pass) · дозор (мониторинг, доклады) · субагенты-ревьюеры (on-demand).
2. **Жизненный цикл задачи (основной путь):** желание → файл `prompts/prompt-*.md` → watcher → `task/*` ветка → облачный воркер → PR → DoD-гейт внутри job → авто-merge (зелёный) / открытый PR с 🔴 (красный) → пост-merge проверка Cowork → откат = revert. Схемой (текстовой) + где какие правила применяются.
3. **Запасные пути и когда они обязательны:** локальный pass (правки `.github/workflows/**`, машина владельца выключена), issue с меткой `ai-task`, `@claude`-комментарии (доработки; merge — только по слову владельца).
4. **Формат промпта:** заголовок/Scope/NOT in scope/Constraints/DoD; naming `prompt-NN-*` vs `prompt-ops-NN-*`; архив `_done/`; тела промптов владельцу в чат не показываются.
5. **Защита от сбоев:** timeout 30 мин, token-free тревога (`worker-failure`), дозор (окно 9:00–01:00, тихий выход без новостей), известные ограничения GitHub (анти-рекурсия `GITHUB_TOKEN` → CI не бегает на воркерских PR, гейт внутри job; запрет на `workflows`).
6. **Память и состояние:** что живёт в DEVLOG (журнал) / BACKLOG (очередь) / ADR (решения) / handoff (перенос контекста между сессиями) / agent-memory; что восстанавливается из репо автоматически.
7. **Инварианты (нарушать нельзя):** один пишущий агент; канон прежде кода; вертикальные срезы; token economy (пин модели, минимальный скоуп чтения, короткие отчёты); прямой push в main — только владелец; секреты никогда в файлах.
8. **Состояния задачи (мини-FSM):** Idle → Prompt Ready → Dispatched → Executing → Gate → Merged/Blocked → Verified → (Reverted). Допустимые переходы и кто их совершает.

## Also

- `README.md`: one line in «Правила разработки» linking to `docs/PROCESS.md`.
- `CLAUDE.md`: one pointer line (the file is pointers-only — keep it to one line).
- DEVLOG entry; this prompt file → `prompts/_done/` in the same PR.

**NOT in scope:** no changes to the process itself — this pass only DESCRIBES what exists; contradictions found between sources are listed at the end of PROCESS.md under «Открытые вопросы» (for the owner), not resolved unilaterally. No workflow/code changes.

## Definition of Done

- [ ] `docs/PROCESS.md` in Russian, structure above, ≤ ~250 lines, links to sources valid
- [ ] Contradictions/gaps → «Открытые вопросы» section, not silent fixes
- [ ] README + CLAUDE.md one-line pointers; DEVLOG entry; prompt archived to `_done/`
- [ ] Docs-only gate → auto-merge; if blocked, PR stays open with the blocker stated

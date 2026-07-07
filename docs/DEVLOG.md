# DEVLOG

Журнал проходов по репозиторию: дата · ветка/коммит · что сделано · что дальше. Новые записи — сверху. Добавляется командой `/devlog`.

## 2026-07-07 · main · baseline

- **Что сделано:**
  - Наведён порядок в документации: убраны дубли PRD/Decision_Center/Entity_Platform, `docs/Command_Center.md` → `docs/full-vision/09_Design_System/Visual_Reference.md`, пересобран INDEX.md, зафиксирован канон модели управления `Management_Model.md` (Ф1–Ф7).
  - Chore-проход: поправлены битые пути в докстрингах backend, наполнен `docs/adr/` шаблоном и README.
  - Оформлен визуальный бренд-бук (Часть II `Visual_Reference.md`): токены, компоненты, семантика состояний — извлечено дословно из кода прототипа `frontend/src/os/`.
  - `ai-agents/` инициализирован как единый репозиторий-ОС: `decision-center/` (пилот) поднят в корень, его локальная история `.git` удалена (рабочий код сохранён), `FreeDeepseekAPI/` вынесен из воркспейса в `c:/Dev/FreeDeepseekAPI` (git-история цела) и зафиксирован как fallback-направление (`docs/adr/0001`), утверждённые дизайн-рендеры перенесены в `docs/full-vision/09_Design_System/renders/` (раздел D10 в бренд-буке), транзитный мусор (`.playwright-mcp/`, `frontend/src.rar`) удалён.
  - Именование зафиксировано: продукт/репозиторий — ОС `ai-agents`, «Decision Center» — имя первого среза (не продукта).
  - Claude Code настроен по максимуму: `CLAUDE.md` (память проекта), `.claude/rules/` (backend/frontend/docs/commits), `.claude/agents/` (code-reviewer, spec-guardian, doc-keeper, test-runner), `.claude/commands/` (`/devlog`, `/ship`, `/adr`), `.claude/hooks/` (protect-main, block-secrets, format-code, statusline) + `.claude/settings.json` (permissions/env/hooks/statusLine), `.mcp.json` (пустой каркас), `.claude/agent-memory/`.
- **Дальше:**
  - M3: борд из трёх персон (CFO/COO/CTO) + синтез.
  - Спайк по локальным LLM-моделям для fallback (`docs/adr/0001`, таблица кандидатов).
  - Решить финальное потребительское имя продукта (кандидат — «Вектор·OS»).

# Промпт: Инициализация `ai-agents` как репозитория ОС + полная настройка Claude Code
### Чистый git-старт · сохранение наработок · fallback-LLM · максимальная конфигурация Claude Code

> **Кому:** AI-агенту разработки (Claude Code).
> **Что делаем:** `ai-agents/` становится ЕДИНЫМ репозиторием — ОС по управлению агентами. `decision-center/` («пробы пера», на которых зафиксирован дизайн) вливается в корень как первый функциональный срез; его git-история ОБНУЛЯЕТСЯ; **рабочий код (backend/frontend/docs) сохраняется**. Настраиваем Claude Code по максимуму (память, правила, субагенты, команды, хуки, MCP, статус-лайн).
> **⚠ Безопасность:** корень воркспейса не под git, `decision-center/.git` будет удалён. Задача 0 (бэкап) — первая и обязательная.
> **Про версии Claude Code:** структура `.claude/` эволюционирует. Перед написанием `settings.json`/хуков/статус-лайна **сверить точную схему с актуальной документацией** `https://code.claude.com/docs` (`/settings`, `/hooks`, `/sub-agents`, `/claude-directory`) — не полагаться только на примеры ниже.

---

## Целевое состояние

```
ai-agents/                       ← НОВЫЙ git-репозиторий (история с нуля)
├── CLAUDE.md                    ← память проекта (конвенции, указатели)
├── CLAUDE.local.md              ← личные заметки (gitignore)
├── .mcp.json                    ← MCP-серверы (коммитится)
├── README.md CONTRIBUTING.md
├── .gitignore .gitattributes .pre-commit-config.yaml
├── .github/                     ← CI (пути выверить после переезда)
├── .claude/
│   ├── settings.json            ← разрешения, env, model, hooks, statusLine (коммит)
│   ├── settings.local.json      ← личные оверрайды (gitignore)
│   ├── rules/                   ← модульные правила по зонам (backend/frontend/docs/commits)
│   ├── agents/                  ← субагенты-специалисты (code-reviewer, doc-keeper, …)
│   ├── commands/                ← slash-команды (/devlog, /ship, /adr)
│   ├── hooks/                   ← скрипты Pre/PostToolUse, statusline
│   ├── skills/                  ← навыки (graphify уже есть; сохранить)
│   └── agent-memory/            ← общая память субагентов (agent-memory-local — gitignore)
├── backend/  frontend/          ← из decision-center (первый срез)
└── docs/
    ├── DEVLOG.md  adr/  full-vision/(…/09_Design_System/renders/)
```

## Задача 0 — Бэкап (ПЕРЕД всем)
```bash
tar --exclude='*/node_modules' --exclude='*/.venv' --exclude='*/dist' \
    -czf ai-agents-backup-$(date +%Y%m%d-%H%M).tar.gz ai-agents/
```
Проверить ненулевой размер; имя записать в DEVLOG (Задача 8).

## Задача 1 — FreeDeepseek: сохранить как fallback-направление, код убрать
Причина сохранения — не «DeepSeek лучший», а **резервный локальный LLM-рантайм**, когда облачный провайдер недоступен (нет подписки / нет интернета / проблемы с VPN).
1. `docs/adr/0001-local-llm-fallback-for-advisors.md` (по `adr/0000-template.md`):
   - **Контекст:** внутренним офисным советникам (front/middle/back, Management_Model §4) нужен LLM. Основной путь — облачный провайдер; нужен **fallback на локальные модели** для оффлайна/сбоев/отсутствия подписки. Протестирован FreeDeepseekAPI (прокси к DeepSeek Web).
   - **Решение:** оставить fallback как явное требование. Прокси-через-веб-сессию — хрупкий механизм; для fallback оценить **2–3 подходящие опенсорс-модели с локальным инференсом** (критерии: качество рассуждений на русском, лицензия, требования к железу, простота развёртывания). Абстракция `LLMProvider` в backend уже готова принять локальный провайдер наряду с облачным.
   - **Статус:** Accepted (требование fallback) + Proposed (конкретные модели — спайк). **Кандидаты** — раздел оставить открытым, заполнить при спайке (не вписывать модели без проверки актуальности).
2. Убедиться, что репо FreeDeepseek сохранён вне воркспейса (`git remote -v`; нет remote → переместить наружу, не удалять). Затем удалить `ai-agents/FreeDeepseekAPI/`.

## Задача 2 — MetaGPT
Артефактов кода нет (проверено) — только текстовые упоминания. При переписывании README/CLAUDE (Задача 6) актуализировать: доки full-vision — ранние черновики (часть через MetaGPT), reference-материал, не авторитетны сверх PRD/Management_Model.

## Задача 3 — Поднять decision-center в корень, обнулить историю
1. Перенести содержимое `decision-center/` (backend, frontend, docs, README, CONTRIBUTING, .github, .gitignore, .pre-commit-config, .claude, .gitattributes при наличии) в корень `ai-agents/`.
2. Удалить `decision-center/.git`; файлы сохранить как есть (включая всю работу прошлых проходов: Management_Model, бренд-бук, frontend/src/os, дедуп доков). Удалить пустую `decision-center/`.
3. **Выверить пути после переезда на уровень вверх:** CI в `.github/workflows` (ссылки `decision-center/…`), `.pre-commit-config`, alembic, `vite.config.ts` proxy, импорты — все вхождения `decision-center/` поправить на корневые.

## Задача 4 — Дизайн-рендеры внутрь репо
1. `docs/full-vision/09_Design_System/renders/` ← `cc-root/drill/final/proc2/proc3/restyle/restyle-drill.png`, `os-panel.png`, `os-goal.png`.
2. `decision-center-list.png` (устаревший) → `renders/_archive/` или удалить (в DEVLOG).
3. В `Visual_Reference.md` (Часть II) — раздел «Дизайн-рендеры» со ссылками, рендер↔экран/состояние.
4. Проверить, что `.gitignore` не глотает эти PNG.

## Задача 5 — Транзитный мусор
- `.playwright-mcp/` — удалить. `frontend/src.rar` — удалить. Кэши (`.venv`, `graphify-out/`, линтер-кэши) — не трогать (регенерируются, должны быть в `.gitignore`).

## Задача 6 — Именование и корневые файлы
1. **Именование** (закрыть открытый вопрос бренд-бука §D1): продукт/репо — **ОС `ai-agents`** (в коде алиас «Вектор·OS» — кандидат в имя, финал за владельцем); **«Decision Center» — имя первого среза**, не продукт. Обновить формулировку в `Visual_Reference.md`.
2. **README.md** — переписать под ОС ai-agents: что это, принцип (Enterprise OS: люди и AI — единая рабочая сила), источники истины (PRD, Management_Model, бренд-бук), таблица вех, статус первого среза.
3. **CONTRIBUTING.md** — сохранить правила (vertical slice, изоляция LLM-провайдера, RU-локализация, зелёные ruff/mypy/pytest); добавить пункт про DEVLOG и Conventional Commits после переезда.

## Задача 7 — Настройка Claude Code (МАКСИМУМ)
> Всё в `.claude/` (кроме `*.local.*`) и `.mcp.json`, `CLAUDE.md` — **коммитится** для командного использования. Личное — gitignore (Задача 8.2). Схему `settings.json` сверить с актуальными доками.

**7.1 Память — `CLAUDE.md` (корень).** Компактно (цель ~ ≤ 400–500 токенов; детали выносить в rules): стек, команды (backend: ruff/mypy/pytest; frontend: build/lint), где источники истины (PRD → Management_Model → бренд-бук), куда писать логи (DEVLOG) и задачи (Issues/BACKLOG), правило RU-локализации UI. Указатели, а не пересказ доков.

**7.2 `.claude/rules/` — модульные правила по зонам** (path-scoped, коротко):
- `backend.md` — FastAPI + SQLAlchemy async; **LLM SDK только в `app/llm/<provider>_provider.py`**; тесты на моках; ruff+mypy+pytest зелёные до PR.
- `frontend.md` — React 19 + TS + oxlint; **UI-строки на русском**; цвета/типографика — токены `index.css`, переиспользовать классы `os.css` по бренд-буку; не хардкодить цвета мимо токенов.
- `docs.md` — правки по `AGENTS.md`; PRD/Management_Model — истина; каждый проход обновляет INDEX + CHANGELOG + DEVLOG.
- `commits.md` — Conventional Commits, один vertical slice на PR, кросс-каттинг — отдельным `chore:`.

**7.3 `.claude/agents/` — субагенты-специалисты (DEV-инструменты, НЕ продуктовые советники):**
- `code-reviewer.md` — ревью диффа против CONTRIBUTING (изоляция LLM, типы, размер PR); вывод с severity.
- `spec-guardian.md` — проверка изменений на соответствие PRD/Management_Model (не разошлась ли реализация с каноном).
- `doc-keeper.md` — следит, что INDEX/CHANGELOG/DEVLOG обновлены и кросс-ссылки целы.
- `test-runner.md` — гоняет ruff/mypy/pytest и frontend build/lint, интерпретирует падения.
Каждый — свой system prompt, минимальный набор инструментов, при желании `memory: project` (память в `.claude/agent-memory/<agent>/`).

**7.4 `.claude/commands/` — slash-команды (простые шаблоны):**
- `/devlog` — добавить запись в `docs/DEVLOG.md` (дата · ветка/коммит · что · дальше).
- `/ship` — прогнать DoD: lint+type+test (обе стороны), обновить доки, предложить Conventional Commit.
- `/adr` — создать новый ADR из `adr/0000-template.md`.
(Навыки `skills/` — для сложных воркфлоу; graphify-навык уже есть, сохранить.)

**7.5 `.claude/hooks/` + регистрация в `settings.json`:**
- **PreToolUse** на `Edit|Write`: блокировать правки на ветке `main` (форсить фиче-ветки per CONTRIBUTING).
- **PreToolUse**: скан секретов — блокировать запись `.env`/ключей/токенов.
- **PostToolUse** на `Edit|Write` `*.py`: `ruff format` изменённого файла; на фронт-файлах — `oxlint --fix` по возможности.
- Скрипты в `.claude/hooks/`, `chmod +x`, пути зарегистрировать в `settings.json`.

**7.6 `.claude/settings.json` (коммит):**
- `permissions`: allow безопасное (Read/Grep/Glob, `Bash(npm:*)`, `Bash(pytest:*)`, `Bash(ruff:*)`, `Bash(mypy:*)`, `Bash(git status:*)`, `Bash(git diff:*)`, `Bash(git log:*)`); ask/deny разрушительное (`Bash(rm -rf:*)`, `Bash(git push:*)` — ask; force-push — deny). Правило: deny > ask > allow.
- `env`: например `LLM_PROVIDER=stub` для локальной разработки без ключей.
- `model`: дефолтная модель проекта (по желанию).
- `hooks`: регистрация из 7.5.
- `statusLine`: скрипт статус-лайна (7.7).
- Включить `$schema` для автодополнения.

**7.7 Статус-лайн — `.claude/hooks/statusline.sh`:** ветка git + текущая модель + краткий индикатор (напр. dirty/clean дерева). Подключить через `statusLine` в `settings.json`.

**7.8 `.mcp.json` (корень, коммит):** каркас MCP-серверов. Внести только реально используемые; для остального — задокументированные заготовки (JSON без комментариев, поэтому — в README-разделе «MCP»). Кандидаты под этот проект: GitHub (есть `.github/`, нужен токен — держать в env, не в git), файловая система/поиск при необходимости. **Не выдумывать несуществующие серверы**; пустой `{"mcpServers": {}}` + инструкция по добавлению — приемлемо.

**7.9 Память субагентов:** каталог `.claude/agent-memory/` (общая, коммит) — для агентов с `memory: project`; `.claude/agent-memory-local/` — личная, gitignore.

## Задача 8 — git init, gitignore и запуск
1. `.gitattributes`: `* text=auto eol=lf`.
2. **Исправить `.gitignore`:** снять глобальный игнор `.claude/`; вместо него игнорить только личное:
   ```
   .claude/settings.local.json
   .claude/agent-memory-local/
   .claude/**/*.local.*
   CLAUDE.local.md
   ```
   Оставить игноры: `.venv`, `node_modules`, `dist`, кэши, `.env`, `*.db`, `graphify-out/`, `*.rar`, `.playwright-mcp/`. Убедиться, что командная конфигурация `.claude/` (settings.json, rules, agents, commands, hooks, skills) и `.mcp.json` НЕ игнорируются.
3. `git init`, ветка `main`.
4. **Проверить запуск ДО первого коммита** (починить, что сломал переезд путей):
   - backend: `cd backend && pip install -e ".[dev]" && ruff check . && mypy app && pytest` — зелёное;
   - frontend: `cd frontend && npm install && npm run build && npm run lint` — проходит.
5. Первый коммит: `chore: initial commit — ai-agents OS (design fixed via decision-center pilot) + Claude Code config`.
6. Remote/push — только по указанию владельца.

## Definition of Done
- [ ] Бэкап создан ДО операций (имя в DEVLOG).
- [ ] FreeDeepseek: fallback зафиксирован в `adr/0001`, код вне воркспейса, папка убрана.
- [ ] decision-center поднят в корень, `.git` пилота удалён, пути в CI/конфигах выверены, рабочий код сохранён.
- [ ] Рендеры в `docs/.../renders/`, залинкованы из бренд-бука, не под игнором.
- [ ] `.playwright-mcp/`, `frontend/src.rar` убраны.
- [ ] Именование обновлено; README/CLAUDE/CONTRIBUTING переписаны под ОС ai-agents.
- [ ] Claude Code настроен: CLAUDE.md-память, rules/, agents/, commands/, hooks/, settings.json (permissions+hooks+statusLine), .mcp.json, статус-лайн; схема сверена с доками.
- [ ] `.gitignore` коммитит командную `.claude/` и игнорит только личное; `.mcp.json` коммитится.
- [ ] `DEVLOG.md` с первой записью; система задач выбрана (Issues/BACKLOG.md) и зафиксирована.
- [ ] `git init` + `main`; backend (ruff/mypy/pytest) и frontend (build/lint) зелёные ПОСЛЕ переезда; первый коммит — чистый baseline; воркспейс запускается.

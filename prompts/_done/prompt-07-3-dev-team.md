# Дополнение к промпту инициализации: DEV-команда субагентов Claude Code
### Заменяет и расширяет Задачу 7.3 — роли-исполнители + существующие функции-контролёры

> **Кому:** Claude Code. Сверить формат с `https://code.claude.com/docs/en/sub-agents` (поля фронтматтера эволюционируют).
> **Принцип:** субагенты в `.claude/agents/` (проектный scope, коммитятся). Два вида, НЕ смешивать:
> - **Роли-исполнители** (кто пишет код) — новые, ниже.
> - **Функции-контролёры** (кто проверяет) — уже созданы: `code-reviewer`, `spec-guardian`, `doc-keeper`, `test-runner`. Оставить.
> Это DEV-инструменты разработки репозитория. НЕ путать с продуктовыми офисными советниками ОС (front/middle/back из Management_Model §4) — те реализуются в коде, а не как `.claude/agents/`.

---

## Правила, обязательные для каждого агента

1. **`description` — с триггер-словами и условием «когда применять»**, не общий ярлык (от неё зависит авто-делегирование).
2. **`tools` задавать явно и узко.** Опустить = унаследовать ВСЕ инструменты (включая MCP) — недопустимо. Ревью/спека/архитектор — read-only (`Read, Grep, Glob`); инженеры — `+ Edit, Write, Bash`.
3. **`model` по весу задачи:** судейские/проектные — `opus` (+ `effort: high` где уместно); исполнители — `sonnet`; поисковые — `haiku`.
4. **Одна роль — один агент.** Тело = system prompt: роль, что НЕ делает, формат вывода.
5. Определения — на английском (как CLAUDE.md/CONTRIBUTING); вывод разработчику может быть кратким. UI-строки продукта — по-прежнему русские (это правило кода, не агентов).
6. При необходимости знаний — прелоадить навык через `skills:` (например graphify для навигации по коду).

## Конвейер (как роли и контролёры сочетаются)

```
product-owner → architect → { backend-engineer | frontend-engineer | llm-integration-engineer }
                                   ↓
   контролёры-гейты: code-reviewer + test-runner + spec-guardian + doc-keeper
```
Исполнитель делает вертикальный срез, контролёры проверяют перед «done». Один срез = один PR (CONTRIBUTING).

## Роли-исполнители — создать в `.claude/agents/`

### `product-owner.md` (read-mostly)
- **Назначение:** превращает запрос/веху в рабочую спеку с критериями приёмки, сверяясь с PRD и Management_Model; задаёт уточняющие вопросы; НЕ пишет код.
- frontmatter: `tools: Read, Grep, Glob`; `model: opus`.
- Вывод: спека (цель, объём, критерии приёмки, открытые вопросы). Явно помечает расхождения с каноном.

### `architect.md` (read-mostly, пишет ADR)
- **Назначение:** проверяет дизайн против ограничений платформы (Entity-модель, изоляция `LLMProvider`, vertical-slice), выбирает подход, оформляет ADR в `docs/adr/`.
- frontmatter: `tools: Read, Grep, Glob, Write` (только для ADR); `model: opus`, `effort: high`.
- Вывод: краткий ADR (Контекст/Решение/Последствия) + guardrails для исполнителя.

### `backend-engineer.md` (исполнитель)
- **Назначение:** реализует backend-срез: route в `app/api/v1/`, логика в `app/services/`, схемы, модель + `alembic revision --autogenerate`, тесты на моках. Соблюдает изоляцию LLM (SDK только в `app/llm/<provider>_provider.py`).
- frontmatter: `tools: Read, Grep, Glob, Edit, Write, Bash`; `model: sonnet`.
- Требование: до сдачи — `ruff`, `mypy`, `pytest` зелёные.

### `frontend-engineer.md` (исполнитель)
- **Назначение:** реализует UI-срез в `frontend/src/os`: React 19 + TS, строки UI на русском, цвета/типографика из токенов `index.css`, переиспользование классов `os.css` по бренд-буку; расширяет `api.ts`/`types.ts` синхронно с backend.
- frontmatter: `tools: Read, Grep, Glob, Edit, Write, Bash`; `model: sonnet`.
- Требование: `npm run build` и `oxlint` проходят; не хардкодить цвета мимо токенов.

### `llm-integration-engineer.md` (исполнитель, «+1») 
- **Назначение:** владеет слоем `LLMProvider`: облачный провайдер + **локальный fallback** (ADR 0001) для оффлайна/сбоев/без подписки; персоны совета в `app/board/personas.py` через forced tool-use; готовит почву под офисных советников ОС.
- frontmatter: `tools: Read, Grep, Glob, Edit, Write, Bash`; `model: sonnet`.
- Требование: никаких live-API в тестах (моки); структурный вывод только через function-calling.

### (Опционально) `release-manager.md`
- **Назначение:** финализирует срез: прогон DoD, Conventional Commit, запись в DEVLOG. Пересекается со `/ship` и `test-runner` — заводить только если нужен отдельный агент, иначе оставить командой `/ship`.
- frontmatter: `tools: Read, Grep, Glob, Bash`; `model: sonnet`.

## Шаблон файла (пример `backend-engineer.md`)
```markdown
---
name: backend-engineer
description: Implements a backend vertical slice (route + service + schema + migration + tests) for FastAPI/SQLAlchemy. Use when a milestone needs new/changed backend behavior. Keeps LLM SDK isolated to app/llm.
tools: Read, Grep, Glob, Edit, Write, Bash
model: sonnet
---
You are a backend engineer for the ai-agents OS (FastAPI + async SQLAlchemy).
Scope: implement ONE vertical slice — route in app/api/v1/, logic in app/services/,
schemas in app/schemas/, model change + `alembic revision --autogenerate`, tests in
tests/. Never import an LLM SDK outside app/llm/<provider>_provider.py. Never make live
API calls in tests — use the mocked LLMProvider.
Before reporting done: run `ruff check .`, `mypy app`, `pytest` — all green.
Output: summary of files changed, migration name, test results. Do not open a PR;
the lead decides. Flag any divergence from PRD/Management_Model instead of guessing.
```

## Definition of Done (для этой задачи)
- [ ] Роли созданы: product-owner, architect, backend-engineer, frontend-engineer, llm-integration-engineer (release-manager — по решению).
- [ ] Существующие контролёры (code-reviewer, spec-guardian, doc-keeper, test-runner) не тронуты.
- [ ] У каждого агента `tools` заданы явно и узко; ревью/спека/архитектор — без Write в код.
- [ ] `model` проставлен по весу роли; `description` — с триггер-словами.
- [ ] Все файлы в `.claude/agents/` коммитятся (не под игнором); проверено, что `.gitignore` их не глотает.
- [ ] Краткая заметка в DEVLOG о составе DEV-команды и конвейере.

# ai-agents — Enterprise OS (люди + ИИ = единая рабочая сила)

Репозиторий ОС по управлению агентами; «Decision Center» — первый вертикальный срез, не продукт. Подробные правила по зонам — в `.claude/rules/` (backend/frontend/docs/commits); этот файл — только указатели.

## Команды

```bash
# backend (FastAPI + SQLAlchemy async + Alembic; Python >=3.11,<3.13)
cd backend && .venv\Scripts\activate
pytest                                             # тесты (мок LLMProvider, без живых API)
ruff check . && ruff format --check . && mypy app  # все четыре зелёные до PR (CI гоняет то же)
alembic upgrade head

# frontend (React 19 + TS + Vite)
cd frontend && npm run dev      # прокси /api -> :8000
npm run build && npm run lint   # tsc -b + vite build; oxlint
```

## Источники истины (по приоритету)

1. `docs/full-vision/02_Product/PRD.md` — продуктовые требования.
2. `docs/full-vision/02_Product/Management_Model.md` — модель управления (карты, роли, увязка, навык ≠ компетенция).
3. `docs/full-vision/09_Design_System/Visual_Reference.md` — интерфейсная модель + бренд-бук (рендеры в `renders/`).

Навигация — `docs/full-vision/INDEX.md`; правила правок доков — `docs/full-vision/AGENTS.md`. Остальной full-vision-архив — reference, не канон. Реализационные решения — ADR в `docs/adr/`.

## Процесс

- Ветки от `main` (`feat/<веха>-<суть>`), прямые правки на `main` блокирует хук. Conventional Commits; кросс-каттинг — отдельный `chore:` PR.
- Весь пользовательский UI-текст — на русском (CONTRIBUTING «Localization»).
- LLM SDK импортируется ТОЛЬКО в `backend/app/llm/<provider>_provider.py`; локально `LLM_PROVIDER=stub` — ключи не нужны.
- Конец каждого прохода: запись в `docs/DEVLOG.md` (`/devlog`), задачи — в `BACKLOG.md`. Milestone-таблица в README может отставать — проверяй `git log`.

## graphify

Граф знаний в `graphify-out/`. Вопросы о кодовой базе — сначала `graphify query "<вопрос>"` (`explain`, `path` — для концептов и связей); после правок кода — `graphify update .` (AST-only, бесплатно).

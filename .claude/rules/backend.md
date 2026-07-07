---
paths:
  - "backend/**"
---

# Backend-правила

- Стек: FastAPI + SQLAlchemy 2.0 (async) + Alembic + SQLite (v0; Postgres через `DATABASE_URL`). Всё наследуется от `Entity` (`app/models/entity.py`, спек — `docs/full-vision/05_Architecture/Entity_Platform.md`).
- **LLM SDK (`anthropic`, `openai`, …) импортируется только в `app/llm/<provider>_provider.py`.** Всё остальное зависит от абстрактного `LLMProvider` (`app/llm/provider.py`), выбор — `factory.py`. Тесты — только на моках (`tests/fakes.py`); живых вызовов API в CI нет никогда.
- Структурированный вывод LLM — только forced tool-use со схемой из Pydantic-модели; никакого парсинга JSON из свободного текста.
- Слои: маршруты `app/api/v1/` → логика `app/services/` → схемы `app/schemas/`. Юнит-тесты в `tests/unit/`, интеграционные — `tests/integration/`.
- Изменение схемы БД: правь SQLAlchemy-модель, затем `alembic revision --autogenerate -m "..."`; миграции руками не редактировать (кроме известных quirks автогенерации).
- Перед PR все четыре зелёные: `ruff check .`, `ruff format --check .`, `mypy app`, `pytest`.

---
paths:
  - "backend/**"
---

# Backend rules

- Stack: FastAPI + SQLAlchemy 2.0 (async) + Alembic + SQLite (v0; Postgres via `DATABASE_URL`). Everything inherits from `Entity` (`app/models/entity.py`, spec — `docs/full-vision/05_Architecture/Entity_Platform.md`).
- **LLM SDKs (`anthropic`, `openai`, …) are imported only in `app/llm/<provider>_provider.py`.** Everything else depends on the abstract `LLMProvider` (`app/llm/provider.py`); selection happens in `factory.py`. Tests use mocks only (`tests/fakes.py`); no live API calls in CI, ever.
- Structured LLM output — forced tool-use with a schema from a Pydantic model only; never parse JSON out of free text.
- Layers: routes `app/api/v1/` → logic `app/services/` → schemas `app/schemas/`. Unit tests in `tests/unit/`, integration tests in `tests/integration/`.
- Changing the DB schema: edit the SQLAlchemy model, then `alembic revision --autogenerate -m "..."`; don't hand-edit migrations (except known autogeneration quirks).
- All four must be green before a PR: `ruff check .`, `ruff format --check .`, `mypy app`, `pytest`.

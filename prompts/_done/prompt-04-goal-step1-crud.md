# Промпт №4 (Goal Entity, Шаг 1): CRUD цели + авто «туман/определён»
### `backend/` · один вертикальный срез · по образцу Decision

> **Кому:** Claude Code, по `CONTRIBUTING.md`, `docs/full-vision/AGENTS.md`, `.claude/rules/backend.md`.
> **Ветка/коммит:** `feat/goal-entity-step1-crud`, `feat: goal entity CRUD with auto fog/defined state`.
> **Scope:** ТОЛЬКО Шаг 1 — плоская цель (без дерева, без ресурсов, без увязки). Дерево — Шаг 2, ресурсы+увязка — Шаг 3.
> **Каноны:** `docs/full-vision/02_Product/Management_Model.md` (§3.3 определённость), `docs/adr/0002-reconciliation-first-slice.md` (Q4), `docs/full-vision/05_Architecture/Entity_Platform.md` (базовая Entity).
> **Образец для 1:1 копирования паттерна:** существующий Decision — `models/decision.py`, `schemas/decision.py`, `services/decision_service.py`, `api/v1/decisions.py`, `tests/integration/test_decisions.py`, `tests/unit/test_decision_service.py`. Goal повторяет ту же архитектуру (Entity + join-таблица по `entity_id`).

---

## Что делаем (Шаг 1)

Цель (Goal) — конкретный тип Entity, как Decision: строка в `entity` + строка в новой таблице `goal` с `entity_id` (PK и FK на `entity.id`). CRUD (create/get/list/patch) + автоматическое вычисление состояния определённости «туман/определён». Ручной флаг «бэклог».

### Правило определённости (Шаг 1)
- **определён (`defined`)**, если у узла есть: **KPI с числовым таргетом** И **владелец** (непустой). Иначе — **туман (`fog`)**.
- Определённость **вычисляется** (не хранится в БД) — всегда свежая, что тривиально удовлетворяет «пересчёт на изменение» (ADR-0002 Q7).
- **Бэклог** — отдельное **ручное** булево поле (`is_backlog`), ставит человек (ADR-0002 Q4). Это отдельное измерение, не заменяет fog/defined и не является lifecycle-стадией (Management_Model §3.3).
- Примечание: на Шаге 3 к правилу добавится третий критерий «есть ресурс»; сейчас его нет физически, поэтому проверяем то, что есть (KPI + владелец). Зафиксировать это комментарием в коде.

## Модель — `app/models/goal.py`

Новый файл по образцу `decision.py`:
- `class GoalLifecycleStage(str, enum.Enum)`: `DRAFT="draft"`, `ACTIVE="active"`, `REVIEW="review"`, `ARCHIVED="archived"` (PRD §14.3; проще, чем 13-стадийный цикл Decision).
- `class RoleLabel(str, enum.Enum)`: `OWNER="owner"`, `MANAGER="manager"`, `EXECUTOR="executor"` — **чистая семантика ответственности, без модели прав** (ADR-0002 Q3 отложен).
- `class Goal(Base)`, `__tablename__ = "goal"`:
  - `entity_id: Mapped[str]` = `mapped_column(String(36), ForeignKey("entity.id"), primary_key=True)`
  - `role_label: Mapped[str]` = `mapped_column(String(20), default=RoleLabel.OWNER.value)`
  - `kpis: Mapped[list[dict]]` = `mapped_column(JSONType, default=list)` — список `{name, target, unit}`, `target` числовой
  - `is_backlog: Mapped[bool]` = `mapped_column(Boolean, default=False)`
  - (parent_id и ресурсы НЕ добавлять — это Шаги 2 и 3.)

Зарегистрировать модель для metadata: добавить `goal` в импорты `from app.models import ...` в `tests/integration/conftest.py` и `tests/unit/test_decision_service.py` (там уже перечислены entity, decision, …) — иначе таблица не создастся в тестах.

## Схемы — `app/schemas/goal.py`

По образцу `schemas/decision.py`:
- `class GoalKpi(BaseModel)`: `name: str`, `target: float`, `unit: str`.
- `class GoalCreate(BaseModel)`: `name: str`, `owner: str = ""` (пустой = не назначен → влияет на туман), `role_label: RoleLabel = RoleLabel.OWNER`, `description: str | None = None`, `kpis: list[GoalKpi] = Field(default_factory=list)`.
- `class GoalPatch(BaseModel)`: все поля Optional — `name`, `description`, `owner`, `role_label`, `kpis`, `is_backlog`.
- `class GoalRead(BaseModel)`: поля Entity (`id`, `entity_type`, `name`, `description`, `owner`, `status`, `lifecycle_stage`, `risk_level`, `created_at`, `updated_at`) + Goal (`role_label`, `kpis: list[GoalKpi]`, `is_backlog`) + **вычисляемое** `definiteness: str` (`"fog"` / `"defined"`).

## Сервис — `app/services/goal_service.py`

По образцу `decision_service.py`:
- `def compute_definiteness(owner: str, kpis: list[dict]) -> str`: `"defined"` если `owner.strip()` непустой И есть хотя бы один kpi с числовым `target`; иначе `"fog"`. Чистая функция — покрыть unit-тестами.
- `def to_goal_read(entity, goal) -> GoalRead`: собирает поля + `definiteness=compute_definiteness(entity.owner, goal.kpis)`.
- `async def create_goal(session, payload) -> tuple[Entity, Goal]`: создаёт `Entity(entity_type="goal", ..., status="draft", lifecycle_stage=GoalLifecycleStage.DRAFT.value)`, flush, затем `Goal(...)`. Тот же паттерн, что `create_decision`.
- `_get_row`, `get_goal`, `list_goals` — join Entity+Goal по `entity_id`.
- `async def patch_goal(session, goal_id, payload)`: обновление; поля `name/description/owner` → на Entity, `role_label/kpis/is_backlog` → на Goal; `entity.version += 1`, `updated_at`. (Ограничение «нельзя править после решения» из Decision здесь НЕ нужно.)

## Роут — `app/api/v1/goals.py`

По образцу `decisions.py`: `APIRouter(prefix="/goals", tags=["goals"])`, эндпоинты `POST ""`, `GET ""`, `GET "/{goal_id}"`, `PATCH "/{goal_id}"`, 404 через HTTPException. Подключить роутер в `app/api/v1/__init__.py` (там уже подключается decisions).

## Миграция

`alembic revision --autogenerate -m "add goal table"`. Проверить сгенерированное (таблица `goal`, FK на `entity.id`); поправить только известные quirks автогенерации (напр. импорт `Text`/JSONB-варианты), как указано в CONTRIBUTING.

## Тесты

**Integration — `tests/integration/test_goals.py`** (по образцу `test_decisions.py`, хелпер `_payload`):
- create → 201, `entity_type=="goal"`, `status=="draft"`, `lifecycle_stage=="draft"`.
- **definiteness: без KPI → `"fog"`**; с KPI(таргет) + owner → `"defined"`; с KPI, но пустой owner → `"fog"`.
- get, list, get 404, patch (меняет поле, остальные целы), patch 404.
- **is_backlog**: по умолчанию False; patch ставит True; не влияет на вычисление definiteness.

**Unit — `tests/unit/test_goal_service.py`**: прямые тесты `compute_definiteness` (все ветки: нет KPI / KPI без числ.таргета / нет owner / всё есть) + create/patch через in-memory engine (по образцу `test_decision_service.py`).

## Ограничения
- Только backend. Frontend goal-карта — прототип на демо-данных; её привязка к реальному API — отдельный будущий срез (занести пункт в `BACKLOG.md`, не делать здесь).
- Никаких parent_id/ресурсов/увязки (Шаги 2–3).
- LLM не задействуется. Изоляция LLM-правила соблюдать (здесь LLM просто не нужен).

## Definition of Done
- [ ] Модель/схемы/сервис/роут Goal созданы по паттерну Decision; роутер подключён.
- [ ] Миграция сгенерирована и применяется (`alembic upgrade head`).
- [ ] `goal` добавлен в импорты моделей в обоих тестовых файлах-регистраторах.
- [ ] Тесты покрывают CRUD + все ветки definiteness + is_backlog; `pytest` зелёный.
- [ ] `ruff check .` + `ruff format --check .` + `mypy app` зелёные. (Если `.venv\Scripts\mypy` капризничает — использовать `python -m mypy app`; дубликат `venv/` рядом с `.venv/` — в BACKLOG отдельным пунктом, не в этом PR.)
- [ ] Запись в `docs/DEVLOG.md`; пункт «привязка frontend goal-карты к API» добавлен в `BACKLOG.md`.
- [ ] Один `feat:`-коммит на ветке `feat/goal-entity-step1-crud`; PRD/канон не тронуты (решения уже зафиксированы ADR-0002).

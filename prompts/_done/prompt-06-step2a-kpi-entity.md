# Промпт №6 (Goal, Шаг 2a): вынести KPI из JSON в Сущность
### `backend/` · рефактор Шага 1 · KPI = полноценная Entity-сущность

> **Кому:** Claude Code, по `CONTRIBUTING.md`, `.claude/rules/backend.md`, `docs/full-vision/AGENTS.md`.
> **Ветка/коммит:** `feat/goal-step2a-kpi-entity`, `feat: promote KPI from JSON field to first-class entity`.
> **Каноны:** `Management_Model.md` §9.1 (KPI — Сущность), `docs/adr/0003-kpi-entity-and-goal-alignment.md` (Шаг 2a), §6 «Всё есть Сущность».
> **Образец паттерна Entity+join:** `models/goal.py`, `services/goal_service.py`, `models/decision.py` — KPI повторяет ту же схему (строка в `entity` + строка в `kpi` с `entity_id` PK/FK).
> **Scope:** ТОЛЬКО вынос KPI в сущность (рефактор Шага 1). НЕ добавлять `parent_id` (Шаг 2b) и НЕ добавлять связи KPI→KPI (Шаг 3).

---

## Суть

Сейчас (Шаг 1) KPI живут как JSON-список `goal.kpis`. Сделать KPI отдельной Сущностью со своим стабильным ID (паттерн Goal/Decision), чтобы Шаг 3 мог ссылаться на конкретный KPI. **API-контракт снаружи сохранить прежним** (kpis передаются/возвращаются списком в Goal-create/read) — меняется только хранение, не форма запроса/ответа. Это сохранит фронт-контракт и позволит Шагу 2a быть чистым рефактором.

## Модель — `app/models/kpi.py`

Новый файл по образцу `goal.py`:
- `class Kpi(Base)`, `__tablename__ = "kpi"`:
  - `entity_id: Mapped[str]` = `mapped_column(String(36), ForeignKey("entity.id"), primary_key=True)` — KPI это Entity-подтип.
  - `goal_id: Mapped[str]` = `mapped_column(String(36), ForeignKey("entity.id"), index=True)` — к какой цели относится (FK на entity.id цели).
  - `target: Mapped[float | None]` = `mapped_column(Float, nullable=True)` — числовой таргет; `None` = нет таргета (узел в тумане).
  - `unit: Mapped[str]` = `mapped_column(String(50), default="")`.
  - (Имя KPI — в `entity.name`; описание — в `entity.description`. Не дублировать в `kpi`.)

Замечание про определённость: `target` теперь колонка, а не значение в JSON. `compute_definiteness` проверяет «есть хотя бы один KPI цели с не-`None` числовым `target`».

Убрать поле `kpis` из `models/goal.py` (Goal больше не хранит KPI в JSON).

Зарегистрировать `kpi` в импортах моделей в `tests/integration/conftest.py` и `tests/unit/test_goal_service.py` (там уже перечислены entity, goal, …).

## Схемы — `app/schemas/goal.py` + `app/schemas/kpi.py`

- Оставить публичный `GoalKpi` (name, target, unit) как форму в API — но теперь при чтении собирается из строк `kpi`, при создании/патче — создаёт/обновляет строки `kpi`. `target` в схеме допускает `float | None` (было `float`) — чтобы можно было завести KPI без таргета (туман). Обновить тесты, где `target` обязателен.
- `GoalCreate.kpis: list[GoalKpi]`, `GoalRead.kpis: list[GoalKpi]`, `GoalPatch.kpis: list[GoalKpi] | None` — форма прежняя.
- (Отдельные KPI-эндпоинты в Шаге 2a НЕ вводить — понадобятся в Шаге 3 для графа связей.)

## Сервис — `app/services/goal_service.py` + `app/services/kpi_service.py`

- `kpi_service.create_kpi(session, goal_id, name, target, unit) -> tuple[Entity, Kpi]`: создаёт `Entity(entity_type="kpi", name=name, owner="", status="active", lifecycle_stage="active")`, flush, затем `Kpi(entity_id, goal_id, target, unit)`. (owner у KPI пуст — он наследует контекст цели; lifecycle KPI не разворачиваем в Шаге 2a.)
- `kpi_service.list_kpis_for_goal(session, goal_id) -> list[tuple[Entity, Kpi]]`.
- `compute_definiteness(owner: str, kpis: list[Kpi]) -> str` — переписать сигнатуру: принимает список KPI-строк (или их таргетов), «defined» если owner непустой И есть KPI с числовым не-`None` `target`. Сохранить защиту от `bool` (как в Шаге 1).
- `create_goal`: после создания цели — создать её KPI-строки через `create_kpi`. `to_goal_read`: собрать `kpis` из строк KPI цели; `definiteness` считать по ним.
- `patch_goal`: при патче `kpis` — синхронизировать строки KPI цели (простейшая стратегия для 2a: удалить прежние KPI цели и создать заново из payload; отметить это комментарием как «replace-all», оптимизацию отложить). Патч остальных полей — как в Шаге 1.
- Обновить `_get_row`/`list_goals`: KPI подгружать отдельным запросом по `goal_id` (не ломать join Entity+Goal).

## Роут — `app/api/v1/goals.py`

Форма эндпоинтов не меняется (POST/GET/GET{id}/PATCH `/goals`). Внутри — сервис теперь работает с KPI-строками. Проверить, что `GoalRead` по-прежнему отдаёт `kpis` и `definiteness`.

## Миграция

`alembic revision --autogenerate -m "add kpi entity, drop goal.kpis json"`. Проверить: создаётся таблица `kpi` (FK на entity.id ×2 — `entity_id` и `goal_id`), удаляется колонка `kpis` из `goal`. Данных в dev нет — data-migration не требуется (отметить в теле миграции комментарием). Поправить известные autogen-quirks.

## Тесты

Обновить `tests/integration/test_goals.py` и `tests/unit/test_goal_service.py` под новую модель:
- CRUD цели с KPI по-прежнему работает через тот же API (create с kpis → read возвращает kpis).
- **definiteness**: без KPI → fog; KPI с числовым target + owner → defined; KPI без target (`None`) → fog; owner пустой → fog. (Теперь «KPI без target» — валидный кейс: KPI-туман, как «гудвилл».)
- Патч kpis заменяет набор (replace-all): создать цель с 1 KPI, патчнуть на 2 KPI → читается 2.
- unit-тесты `compute_definiteness` под новую сигнатуру (список KPI/таргетов), все ветки.
- Проверить, что созданные KPI — реальные сущности: у каждого `entity_type=="kpi"` и свой id (это фундамент под Шаг 3).

## Ограничения
- Только backend. Никакого `parent_id` (2b) и связей KPI→KPI (3).
- API-форма Goal не меняется — фронт-контракт стабилен.
- Изоляция LLM соблюдать (здесь LLM не нужен).

## Definition of Done
- [ ] `models/kpi.py`, `schemas/kpi.py`, `services/kpi_service.py` созданы; `goal.kpis` JSON удалён.
- [ ] KPI — Entity-подтип (entity + kpi, `entity_id` PK/FK), у каждого стабильный id.
- [ ] `compute_definiteness` работает от KPI-строк; KPI без target = валидный туман-кейс.
- [ ] Миграция создаёт `kpi`, дропает `goal.kpis`; `alembic upgrade head` чисто.
- [ ] `kpi` добавлен в импорты моделей в тестах-регистраторах.
- [ ] Тесты покрывают CRUD + все ветки definiteness + replace-all патч + «KPI это сущность со своим id»; `pytest` зелёный.
- [ ] `ruff` + `ruff format` + `python -m mypy app` зелёные.
- [ ] DEVLOG обновлён; один `feat:`-коммит на ветке; PRD/канон не тронуты.
- [ ] **После проверки — смёржить ветку в `main` перед следующим срезом** (правило: не копить ветки).

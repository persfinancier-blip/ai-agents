# Промпт №14: Шаг 3b — составной KPI (взвешенные факторы)
### `feat/goal-step3b-composite-kpi`, `feat: composite KPI from weighted factor KPIs`

> **Кому:** Claude Code, по образцу Шага 3a/3c (`app/models/kpi_link*.py`, `app/services/kpi_link_service.py`, `app/api/v1/kpi_links.py`).
> **Модель/режим:** Sonnet, обычный режим — задача сопоставима по объёму с Шагом 3a (одна новая таблица + сервис + роут + расширение существующей чистой функции), без архитектурной неоднозначности. Опус/повышенный reasoning не нужен, если только не всплывёт неочевидный edge-case в `compute_definiteness`.
> **Канон:** `docs/full-vision/02_Product/Management_Model.md` §9.12, `docs/adr/0004-goal-link-types-cycles-composite-kpi.md` (Р4).
> **Решение, зафиксированное владельцем перед этим промптом** (ADR-0004 «Открытые вопросы» п.2 явно запрещал изобретать нормализацию весов на этом шаге без отдельного обсуждения): считаем **сырую взвешенную сумму без нормализации** (`Σ weight_i × factor.target_i`), веса не обязаны давать 1, разные единицы не приводятся друг к другу — интерпретация остаётся за человеком (согласуется с Ф3 «система предлагает, человек утверждает»).

## Scope

**Делаем:**
- Таблица `kpi_factor` — связь «композитный KPI ← фактор-KPI» с весом.
- `compute_definiteness` расширяется: KPI измерим, если есть числовой `target` **ИЛИ** он составной (есть хотя бы один фактор).
- Вычисление `computed_value` составного KPI на чтении (не хранится, не кэшируется — пересчёт дешёвый, тот же аргумент, что везде в проекте).
- CRUD-роут `/kpi-factors` (по образцу `/kpi-links`).

**НЕ делаем (сознательно, не домысливать):**
- **Рекурсивные составные KPI.** Фактор обязан иметь собственный числовой `target` (проверка `factor.target is not None` при создании `kpi_factor`). Составной KPI как фактор другого составного — запрещено этой же проверкой (у составного `target`, как правило, `None`). Это заодно означает, что в графе факторов **структурно не может быть циклов** — отдельный алгоритм детекта не нужен, в отличие от Шага 3c.
- **Нормализация/приведение единиц весов** — открытый вопрос ADR-0004, не решается здесь; `computed_value` — сырое число, ничем не провалидированное сверх типа.
- Составные KPI не встраиваются в payload `POST/PATCH /goals` (`GoalKpi.kpis`) — управляются отдельным роутом `/kpi-factors`, как связи Шага 3a. Причина: фактор должен уже существовать (свой `entity_id`), а `kpis` в payload цели создаются в том же запросе — курица-яйцо, проще держать отдельно.

## Модель данных

`app/models/kpi_factor.py`, по образцу `kpi_link.py` (не Entity-подтип — тот же аргумент: это связь между уже существующими KPI-сущностями, не новый узел графа):

```python
class KpiFactor(Base):
    __tablename__ = "kpi_factor"

    id: Mapped[str]                    # uuid, PK
    composite_kpi_id: Mapped[str]      # FK entity.id — KPI, у которого этот фактор
    factor_kpi_id: Mapped[str]         # FK entity.id — KPI-фактор
    weight: Mapped[float]
```

Миграция: `create_table`, без ALTER (как Шаги 3a/3c).

## Сервис `app/services/kpi_factor_service.py`

По образцу `kpi_link_service.py`:

- `create_factor(session, composite_kpi_id, factor_kpi_id, weight) -> KpiFactor`:
  - оба id — существующие KPI (`_kpi_exists`, переиспользовать паттерн из `kpi_link_service`);
  - `composite_kpi_id != factor_kpi_id` → 400 (`SelfFactorError`);
  - фактор обязан иметь числовой `target` (`kpi.target is not None`) → иначе 400 (`FactorNotMeasurableError`, "фактор сам должен быть измерим") — это и есть заслон от рекурсии/циклов, см. Scope;
  - дубль пары `(composite_kpi_id, factor_kpi_id)` → 409 (`DuplicateFactorError`).
- `get_factor`, `list_factors_for_composite(session, composite_kpi_id)`, `delete_factor`.
- `delete_factors_for_kpi(session, kpi_id)` — удаляет строки, где `kpi_id` фигурирует **как composite ИЛИ как фактор** (симметрично `kpi_link_service.delete_links_for_kpi`); вызвать из `kpi_service.delete_kpi` и `kpi_service.delete_kpis_for_goal` **рядом** с уже существующим вызовом `kpi_link_service.delete_links_for_kpi` (та же точка каскада, тот же принцип ADR-0004 Р2 — связь не переживает удаление своего конца).
- `is_composite(session, kpi_id) -> bool` и/или bulk-версия `composite_kpi_ids(session, kpi_ids: list[str]) -> set[str]` — для `compute_definiteness` и заполнения `computed_value` без N+1.
- `compute_value(session, composite_kpi_id) -> float | None` — `Σ weight × factor.target` по строкам `kpi_factor`; `None`, если факторов нет (не составной).

## Расширение fog-правила

`goal_service.compute_definiteness` сейчас:

```python
def compute_definiteness(owner: str, kpi_targets: list[float | None]) -> str:
```

Изменить сигнатуру на `kpi_measurable: list[bool]` (переименовать параметр, передавать заранее вычисленный флаг на каждый KPI: `target is not None or kpi_id in composite_ids`), логика `has_owner and any(kpi_measurable)` остаётся. Обновить единственный вызов в `to_goal_read` — там уже есть цикл по `kpi_rows`, добавить bulk-запрос `composite_kpi_ids` перед его формированием. Обновить прямые юнит-тесты `compute_definiteness` в `test_goal_service.py` под новую сигнатуру (не расширение поведения "в лоб" — там сейчас передаётся `list[float | None]`, придётся переписать вызовы).

## Схемы и роут

`app/schemas/kpi_factor.py`:

```python
class KpiFactorCreate(BaseModel):
    composite_kpi_id: str
    factor_kpi_id: str
    weight: float

class KpiFactorRead(BaseModel):
    id: str
    composite_kpi_id: str
    factor_kpi_id: str
    weight: float
```

`app/schemas/goal.py` — `GoalKpi` получает необязательное поле `computed_value: float | None = None`, заполняемое **только на чтении** (`to_goal_read` вызывает `kpi_factor_service.compute_value` для KPI, у которых есть факторы). На create/patch поле игнорируется (как уже игнорируется `id` при create) — явно не документировать как принимаемое.

`app/api/v1/kpi_factors.py`, по образцу `kpi_links.py`:

- `POST /kpi-factors` → 201 / 400 (`SelfFactorError`, `FactorNotMeasurableError`, несуществующий KPI) / 409 (дубль).
- `GET /kpi-factors?composite_kpi_id=...` → список факторов композита.
- `DELETE /kpi-factors/{id}` → 204/404.

Зарегистрировать роутер в `app/api/v1/__init__.py`.

## Тесты

Юнит (`test_kpi_factor_service.py`):
- `create_factor` — валидации по отдельности (self-factor 400, фактор без target 400, дубль 409, несуществующий KPI 400).
- `compute_value` — два фактора с весами и таргетами → правильная сумма; ноль факторов → `None`.
- `compute_definiteness` (обновлённые вызовы) — составной KPI без `target`, но с фактором → `measurable=True` → цель `defined`.

Интеграционные (`test_kpi_factors.py`):
- Создать цель с двумя обычными KPI (числовые target — они же будущие факторы) + одним KPI без target (будущий составной, руками через `PATCH /goals/{id}` добавить его в `kpis` без target — уже поддержано diff-sync Шага 3-0).
- Добавить два `kpi_factor` на составной, с весами (например 0.3/0.7, как в каноническом примере гудвилла — не обязательно ровно эти числа).
- `GET /goals/{id}` → у составного KPI `computed_value` = взвешенная сумма, `definiteness` цели = `defined` (была бы `fog`, если бы составной KPI единственный без target).
- Попытка фактора с `target=None` → 400.
- Удаление фактора-KPI (diff-sync патч цели, опускающий его) → `kpi_factor`-строка исчезает (переиспользует существующий каскад Шага 3a/3c — добавить туда вызов `delete_factors_for_kpi`), `computed_value` составного пересчитывается на следующий `GET` (меньше слагаемых).
- Удаление составного KPI → его строки `kpi_factor` тоже исчезают.

## Definition of Done

- [ ] `pytest`, `ruff check .`, `ruff format --check .`, `python -m mypy app` — зелёные.
- [ ] Миграция `add kpi_factor table` прогнана туда-обратно.
- [ ] `kpi_factor` зарегистрирован в импортах моделей (`alembic/env.py`, оба тестовых регистратора — та же ловушка, что в Шагах 3a/3c).
- [ ] `compute_definiteness` обновлён и все прямые юнит-тесты на него — под новую сигнатуру.
- [ ] Каскад удаления KPI (точечный и через удаление цели) чистит и `kpi_link`, и `kpi_factor`.
- [ ] `BACKLOG.md`: пункт «Шаг 3b» отмечен `[x]`.
- [ ] `docs/DEVLOG.md` обновлён (`/devlog`).
- [ ] Один коммит, смёржить в `main` (без накопления веток).

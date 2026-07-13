# Промпт №9 (Goal, Шаг 3-0): diff-sync KPI вместо replace-all
### `backend/` · предусловие Шага 3 · маленький изолированный срез

> **Кому:** Claude Code, по `CONTRIBUTING.md`, `.claude/rules/backend.md`, `AGENTS.md`.
> **Ветка/коммит:** `feat/goal-step3-0-kpi-diff-sync`, `fix: sync goal KPIs by diff instead of replace-all to keep stable ids`.
> **Каноны:** `Management_Model.md` §9.10, `docs/adr/0004-...md` (Р2 «следствие»: diff-sync — предусловие Шага 3).
> **Scope:** ТОЛЬКО замена replace-all на diff-sync в `patch_goal`. НЕ добавлять связи KPI→KPI (3a), типы, циклы. Не менять API-форму.

---

## Зачем

Сейчас `patch_goal` при обновлении `kpis` делает **replace-all**: удаляет все KPI цели и создаёт заново. Раз KPI — сущность со своим `entity_id` (Шаг 2a), это значит **каждый патч цели меняет id всех её KPI**. Как только на KPI появятся связи (Шаг 3a), replace-all будет молча удалять эти связи вместе с пересоздаваемыми KPI (ADR-0004 Р2: связь каскадно умирает с концом). Поэтому до связей переводим синхронизацию на **diff-sync**: неизменные KPI сохраняют свой id, трогаем только дельту.

## Проблема идентичности: по чему матчить KPI

Публичная форма `GoalKpi` сейчас — `{name, target, unit}`, без id. Чтобы diff-sync знал, какой входящий KPI соответствует какому существующему, нужен ключ сопоставления. Решение для 3-0:

- Добавить в `GoalKpi` **опциональное поле `id: str | None = None`**.
  - На **read** — заполняется реальным `entity_id` KPI (теперь клиент видит id каждого KPI).
  - На **patch** — клиент присылает `id` для KPI, которые надо сохранить/обновить; KPI без `id` — новые (создать); существующие KPI, чьих id нет во входящем списке, — удалить.
- Это расширение формы **обратно совместимо**: create по-прежнему принимает `kpis` без id (все создаются). Меняется только поведение patch и появляется id в read.

## Логика diff-sync — `app/services/goal_service.py` (+ `kpi_service.py`)

Заменить блок replace-all в `patch_goal` на `sync_kpis(session, goal_id, incoming: list[GoalKpi])`:

1. Загрузить текущие KPI цели (`list_kpis_for_goal`) → map `{entity_id: (Entity, Kpi)}`.
2. Разбить входящий список:
   - **с `id`, id есть среди текущих** → **update in place**: обновить `name` (на Entity), `target`, `unit` (на Kpi). id НЕ меняется.
   - **с `id`, которого нет среди текущих** → ошибка 400 (ссылается на несуществующий KPI цели) — не создавать молча.
   - **без `id`** → **create** новый KPI (через `kpi_service.create_kpi`).
   - **текущие, чьих id нет во входящем списке** → **delete** (через точечное удаление entity+kpi строк; можно `kpi_service.delete_kpi(session, kpi_entity_id)` — добавить такой точечный метод вместо только `delete_kpis_for_goal`).
3. Порядок: сперва delete отсутствующих, затем update существующих, затем create новых (или любой порядок, не нарушающий целостность).

Добавить в `kpi_service`:
- `async def update_kpi(session, kpi_entity_id, name, target, unit) -> tuple[Entity, Kpi]` — точечное обновление.
- `async def delete_kpi(session, kpi_entity_id) -> None` — точечное удаление одной KPI-сущности (entity+kpi), без затрагивания других KPI цели.

`compute_definiteness` не меняется (по-прежнему от таргетов текущих KPI).

## Схемы — `app/schemas/goal.py`

- `GoalKpi`: добавить `id: str | None = None`. `target: float | None` (как в 2a). На read id заполняется; на create id обычно None.
- `GoalRead.kpis` теперь отдаёт KPI с их `id`.

## Роут

Форма не меняется. При `id`, не принадлежащем цели, — 400 с внятным detail. (Ошибку прокинуть сервисным исключением, как `GoalParentNotFoundError`.)

## Миграция

Схема БД НЕ меняется (id у KPI уже есть — это `entity_id`). Миграция не требуется. Если alembic-autogenerate что-то предложит — убедиться, что это пусто/ложное срабатывание, миграцию не плодить.

## Тесты

`tests/integration/test_goals.py` / `tests/unit/test_goal_service.py`:
- **Сохранение id:** создать цель с 2 KPI → запомнить их id → patch, оставив те же 2 KPI (с их id, изменив target одного) → **id обоих не изменились**, target обновился. (Это главный тест — то, ради чего весь срез.)
- **Добавление:** patch со старыми (с id) + одним новым (без id) → старые id целы, новый получил свой id.
- **Удаление:** patch, где один из существующих KPI опущен → он удалён (нет сиротской entity-строки), остальные целы.
- **Ошибка:** patch с `id`, не принадлежащим цели → 400.
- Существующие тесты definiteness/CRUD остаются зелёными (форма совместима).

## Ограничения
- Только backend. Никаких связей KPI→KPI (3a), типов, циклов.
- API-форма Goal совместима (добавилось лишь опциональное `id` в GoalKpi).
- Изоляция LLM соблюдать.

## Definition of Done
- [ ] `patch_goal` использует diff-sync; неизменные KPI сохраняют `entity_id`.
- [ ] `kpi_service` получил `update_kpi` и `delete_kpi` (точечные); `GoalKpi.id` добавлен.
- [ ] Тест «id KPI не меняется при патче» проходит (ключевой); + add/delete/ошибка-400.
- [ ] Нет сиротских entity-строк после удаления KPI; `pytest` зелёный.
- [ ] Миграции не потребовалось (схема не изменилась) — подтверждено.
- [ ] `ruff`+`ruff format`+`python -m mypy app` зелёные; DEVLOG обновлён; один коммит.
- [ ] После проверки — смёржить в `main` перед Шагом 3a.

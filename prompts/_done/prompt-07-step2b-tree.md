# Промпт №7 (Goal, Шаг 2b): структура дерева — parent_id, проваливание, циклы, каскадное удаление
### `backend/` · один вертикальный срез · СТРУКТУРА (не смысловые связи!)

> **Кому:** Claude Code, по `CONTRIBUTING.md`, `.claude/rules/backend.md`, `AGENTS.md`.
> **Ветка/коммит:** `feat/goal-step2b-tree`, `feat: goal structural tree (parent_id, subtree, cycle guard, cascade delete)`.
> **Каноны:** `Management_Model.md` §9.3 (структура `parent_id` — отдельное отношение от связей целей), ADR-0003 (Шаг 2b).
> **Scope:** ТОЛЬКО структурная иерархия `parent_id`. НЕ делать связи KPI→KPI (Шаг 3), НЕ агрегировать определённость/ресурсы снизу вверх.
> **Критично про смысл:** `parent_id` = «в каком узле структурно живёт цель» (отношение «содержит»). Это НЕ смысловая связь «работает на цель». Связи целей — граф KPI→KPI — это Шаг 3, здесь их нет.

---

## Решения (уже приняты владельцем)

- **Плоский список + parent_id.** Наружу отдаём плоский список узлов, у каждого `parent_id`; клиент строит дерево сам. Плюс эндпоинт поддерева.
- **Определённость родителя — по своим KPI**, как у листа. НИКАКОЙ агрегации «туман снизу вверх» (это про roll-up, отдельный будущий шаг). `compute_definiteness` не трогаем.
- **Циклы запрещены жёстко** — узел не может стать потомком самого себя или своего потомка.
- **Удаление — каскадом всего поддерева, с подтверждением** (флаг), иначе блок.

## Модель — `app/models/goal.py`

Добавить:
- `parent_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("entity.id"), nullable=True, index=True)` — self-FK на `entity.id` родительской цели; `None` = корень.

(Больше ничего: связи целей и ресурсы — не здесь.)

## Схемы — `app/schemas/goal.py`

- `GoalCreate`: добавить `parent_id: str | None = None`.
- `GoalPatch`: добавить `parent_id: str | None = None` (перемещение узла; при смене — проверка цикла).
- `GoalRead`: добавить `parent_id: str | None`.
- Новая `GoalTreeNode`/переиспользовать `GoalRead` для поддерева — отдавать плоским списком `list[GoalRead]`.

## Сервис — `app/services/goal_service.py`

- В `create_goal`/`to_goal_read`/`patch_goal` протащить `parent_id`.
- **Валидация родителя при create/patch:**
  - если `parent_id` задан — проверить, что такая цель существует (иначе 400/404 через сервисный сигнал).
  - **запрет цикла:** при установке `parent_id` подняться по цепочке предков от кандидата-родителя; если встретили сам `goal_id` — цикл, отклонить. Также `parent_id != goal_id` (сам себе не родитель). Вынести в чистую функцию `async def would_create_cycle(session, goal_id, new_parent_id) -> bool` (покрыть unit-тестами).
- `async def get_subtree(session, goal_id) -> list[Entity, Goal]` — все потомки узла (рекурсивный обход по `parent_id`), включая сам узел; вернуть плоским списком. Для SQLite — обход в Python (рекурсивный CTE не обязателен на этом объёме).
- **Каскадное удаление:** `async def delete_goal(session, goal_id, cascade: bool) -> Literal["ok","has_children","not_found"]`:
  - нет узла → `not_found`;
  - есть дети и `cascade=False` → `has_children` (роут вернёт 409);
  - иначе удалить всё поддерево: для КАЖДОГО узла поддерева — сначала его KPI (через `kpi_service.delete_kpis_for_goal`, чтобы не осталось сиротских entity/kpi строк), затем строку `goal`, затем строку `entity`. Удалять от листьев к корню.

## Роут — `app/api/v1/goals.py`

- `GET /goals/{goal_id}/subtree` → `list[GoalRead]` (плоский список поддерева).
- `DELETE /goals/{goal_id}` с query-параметром `cascade: bool = False`:
  - `not_found` → 404; `has_children` → **409** с понятным detail («узел имеет потомков; повторите с ?cascade=true»); `ok` → 204.
- create/patch — прежние, но теперь принимают `parent_id`; при цикле/несуществующем родителе — 400/409 с внятным detail.

## Миграция

`alembic revision --autogenerate -m "add goal.parent_id"`. Проверить: колонка `parent_id` в `goal`, FK на `entity.id`, nullable, индекс. Autogen-quirks поправить.

## Тесты

**Integration — `tests/integration/test_goals.py`** (дополнить):
- create с `parent_id` → читается; корень имеет `parent_id == None`.
- **цикл:** patch, делающий узел потомком своего потомка → 400/409; узел сам себе родитель → отклонён.
- несуществующий `parent_id` → ошибка (не 500).
- **subtree:** дерево из 3 уровней → `/subtree` корня возвращает все узлы плоским списком; поддерево среднего узла — только его ветвь.
- **каскад:** delete узла с детьми без cascade → 409; с `?cascade=true` → 204 и всё поддерево (вместе с их KPI!) удалено; delete листа без cascade → 204.
- определённость НЕ меняется от наличия детей (родитель в тумане/определён только по своим KPI).

**Unit — `tests/unit/test_goal_service.py`**: `would_create_cycle` (все ветки: прямой цикл, транзитивный, валидный перенос), каскадное удаление чистит KPI поддерева (нет сиротских entity-строк).

## Ограничения
- Только backend. НИКАКИХ связей KPI→KPI (Шаг 3), НИКАКОЙ агрегации определённости/ресурсов вверх.
- `parent_id` — структура, не смысл. В коде/докстрингах не называть это «декомпозицией цели» (во избежание путаницы со связями Шага 3).
- Изоляция LLM соблюдать.

## Definition of Done
- [ ] `goal.parent_id` (self-FK, nullable) добавлен; протащен в create/patch/read.
- [ ] Запрет циклов (прямой и транзитивный) + `parent != self`; чистая функция покрыта unit-тестами.
- [ ] `GET /goals/{id}/subtree` отдаёт плоский список поддерева.
- [ ] `DELETE /goals/{id}?cascade=` : 404 / 409(has_children) / 204; каскад чистит и KPI всех узлов поддерева (нет сиротских entity/kpi строк).
- [ ] Определённость по-прежнему по своим KPI (без агрегации).
- [ ] Миграция добавляет `parent_id`; `alembic upgrade head` чисто.
- [ ] Тесты покрывают parent_id/цикл/subtree/каскад; `pytest` зелёный; ruff/format/`python -m mypy app` зелёные.
- [ ] DEVLOG обновлён; один `feat:`-коммит.
- [ ] **После проверки — смёржить в `main` перед Шагом 3.**

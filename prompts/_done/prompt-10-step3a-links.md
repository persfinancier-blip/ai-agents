# Промпт №10 (Goal, Шаг 3a): граф связей KPI→KPI с тремя типами
### `backend/` · один вертикальный срез · ядро графа (без циклов/судьи — это 3c)

> **Кому:** Claude Code, по `CONTRIBUTING.md`, `.claude/rules/backend.md`, `AGENTS.md`.
> **Ветка/коммит:** `feat/goal-step3a-kpi-links`, `feat: KPI->KPI alignment links with types`.
> **Каноны:** `Management_Model.md` §9.9–9.10, `docs/adr/0004-...md` (Р1 типы, Р2 удаление).
> **Scope:** ТОЛЬКО таблица связей + три типа + CRUD связей + каскадная чистка связи при удалении KPI. НЕ делать детект циклов / судью / флаг (Шаг 3c), НЕ делать составной KPI (3b), НЕ трогать ресурсы.

---

## Что делаем

Связь = направленное ребро между двумя KPI-сущностями с типом. По ADR-0004 Р1: один KPI может быть источником нескольких связей; направление — пара (source, target); тип из трёх. По Р2: связь умирает вместе с любым своим концом.

**Важно про удаление (из анализа кода):** каскадов на уровне БД в проекте нет — Goal/Kpi чистятся вручную в сервисах. Значит связи тоже чистим **в сервисном коде** при удалении KPI, НЕ через `ON DELETE CASCADE`. Иначе останутся висячие строки связей.

## Модель — `app/models/kpi_link.py`

- `class KpiLinkType(str, enum.Enum)`: `CONTRIBUTES="contributes"`, `CONSTRAINS="constrains"`, `DEPENDS_ON="depends_on"`.
- `class KpiLink(Base)`, `__tablename__="kpi_link"`:
  - `id: Mapped[str]` = `mapped_column(String(36), primary_key=True, default=_uuid)` (у связи свой id; можно переиспользовать генератор uuid — импортом или локально).
  - `source_kpi_id: Mapped[str]` = FK на `entity.id` (KPI-источник), `index=True`.
  - `target_kpi_id: Mapped[str]` = FK на `entity.id` (KPI-получатель), `index=True`.
  - `link_type: Mapped[str]` = `mapped_column(String(20))` (значение из KpiLinkType).
  - (Связь — самостоятельная строка, НЕ Entity-подтип: это ребро графа, а не узел. Узлы — KPI-сущности; для ребра полноценная Entity избыточна. Зафиксировать это решение комментарием.)

Зарегистрировать `kpi_link` в импортах моделей в тестах-регистраторах (`conftest.py`, unit-регистратор).

## Валидация при создании связи

- оба `source_kpi_id` и `target_kpi_id` должны быть **существующими KPI** (entity_type=="kpi") — иначе 400.
- `source != target` (KPI не ссылается сам на себя) — иначе 400.
- `link_type` из допустимых — Pydantic-enum отвалидирует.
- **Дубли:** пара (source, target, link_type) не должна дублироваться — при повторе вернуть существующую или 409 (выбрать 409 с внятным detail; отметить в тестах).
- **Циклы НЕ проверяем** — это Шаг 3c (по ADR-0004 циклы не запрещаются вовсе, только детектируются позже). Здесь связь, замыкающая цикл, создаётся штатно.

## Схемы — `app/schemas/kpi_link.py`

- `KpiLinkCreate`: `source_kpi_id: str`, `target_kpi_id: str`, `link_type: KpiLinkType`.
- `KpiLinkRead`: `id`, `source_kpi_id`, `target_kpi_id`, `link_type`, `created_at` (если добавите timestamp — по желанию; можно без него для простоты 3a).

## Сервис — `app/services/kpi_link_service.py`

- `create_link(session, source_id, target_id, link_type) -> KpiLink` — с валидацией выше (кинуть сервисные исключения `KpiNotFoundError`, `SelfLinkError`, `DuplicateLinkError`).
- `get_link(session, link_id)`, `list_links(session)` (все), `list_links_for_kpi(session, kpi_id)` — где KPI участвует как источник ИЛИ получатель.
- `delete_link(session, link_id) -> bool`.
- `delete_links_for_kpi(session, kpi_id) -> None` — удалить все связи, где KPI источник ИЛИ получатель. **Вызывать из `kpi_service.delete_kpi`** (точечное удаление KPI, Шаг 3-0) — чтобы связь умирала с концом (Р2). Проверить также каскадное удаление цели (`delete_goal` → `delete_kpis_for_goal`): при удалении KPI цели их связи тоже должны исчезнуть — либо `delete_kpis_for_goal` вызывает `delete_links_for_kpi` для каждого, либо переиспользует `delete_kpi`.

## Роут — `app/api/v1/kpi_links.py`

- `POST /kpi-links` → 201 (create); 400 (несуществующий KPI/self), 409 (дубль).
- `GET /kpi-links` → список; опц. query `?kpi_id=` → связи конкретного KPI (источник или получатель).
- `GET /kpi-links/{id}` → 404 если нет.
- `DELETE /kpi-links/{id}` → 204 / 404.
- Подключить роутер в `app/api/v1/__init__.py`.

## Миграция

`alembic revision --autogenerate -m "add kpi_link table"`. Таблица `kpi_link`, два FK на `entity.id`, индексы. Помнить про SQLite/batch (как в 2b) при любых ALTER; для create_table обычно ок. Проверить upgrade/downgrade.

## Тесты

**Integration — `tests/integration/test_kpi_links.py`:**
- создать 2 цели с KPI → создать связь source→target типа contributes → 201, читается.
- три типа создаются; невалидный тип → 422.
- несуществующий KPI → 400; self-link (source==target) → 400; дубль (source,target,type) → 409.
- один KPI как источник нескольких связей (множественность, Р1) → все создаются.
- `?kpi_id=` возвращает связи, где KPI и источник, и получатель.
- **связь, замыкающая цикл, создаётся штатно** (циклы разрешены; детект — 3c). Явный тест: A→B и B→A обе успешны.
- delete связи → 204, затем 404.
- **каскад Р2:** удалить KPI-источник (через diff-sync-патч цели, опустив его) → связь исчезла; удалить цель с KPI → все их связи исчезли. Нет висячих строк `kpi_link`.

**Unit — `tests/unit/test_kpi_link_service.py`:** валидации (self/несуществующий/дубль), `delete_links_for_kpi` чистит обе стороны.

## Ограничения
- Только backend. НИКАКИХ циклов/судьи/флага (3c), составного KPI (3b), ресурсов.
- Связь — ребро, не Entity-подтип.
- Каскад связей — в сервисном коде, не в БД.
- Изоляция LLM.

## Definition of Done
- [ ] `models/kpi_link.py` (+ enum типов), `schemas/kpi_link.py`, `services/kpi_link_service.py`, роут — созданы; роутер подключён.
- [ ] Валидация: существование KPI, self-link, дубль; три типа.
- [ ] Множественность (один KPI — много связей) работает.
- [ ] Связь, замыкающая цикл, создаётся штатно (детекта нет — это 3c).
- [ ] Р2: удаление KPI (точечное и через каскад цели) удаляет его связи; нет висячих строк.
- [ ] `kpi_link` в импортах моделей тестов; миграция создаёт таблицу; upgrade/downgrade чисто.
- [ ] Тесты покрывают всё выше; `pytest` зелёный; ruff/format/`python -m mypy app` зелёные.
- [ ] DEVLOG обновлён; один `feat:`-коммит; после проверки — смёрж в `main` перед Шагом 3c.

# Prompt #44: slice 44 — unit grouping backend (departments tree + teams overlay), ADR-0007

### commit type `feat:`, e.g. `feat: unit grouping — departments + teams, goal ownership widened (slice 44, ADR-0007)`

> **For:** Claude Code worker (unattended, file-driven dispatch → `task/**` branch → one PR → DoD gate → auto-merge). Backend zone → the gate runs `ruff`/`ruff format --check`/`python -m mypy app`/`pytest`, so correctness is enforced before merge.
> **Milestone:** closes the grouping question deferred by ADR-0006 §8.5 / open-Q2. This is the **backend + canon** slice. The UI (unit/group picker with search in `GoalPopup`, department tree in the units panel) is a **later frontend slice** — do not start it here.
> **Owner's intent:** atomic units group into **departments** (strict single-parent tree — one "home" per unit) and **teams** (many-to-many overlay); a goal can be owned by an atomic unit **or** a group. Decisions approved by the owner 2026-07-17 (see the ADR text in Scope item 1 — commit it verbatim, status «Принято»).
> **Model/mode:** Sonnet, effort medium-high on the migration (FK repoint on SQLite). Backend only; no frontend in this slice.
> **Canon:** `Management_Model.md` §2, §6, §8.5; `docs/adr/0006-unit-entity-and-goal-ownership.md` (open-Q2); Entity subtype pattern = row in `entity` + subtype table keyed by `entity_id` (PK+FK), as in `backend/app/models/unit.py`, `goal.py`.
> **Precondition:** main at `5917801`, clean tree. **Step 0:** `git log -1 --name-only` to find this prompt file; `git status`.
> **Repo facts to reuse (read, mirror):** `backend/app/models/unit.py` (`Unit`, `UnitKind`), `backend/app/models/goal.py` (`Goal.unit_id` FK → `unit.entity_id`), `backend/app/api/v1/units.py` + `backend/app/services/unit_service.py` + `backend/app/schemas/unit.py` (CRUD pattern), `backend/app/services/*` `compute_definiteness` (checks `goal.unit_id` presence — **do not change it**). SQLite FK/column alters use `batch_alter_table` (sanctioned precedent in this repo).

## Scope

**Do:**

1. **ADR** — create `docs/adr/0007-unit-grouping-departments-teams.md` with **exactly** this content (note: status is «Принято», not «Предложено»):

   ```markdown
   # ADR-0007: Группировка юнитов — департаменты (дерево) и команды (оверлей)

   **Статус:** Принято
   **Дата:** 2026-07-17
   **Авторы:** владелец продукта + AI-агент разработки

   ## Контекст (Context)

   ADR-0006 ввёл юнит как подтип Entity с четырьмя атомарными видами (`employee | agent | external | device`) и заменил текстовый `entity.owner` на `goal.unit_id` (FK → `unit.entity_id`). Там же (§8.5, «Открытые вопросы» п. 2) группировка `team`/`dept` была сознательно отложена как самостоятельная надстройка над атомарными юнитами — отдельный ADR + слайс. `Management_Model.md` §2, §6, §8.5 называют team/dept «будущей надстройкой группировки», а PRD §28 (Единая рабочая сила) прямо перечисляет команды и отделы как формы рабочей силы.

   Этот ADR закрывает отложенный вопрос: как атомарные юниты объединяются в группы и может ли цель принадлежать группе. Решения ниже приняты владельцем 2026-07-17, до начала кодового прохода — чтобы backend-срез не угадывал схему (тот же порядок, что и в ADR-0006).

   ## Решение (Decision)

   1. **Группа — подтип Entity**, тем же паттерном, что `Unit`/`Goal`/`Kpi`: строка в `entity` + таблица `unit_group` с `entity_id` как PK+FK. Имя и описание живут на `Entity` (как у `Unit`), в таблице подтипа — только специфика. Новых моделей вне Entity Platform не создаётся (Management_Model §6).

   2. **`unit_group.kind ∈ {department, team}`** — две разные формы группировки с разной семантикой принадлежности:
      - **`department` — строгое дерево (один дом).** Департаменты вложены друг в друга: `unit_group.parent_id` (nullable FK → `unit_group.entity_id`, только для `department`). Каждый атомарный юнит имеет ровно один домашний департамент: `unit.department_id` (nullable FK → `unit_group.entity_id`). Это зеркалит структурную ось `goal.parent_id` (ADR-0003 §9.3): административная принадлежность, один родитель на узел.
      - **`team` — оверлей многие-ко-многим.** Юнит состоит в любом числе команд; связь — join-таблица `team_membership(team_id, unit_id)`. Команды в первом срезе плоские (не вкладываются одна в другую и не содержат департаменты) — вложенность команд отложена.

      Департамент отвечает на вопрос «где юнит живёт административно» (один ответ), команда — «в каких рабочих группах он участвует» (сколько угодно). Две оси намеренно независимы, как структура и смысл у целей (ADR-0003 §9.3).

   3. **Владение целью расширяется: `goal.unit_id` → любая Сущность рабочей силы (атомарный юнит ИЛИ группа).** FK `goal.unit_id` перенаправляется с `unit.entity_id` на `entity.id`; сервисный слой валидирует, что указанная сущность — это `Unit` или `unit_group` (department/team), иначе 422. Имя колонки `unit_id` сохраняется (низкая цена миграции; переименование в `owner_id` — минорный отложенный вопрос). Один канал владельца, а не два поля — прямое следствие ADR-0006 п. 3/5.

   4. **Определённость узла не меняется.** `compute_definiteness` уже проверяет наличие `goal.unit_id`; после расширения референта проверка та же — владелец «назначен», если `unit_id` заполнен, будь то юнит или группа.

   **Отклонённые альтернативы:** отдельная колонка `goal.group_id` рядом с `unit_id` (два источника истины — против ADR-0006 п. 3/5); группа как ещё один `unit.kind` (уже отклонено в ADR-0006); только m2m без дерева или только дерево без команд (владельцу нужны обе оси).

   ## Последствия (Consequences)

   - Backend: таблица `unit_group` (Entity-подтип) + `unit_group.parent_id`; поле `unit.department_id`; join-таблица `team_membership`; перенаправление FK `goal.unit_id` на `entity.id` + валидация подтипа в сервисе; API групп (CRUD + членство) по образцу `units.py`; Alembic-миграция. `compute_definiteness` — без изменений.
   - Инвариант «один дом»: `unit.department_id` — не более одного; `parent_id` только у `department`; членство в `team_membership` — только для `kind=team`; запрет циклов в дереве департаментов.
   - Канон: `Management_Model.md` §2/§6/§8.5 и «Открытые вопросы» ADR-0006 п. 2 — группировка переходит из «отложено» в «решено этим ADR».
   - Фронтенд (позже, отдельный UI-слайс): пикер назначения в `GoalPopup` предлагает юниты и группы с поиском; панель юнитов показывает дерево департаментов и команды.

   ## Открытые вопросы (не домысливать в кодовом срезе)

   1. Агрегация ресурсов/загрузки группы (Management_Model §3.2; ADR-0006 откр. в. 5). Не решено.
   2. Вложенность команд. В первом срезе команды плоские. Не решено.
   3. Жизненный цикл группы; правило удаления в этом срезе — занулять входящие ссылки (см. слайс). Полная модель не решена.
   4. Права на изменение состава группы (ADR-0002 §7.2 в. 3). Не решено.
   5. Переименование `goal.unit_id` → `owner_id` — отложено. Минорно.
   ```

2. **Models** (`backend/app/models/`): mirror `unit.py`.
   - `unit_group.py`: `UnitGroupKind(str, enum.Enum)` = `DEPARTMENT="department"`, `TEAM="team"`. `class UnitGroup(Base)` `__tablename__ = "unit_group"`: `entity_id` (String(36), FK `entity.id`, PK); `kind` (String(20)); `parent_id` (String(36), FK `unit_group.entity_id`, nullable, index) — department nesting only.
   - `team_membership.py` (or in the same module): `class TeamMembership(Base)` `__tablename__ = "team_membership"`: `team_id` (FK `unit_group.entity_id`), `unit_id` (FK `unit.entity_id`), composite PK `(team_id, unit_id)`.
   - `Unit`: add `department_id` (String(36), FK `unit_group.entity_id`, nullable, index).
   - `Goal.unit_id`: repoint FK target from `unit.entity_id` to `entity.id` (stays nullable+indexed). Name unchanged.

3. **Migration** (Alembic, `python -m alembic revision --autogenerate` then hand-fix): create `unit_group` + `team_membership`; add `unit.department_id`; **repoint `goal.unit_id` FK** from `unit.entity_id` to `entity.id` — on SQLite use `with op.batch_alter_table("goal") as batch: ...` to drop+recreate the FK (sanctioned precedent). Downgrade reverses it. Verify `alembic upgrade head` is clean on a fresh DB and idempotent with existing data (existing `goal.unit_id` values already point at `unit.entity_id`, which are `entity.id` values — so data stays valid after the repoint).

4. **Schemas + service + API** — mirror `schemas/unit.py` / `services/unit_service.py` / `api/v1/units.py`:
   - `UnitGroupCreate{name, kind, description?, parent_id?}`, `UnitGroupUpdate{...all optional}`, `UnitGroupRead{entity_id, name, kind, description, parent_id, created_at}`.
   - Group CRUD at `/api/v1/unit-groups` (POST/GET list/GET one/PATCH/DELETE), plus membership: set a unit's home department (`PATCH /units/{id}` gains `department_id`, or a dedicated route — your call, mirror existing style), add/remove a unit to a team (`POST /unit-groups/{team_id}/members/{unit_id}`, `DELETE` same). Validate: `parent_id` only when `kind=department`; no cycles in the department tree (mirror the goal `parent_id` cycle check → 409); team membership only when `kind=team` (else 422); home `department_id` must reference a `department` (else 422).
   - **Goal ownership validation:** where the Goal service sets `unit_id` (create/patch), validate the referenced `entity.id` is a `Unit` OR a `unit_group`; otherwise 422. A goal owned by a group is valid.
   - **Delete rule (this slice):** deleting a group nulls all inbound refs — `goal.unit_id` set NULL where it pointed at the group; `unit.department_id` set NULL for members; `team_membership` rows removed; child departments' `parent_id` set NULL (become roots). Mirror `unit_service.delete_unit` which already nulls `goal.unit_id`.

5. **`compute_definiteness` — DO NOT change.** Add a test that a goal whose `unit_id` points at a group is «defined» (owner present) exactly like one pointing at a unit.

6. **Canon + housekeeping:** update `Management_Model.md` §2/§6/§8.5 (grouping now decided → ADR-0007) and `docs/adr/0006-...md` «Открытые вопросы» п. 2 (mark resolved by ADR-0007); add ADR-0007 to `docs/adr/README.md`; `BACKLOG.md` close «ADR + слайс группировки»; `docs/DEVLOG.md` entry (`/devlog`).

7. **Tests** (`pytest`, mocked LLM as usual): model + API for group CRUD, department parent + cycle rejection, unit home-department set/validation, team add/remove member, goal ownership by unit vs group (accept) vs arbitrary entity (422), delete-group nulls inbound refs, definiteness with a group owner.

**Don't (deliberately):**

- **No frontend** — the picker/tree UI is a separate later slice.
- No resource/load aggregation of groups; no team nesting; no group lifecycle beyond the delete-nulls rule; no rename `unit_id → owner_id`. (All are ADR-0007 open questions.)
- Don't touch `compute_definiteness` logic; don't reintroduce text `owner` on Goal.

## Constraints

- Canon/docs text Russian; code / comments / commits English. LLM SDKs untouched (not relevant here). `mypy` as `python -m mypy app`. PowerShell 5.1 — one command at a time; venv Python as `python -m X`.

## Definition of Done

- [ ] `ruff check .` + `ruff format --check .` + `python -m mypy app` + `pytest` all green (the backend auto-merge gate).
- [ ] `alembic upgrade head` clean on a fresh DB; downgrade defined.
- [ ] ADR-0007 committed as above (status «Принято»); `Management_Model.md` + ADR-0006 open-Q2 + `docs/adr/README.md` + `BACKLOG.md` + `docs/DEVLOG.md` updated.
- [ ] **Tail cleanup:** move this prompt file to `prompts/_done/prompt-44-unit-grouping-backend.md`; update `prompts/README.md`.
- [ ] One commit; worker opens the PR; gate green → auto-merge; clean tree.
- [ ] Report back: confirm the next slice is the **units/groups picker UI** (search + assign unit or department/team from `GoalPopup`).

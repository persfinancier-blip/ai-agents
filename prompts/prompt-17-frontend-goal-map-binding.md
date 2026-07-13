# Промпт №17: Шаг Ф1 — карта целей на реальном Goal API (чтение)
### `feat/frontend-goal-map-binding`, `feat: bind goal map to real Goal API (read-only)`

> **Кому:** Claude Code. Первый фронтовый срез после прототипа: карта целей перестаёт быть демо-картинкой.
> **Модель/режим:** Sonnet, обычный режим. Архитектурной неоднозначности нет: API готов, интерфейсная модель канонизирована.
> **Канон:** `docs/full-vision/09_Design_System/Visual_Reference.md` §2–§4 (карта целей — главный экран, туман войны), Часть II — бренд-бук (не изобретать новых стилей); `docs/full-vision/02_Product/Management_Model.md` §9 (fog/defined); бэкенд-контракт — `backend/app/schemas/goal.py` (`GoalRead`), роуты — `backend/app/api/v1/goals.py`.
> **Предусловие:** `prompts/prompt-16-repo-integrity-recovery.md` выполнен, дерево чистое, все проверки зелёные. Если нет — сначала он.

## Scope

**Делаем:**
1. TS-типы `GoalRead`/`GoalKpi` зеркалом pydantic-схем.
2. API-клиент целей в `frontend/src/api.ts` (по образцу существующих функций Decisions): `listGoals`, `getGoal`, `getGoalSubtree`.
3. Карта целей в `CommandPanel.tsx` читает реальные цели: дерево из плоского списка по `parent_id`, автораскладка, туман для `definiteness === "fog"`.
4. Сид-скрипт демо-целей на бэке, чтобы карту было чем наполнить.

**НЕ делаем (сознательно, не домысливать):**
- **Никакого редактирования целей из UI** — create/patch/delete из интерфейса не подключаем (следующий срез).
- **`GoalCard.tsx` не трогаем** — карточка цели остаётся на демо-данных `GOAL_TREE` (отдельный срез; там своя модель resources/units, которой на бэке ещё нет).
- **Не выдумывать прогресс.** У `GoalRead` НЕТ процента выполнения (факт KPI — это ресурсные блоки, ADR-0005, не реализовано). Демо-`pct` на реальных целях не показывать — вместо процента показывать состояние: «туман»/«определена» + число KPI. Никаких случайных или вычисленных из воздуха процентов.
- **Связи и циклы KPI на карте не визуализируем** (открытый вопрос ADR-0004) — только структурное дерево `parent_id`.
- Rail-блоки (`RAIL_ACTIVE`/`RAIL_OFF`), советники, юниты — остаются демо, не трогать.
- Бэкенд-код не менять (кроме нового сид-скрипта; существующие модели/сервисы/роуты — read-only).

## 1. Типы

`frontend/src/types.ts` — добавить рядом с типами Decisions:

```ts
export interface GoalKpiRead {
  id: string | null
  name: string
  target: number | null
  unit: string
  computed_value: number | null
}

export interface GoalRead {
  id: string
  entity_type: string
  name: string
  description: string | null
  owner: string
  status: string
  lifecycle_stage: string
  risk_level: string
  role_label: string
  kpis: GoalKpiRead[]
  is_backlog: boolean
  definiteness: 'fog' | 'defined'
  parent_id: string | null
  created_at: string
  updated_at: string
}
```

## 2. API-клиент

`frontend/src/api.ts`, тем же `request<T>`-хелпером:

```ts
export const listGoals = () => request<GoalRead[]>('/goals')
export const getGoal = (id: string) => request<GoalRead>(`/goals/${id}`)
export const getGoalSubtree = (id: string) => request<GoalRead[]>(`/goals/${id}/subtree`)
```

## 3. Дерево и раскладка

Новый модуль `frontend/src/os/goalTree.ts` (не смешивать с демо-хелперами `goals.ts`):

- `buildGoalForest(goals: GoalRead[]): GoalNode[]` — дерево из плоского списка по `parent_id`; `GoalNode = { goal: GoalRead; children: GoalNode[] }`; сироты (parent не в списке) поднимаются в корни, цикл невозможен (бэкенд запрещает, `would_create_cycle`).
- `layoutForest(forest: GoalNode[]): Map<string, {x, y, w}>` — **простая** автораскладка: глубина дерева = колонка, порядок обхода = строка; константы шага взять из габаритов текущих демо-узлов (`MAP_GOALS`: w ≈ 200–225, шаг y ≈ 118). Никаких force-directed/умных алгоритмов — это заведомо временная раскладка до отдельного среза UI карты.
- `is_backlog === true` — не размещать на карте (это бэклог-идеи, не активные узлы карты; визуальный код «бэклога» — открытый вопрос бренд-бука, не решать здесь).

## 4. CommandPanel

- Загрузка через `useEffect` (по образцу `listDecisions` в `App.tsx`), состояния: загрузка / ошибка (текст по-русски: «Не удалось загрузить карту целей») / пусто / данные.
- **Есть реальные цели** → карта рисует их вместо `MAP_GOALS`/`FOCUS_GOAL`: имя, `owner` (пусто → «отв. —»), бейдж состояния: `definiteness === 'fog'` → «туман» (приглушённый тон, ближайший существующий класс бренд-бука; новых цветов не вводить), иначе тон по `risk_level` (маппинг: low → обычный, medium → warn, high → risk). Вместо `pct` — «N KPI» или «туман».
- **Целей нет (пустая БД)** → текущая демо-карта целиком, с видимой пометкой «демо-данные» (RU). Демо-константы из `data.ts` не удалять.
- Блок `FOCUS_GOAL` (фокус-цель с этапами): на реальных данных фокус — первая корневая цель, её «этапы» — прямые дети (имя + owner + definiteness); футер (`res/team/dec`) на реальных данных скрыть — этих данных на бэке нет.

## 5. Сид демо-целей (backend)

`backend/scripts/seed_demo_goals.py` — запускаемый вручную (`python -m scripts.seed_demo_goals` из `backend/`; venv-лаунчеры битые, только `python -m`):

- Создаёт через `goal_service.create_goal` (не сырым SQL) ~6 целей по мотивам демо-контента `data.ts`: 1 корень («Выручка 120 млн ₽ / год», owner, 2 KPI с таргетами) + 3–4 ребёнка (один без owner и без KPI-таргетов — увидим туман) + 1 отдельный корень.
- Идемпотентность по-простому: если в БД уже есть цели — выйти с сообщением, ничего не создавать.
- Скрипт — dev-утилита: не импортировать его из приложения, тестов на него не писать (но `ruff`/`mypy` должны проходить и по нему; проверить, входит ли `scripts/` в их пути — если нет, добавить в конфиг, не ослабляя правил).

## Ограничения

- UI-текст только на русском (CONTRIBUTING «Localization»).
- Стили — только существующие токены/классы бренд-бука (`Visual_Reference.md` Часть II, код `frontend/src/index.css`, `frontend/src/os/os.css`); расхождения фиксировать в «Открытых вопросах» Части II, не «улучшать» молча.
- Windows-среда: PowerShell 5.1 — команды без `&&`, по одной.

## Definition of Done

- [ ] `cd frontend`: `npm run build` (tsc -b + vite) и `npm run lint` — зелёные.
- [ ] `cd backend`: `pytest`, `ruff check .`, `ruff format --check .`, `python -m mypy app` — зелёные (сид-скрипт ничего не сломал).
- [ ] Ручная проверка: backend поднят, сид прогнан, `npm run dev` — карта показывает реальные цели с туманом на цели без owner/таргетов; при пустой БД — демо-карта с пометкой «демо-данные».
- [ ] `docs/DEVLOG.md` — запись прохода; пункт «Привязка frontend-карты целей…» в `BACKLOG.md` отмечен `[x]` со ссылкой на ветку.
- [ ] Один коммит в `feat/frontend-goal-map-binding`, merge в `main`, промпт в `prompts/_done/`, таблица `prompts/README.md` обновлена.

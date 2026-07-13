# BACKLOG

Задачи и идеи, ещё не взятые в работу. Пока в репозитории нет remote — трекер задач здесь, не в GitHub Issues; при появлении remote можно перенести. Актуальные вехи — таблица в [README.md](README.md).

## Продукт / доки

- [ ] Финальное потребительское имя продукта (кандидат — «Вектор·OS»); зафиксировать в `Visual_Reference.md` D1.
- [ ] Спайк: 2–3 локальные LLM-модели под fallback советников (`docs/adr/0001-local-llm-fallback-for-advisors.md`).
- [x] Открытые вопросы Management_Model §7 — вопросы 1/2/4/7 (формулы увязки, единицы измерения ресурсов, порог «определённости», триггеры пере-увязки) решены под первый срез, см. [`docs/adr/0002-reconciliation-first-slice.md`](docs/adr/0002-reconciliation-first-slice.md).
- [ ] §7 вопрос 3 — права ролей на редактирование чужих узлов; отложено до среза аутентификации/ролей доступа.
- [ ] §7 вопрос 5 — версионирование аналитических справок офисных агентов; отложено до среза офисных агентов (M7–M8).
- [ ] §7 вопрос 6 — каталог навыков (глобальный/по юнитам, переиспользование, Marketplace PRD §39); отложено до среза навыков-воркфлоу.
- [ ] Открытые вопросы бренд-бука Часть II (долг хардкод-цветов, `.ovl.crit` без правила, захардкоженные проценты, мёртвые демо-данные `GOAL_CARD`, визуальный код «бэклога», селф-хостинг шрифтов).

## Инженерия

- [ ] M3 — борд CFO/COO/CTO + синтез рекомендации.
- [x] Goal Entity Шаг 1 — CRUD + автодетекция fog/defined (`compute_definiteness`), см. ветку `feat/goal-entity-step1-crud` (слита в main).
- [x] Goal Entity Шаг 2a — KPI вынесен из JSON-поля `goal.kpis` в отдельную таблицу-сущность (`models/kpi.py`) со своим ID; `compute_definiteness` читает таргеты из неё. См. ветку `feat/goal-step2a-kpi-entity`.
- [x] Goal Entity Шаг 2b — структурное дерево целей: `goal.parent_id` (self-FK), запрет циклов структуры (`would_create_cycle`), поддерево (`get_subtree`). См. ветку `feat/goal-step2b-tree`, слита в main.
- [x] Goal Entity Шаг 3a — граф связей KPI→KPI: таблица `kpi_link` (ребро, не Entity-подтип) с `link_type ∈ {contributes, constrains, depends_on}`; один KPI — источник нескольких связей; циклы разрешены и НЕ детектируются (это Шаг 3c); удаление KPI (точечное и каскадное через удаление цели) чистит его связи в сервисном коде (`kpi_link_service.delete_links_for_kpi`, БД-каскадов в проекте нет). См. ветку `feat/goal-step3a-kpi-links`.
- [ ] Goal Entity Шаг 3c — детект циклов графа связей (не запрет — флаг + подсветка); судья цикла = ближайший общий предок узлов цикла по `parent_id`, ручной флаг «подтверждён как ставка»; проработать соотношение структурной свёртки ресурсов (`resource.kind`, ADR-0002) и смысловой увязки по графу связей (см. Management_Model §9.8/9.9–9.11, ADR-0004). Модель — `docs/adr/0004-goal-link-types-cycles-composite-kpi.md`.
- [ ] Goal Entity Шаг 3b (после Шага 3) — составной KPI: значение из взвешенных факторов-KPI вместо прямого таргета (пример — гудвилл = 0.3·отзывы + 0.3·LTV + 0.4·брак); расширение правила тумана (таргет ИЛИ формула из факторов). Точечный инструмент «решение в моменте», не для всех KPI. Модель — `docs/full-vision/02_Product/Management_Model.md` §9.12, `docs/adr/0004-goal-link-types-cycles-composite-kpi.md`.
- [ ] Привязка frontend-карты целей (`frontend/src/os/data.ts`, сейчас демо-данные) к реальному Goal API (backend готов, Шаг 1: CRUD + fog/defined).
- [ ] CI: проверить пути `.github/workflows/ci.yml` после переезда `decision-center/` в корень (working-directory `backend`/`frontend` уже относительные — но прогнать реальный workflow до первого push).
- [ ] GitHub MCP-сервер — добавить в `.mcp.json`, когда появится remote (см. README «MCP»).
- [x] Шаг 3a — diff-sync KPI в `patch_goal` (`sync_kpis`, сопоставление по id вместо
  replace-all): было предусловием Шага 3 (связи KPI→KPI не переживут replace-all,
  меняющий `entity_id` при каждом патче цели). См. ветку `feat/goal-step3-0-kpi-diff-sync`,
  слита в main.
- [ ] `goal_service.list_goals` тянет KPI отдельным запросом на каждую цель (N+1).
  Оптимизировать (bulk-загрузка KPI по списку goal_id) при росте числа целей.
- [ ] Доработать `.claude/hooks/protect-main.sh`: (а) ловит только `Edit|Write|NotebookEdit`
  — запись через Bash его обходит (дыра); (б) блокирует легитимное разрешение
  merge-конфликтов на `main`. Вариант: пропускать правки при активном merge (`MERGE_HEAD`)
  или сливать через temp-ветку с fast-forward.

# DEVLOG

Журнал проходов по репозиторию: дата · ветка/коммит · что сделано · что дальше. Новые записи — сверху. Добавляется командой `/devlog`.

С 2026-07-22 журнал разбит на части в `docs/devlog/` — размер, не календарь, определяет границу: часть закрывается по достижении ~25 KB. Этот файл — только индекс (таблица частей + одна строка на запись); `/devlog` читает только его хвост и текущую часть, не весь журнал.

## Части

| Часть | Диапазон дат | Записей |
|---|---|---|
| [часть 01](devlog/part-01.md) | 2026-07-07 — 2026-07-08 | 14 |
| [часть 02](devlog/part-02.md) | 2026-07-08 — 2026-07-13 | 7 |
| [часть 03](devlog/part-03.md) | 2026-07-13 — 2026-07-14 | 5 |
| [часть 04](devlog/part-04.md) | 2026-07-14 — 2026-07-15 | 7 |
| [часть 05](devlog/part-05.md) | 2026-07-15 — 2026-07-16 | 10 |
| [часть 06](devlog/part-06.md) | 2026-07-16 — 2026-07-16 | 8 |
| [часть 07](devlog/part-07.md) | 2026-07-16 — 2026-07-17 | 10 |
| [часть 08](devlog/part-08.md) | 2026-07-17 — 2026-07-22 | 4 |

## Записи

- 2026-07-22 · task/prompt-ops-13-map-and-canon-tocs-20260722125943 · не закоммичено (промпт ops-13) — docs/MAP.md + TOC в трёх канонах, graphify убран из CLAUDE.md → [часть 08](devlog/part-08.md)
- 2026-07-22 · task/ops-11-cowork-direct-push-rules-20260722122918 · не закоммичено (промпт ops-11) — канон синхронизирован с прямым push Cowork в task/** по HTTPS/PAT → [часть 08](devlog/part-08.md)
- 2026-07-22 · task/prompt-ops-10-devlog-shard-20260722111638 · не закоммичено (промпт ops-10) — DEVLOG.md разбит на size-rotated части, /devlog переписан на grep+append → [часть 08](devlog/part-08.md)
- 2026-07-17 · task/prompt-46-units-panel-tree-b · не закоммичено (промпт №46) — дерево департаментов + команды в панели юнитов, завершает юниты-UI milestone → [часть 08](devlog/part-08.md)
- 2026-07-17 · main · 665e88c (промпт №45, PR #50) — пикер владельца цели в GoalPopup (OwnerPicker, юниты/департаменты/команды) → [часть 07](devlog/part-07.md)
- 2026-07-17 · main · 6609044 (промпт №44, PR #49) — ADR-0007 группировка юнитов (department/team), unit_group backend → [часть 07](devlog/part-07.md)
- 2026-07-17 · main · f464e70 (промпт №43, PR #48) — панель юнитов (read-only) поверх карты целей → [часть 07](devlog/part-07.md)
- 2026-07-17 · main · 200f0a0 (промпт #41b, PR #28) — ребейз unit-entity backend на main после сбоя воркера, чинка заголовков DEVLOG №39/40 → [часть 07](devlog/part-07.md)
- 2026-07-17 · main · 9838292 (промпт ops-07, PR #39) — docs/PROCESS.md — протокол полного цикла разработки → [часть 07](devlog/part-07.md)
- 2026-07-17 · main · cee66a0 (промпт ops-06, PR #38) — правило «тела промптов не эхожатся в чат» → [часть 07](devlog/part-07.md)
- 2026-07-17 · main · fd07ad4 (промпт ops-05, PR #36) — DoD gate + auto-merge воркерских PR без кнопки владельца → [часть 07](devlog/part-07.md)
- 2026-07-17 · chore/fix-push-bridge · не закоммичено (промпт ops-04) — починен мост task/** push → воркер (claude CLI напрямую вместо action) → [часть 07](devlog/part-07.md)
- 2026-07-16 · chore/standalone-dispatcher · не закоммичено (промпт ops-03) — диспетчер -RepoRoot, вскрыт баг push-триггера claude-code-action → [часть 07](devlog/part-07.md)
- 2026-07-16 · chore/file-task-dispatch · не закоммичено (промпт ops-02) — file-driven dispatch prompts/ → task/** → воркер, watcher-скрипт → [часть 07](devlog/part-07.md)
- 2026-07-16 · chore/github-actions-automation · не закоммичено (промпт ops-01) — воркер-workflow claude.yml, issue-label ai-task → [часть 06](devlog/part-06.md)
- 2026-07-16 · feat/unit-entity-backend · не закоммичено (промпт №41) — Unit как Entity-подтип, goal.unit_id заменяет owner → [часть 06](devlog/part-06.md)
- 2026-07-16 · main · 71d4eff (промпт №40, PR #25) — ADR-0006 unit entity и goal ownership → [часть 06](devlog/part-06.md)
- 2026-07-16 · main · 0b8f6e6 (промпт №39, PR #23) — драг рёбер карты целей для смены parent_id → [часть 06](devlog/part-06.md)
- 2026-07-16 · fix/frontend-paused-on-map · 826b273 (промпт №38b) — паузнутые цели больше не пропадают с карты → [часть 06](devlog/part-06.md)
- 2026-07-16 · feat/frontend-map-hover-controls · не закоммичено (промпт №38a) — фиксы ревью слайса 38 (create-отмена, клавиатурный доступ к hover-контролам) → [часть 06](devlog/part-06.md)
- 2026-07-16 · feat/frontend-map-hover-controls · не закоммичено — hover-контролы узла/ребра на карте, GoalPopup режим create → [часть 06](devlog/part-06.md)
- 2026-07-16 · feat/frontend-popup-parent · не закоммичено — строка «родитель: …» в GoalPopup, ParentPicker → [часть 06](devlog/part-06.md)
- 2026-07-16 · fix/frontend-goal-popup-style · не закоммичено — попап цели на облачках D9 вместо монолитной рамки → [часть 05](devlog/part-05.md)
- 2026-07-15 · feat/frontend-goal-popup · не закоммичено — карточка цели как попап поверх карты, RealGoalCard.tsx удалён → [часть 05](devlog/part-05.md)
- 2026-07-15 · chore/kickoff-recommendation-fixup — рекомендация модели/усилия и в handoff, и в kickoff → [часть 05](devlog/part-05.md)
- 2026-07-15 · chore/kickoff-model-recommendation — kickoff-сообщение несёт рекомендацию модели/усилия → [часть 05](devlog/part-05.md)
- 2026-07-15 · feat/frontend-goal-decomposition · не закоммичено — секции «КОНТЕКСТ»/«ДЕКОМПОЗИЦИЯ» в карточке цели → [часть 05](devlog/part-05.md)
- 2026-07-15 · chore/hygiene-closed-milestone · не закоммичено — запрет начинать новую работу в сессии закрытой вехи → [часть 05](devlog/part-05.md)
- 2026-07-15 · feat/frontend-kpi-factor-editing · не закоммичено — управление факторами композитного KPI с канваса постановки → [часть 05](devlog/part-05.md)
- 2026-07-15 · chore/token-guardrails · не закоммичено — модель/effort закреплены в settings.json, thinking выключен, session-budget hook → [часть 05](devlog/part-05.md)
- 2026-07-15 · chore/handoff-trigger-hook · не закоммичено — /handoff привязан к моменту «веха закрыта» → [часть 05](devlog/part-05.md)
- 2026-07-15 · chore/i18n-ops-english · не закоммичено — операционные/агентские файлы переведены на английский → [часть 05](devlog/part-05.md)
- 2026-07-14 · chore/session-hygiene · (fixup поверх 7151ec1) — разрешён конфликт владения handoff.md между PR #1/#2 → [часть 04](devlog/part-04.md)
- 2026-07-14 · chore/session-hygiene · 13c478b — раздел «Гигиена сессий» в COWORK.md, правки handoff.md → [часть 04](devlog/part-04.md)
- 2026-07-14 · feat/frontend-goal-canvas · не закоммичено — канвас постановки цели, граф KPI→KPI, редактор связей/циклов → [часть 04](devlog/part-04.md)
- 2026-07-14 · feat/frontend-goal-editing · не закоммичено — карта целей перестала быть read-only, create/patch/delete из UI → [часть 04](devlog/part-04.md)
- 2026-07-14 · chore/v2-polish · не закоммичено — полировка шкуры v2 (rail/HUD капсулы, mono-дисциплина, пульс-точки рёбер) → [часть 04](devlog/part-04.md)
- 2026-07-14 · chore/merger-subagent · не закоммичено — субагент merger (commit→PR→merge→sync), правило push только через PR → [часть 04](devlog/part-04.md)
- 2026-07-15 · chore/config-hygiene · db9f81c (PR #3, смёржен) — protect-main ловит Bash-путь, правило «мерж только через PR» → [часть 04](devlog/part-04.md)
- 2026-07-14 · feat/frontend-restyle-v2 · c8b86b5 — рестайл CommandPanel/карточек под дизайн v2 → [часть 03](devlog/part-03.md)
- 2026-07-14 · docs/design-canon-v2 · промпт №19 — канон дизайн-направления v2 (Часть III Visual_Reference.md) → [часть 03](devlog/part-03.md)
- 2026-07-13 · feat/frontend-real-goal-card → main (c1bc2fc, merge 9635c3e) — реальные узлы карты кликабельны, RealGoalCard.tsx → [часть 03](devlog/part-03.md)
- 2026-07-13 · feat/frontend-goal-map-binding — карта целей на реальном Goal API вместо демо-данных → [часть 03](devlog/part-03.md)
- 2026-07-13 · chore/repo-integrity-recovery — инцидент: восстановление битого git-индекса/multi-pack-index → [часть 03](devlog/part-03.md)
- 2026-07-13 · docs/workspace-platform-canon · 54b8daf (слита в main, b3207c2) — канон Workspace Platform, «Every Entity Has Workspace» → [часть 02](devlog/part-02.md)
- 2026-07-13 · main · 8c12939 — составной KPI (kpi_factor) смёржен в main → [часть 02](devlog/part-02.md)
- 2026-07-13 · feat/goal-step3b-composite-kpi — составной KPI: таблица kpi_factor, computed_value без нормализации весов → [часть 02](devlog/part-02.md)
- 2026-07-13 · main · 72c8d2f — детект циклов графа связей KPI→KPI смёржен в main → [часть 02](devlog/part-02.md)
- 2026-07-13 · feat/goal-step3c-cycle-detection — таблица kpi_link_cycle, find_cycles/sync_cycles, судья — общий предок → [часть 02](devlog/part-02.md)
- 2026-07-13 · feat/goal-step3a-kpi-links — граф связей KPI→KPI (kpi_link), три типа связи → [часть 02](devlog/part-02.md)
- 2026-07-08 · docs/plan-fact-and-clients — канон план/факт (ADR-0005) и клиентская архитектура (направления, не решения) → [часть 02](devlog/part-02.md)
- 2026-07-08 · main · a190759 — diff-sync KPI смёржен в main → [часть 01](devlog/part-01.md)
- 2026-07-08 · feat/goal-step3-0-kpi-diff-sync · 4e9dc5b — replace-all → diff-sync в patch_goal, entity_id KPI переживает патч → [часть 01](devlog/part-01.md)
- 2026-07-08 · docs/goal-links-model — канон модели связей целей (ADR-0004): типы, каскад, циклы, составной KPI → [часть 01](devlog/part-01.md)
- 2026-07-08 · main · 924675a — структурное дерево целей (parent_id, запрет циклов) смёржено в main → [часть 01](devlog/part-01.md)
- 2026-07-08 · feat/goal-step2b-tree · 1cfdbab — goal.parent_id, would_create_cycle, get_subtree, каскадное удаление → [часть 01](devlog/part-01.md)
- 2026-07-08 · docs/backlog-pre-2b · не закоммичено — три пункта в BACKLOG перед Шагом 2b (diff-sync, N+1, protect-main) → [часть 01](devlog/part-01.md)
- 2026-07-08 · main · a9ecce0 — KPI как Entity-сущность смёржен в main → [часть 01](devlog/part-01.md)
- 2026-07-08 · feat/goal-step2a-kpi-entity · 91958fe — KPI вынесен из JSON goal.kpis в Entity-сущность → [часть 01](devlog/part-01.md)
- 2026-07-08 · main · интеграция веток, main консолидирован — слиты delegation-policy/goal-alignment-model/goal-entity-step1-crud → [часть 01](devlog/part-01.md)
- 2026-07-08 · docs/goal-alignment-model — канон модели KPI и увязки целей (ADR-0003): структура vs граф связей → [часть 01](devlog/part-01.md)
- 2026-07-08 · feat/goal-entity-step1-crud — Goal Entity Шаг 1: CRUD, compute_definiteness (туман/определён) → [часть 01](devlog/part-01.md)
- 2026-07-08 · docs/reconcile-decisions — 4 из 7 вопросов Management_Model §7 закрыты (ADR-0002) → [часть 01](devlog/part-01.md)
- 2026-07-08 · docs/delegation-policy — раздел «Делегирование (субагенты)» в CLAUDE.md → [часть 01](devlog/part-01.md)
- 2026-07-07 · main · baseline — репозиторий инициализирован как ОС ai-agents, канон Management_Model/Visual_Reference → [часть 01](devlog/part-01.md)

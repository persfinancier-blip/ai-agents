# Документация AI Company Simulator

Единственная точка навигации по документации. Правила работы с документами — [AGENTS.md](AGENTS.md). Журнал наведения порядка — [00_CHANGELOG_docs_cleanup.md](00_CHANGELOG_docs_cleanup.md).

## Служебные
- [AGENTS.md](AGENTS.md) — правила работы AI-агентов с документацией: приоритеты документов, порядок изменений.
- [00_CHANGELOG_docs_cleanup.md](00_CHANGELOG_docs_cleanup.md) — журнал дедупликации и реорганизации docs (2026-07-07).
- [../adr/README.md](../adr/README.md) — Architecture Decision Records: журнал реализационных решений (шаблон — `../adr/0000-template.md`). Текущие: [0001](../adr/0001-local-llm-fallback-for-advisors.md) — локальный LLM-fallback для советников, [0002](../adr/0002-reconciliation-first-slice.md) — детерминированная увязка для первого среза Goal Entity, [0003](../adr/0003-kpi-entity-and-goal-alignment.md) — KPI как сущность и граф увязки целей поверх структуры, [0004](../adr/0004-goal-link-types-cycles-composite-kpi.md) — типы связей целей, направленность и циклы, составной KPI, [0005](../adr/0005-plan-vs-fact-and-resource-blocks.md) — план vs факт у KPI и ресурсные блоки как источник факта (направление, Proposed).

## 01 — Видение
- [Product_Vision.md](01_Vision/Product_Vision.md) — зачем продукт существует: проблема фрагментации управления и четыре фундаментальных принципа платформы.

## 02 — Требования
- [PRD.md](02_Product/PRD.md) — **источник истины** (v6.0): полные продуктовые требования, §1–§54, от видения до критериев успеха.
- [Management_Model.md](02_Product/Management_Model.md) — **канон модели управления** (приоритет после PRD): два типа карт, роли, мягко-жёсткая увязка, офисные агенты, навык ≠ компетенция; §7 — 4 из 7 открытых вопросов решены под первый срез (см. ADR-0002), 3 осознанно отложены; §9 — KPI-сущность, граф увязки целей поверх структуры (ADR-0003), типы связей/циклы+судья/составной KPI (ADR-0004), план/факт — направление на будущее (ADR-0005).
- [MVP_Scope.md](02_Product/MVP_Scope.md) — состав первого релиза: регистрация и роли, канвасы, базовые механики.
- [User_Scenarios.md](02_Product/User_Scenarios.md) — шесть ролевых сценариев использования (Основатель, Топ-менеджер, Руководитель отдела, Исполнитель, Менеджер маркетплейса, Бухгалтер как анти-сценарий); ориентир приоритизации, не бэклог.

## 03 — AI и рабочая сила
- [Unified_Workforce.md](03_AI_Workforce/Unified_Workforce.md) — концепция Единой рабочей силы: люди и цифровые сотрудники в одной модели управления (PRD §28–§29).
- [Fine_Tuner_Agent.md](03_AI_Workforce/Fine_Tuner_Agent.md) — философия живого предприятия и саморазвитие агентов: обучение, дообучение, эволюция (PRD §20, §32–§33).

## 04 — Симуляция
- [Decision_Center.md](04_Simulation/Decision_Center.md) — **активный спек**: жизненный цикл решения (13 стадий), Decision Canvas, AI Board of Directors — основа текущего вертикального среза.
- [Game_Mechanics.md](04_Simulation/Game_Mechanics.md) — потребительская геймификация: XP, уровни, достижения, рейтинги (PRD §40). НЕ основа игровой панели Command Center.
- [Evolution_System.md](04_Simulation/Evolution_System.md) — эволюционная система и уровни зрелости сущностей (PRD §20–§26).

## 05 — Архитектура
- [High_Level_Design.md](05_Architecture/High_Level_Design.md) — высокоуровневый архитектурный дизайн: AI-рантайм, компоненты системы.
- [Entity_Platform.md](05_Architecture/Entity_Platform.md) — **активный спек**: модель «Всё есть Сущность», граф знаний, отношения и жизненный цикл — фундамент модели данных бэкенда.
- [Workspace_Platform.md](05_Architecture/Workspace_Platform.md) — **направление** (не активный спек): рабочие пространства сущностей — «каждая Сущность имеет пространство», универсальный UI-слой над Entity Platform; карта целей остаётся главным экраном, пространство — внутренность узла при зуме; блоки-районы, Dashboard-Workspace и Decision Canvas — его частные случаи.
- [AI_Workforce_Runtime.md](05_Architecture/AI_Workforce_Runtime.md) — рантайм цифровых сотрудников: оркестрация моделей, маршрутизация, автономность.
- [Simulation_Engine.md](05_Architecture/Simulation_Engine.md) — движок симуляции: прогнозирование эффекта изменений до внедрения (PRD §44).
- [Integration_Hub.md](05_Architecture/Integration_Hub.md) — интеграционный слой: подключение внешних систем и источников данных.
- [Technical_Requirements.md](05_Architecture/Technical_Requirements.md) — технические требования по разделам PRD 30, 41, 43–47.

## 06 — Планы
- [Roadmap.md](06_Roadmap/Roadmap.md) — дорожная карта по этапам: MVP → Желательно → Можно → Будущее (PRD §48).

## 07 — Бизнес-возможности
- [Business_Capability_Map.md](07_Business_Capabilities/Business_Capability_Map.md) — главная карта бизнес-возможностей платформы; блоки управления Command Center — её пользовательская проекция.

## 08 — Аналитика предприятия
- [Enterprise_Analytics.md](08_Enterprise_Analytics/Enterprise_Analytics.md) — аналитическая платформа поверх Живого графа: метрики, здоровье организации, операционный интеллект.
- [Dashboard_Builder.md](08_Enterprise_Analytics/Dashboard_Builder.md) — конструктор дашбордов на данных графа сущностей.
- [Report_Builder.md](08_Enterprise_Analytics/Report_Builder.md) — конструктор отчётов: регулярная и произвольная отчётность на сущностях.

## 09 — Дизайн-система
- [Visual_Reference.md](09_Design_System/Visual_Reference.md) — **активный спек** (бывший `docs/Command_Center.md`), три части: I — интерфейсная модель Command Center (карта целей как главный экран, уровни масштаба, юниты, блоки-районы, сквозные агенты); II — визуальный бренд-бук as-built v1 (Terminal Strategist; токены, типографика, каталог компонентов, семантика состояний, движение, доступность), извлечённый из кода прототипа `frontend/src/os/` и обязанный ему соответствовать до рестайла №20; III — дизайн-направление v2 (утверждено 2026-07-13, референс ZOEY_OS): «полотно вместо рамок», орб-советник, вертикаль собеседников, оверлей разговора, язык роя точек.

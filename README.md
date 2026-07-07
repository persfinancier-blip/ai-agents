# ai-agents — операционная система по управлению агентами

**ai-agents** — Enterprise OS, в которой люди и ИИ-сотрудники — **единая рабочая сила**: управляются одной логикой (роли, задачи, KPI, обучение, оценка), а вся компания — единый граф Сущностей с картой целей вместо разрозненных инструментов. Управление строится как стратегическая игра: карта целей — главный экран, юниты — сотрудники и их агенты, решения — ходы.

Дизайн и модель управления зафиксированы на пилоте **Decision Center** — первом вертикальном срезе (решение → мнения ИИ-борда → рекомендация). «Decision Center» — имя среза, не продукта; в коде прототипа живёт рабочий алиас «Вектор·OS» (кандидат в финальное имя, решение за владельцем).

## Источники истины

Навигация по всем документам — [`docs/full-vision/INDEX.md`](docs/full-vision/INDEX.md); правила работы с доками — [`docs/full-vision/AGENTS.md`](docs/full-vision/AGENTS.md). Приоритет:

1. [`docs/full-vision/02_Product/PRD.md`](docs/full-vision/02_Product/PRD.md) — продуктовые требования (v6.0). Конфликты решаются в пользу PRD.
2. [`docs/full-vision/02_Product/Management_Model.md`](docs/full-vision/02_Product/Management_Model.md) — канон модели управления: два типа карт, роли, мягко-жёсткая увязка, офисные агенты, навык ≠ компетенция.
3. [`docs/full-vision/09_Design_System/Visual_Reference.md`](docs/full-vision/09_Design_System/Visual_Reference.md) — интерфейсная модель Command Center (Часть I) + визуальный бренд-бук as-built (Часть II, рендеры в `renders/`).

Активные спеки среза: [`04_Simulation/Decision_Center.md`](docs/full-vision/04_Simulation/Decision_Center.md), [`05_Architecture/Entity_Platform.md`](docs/full-vision/05_Architecture/Entity_Platform.md). Остальной `full-vision/`-архив — ранние черновики (частично сгенерированы MetaGPT, который больше не используется); reference-материал, не авторитетнее PRD/Management_Model. Реализационные решения — в [`docs/adr/`](docs/adr/README.md); журнал работ — [`docs/DEVLOG.md`](docs/DEVLOG.md); задачи — [`BACKLOG.md`](BACKLOG.md).

## Вехи

| Веха | Объём | Статус |
|---|---|---|
| M1 | Entity + Decision CRUD, без AI | Готово |
| M2 | Мнение одного советника (CFO) | Готово |
| M3 | Борд из трёх персон (CFO/COO/CTO) + синтез | Следующая |
| M4 | Сценарии + жизненный цикл decide/evaluate | Не начата |
| M5 | Frontend | Вытянута вперёд — базовая версия готова, расширяется с каждой вехой |
| M6 | Карта целей компании как главный экран (Command Center, шаг 1) | UI-прототип готов (`frontend/src/os/`, демо-данные); Goal Entity на бэкенде не начата |
| M7 | Советник строит оргструктуру по описанию простыми словами + настройка сотрудника + автозадача оценки навыков | Не начата |
| M8 | Агенты, привязанные к сотрудникам; сквозные офисные агенты | Не начата |

Текущие CRUD-экраны — временный каркас: целевой UI — игровая панель с картой целей (M6+), существующие экраны становятся деталями карты. Прототип панели: `frontend/src/os/` (два экрана — панель управления и карточка цели), утверждённые рендеры — `docs/full-vision/09_Design_System/renders/os-panel.png`, `os-goal.png`.

## Запуск

Для разработки ключ Anthropic не нужен: `LLM_PROVIDER=stub` (по умолчанию) возвращает помеченные заглушки, весь поток работает бесплатно. Тесты гоняются на моке `LLMProvider` — живых вызовов API нет. Fallback на локальные модели — требование архитектуры, см. [`docs/adr/0001`](docs/adr/0001-local-llm-fallback-for-advisors.md).

### Backend (Python ≥3.11,<3.13)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate       # Windows
pip install -e ".[dev]"
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload   # API-доки: http://localhost:8000/docs
```

```bash
pytest                        # тесты
ruff check . && ruff format --check . && mypy app   # линт + формат + типы
pre-commit run --all-files
```

### Frontend (React 19 + TypeScript + Vite)

```bash
cd frontend
npm install
npm run dev      # dev-сервер Vite, проксирует /api на localhost:8000
npm run build    # tsc -b && vite build
npm run lint     # oxlint
```

## Правила разработки

См. [`CONTRIBUTING.md`](CONTRIBUTING.md): vertical-slice PR, изоляция LLM-провайдера, русская локализация UI, зелёные ruff/mypy/pytest, Conventional Commits, запись в DEVLOG после каждого прохода.

## MCP

`.mcp.json` в корне — командная конфигурация MCP-серверов (сейчас пустой каркас). Как добавлять:

- **GitHub MCP** (когда появится remote): сервер `github`, токен строго через переменную окружения (например `GITHUB_TOKEN`), не в файле.
- **Playwright MCP** уже подключён на уровне пользователя (`~/.claude.json`) — в репо не дублируется.

Перед добавлением сверяться с актуальной документацией: https://code.claude.com/docs/en/mcp.

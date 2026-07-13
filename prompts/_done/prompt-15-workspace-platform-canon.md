# Промпт №15: канон «Workspace Platform» — зафиксировать в git
### `docs/workspace-platform-canon`, `docs: workspace platform — рабочие пространства сущностей`

> **Кому:** Claude Code. Чисто документационный проход, кода нет.
> **Модель/режим:** Sonnet, обычный режим — файлы уже написаны Cowork, задача — проверить, закоммитить, смёржить.
> **Канон:** новый `docs/full-vision/05_Architecture/Workspace_Platform.md` + точечные правки INDEX / Entity_Platform / Visual_Reference / Dashboard_Builder / BACKLOG.
> **Контекст:** владелец принёс анализ GPT об «Operational Workspace»; Cowork разобрал его и зафиксировал как направление: принцип **Every Entity Has Workspace**, цепочка Entity → Workspace → Capability → Entity. Ключевое решение владельца: **карта целей остаётся главным экраном**, пространство — «внутренность» узла при зуме (вариант «Workspace OS вместо карты» отклонён как конфликтующий с `Visual_Reference.md` §2).

## Scope

**Делаем:**
- Проверяем и коммитим УЖЕ внесённые в рабочее дерево правки (Cowork писал напрямую, по прямой просьбе владельца):
  - `docs/full-vision/05_Architecture/Workspace_Platform.md` — новый документ (Architecture Direction, не активный спек);
  - `docs/full-vision/INDEX.md` — строка про Workspace_Platform в разделе 05;
  - `docs/full-vision/05_Architecture/Entity_Platform.md` — Workspace_Platform в «Связанные документы» + одна строка в §20;
  - `docs/full-vision/09_Design_System/Visual_Reference.md` — абзац в §3 (зум в узел → пространство) + предложение в §6 (блоки — частный случай возможностей пространства);
  - `docs/full-vision/08_Enterprise_Analytics/Dashboard_Builder.md` — уточнение в §4 (Workspace дашбордов = реализация пространства);
  - `BACKLOG.md` — пункт в «Продукт / доки».
- Запись в `docs/DEVLOG.md` (формат `/devlog`): что зафиксировано, почему «слой над картой», ссылка на промпт.
- Один коммит в ветке `docs/workspace-platform-canon`, merge в `main`.

**НЕ делаем (сознательно, не домысливать):**
- **PRD не трогаем** — принцип «Every Entity Has Workspace» пока направление, не требование; в PRD попадёт отдельным решением владельца.
- **Management_Model.md не трогаем** — модель управления не менялась.
- **Никакого кода** — ни frontend-заготовок пространств, ни моделей. Реализация — после привязки карты целей к Goal API (BACKLOG).
- Не переименовывать существующие концепции (блоки-районы, Decision Canvas) — они объявлены частными случаями, не заменяются.

## Проверка перед коммитом (обязательна, не верить на слово)

1. Прочитать `Workspace_Platform.md` целиком и сверить с каноном:
   - нет противоречий `Visual_Reference.md` §2 (карта — главный экран) — док должен явно это подтверждать (его §3, §9);
   - нет новых моделей данных вне Entity Platform (его §7 против `Entity_Platform.md` §20);
   - терминология едина: «рабочее пространство сущности» / Workspace, без «Living/Operational Workspace».
2. Проверить, что все относительные ссылки в изменённых файлах ведут на существующие файлы/разделы.
3. `git diff` по каждому файлу: в правках существующих доков — только описанные выше вставки, ничего лишнего.
4. Файлы вне списка Scope в коммит не включать (в дереве есть посторонние незакоммиченные изменения backend/prompts — их НЕ трогать).

## Ограничения

- Не касаться `backend/`, `frontend/`, `prompts/` (кроме перемещения этого промпта в `_done/` после merge).
- В выводах `git status`/`git log` ранее мелькала ошибка `error: improper chunk offset` — перед работой прогнать `git fsck` и доложить владельцу результат; если репозиторий повреждён — остановиться и не коммитить.

## Definition of Done

- [ ] `git fsck` чистый (или проблема доложена и решена).
- [ ] Проверки 1–4 пройдены, расхождения исправлены или доложены.
- [ ] `docs/DEVLOG.md` дополнен записью прохода.
- [ ] Один коммит `docs: workspace platform — рабочие пространства сущностей` в ветке `docs/workspace-platform-canon`.
- [ ] Ветка смёржена в `main`, этот промпт перемещён в `prompts/_done/`, таблица «Активные» в `prompts/README.md` обновлена.

# Промпт №1b (каскад): Гигиена репозитория — хвосты после уборки документации
### AI Company Simulator · отдельный `chore:`-проход · НЕ смешивать с фичами

> **Кому:** AI-агенту разработки, работающему по `CONTRIBUTING.md` и `docs/full-vision/AGENTS.md`.
> **Почему отдельно:** по `CONTRIBUTING.md` кросс-каттинг чинилки идут отдельным `chore:`-PR, не бандлятся с фичами. Это чистка хвостов, оставшихся после промпта №1 (наведение порядка в документации).
> **Ветка/коммит:** `chore/docs-path-tails`, Conventional Commit `chore: fix stale doc paths and repo hygiene`.

---

## Контекст

Промпт №1 переместил и переименовал документы (в частности `docs/Command_Center.md` → `docs/full-vision/09_Design_System/Visual_Reference.md`, удалил дубли PRD/Decision_Center/Entity_Platform верхнего уровня). По ограничению «код не трогать» остались хвосты. Их закрываем здесь. Все пути и факты ниже перед правкой подтвердить `grep`/`git status` — не полагаться на список вслепую.

## Задача A — Битые ссылки на старые пути в backend

В докстрингах `backend/app/` (по отчёту уборки — ~4 файла) остались ссылки на старые пути документов. Найти и поправить:

```bash
grep -rn -E 'Command_Center\.md|docs/Decision_Center\.md|docs/Entity_Platform\.md|prd_ai_company_simulator|docs/(02_Product|04_Simulation|05_Architecture)/' backend/ --include=*.py
```

- Перенаправить на актуальные пути (`docs/full-vision/...`, `Visual_Reference.md`).
- Менять **только строки-докстринги/комментарии**, не логику.
- Прогнать после правки: `ruff check . && ruff format --check . && mypy app && pytest` (все четыре зелёные — как требует CONTRIBUTING).

## Задача B — Прочесать остальной репозиторий на устаревшие пути

Те же ссылки могли остаться в других местах (CI-конфиги, скрипты, `.pre-commit`, вложенные README):

```bash
grep -rn -E 'Command_Center\.md|prd_ai_company_simulator|docs/Decision_Center\.md|docs/Entity_Platform\.md' . \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude=*.rar
```

Поправить найденное; если ссылок нет — зафиксировать «чисто» в отчёте.

## Задача C — Пустой каталог `docs/adr/`

Каталог `docs/adr/` пуст. Выбрать одно (рекомендация — вариант 1):

1. **Наполнить смыслом:** положить `docs/adr/0000-template.md` (шаблон ADR: Context / Decision / Status / Consequences) и `docs/adr/README.md` с правилом ведения ADR. Дать ссылку из `INDEX.md`.
2. **Удалить**, если ADR-практика не планируется.

## Задача D — Архивы в git

`docs.rar` и `frontend/src.rar` лежат в дереве репозитория. Бинарные архивы обычно не версионируют.

- Убрать из-под контроля версий: `git rm --cached docs.rar frontend/src.rar`.
- Добавить в `.gitignore`: `*.rar`.
- Сами файлы на диске не удалять (могут быть нужны локально) — только из индекса git.
- Если это осознанные снапшоты — вместо удаления зафиксировать в отчёте причину оставить.

## Задача E — Отчёт

Дописать в `docs/full-vision/00_CHANGELOG_docs_cleanup.md` секцию «Хвосты (chore-проход)»: что найдено, что поправлено, что осознанно оставлено. Закрыть соответствующие пункты «хвостов», отмеченные в предыдущей уборке.

## Definition of Done (единое правило каскада)

- [ ] `grep` не находит устаревших путей в `backend/` и остальном репо (кроме архивных доков «reference only», если такие явно помечены).
- [ ] Backend-проверки зелёные: `ruff` + `ruff format` + `mypy` + `pytest`.
- [ ] `docs/adr/` разобран (наполнен или удалён).
- [ ] Архивы вне git-индекса, `*.rar` в `.gitignore` (или явно обосновано обратное).
- [ ] CHANGELOG дополнен; INDEX актуален, если менялись ссылки.
- [ ] Один `chore:`-коммит, без фичей и без правок PRD.

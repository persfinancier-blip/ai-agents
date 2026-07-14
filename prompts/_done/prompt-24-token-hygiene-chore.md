# prompt-24 — chore: гигиена токенов (session hygiene) → отдельный chore: PR

**Кому:** Claude Code
**Ветка:** новая `chore/session-hygiene` **от `main`** (НЕ от текущей `feat/frontend-goal-canvas`)
**Тип коммита:** `chore:` (кросс-каттинг — отдельный PR, по CLAUDE.md «Процесс»)
**Каноны:** правки только в мета-файлах (CLAUDE.md, COWORK.md, .claude/commands/) — продуктового канона не касаются.

---

## Контекст / состояние (проверь сам перед действиями)

Три файла с готовыми правками «гигиены токенов» лежат **uncommitted** в рабочем дереве, но сейчас чекаутнута `feat/frontend-goal-canvas`, где вдобавок висит **несмёрженный** feature-коммит `b8facd6 feat: goal canvas`:

- `M CLAUDE.md` — правило `graphify-first` → `grep/чтение-first`; субагенты-исполнители `3–5/авто-каскад` → `1–2/1× в конце прохода`.
- `M COWORK.md` — новый раздел «Гигиена сессий»; `/handoff` добавлен в список команд Claude Code.
- `?? .claude/commands/handoff.md` — новая команда генерации промпта-переноса.

**Репозиторий подпорчен** — все git-операции сейчас печатают `error: improper chunk offset(s) 4310 and 5bf0`. Причина: битый `multi-pack-index` (`git fsck`: «multi-pack-index file exists, but failed to parse»), плюс мусорный `.git/objects/pack/pack-*.mtimes` и залипший `.git/index.lock`. Объекты целы (fsck показывает только нормальные dangling). Это надо починить ДО коммита.

## Scope

**Делаем:**
1. Чиним подпорченный git: удалить битый `multi-pack-index` и мусор, снять залипший lock:
   ```bash
   rm -f .git/objects/pack/multi-pack-index
   rm -f .git/objects/pack/*.mtimes
   rm -f .git/index.lock
   git multi-pack-index write   # опционально; можно просто дать git пересобрать idx
   ```
   Убедиться, что `git status` больше не печатает `improper chunk offset`.
2. Перенести три файла на **свежую ветку от `main`**, не таща за собой `b8facd6`:
   ```bash
   git stash push -u -- CLAUDE.md COWORK.md .claude/commands/handoff.md
   git switch main            # если локальной main нет — git switch -c main origin/main
   git switch -c chore/session-hygiene
   git stash pop
   ```
3. Один коммит `chore:` с этими тремя файлами, push, открыть PR.

**НЕ делаем:**
- Не трогаем `b8facd6 feat: goal canvas` и ветку `feat/frontend-goal-canvas` — это отдельный concern (решение владельца).
- Не касаемся `backend/`, `frontend/`, миграций, тестов.
- Никаких правок содержимого трёх файлов — они уже готовы и проверены, только перенос + коммит.

## Ограничения

- Ветку резать строго от `main` (кросс-каттинг → свой PR, CLAUDE.md «Процесс»). Прямой коммит в `main` блокирует хук `protect-main` — и не нужен.
- После `stash pop` сверь `git status`: ровно три ожидаемых файла, ничего лишнего из feature-дерева не подтянулось.
- Сообщение коммита — на английском, Conventional Commits, например:
  `chore: session hygiene — grep-first + solo-mode subagents, /handoff command`

## Definition of Done

- [ ] `git status` чист от ошибки `improper chunk offset` (MIDX починен).
- [ ] Ветка `chore/session-hygiene` создана **от `main`**; `b8facd6` в неё НЕ входит (`git log --oneline main..chore/session-hygiene` показывает только новый chore-коммит).
- [ ] Ровно три файла в диффе: `CLAUDE.md`, `COWORK.md`, `.claude/commands/handoff.md`; их содержимое не изменено против рабочего дерева.
- [ ] Один `chore:` коммит, PR открыт.
- [ ] `feat/frontend-goal-canvas` и `b8facd6` не тронуты; `backend/`/`frontend/` не тронуты.
- [ ] Запись в `docs/DEVLOG.md` (`/devlog`) о переносе гигиены токенов в chore-PR.

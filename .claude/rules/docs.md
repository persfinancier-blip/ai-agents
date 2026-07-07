---
paths:
  - "docs/**"
---

# Правила работы с документацией

- Порядок правок — `docs/full-vision/AGENTS.md`. Иерархия истины: PRD → Management_Model → Visual_Reference (бренд-бук); конфликты решаются в пользу верхнего. PRD не менять без явного запроса человека.
- Язык — русский, Markdown с заголовками, Mermaid где помогает.
- Каждый проход по докам обновляет: `docs/full-vision/INDEX.md` (новые/перемещённые файлы), `docs/full-vision/00_CHANGELOG_docs_cleanup.md` (структурные изменения) и `docs/DEVLOG.md` (запись о проходе).
- Кросс-ссылки — относительные, проверять после перемещений. Реализационные решения — новый ADR по `docs/adr/0000-template.md`, строка в индекс `docs/adr/README.md`.
- Новые утверждённые дизайн-рендеры — в `09_Design_System/renders/` + строка в таблицу D10; устаревшие — в `renders/_archive/`.

# prompt-ops-13 — docs/MAP.md + canon TOCs (token economy), retire graphify from canon

**For:** Claude Code (GitHub Actions worker, `task/**` push path).
**Branch:** the dispatched `task/ops-13-*` branch. **Commit type:** `docs:`.
**Goal:** a worker reading canon should be able to open ONLY the section it needs (~3 KB), not a whole 40–90 KB file. Read scope for THIS pass: only the files named below.

## Scope

DO:
1. Create `docs/MAP.md` (Russian, like other docs/) — the single "where is what" entry point, ≤ 8 KB.
2. Add a table of contents block to the top of the three big canon docs.
3. Retire graphify from canon (CLAUDE.md) — the skill stays on disk, canon stops recommending it.
4. Point CLAUDE.md's "Minimal read scope" at MAP.md.

DO NOT: touch `backend/`, `frontend/`, `.github/workflows/**`, `.claude/skills/graphify/**` (files stay), or reword canon content itself — TOCs and MAP are additive navigation, not rewrites. No renames, no section restructuring.

## 1. `docs/MAP.md`

Structure (adapt while building, but keep it ≤ 8 KB and scannable):

- **Каноны** — for each of `docs/full-vision/02_Product/PRD.md`, `docs/full-vision/02_Product/Management_Model.md`, `docs/full-vision/09_Design_System/Visual_Reference.md`: a bullet list of its top-level sections with a one-line "что внутри" per section, so an agent can decide which section to read WITHOUT opening the file. Build these lists by reading the actual headings (`grep -n '^#' <file>` is enough; read section bodies only where a heading alone is ambiguous).
- **Код** — one short block each for `backend/app/` and `frontend/src/` naming the key modules/folders and their roles (from directory listing + existing README/CLAUDE.md knowledge; do NOT scan file contents repo-wide).
- **Процесс** — pointers: `docs/PROCESS.md`, `.claude/rules/*`, `prompts/` pipeline, `docs/DEVLOG.md` (index) + `docs/devlog/part-NN.md`, `BACKLOG.md`, ADRs in `docs/adr/`.
- Header line: purpose ("первая точка входа: найди раздел здесь, читай только его") + rule that MAP.md must be updated in the same PR whenever canon sections are added/renamed.

## 2. TOCs in the three canon docs

At the very top of each file (right after the H1 and any existing preamble line), insert:

```
<!-- TOC (ops-13): читай только нужный раздел, не весь файл. Обновляй при изменении разделов. -->
## Оглавление
- [<section title>](#<anchor>) — <one line: что внутри>
...
```

One entry per top-level (`##`) section; nested subsections only where a top-level section exceeds ~15 KB (Visual_Reference will need this). Anchors must be valid GitHub markdown anchors for the existing headings (do not rename headings).

## 3. Retire graphify from canon

In `CLAUDE.md` (repo root): delete the `## graphify` section entirely. In its place (same location) add a short `## Навигация` section: "Первая точка входа — `docs/MAP.md`: найди нужный раздел там и читай только его. Для точечных задач — grep/Read по конкретному файлу." Do not touch `.claude/CLAUDE.md` or the skill files.

## 4. CLAUDE.md "Minimal read scope"

In the "Token economy" section, extend the "Minimal read scope" bullet: prepend "MAP.md → " to the chain (`MAP.md → file → folder → module`) and add "канон читать только по разделу из оглавления (TOC), не целиком".

## Definition of Done

- `docs/MAP.md` exists, ≤ 8 KB, covers all three canons section-by-section with one-liners.
- All three canon files have the TOC block; anchors resolve (spot-check at least 3 per file).
- `grep -n graphify CLAUDE.md` returns nothing; the `## Навигация` section exists.
- No content sections of canon docs were reworded (diff shows only TOC insertions).
- Docs-only pass (DoD gate trivial). Prompt archived to `prompts/_done/`, DEVLOG entry, one `docs:` commit.

---
paths:
  - "docs/**"
---

# Documentation rules

- Edit order — `docs/full-vision/AGENTS.md`. Truth hierarchy: PRD → Management_Model → Visual_Reference (brand book); conflicts resolve in favor of the higher one. Don't change the PRD without an explicit human request.
- Language — Russian, Markdown with headings, Mermaid where it helps.
- Every docs pass updates: `docs/full-vision/INDEX.md` (new/moved files), `docs/full-vision/00_CHANGELOG_docs_cleanup.md` (structural changes), and `docs/DEVLOG.md` (an entry for the pass).
- Cross-links are relative; verify them after moves. Implementation decisions get a new ADR from `docs/adr/0000-template.md`, plus a line in the `docs/adr/README.md` index.
- New approved design renders go in `09_Design_System/renders/` plus a row in the D10 table; obsolete ones go in `renders/_archive/`.

---
description: Run the Definition of Done — checks on both sides, doc hygiene, propose a Conventional Commit
allowed-tools: Bash, Read, Grep, Glob, Edit
---

Run the Definition of Done for the current work, step by step, with a full report:

1. **Backend** (from `backend/`, via `.venv`): `ruff check .`, `ruff format --check .`, `mypy app`, `pytest -q`. All four must be green.
2. **Frontend** (from `frontend/`): `npm run build`, `npm run lint`.
3. **Docs**: if the pass touched `docs/` — check that `docs/full-vision/INDEX.md` and `docs/full-vision/00_CHANGELOG_docs_cleanup.md` are updated; regardless, propose an entry for the DEVLOG (as in `/devlog` — lands in the current `docs/devlog/part-NN.md`, indexed from `docs/DEVLOG.md`).
4. **Diff**: show `git status --short` and the gist of the diff; confirm no junk got in (caches, .env, stray files) and that the branch isn't `main`.
5. **Commit**: propose a Conventional Commits message (`feat:`/`fix:`/`chore:`/`docs:`/`test:` + a short body: what and why). Only make the commit itself after the user confirms.

If any step is red, stop there, show the error, and propose a fix — don't propose a commit on top of red checks. $ARGUMENTS narrows the scope (e.g. "backend only").

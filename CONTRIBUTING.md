# Contributing

This repo is worked on by a mix of humans and AI coding agents. These
conventions exist so several contributors can work in parallel without
stepping on each other — follow them even if you're the only one here today.

## Branching & commits

- Trunk-based: branch off `main` as `feat/<milestone>-<short-desc>`, e.g.
  `feat/m2-cfo-persona`. Never commit directly to `main` (a Claude Code
  hook blocks edits on `main` as a reminder).
- [Conventional Commits](https://www.conventionalcommits.org/): `feat:`,
  `fix:`, `chore:`, `docs:`, `test:`. Cross-cutting cleanups go in a
  separate `chore:` PR, never bundled into a feature PR.
- Open a PR against `main`; CI (lint + type-check + tests + migration check)
  must be green before merge.

## DEVLOG

Every working pass (feature, chore, docs sweep) ends with an entry in
[`docs/DEVLOG.md`](docs/DEVLOG.md): date · branch/commit · what was done ·
what's next. The `/devlog` slash command in Claude Code appends one. Tasks
and ideas that aren't picked up yet go to [`BACKLOG.md`](BACKLOG.md) — this
repo uses a tracked backlog file, not GitHub Issues, until a remote exists.

## What "one task" looks like

Keep PRs to a single vertical slice: **one endpoint + its service function +
its migration (if any) + its tests**, touching at most 1–2 model files. This
is what lets multiple agents/contributors pick up different tasks from the
milestone table in [README.md](README.md) without merge conflicts.

Specifically:

- **New persona** (e.g. adding CMO in a later milestone): one new file in
  `app/board/personas.py` area, tested only against a mocked `LLMProvider`
  (see `app/llm/provider.py`) — never a live API call in CI.
- **New endpoint**: route in `app/api/v1/`, logic in `app/services/`, schema
  in `app/schemas/`, tests in `tests/integration/`.
- **Schema change**: update the SQLAlchemy model, then
  `alembic revision --autogenerate -m "..."` — don't hand-edit migrations
  except to fix known autogenerate quirks (e.g. missing `Text` import on
  Postgres `JSONB` variants).
- **Frontend**: `frontend/` was pulled forward from M5 so there's always
  something visual to look at, and it should stay in step with the backend
  from here on — when a milestone adds/changes an endpoint, extend
  `src/api.ts` + `src/types.ts` and the relevant view in the same PR (or a
  fast follow-up), rather than letting the UI drift out of date until "M5".

Don't bundle cross-cutting refactors into a feature PR — send those
separately so they don't block or get lost in feature review.

## Local setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows; use .venv/bin/activate on macOS/Linux
pip install -e ".[dev]"
cp .env.example .env
alembic upgrade head
pre-commit install
```

```bash
cd frontend
npm install
npm run dev      # requires the backend running on port 8000
```

## Before opening a PR

```bash
ruff check .
ruff format --check .
mypy app
pytest --cov=app
```

All four must pass locally — CI runs the same checks.

## Localization

All user-facing text (frontend UI strings, AI Board opinions/labels shown to
the user, user-facing error messages) must be in **Russian**. Keep
established technical terms as-is rather than forcing an awkward translation
— e.g. "frontend"/"backend", "API", "commit", persona names like
"CFO"/"COO"/"CTO". Code identifiers, comments, commit messages, and this
documentation stay in English as usual.

## LLM provider rules

- Never import an LLM SDK (`anthropic`, `openai`, ...) outside
  `app/llm/<provider>_provider.py`. Everything else depends only on the
  abstract `LLMProvider` interface in `app/llm/provider.py`.
- Tests must use a fake/mocked `LLMProvider` — no live API calls in CI, ever.
- Structured output is always via forced tool-use / function-calling with a
  schema generated from a Pydantic model. Never parse free-text for JSON.

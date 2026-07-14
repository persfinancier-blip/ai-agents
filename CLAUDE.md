# ai-agents — Enterprise OS (people + AI = one workforce)

Repository for the OS that manages agents; "Decision Center" is the first vertical slice, not a product. Detailed zone rules live in `.claude/rules/` (backend/frontend/docs/commits); this file is pointers only.

## Commands

```bash
# backend (FastAPI + SQLAlchemy async + Alembic; Python >=3.11,<3.13)
cd backend && .venv\Scripts\activate
pytest                                             # tests (mocked LLMProvider, no live APIs)
ruff check . && ruff format --check . && mypy app  # all four green before a PR (CI runs the same)
alembic upgrade head

# frontend (React 19 + TS + Vite)
cd frontend && npm run dev      # proxies /api -> :8000
npm run build && npm run lint   # tsc -b + vite build; oxlint
```

## Sources of truth (by priority)

1. `docs/full-vision/02_Product/PRD.md` — product requirements.
2. `docs/full-vision/02_Product/Management_Model.md` — management model (maps, roles, alignment, skill ≠ competency).
3. `docs/full-vision/09_Design_System/Visual_Reference.md` — interface model + brand book (renders in `renders/`).

Navigation — `docs/full-vision/INDEX.md`; doc-editing rules — `docs/full-vision/AGENTS.md`. The rest of the full-vision archive is reference, not canon. Implementation decisions — ADRs in `docs/adr/`.

## Process

- Branch off `main` (`feat/<milestone>-<subject>`); direct edits to `main` are blocked by a hook. Conventional Commits; cross-cutting changes get a separate `chore:` PR.
- All user-facing UI text is in Russian (CONTRIBUTING "Localization").
- LLM SDKs are imported ONLY in `backend/app/llm/<provider>_provider.py`; locally `LLM_PROVIDER=stub` — no keys needed.
- End of every pass: an entry in `docs/DEVLOG.md` (`/devlog`), tasks in `BACKLOG.md`. The milestone table in README can lag — check `git log`.

## Token economy (owner decision, 2026-07-14)

- **Model — Sonnet** (as specified in prompts); Opus or above only on the owner's explicit instruction.
- **Minimal read scope:** file → folder → module; never scan the whole repo. Read canon selectively — only the sections a prompt references, not the whole PRD.
- **Playwright** — one pass against the DoD checklist at the end of a pass; screenshots only as finals for `renders/`; run `/compact` after a series of browser actions.
- **Reports stay short:** conclusions and actions; don't recount code or file contents.

## Delegation (subagents)

Four subagents in `.claude/agents/` are **on-demand reviewers** (token economy, owner decision 2026-07-14; the earlier "always needed" rule is repealed): `code-reviewer` — for diffs of ~150+ lines or on explicit request; `spec-guardian` — on canon/doc passes and when data models change; `doc-keeper` — on docs passes; `test-runner` — don't invoke it, the lead runs DoD checks itself.

**Executor roles are not pre-assigned.** The lead decides based on task context:
- Split off into **ad-hoc task-specific subagents** only when work is genuinely parallel (independent files/layers) or heavy context shouldn't clutter the main session. Give each one **narrow `tools`** and a single clear task.
- By default — **single-threaded**: a normal pass over this repo doesn't need subagents.
- Concurrency guideline — no more than 3 at once.

**Crystallization:** only "freeze" an executor role into a file under `.claude/agents/` once it has proven repeatable. Start ad-hoc; promote to a file once repetition is a fact.

Every subagent follows the same rules: canon (PRD → Management_Model → brand book), LLM-SDK isolation, RU localization for UI, token economy.

## graphify

Knowledge graph in `graphify-out/`. For point tasks (find a function, read a file, a local fix) — use plain grep/Read: it's cheaper. `graphify query` — only for questions about relationships/architecture not visible from 1–2 files; after code edits `graphify update .` stays free (AST-only).

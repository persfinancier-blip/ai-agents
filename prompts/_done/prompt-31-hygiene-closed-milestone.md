# prompt-31 — chore: no new work after «веха закрыта»

**To:** Claude Code
**Branch:** new `chore/hygiene-closed-milestone` from `main`
**Commit type:** `chore:` (canon hygiene — one PR)
**Canon:** `COWORK.md`. No product canon touched.

---

## Context (verify yourself)

The `/handoff` trigger from prompt-28 fired correctly at the «веха закрыта» moment, but only half-worked: after the proposal, the owner's next messages switched context (new product questions), and Cowork got pulled into new work inside the closed milestone's session instead of re-proposing the exit. The "context drifted" trigger in the Session hygiene section exists but is not bound to a prohibition on starting new work after a closed milestone. Close that gap.

## Scope — do (one PR)

In `COWORK.md`, section **"Session hygiene (context economy)"**, immediately after the existing bullet **«Триггер `/handoff` (привязан к шагу проверки)»**, add one bullet (3–5 lines). Do NOT rewrite or restructure the rest of the section. English prose; keep Russian literals as-is:

> - **После «веха закрыта» — новая работа в этой сессии не начинается:** once the `/handoff` proposal has fired, ANY new request outside the closed milestone's tails (a fix inside the just-merged PR, its DEVLOG/BACKLOG records) gets the same response first — re-propose `/handoff` + a fresh session, and do not start the new work here. New product questions from the owner are the typical drift vector: they are **new work, not tails**. This binds the "context drifted" trigger (item 3) to a concrete rule instead of a judgement call.

## Do NOT

- Touch anything besides this `COWORK.md` addition.
- Touch `backend/`, `frontend/`, tests, product canon, `.claude/settings.json` guardrails, or `docs/full-vision`.

## Definition of Done

- [ ] `COWORK.md` Session hygiene carries the "no new work after «веха закрыта»" bullet, placed right after the prompt-28 trigger bullet; the rest of the section unchanged.
- [ ] This file `prompts/prompt-31-hygiene-closed-milestone.md` committed **directly into `prompts/_done/` in this same PR** (no tail PR).
- [ ] `docs/DEVLOG.md` entry (Russian).
- [ ] Step 0 preflight per COWORK.md tail-cleanup rule (`git status` + `git log origin/main..HEAD`); merge via the **`merger`** subagent; clean tree, `main` synced, pruned.
- [ ] `backend/`/`frontend/`/tests/guardrails untouched.

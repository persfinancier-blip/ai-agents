# prompt-33 — chore: kickoff format carries model + effort recommendation

**To:** Claude Code
**Branch:** new `chore/kickoff-model-recommendation` from `main`
**Commit type:** `chore:` (process hygiene — one PR)
**Canon:** `COWORK.md`. No product canon touched.

---

## Context (verify yourself)

Token economy (CLAUDE.md, owner decision 2026-07-14) pins the working model to Sonnet; anything above requires the owner's explicit instruction — but no channel for that instruction is defined. Owner decision 2026-07-15: the kickoff message Cowork gives the owner for each new milestone must itself carry a model + effort recommendation, and the owner's confirmation of that recommendation IS the explicit instruction. Cowork already applies the format in chat; this pass fixes it in the file.

## Scope — do (one PR)

In `COWORK.md`, section **"Working with the `prompts/` folder"**, immediately after the existing bullet about the kickoff line (**«The prompt lives in the file under `prompts/`…»**), add one bullet (3–5 lines). Do NOT rewrite or restructure the rest of the section. English prose; keep Russian literals as-is:

> - **Kickoff carries a model + effort recommendation:** opening a new milestone, Cowork's kickoff message includes «Рекомендуемая модель: X, усилие: Y» with a one-line rationale (example: «Открываем веху Ф8, промпт prompts/prompt-34-….md, рекомендуемая модель Fable 5, усилие hard — многослойный рефакторинг»). The default stays Sonnet/medium and the `.claude/settings.json` guardrails stay untouched; a model above Sonnet is legalized ONLY by the owner confirming such a recommendation — that confirmation is the "explicit instruction" required by CLAUDE.md "Token economy".

## Do NOT

- Touch anything besides this `COWORK.md` addition.
- Touch `backend/`, `frontend/`, tests, product canon, `.claude/settings.json` guardrails, or `docs/full-vision`.

## Definition of Done

- [ ] `COWORK.md` "Working with the `prompts/` folder" carries the model+effort recommendation bullet, placed right after the kickoff-line bullet; the rest of the section unchanged.
- [ ] This file `prompts/prompt-33-kickoff-model-recommendation.md` committed **directly into `prompts/_done/` in this same PR** (no tail PR).
- [ ] `docs/DEVLOG.md` entry (Russian).
- [ ] Step 0 preflight per COWORK.md tail-cleanup rule (`git status` + `git log origin/main..HEAD`); merge via the **`merger`** subagent; clean tree, `main` synced, pruned.
- [ ] `backend/`/`frontend/`/tests/guardrails untouched.

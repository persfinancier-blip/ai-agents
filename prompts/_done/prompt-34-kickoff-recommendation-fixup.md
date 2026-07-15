# prompt-34 — chore: model+effort recommendation also fires in the handoff (fix-up of prompt-33)

**To:** Claude Code
**Branch:** new `chore/kickoff-recommendation-fixup` from `main`
**Commit type:** `chore:` (process hygiene — one PR)
**Canon:** `COWORK.md`. No product canon touched.

---

## Context (verify yourself)

Prompt-33 (PR #16) added the model+effort recommendation rule, but scoped it to **Cowork's kickoff message for Claude Code** only. Owner's intent was broader: the recommendation fires when a **milestone is opened**, and a milestone is first opened in the **handoff block** that starts a new session — the kickoff comes later. Verified in practice 2026-07-15: Cowork generated a handoff for Ф7а with no recommendation, following the letter of the rule. Fix the letter to match the intent.

## Scope — do (one PR)

In `COWORK.md`, section **"Working with the `prompts/` folder"**, replace the existing bullet **«Kickoff carries a model + effort recommendation:»** with the following (one bullet, 4–6 lines; do NOT touch anything else in the section). English prose; keep Russian literals as-is:

> - **Model + effort recommendation at both milestone-opening points:** Cowork includes «Рекомендуемая модель: X, усилие: Y» with a one-line rationale (example: «Открываем веху Ф8, промпт prompts/prompt-NN-….md, рекомендуемая модель Fable 5, усилие hard — многослойный рефакторинг») in **(a) the handoff block** that opens a new session for a milestone, and **(b) the kickoff message** for Claude Code — the repetition is deliberate: the owner sees it both when starting the session and when launching the pass. The default stays Sonnet/medium and the `.claude/settings.json` guardrails stay untouched; a model above Sonnet is legalized ONLY by the owner confirming such a recommendation — that confirmation is the "explicit instruction" required by CLAUDE.md "Token economy".

## Do NOT

- Touch anything besides this `COWORK.md` bullet replacement.
- Touch `backend/`, `frontend/`, tests, product canon, `.claude/settings.json` guardrails, or `docs/full-vision`.

## Definition of Done

- [ ] `COWORK.md` carries the replaced bullet (handoff + kickoff, both points); the rest of the section unchanged.
- [ ] This file `prompts/prompt-34-kickoff-recommendation-fixup.md` committed **directly into `prompts/_done/` in this same PR** (no tail PR).
- [ ] `docs/DEVLOG.md` entry (Russian) noting this is a fix-up of prompt-33 intent.
- [ ] Step 0 preflight per COWORK.md tail-cleanup rule (`git status` + `git log origin/main..HEAD`); merge via the **`merger`** subagent; clean tree, `main` synced, pruned.
- [ ] `backend/`/`frontend/`/tests/guardrails untouched.

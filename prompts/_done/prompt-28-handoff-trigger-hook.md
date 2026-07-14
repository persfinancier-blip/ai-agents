# prompt-28 — chore: bind the /handoff trigger to the verification step

**To:** Claude Code
**Branch:** new `chore/handoff-trigger-hook` from `main`
**Commit type:** `chore:` (canon hygiene — one PR)
**Canon:** `COWORK.md`. No product canon touched.

---

## Context (verify yourself)

The session-hygiene rule ("milestone closed / context switch → `/handoff` → fresh session") currently lives as a floating principle, not bound to any concrete step — so it gets missed (it just was). Bind it to the exact moment it must fire: Cowork's post-pass MCP verification, right when Cowork is about to report that the milestone is done.

## Scope — do (one PR)

In `COWORK.md`, in the section describing Cowork's verification role / session hygiene (where "verify passes via GitHub MCP" is covered), add a rule bullet. English prose, but keep the Russian literal phrase «веха закрыта» as-is (it is what Cowork actually writes to the owner):

> - **Триггер `/handoff` (привязан к шагу проверки):** when post-pass MCP verification confirms the pass achieved the milestone's result and Cowork is about to report «веха закрыта», that **same message must also propose `/handoff` + a fresh session** — it must not offer to continue new work inside the closed milestone's session. The trigger is the concrete moment "about to declare «веха закрыта»", not the abstract "context switch".

## Do NOT

- Touch anything besides this `COWORK.md` addition.
- Touch `backend/`, `frontend/`, tests, product canon, or branch protection.

## Definition of Done

- [ ] `COWORK.md` carries the bound `/handoff` trigger rule at the verification step.
- [ ] This file `prompts/prompt-28-handoff-trigger-hook.md` committed **directly into `prompts/_done/` in this same PR** (no tail PR).
- [ ] `docs/DEVLOG.md` entry (Russian).
- [ ] Merge via the **`merger`** subagent (`gh pr merge --merge --delete-branch`) — dogfood; this pass does not edit `merger.md`, so it is safe. Clean tree, `main` synced, pruned.
- [ ] `backend/`/`frontend/`/tests/branch protection untouched.

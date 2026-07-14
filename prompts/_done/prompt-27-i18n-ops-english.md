# prompt-27 — chore: translate operational/config files to English + fix prompt-archival tail

**To:** Claude Code
**Branch:** new `chore/i18n-ops-english` from `main`
**Commit type:** `chore:` (cross-cutting config/canon hygiene — one PR)
**Canon:** `CLAUDE.md`, `COWORK.md`, `.claude/rules/commits.md`. Product canon (PRD / Management_Model / Visual_Reference / ADR content, DEVLOG, BACKLOG) is NOT touched.

---

## Context (verify yourself)

Token economy (owner decision). Operational/agent-facing instruction files are read constantly — `CLAUDE.md` every session start, agents on each invoke, rules per zone — and Russian costs roughly 2× the tokens of equivalent English. Translate these operational files to English. Everything about the **product** (vision, development, results) stays Russian, definitively. Also fix a recurring process leak: every pass currently spawns a second "tail" PR just to move the prompt file into `prompts/_done/`.

## Scope — do (one PR)

### 1. Translate to English — faithful, meaning-preserving

These files (they read like code/comments — the "code is English" rule applies):
- `CLAUDE.md` (root) and `.claude/CLAUDE.md`
- `COWORK.md`
- `.claude/rules/*.md` (backend, frontend, docs, commits)
- `.claude/agents/*.md` (code-reviewer, spec-guardian, doc-keeper, test-runner, merger)
- `.claude/commands/*.md` (adr, devlog, ship, handoff)

**Keep in Russian — do NOT translate these literals inside the files above:**
- Any quoted product-canon text and UI-string examples.
- **Output templates that commands emit stay Russian**, because they produce owner-facing / canon Russian content: translate the *instructions* of a command to English, but keep the *emitted template* in Russian —
  - `handoff.md` → the «Перенос контекста» block it prints stays Russian.
  - `devlog.md` → the DEVLOG entry format it writes stays Russian.
  - `adr.md` → the ADR document it generates stays Russian (ADRs are product canon).
  - (`ship.md` is pure instruction — no RU output template — translate fully.)
- File paths, commit-type keywords (`feat:`/`chore:`/…), code, command names.

**Translation must not change meaning.** These files govern agent behavior; a subtle shift is a real hazard. Where a Russian term is load-bearing (e.g. «туман войны», «увязка», «срез»), keep the Russian term in parentheses after the English on first use if a clean English equivalent is ambiguous.

### 2. Codify the language rule

In `COWORK.md` (and cross-ref in `commits.md`), replace/extend the current "prompt files English" line with:
> - **Язык файлов:** операционные/агентские файлы (`.claude/**`, `CLAUDE.md`, `COWORK.md`) и промпт-файлы для Claude Code — на английском (как код/коммиты). Продуктовый канон (`docs/**` — PRD, Management_Model, Visual_Reference, ADR, DEVLOG, BACKLOG), `README.md`, `CONTRIBUTING.md` — по-русски. Литеральные RU UI-строки, цитаты канона и русские выводы команд (handoff/devlog/adr) внутри переведённых файлов остаются по-русски. Общение с владельцем и UI — русский.

### 3. Fix the prompt-archival tail leak

Update the "хвост-уборка" rule in `COWORK.md` **and** the corresponding step in `.claude/agents/merger.md`: the prompt file is committed **directly into `prompts/_done/` within the same PR** (it is already executed by commit time) — **no separate post-merge archival branch/PR**. Remove any "after merge move to `_done`" wording that forces a second PR.

## Do NOT

- Translate or touch `docs/**` (product canon, DEVLOG history, BACKLOG), `README.md`, `CONTRIBUTING.md`, or `prompts/_done/*` history.
- Touch `backend/`, `frontend/`, migrations, tests.
- Enable/alter GitHub branch protection.
- Change the **meaning** of any rule while translating.

## Verification

- Invoke **spec-guardian** to confirm each translated file says exactly what the Russian said — no behavior drift. Special attention: `commits.md` rules, `protect-main` references, the `merger` ruleset, and the preserved Russian output templates (they must remain Russian and intact).

## Definition of Done

- [ ] All listed operational files are in English; RU literals and command output-templates (handoff/devlog/adr) preserved in Russian.
- [ ] Language rule codified in `COWORK.md` (+ cross-ref in `commits.md`).
- [ ] "хвост-уборка" + `merger.md` updated: prompt file goes straight to `prompts/_done/` in the same PR; the tail PR is gone.
- [ ] **spec-guardian** run; no meaning drift reported (or drift fixed).
- [ ] This file `prompts/prompt-27-i18n-ops-english.md` committed **directly into `prompts/_done/` in THIS PR** (dogfood the new no-tail rule — do NOT open a second PR for it).
- [ ] `docs/DEVLOG.md` entry (in Russian — DEVLOG stays Russian).
- [ ] Merge via `gh pr merge --merge --delete-branch` the normal way — do NOT dogfood the `merger` agent this pass, since `merger.md` itself is being edited here. Clean tree, `main` synced, pruned.
- [ ] `backend/`/`frontend/`/tests/branch protection untouched.

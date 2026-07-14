# prompt-26 — chore: crystallize git/merge subagent + settle push canon

**To:** Claude Code
**Branch:** new `chore/merger-subagent` from `main`
**Commit type:** `chore:` (config/canon hygiene — one PR)
**Canon:** `CLAUDE.md` (delegation & "кристаллизация", token economy), `COWORK.md`, `.claude/rules/commits.md`. Product canon (PRD / Management_Model / ADR / Visual_Reference) is NOT touched.

---

## Context (verify yourself)

The commit → PR → merge → cleanup cycle has proven repeatable (several passes, plus a fumble while landing PR #3/#4 where the old local `git push origin main` habit was correctly blocked by the new `protect-main` Bash guard). Per `CLAUDE.md` "Кристаллизация", a role that shows repeatability should be frozen into `.claude/agents/`. This prompt crystallizes the git/merge executor, resolves a canon contradiction the merge exposed, and lands two pending Cowork rules.

## Scope — do (one PR)

1. **Create git/merge subagent `.claude/agents/merger.md`** (executor role, not a controller). Narrow `tools`: `Bash, Read` only. Its job: take an already-prepared set of changes (made by the main session on a branch, or modified in the working tree) plus a commit type/scope/message, and run the full git lifecycle **safely**:
   - **Input check (merger's first action):** `git status` to confirm the working tree holds exactly the intended changes, plus `git log origin/main..HEAD` for divergence. If something unexpected is present, STOP and report — never blind-proceed. NOTE: this is the merger verifying its own inputs at commit time; it is distinct from the **pass-level start preflight** (ensuring a clean/synced state *before any edits*), which stays the main session's Step 0 and runs before the merger is ever invoked. The merger is an executor called at the commit/merge point — it does not need to run "first".
   - Ensure work is on a proper feature branch (`feat/…`, `chore/…`, `docs/…`) created from `main` — never commit on `main`.
   - Stage **only the intended files** (explicit paths — **no `git add .`**).
   - Commit with a Conventional Commit message (English).
   - `git push -u origin <branch>`.
   - `gh pr create` with a clear title/body.
   - Merge via **`gh pr merge --merge --delete-branch`** — **NEVER** `git push origin main` (the `protect-main` hook blocks it, and it's forbidden by policy).
   - Sync local `main` (`git checkout main && git pull origin main`), then `git fetch --prune`.
   - **Хвост-уборка:** finish with a clean tree; report the PR number and merge status. If any step fails, report the exact error and do NOT claim completion.
   - **Never:** local push/commit to `main`, force-push, blind `git add .`, or auto-merging work that wasn't the delegated task.

2. **Resolve the canon contradiction in `.claude/rules/commits.md`.** The line "Push разрешён автоматически: после каждого merge в `main` выполнять обычный `git push origin main` (решение владельца, 2026-07-13)" is now superseded — the `protect-main` hook blocks direct `git push origin main`, and policy is "agents always via PR". Replace it with:

   > - **Мерж — только через PR** (`gh pr merge --merge --delete-branch`); прямой `git push origin main` агентам запрещён (блокирует хук `protect-main`). Локальный `main` синхронизируется `git pull` после мержа. Force-push запрещён (`deny` в settings); добавление/смена remote'ов — только по явному указанию владельца.

3. **Add two Cowork rules** (Russian literals — these go into `COWORK.md`, cross-reference in `commits.md` "Пуш и ответственность"):

   > - **Песочница:** Cowork смотрит состояние репо только через GitHub MCP (read-only) — ветки, PR, диффы, файлы. Локальный git в своей песочнице не трогает. Единственная локальная операция Cowork — положить файл-промпт в `prompts/`; коммит/пуш этого файла — на Claude Code.
   > - **Язык промптов:** промпт-файлы для Claude Code — на английском (как код/коммиты). Литеральные RU UI-строки и цитаты канона внутри промпта остаются по-русски. Общение с владельцем и UI — по-прежнему русский.

## Do NOT

- Touch `backend/`, `frontend/`, migrations, tests.
- Enable GitHub branch protection (separate owner decision).
- Touch the other subagent files (`code-reviewer`, `spec-guardian`, `doc-keeper`, `test-runner`) or the graphify skill.
- Touch product canon.

## Definition of Done

- [ ] `.claude/agents/merger.md` exists, is a valid agent definition with narrow `tools: Bash, Read`, and encodes the full ruleset above (preflight, feature-branch-only, no `git add .`, `gh pr merge` not local push, prune, хвост-уборка).
- [ ] `commits.md`: stale "auto `git push origin main`" line replaced with the PR-only rule.
- [ ] `COWORK.md`: sandbox rule + English-prompt rule present.
- [ ] This file `prompts/prompt-26-merger-subagent.md` committed in the pass; moved to `prompts/_done/` after merge.
- [ ] Clean tree; PR opened **and merged via `gh pr merge`**; `main` synced; branches pruned. `docs/DEVLOG.md` entry (`/devlog`).
- [ ] `backend/`/`frontend/`/tests untouched; branch protection untouched.

_Note: dogfooding the new `merger` agent on a real task is for the next pass — this PR itself merges the normal way (`gh pr merge`), since the agent only exists once this PR lands._

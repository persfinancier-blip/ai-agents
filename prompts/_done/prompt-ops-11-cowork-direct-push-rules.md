# prompt-ops-11 — Align rules/instructions with Cowork direct push

**For:** Claude Code (GitHub Actions worker, `task/**` push path).
**Branch:** the dispatched `task/ops-11-*` branch. **Commit type:** `docs:`.
**Canon touched:** `.claude/rules/commits.md`, `.claude/rules/github-automation.md`, `COWORK.md`. File language: English (operational files).

## Context — what changed (2026-07-22)

Cowork now has a working **write** path to GitHub: during a session it commits a prompt file and **pushes it straight to a `task/<slug>-<timestamp>` branch from its own sandbox over HTTPS**, authenticated with a fine-grained GitHub PAT the owner stored locally at `.secrets/gh_token` (gitignored, never committed). Verified end-to-end (push probe + the dispatch of this very prompt). SSH does not work from the sandbox; HTTPS does. The PAT carries `Contents: Read and write` on this repo.

Consequence: the local Task Scheduler watcher (`scripts/dispatch-tasks.ps1`) is now a **fallback** (for prompts dropped while Cowork is closed), not the primary dispatch. Several instruction files still assert "Cowork is read-only / has no write access / dispatch happens via the watcher." That is now false and misleads a future session into the dead watcher path. Fix the wording so the canon matches reality.

## Scope

DO: apply the exact find/replace edits below to the three files, in the existing terse style.
DO NOT: touch `.github/workflows/**` (local-only per this same file), any `backend/` or `frontend/` code, `.claude/settings.json`, or the `scripts/dispatch-tasks.ps1` script itself — only its *description* changes. Do NOT delete the watcher/fallback; reframe it as the fallback. No new mechanisms, no scope creep.

## Edits

### 1. `.claude/rules/commits.md`

Replace the entire section starting at `## Push and responsibility` (currently 5 bullets) with:

```
## Push and responsibility

- **Cowork write scope (2026-07-22):** Cowork pushes **only `task/**` branches** — a prompt file committed straight from its sandbox over HTTPS, authenticated with a fine-grained GitHub PAT stored locally at `.secrets/gh_token` (gitignored, never committed; `Contents: Read and write`). This is the **primary** way a prompt reaches the worker; the local Task Scheduler watcher (`scripts/dispatch-tasks.ps1`) is now only a **fallback** for prompts dropped while Cowork is closed. Details — `.claude/rules/github-automation.md` → "File-driven dispatch".
- Cowork never pushes to `main` or any non-`task/**` branch, never merges a PR, and never writes to `backend/` or `frontend/`. Code writes, PR creation, and merges stay Claude Code's zone.
- Reads/inspection — Cowork via the GitHub MCP (**read-only**) or plain `git` over HTTPS in its sandbox (SSH is unavailable from the sandbox).
- **Sync is confirmed by fact:** after every push Cowork compares the local commit hash against the cloud (`git ls-remote`) and reports «совпадает / расходится» — an event-based check on each push, not a timer.
- Direct push to `main` — human (owner) only; agents always go through a PR.
- Every kickoff line from Cowork carries a preflight (Step 0) and a "tail cleanup" (see `COWORK.md` → "Working with the `prompts/` folder").
```

### 2. `.claude/rules/github-automation.md`

**(a)** In the section `## File-driven dispatch (prompt file → `task/*` branch → worker)`, insert this NEW bullet as the FIRST item of that list, immediately after the heading and before the bullet that begins "The **installed copy** at":

```
- **Primary path — Cowork direct push (2026-07-22):** during a session Cowork commits the new `prompts/prompt-*.md` file straight to a `task/<slug>-<timestamp>` branch from its own sandbox, pushed over HTTPS with the fine-grained PAT at `.secrets/gh_token` (`Contents: Read and write`). SSH does not work from the sandbox; HTTPS does. The `push` trigger in `claude.yml` picks the branch up exactly as before — the worker is unchanged, and the owner's machine is not in the loop. After the push Cowork confirms sync by comparing local vs cloud commit hashes. The Task Scheduler watcher below is the **fallback** for files dropped while Cowork is closed.
```

**(b)** In the same section, the bullet that currently begins:

```
- The **installed copy** at `%LOCALAPPDATA%\ai-agents-ops\dispatch-tasks.ps1`
```

prepend `**Fallback watcher.** ` so it begins:

```
- **Fallback watcher.** The **installed copy** at `%LOCALAPPDATA%\ai-agents-ops\dispatch-tasks.ps1`
```

(leave the rest of that bullet, and all other bullets, unchanged.)

### 3. `COWORK.md`

**(a)** Replace the `**Boundaries:**` sentence (in "## Who you are here"):

Old:
```
**Boundaries:** you write only to `prompts/` (and, on explicit request, to `docs/`). You don't touch `backend/`, `frontend/`, don't commit, don't create branches. Git is Claude Code's zone, so there isn't more than one agent with write access.
```
New:
```
**Boundaries:** your git write scope is **pushing `task/**` branches only** — the prompt file, committed from your sandbox over HTTPS with the fine-grained PAT at `.secrets/gh_token`. You never push to `main` or any non-`task/**` branch, never merge, and never write to `backend/` or `frontend/`. Content-wise you author only `prompts/` files (and, on explicit request, `docs/`). Code, PR creation, and merges remain Claude Code's zone.
```

**(b)** In "## Push and responsibility (brief; canon — `.claude/rules/commits.md`)", replace these two bullets:

Old:
```
- Cowork reads/inspects the repo only via the GitHub MCP (read-only), never writes to git.
- All writes (commit/branch/PR/merge) — Claude Code only.
```
New:
```
- Cowork pushes `task/**` branches (prompt files) directly from its sandbox over HTTPS with the PAT at `.secrets/gh_token` — the primary dispatch path. It still never writes to `main`, other branches, or code.
- Code writes, PR creation, and merges — Claude Code only. Cowork's only git write is the `task/**` prompt-branch push.
```

**(c)** Replace the `**Sandbox:**` bullet:

Old:
```
- **Sandbox:** Cowork looks at repo state only via the GitHub MCP (read-only) — branches, PRs, diffs, files. It doesn't touch local git in its own sandbox. Cowork's only local operation is dropping a prompt file into `prompts/`; committing/pushing that file is Claude Code's job.
```
New:
```
- **Sandbox:** Cowork inspects repo state via the GitHub MCP (read-only) and plain `git` over HTTPS. It uses its sandbox git for exactly one write: committing the prompt file to a `task/**` branch and pushing it (PAT at `.secrets/gh_token`). After each push it confirms sync by comparing local vs cloud commit hashes and reports «совпадает / расходится». SSH is unavailable from the sandbox — HTTPS only.
```

**(d)** In "## Working with the `prompts/` folder", replace the `**New prompt**` bullet:

Old:
```
- **New prompt** → Cowork drops the file straight into `prompts/` named `prompt-NN-short-name.md` (NN = the next sequential number), but does **not** commit or push it. From here dispatch is **instant and event-driven**: a watcher on the owner's machine (`scripts/dispatch-tasks.ps1`, registered as a Task Scheduler job) ships the file to a `task/*` branch within seconds, which wakes the Actions worker automatically. The kickoff line below is needed only as a **fallback** for when the owner's machine is off.
```
New:
```
- **New prompt** → during a session Cowork writes the prompt as `prompt-NN-short-name.md` (NN = next sequential number) and **pushes it directly to a `task/<slug>-<timestamp>` branch** from its sandbox over HTTPS (PAT at `.secrets/gh_token`), which wakes the Actions worker automatically; Cowork then confirms the push by comparing local vs cloud hashes. The local Task Scheduler watcher (`scripts/dispatch-tasks.ps1`) is a **fallback** for prompts dropped while Cowork is closed; the kickoff line below is a further fallback for when the owner's machine is off.
```

## Definition of Done

- All three files updated as above; a repo-wide grep finds **no** remaining "Cowork ... read-only", "no write access", or "never writes to git" claims that contradict the new scope.
- `.github/workflows/**` untouched; no `backend/`/`frontend/` code changed; `scripts/dispatch-tasks.ps1` script body unchanged.
- This prompt file archived to `prompts/_done/` in the same PR.
- DEVLOG entry recording the pass (`/devlog`).
- One `docs:` commit; PR opened and auto-merged (DoD gate: docs/prompts-only → trivially passes).

# Commits and PRs

- [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `chore:`, `docs:`, `test:`.
- One PR = one vertical slice: endpoint + service + migration (if any) + tests + the matching frontend extension. Cross-cutting fixes get their own `chore:` PR — don't bundle them into a feature.
- Work only on branches off `main` (`feat/<milestone>-<subject>`, `chore/...`, `docs/...`); the `protect-main` hook blocks direct edits to `main`.
- **Merge only via a PR** (`gh pr merge --merge --delete-branch`); agents are forbidden from a direct `git push origin main` (the `protect-main` hook blocks it). Local `main` gets synced with `git pull` after a merge. Force-push is forbidden (`deny` in settings); adding/changing remotes still requires the owner's explicit instruction.
- Run both sides' checks before proposing a commit (`/ship` does this end to end).
- **File language:** see `COWORK.md` → «Язык файлов» for which files are English vs. Russian.

## Push and responsibility

- **Cowork write scope (2026-07-22):** Cowork pushes **only `task/**` branches** — a prompt file committed straight from its sandbox over HTTPS, authenticated with a fine-grained GitHub PAT stored locally at `.secrets/gh_token` (gitignored, never committed; `Contents: Read and write`). This is the **primary** way a prompt reaches the worker; the local Task Scheduler watcher (`scripts/dispatch-tasks.ps1`) is now only a **fallback** for prompts dropped while Cowork is closed. Details — `.claude/rules/github-automation.md` → "File-driven dispatch".
- Cowork never pushes to `main` or any non-`task/**` branch, never merges a PR, and never writes to `backend/` or `frontend/`. Code writes, PR creation, and merges stay Claude Code's zone.
- Reads/inspection — Cowork via the GitHub MCP (**read-only**) or plain `git` over HTTPS in its sandbox (SSH is unavailable from the sandbox).
- **Sync is confirmed by fact:** after every push Cowork compares the local commit hash against the cloud (`git ls-remote`) and reports «совпадает / расходится» — an event-based check on each push, not a timer.
- Direct push to `main` — human (owner) only; agents always go through a PR.
- Every kickoff line from Cowork carries a preflight (Step 0) and a "tail cleanup" (see `COWORK.md` → "Working with the `prompts/` folder").

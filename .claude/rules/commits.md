# Commits and PRs

- [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `chore:`, `docs:`, `test:`.
- One PR = one vertical slice: endpoint + service + migration (if any) + tests + the matching frontend extension. Cross-cutting fixes get their own `chore:` PR — don't bundle them into a feature.
- Work only on branches off `main` (`feat/<milestone>-<subject>`, `chore/...`, `docs/...`); the `protect-main` hook blocks direct edits to `main`.
- **Merge only via a PR** (`gh pr merge --merge --delete-branch`); agents are forbidden from a direct `git push origin main` (the `protect-main` hook blocks it). Local `main` gets synced with `git pull` after a merge. Force-push is forbidden (`deny` in settings); adding/changing remotes still requires the owner's explicit instruction.
- Run both sides' checks before proposing a commit (`/ship` does this end to end).
- **File language:** see `COWORK.md` → «Язык файлов» for which files are English vs. Russian.

## Push and responsibility

- Reading/inspecting the repo — Cowork via the GitHub MCP (**read-only**).
- Writes (commit/branch/PR/merge) — **Claude Code only** (Cowork has no write access to the repo).
- Direct push to `main` — human (owner) only; agents always go through a PR.
- Every kickoff line from Cowork carries a preflight (Step 0) and a "tail cleanup" (see `COWORK.md` → "Working with the `prompts/` folder").
- Cowork's sandbox and prompt-file language — see `COWORK.md` → "Push and responsibility (brief)".

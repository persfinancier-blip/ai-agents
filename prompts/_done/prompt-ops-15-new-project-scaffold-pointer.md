# prompt-ops-15 — new-project (scaffold) requests: codify the routing rule

For: Claude worker. Docs-only pass, commit type `docs:`. Work on THIS task branch.

## Scope

Add the "new-project request" routing rule to `COWORK.md` and a one-line pointer
in `CLAUDE.md`. Touch NOTHING else. No code, no other docs.

## Changes

1. `COWORK.md` — right after the "## Who you are here" section, add:

```markdown
## New-project (scaffold) requests

- An owner request like «новый проект: …» / «разверни бота …» is NOT a task for
  this repo and NOT a coding task. It is a scaffold request: follow
  `SCAFFOLD.md` in the local clone of
  [agent-starter](https://github.com/persfinancier-blip/agent-starter) at
  `C:\Dev\agent-starter` (run `git pull` there first — the mechanism evolves).
- The agent does everything itself: creates `C:\Dev\<slug>`, the GitHub repo
  (owner clicks github.com/new only if the MCP returns 403), fills it from
  `template/`, writes `docs/TZ.md` + `prompt-01`, copies the PAT from
  `ai-agents/.secrets/gh_token` into `<slug>/.secrets/gh_token`. The owner
  never runs git, never creates folders — only clicks: repo creation on 403,
  the `CLAUDE_CODE_OAUTH_TOKEN` secret + Actions permissions in the new repo,
  and a new Cowork project on the ready folder.
- Never write such a request into `ai-agents/prompts/` — it does not enter this
  repo's pipeline.
```

2. `CLAUDE.md` — add one bullet at the end of the "## Process" section:

```markdown
- «Новый проект / разверни бота X» from the owner = a scaffold request routed
  through `agent-starter` (see `COWORK.md` → "New-project (scaffold) requests"),
  never a task in this repo.
```

## Constraints

- Docs-only: `COWORK.md`, `CLAUDE.md`, and moving this prompt file to `prompts/_done/`.
- Keep the existing file language convention (both files are English-operational).

## Definition of Done

- Both edits in place verbatim (adjust surrounding blank lines per CommonMark).
- This prompt file moved to `prompts/_done/` in the same commit.
- DoD gate green (docs-only → trivial), PR auto-merged into `main`.

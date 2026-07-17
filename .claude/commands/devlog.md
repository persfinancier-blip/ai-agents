---
description: Add an entry for the current pass to docs/DEVLOG.md
allowed-tools: Read, Edit, Bash(git log *), Bash(git branch *), Bash(git status *), Bash(gh pr view *)
---

**Step 0 — finalize stale headers first.** Before inserting the new entry, scan existing headers
for `не закоммичено (промпт ...)`. For each one whose PR has since merged (check with
`gh pr view <n> --json state,mergeCommit -q '.state + " " + .mergeCommit.oid'`, matching the PR
number from context or from `git log --oneline --merges` on the entry's branch name), rewrite just
that header line to `## ГГГГ-ММ-ДД · main · <merge-sha> (промпт №NN, PR #N)` — a single-line edit
per entry, nothing else on the line or below it touched. This is what makes finalization actually
happen instead of being a step nobody runs: it fires every time `/devlog` is invoked, not only
when someone remembers to do it post-merge.

Insert a new entry into `docs/DEVLOG.md` **immediately after** the `# DEVLOG` heading and its intro
paragraph (the line starting "Журнал проходов..."), newest entries on top. This must be a pure
insertion: do not touch, reformat, or reflow any existing line below the insertion point — the
№39/№40 regression (a prior pass ate an existing entry's header while inserting) must not repeat.
If you are not certain the insertion is header-for-header clean, re-read the file after editing
and diff it mentally against what was there before saving.

Entry format:

```
## ГГГГ-ММ-ДД · <ветка> · <короткий hash последнего коммита или «не закоммичено»>

- **Что сделано:** 2–5 пунктов, по фактам этой сессии (не пересказывай план — только сделанное).
- **Дальше:** 1–3 пункта следующих шагов; задачи, которые не берём сейчас, — перенеси в BACKLOG.md.
```

Take the date as today's, the branch and hash from `git branch --show-current` and `git log -1 --format=%h`. Fill the bullets from the current conversation's context — what was actually done in this pass. If the user passed arguments ($ARGUMENTS), use them as the basis for "Что сделано"/"Дальше".

**Finalization** of this entry's own header happens the same way, on some future `/devlog` run
after its PR has merged (see Step 0 above) — no separate manual step or `/ship` hook needed.

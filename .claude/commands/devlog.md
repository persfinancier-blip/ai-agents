---
description: Add an entry for the current pass to docs/DEVLOG.md
allowed-tools: Read, Edit, Write, Glob, Bash(git log *), Bash(git branch *), Bash(git status *), Bash(gh pr view *), Bash(grep *), Bash(wc *)
---

`docs/DEVLOG.md` is an index only — parts live in `docs/devlog/part-NN.md`, rotated by size
(new part once the current one exceeds 25 KB). **Never read `docs/DEVLOG.md` in full** — read
just enough of its head to find the insertion point (intro paragraph + parts table) and the
one-line-per-entry list start. Never read a part file you are not editing.

**Step 0 — finalize stale headers first, via `grep`, not a read.** Run
`grep -rn "не закоммичено" docs/DEVLOG.md docs/devlog/` to locate candidates. For each one whose
PR has since merged (check with
`gh pr view <n> --json state,mergeCommit -q '.state + " " + .mergeCommit.oid'`, matching the PR
number from context or from `git log --oneline --merges` on the entry's branch name), rewrite:
(a) the header line in its specific part file to `## ГГГГ-ММ-ДД · main · <merge-sha> (промпт №NN, PR #N)`,
and (b) the matching one-line entry in the index — two single-line edits, nothing else touched.

**Step 1 — determine the current part.** Find the highest `docs/devlog/part-NN.md` (`Glob`).
Check its size with `wc -c`. If it is **over 25 KB**, create `docs/devlog/part-<NN+1>.md` with a
`# DEVLOG — часть NN` header and a one-line date-range note, and add a new row for it to the
index's part table.

**Step 2 — insert the entry.** Insert at the top of the current part, immediately after that
part's header lines (`# DEVLOG — часть NN` + date-range line), newest-on-top. Then prepend the
matching one-line entry to the index's entry list, immediately after the parts table.

Entry format (unchanged):

```
## ГГГГ-ММ-ДД · <ветка> · <короткий hash последнего коммита или «не закоммичено»>

- **Что сделано:** 2–5 пунктов, по фактам этой сессии (не пересказывай план — только сделанное).
- **Дальше:** 1–3 пункта следующих шагов; задачи, которые не берём сейчас, — перенеси в BACKLOG.md.
```

Index line format: `- ГГГГ-ММ-ДД · <ветка> · <hash> (промпт №NN, PR #N) — <хук в 5–10 слов> → [часть NN](devlog/part-NN.md)`

Take the date as today's, the branch and hash from `git branch --show-current` and `git log -1 --format=%h`. Fill the bullets from the current conversation's context — what was actually done in this pass. If the user passed arguments ($ARGUMENTS), use them as the basis for "Что сделано"/"Дальше".

**Finalization** of this entry's own header happens the same way, on some future `/devlog` run
after its PR has merged (see Step 0 above) — no separate manual step or `/ship` hook needed.

Sharding (2026-07-22) structurally prevents the old №39/№40 header-eating regression: a part file
stays under 25 KB, so there is no longer a 166 KB file in which an insertion can silently clobber
a neighbouring entry. No post-edit full re-read or mental diff is needed.

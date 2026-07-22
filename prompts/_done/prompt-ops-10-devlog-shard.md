# Prompt #ops-10: shard `docs/DEVLOG.md` into size-rotated parts, rewrite `/devlog` to stop reading the whole log

### commit type `docs:`, e.g. `docs: shard DEVLOG into size-rotated parts, /devlog appends instead of full-read`

> **For:** Claude Code worker (unattended, file-driven dispatch → `task/**` branch → one PR → DoD gate → auto-merge). **Docs/commands zone → the gate passes trivially** (no backend/frontend files touched), so correctness here is entirely on your own verification. Read the "Verification" section before you start editing — this pass moves 166 KB of the owner's project history and losing an entry is not recoverable from the gate.
> **Milestone:** token economy, ops track. Owner decision 2026-07-18.
> **Owner's intent:** `/devlog` runs at the end of **every** pass. `docs/DEVLOG.md` is 166 KB / 61 entries, and inserting at the top forces a `Read` of the whole file (≈45 KB of tokens, ≈45K tokens) on every single pass — the single largest recurring token cost in the repo, spent on a bookkeeping step. After this pass `/devlog` must never read more than the index plus the current part.
> **Rotation rule (owner's decision):** parts rotate **by size, not by calendar month**. At the current pace (slices 43–46 landed in one day) a month-based shard would be back at 166 KB within weeks. Threshold: when the newest part exceeds **25 KB**, `/devlog` starts the next one.
> **Model/mode:** Sonnet, effort medium. Docs + `.claude/commands/devlog.md` only.
> **Canon:** `CLAUDE.md` → "Token economy"; `docs/PROCESS.md` (DEVLOG's role in the pass lifecycle); `.claude/rules/docs.md`.
> **Precondition:** clean tree. **Step 0:** `git log -1 --name-only` to find this prompt file; `git status`.

## Current state (measured 2026-07-18 — re-measure, don't trust these numbers blindly)

- `docs/DEVLOG.md`: 166 211 bytes, 665 lines, **61 entries** (`^## ` headers), 24 of them still carrying `не закоммичено` in the header.
- Newest entry on top (`## 2026-07-17 · task/prompt-45-goal-owner-picker-20260717 · не закоммичено (промпт №45)`), oldest at the bottom (`## 2026-07-07 · main · baseline`).
- Average entry ≈ 2.7 KB.

## Scope

**Do:**

1. **Create `docs/devlog/` and split the existing log into parts.**
   - Parts are named `docs/devlog/part-NN.md` (`part-01.md` = **oldest**, highest number = newest). Numbering ascends with time so "the current part" is always the highest number.
   - Fill parts chronologically from the oldest entry up, closing a part once it would exceed **25 KB**. At ~2.7 KB/entry that lands around 9 entries per part and ~7 parts total — but drive it off actual byte size, not a fixed entry count.
   - **Within a part, keep newest-on-top** (same convention as today), so a part reads like a small DEVLOG.
   - Each part starts with `# DEVLOG — часть NN` and one line stating the date range it covers.
   - **Entry bodies are copied verbatim.** Do not reword, re-wrap, reformat, or "improve" a single existing entry. This is a move, not an edit.
2. **Rewrite `docs/DEVLOG.md` as an index.**
   - Keep the `# DEVLOG` heading and an intro paragraph explaining the new structure (parts, size rotation, where `/devlog` writes).
   - Then a table of parts: part file, date range, entry count.
   - Then a one-line-per-entry index, **newest on top**: `- ГГГГ-ММ-ДД · <ветка> · <hash> (промпт №NN, PR #N) — <хук в 5–10 слов> → [часть NN](devlog/part-NN.md)`.
   - The "хук" is a short phrase you derive from the entry's own «Что сделано» — enough for a human or an agent to decide whether to open the part. No anchors into the part files (they rot); the part link is enough.
   - Target: the index stays **under 20 KB** even at 61 entries. If it doesn't, your hooks are too long.
3. **Rewrite `.claude/commands/devlog.md`.** The new command must:
   - **Never read `docs/DEVLOG.md` in full.** Read the index head only (enough to find the insertion point and the current part number), and the current part file.
   - Determine the current part: highest `part-NN.md` in `docs/devlog/`. **Check its size first** — if it is over 25 KB, create `part-<NN+1>.md` (with its `# DEVLOG — часть NN` header) and write the new entry there instead, and add the new part to the index's part table.
   - Insert the new entry at the top of the current part (immediately after that part's header lines), then prepend the matching one-line entry to the index.
   - Keep the existing entry format (`## ГГГГ-ММ-ДД · <ветка> · <hash>` + «Что сделано» / «Дальше» bullets) and the existing rules for taking date/branch/hash and using `$ARGUMENTS`.
   - **Keep Step 0 (finalizing stale `не закоммичено` headers) but make it a `grep`, not a read:** `grep -rn "не закоммичено" docs/DEVLOG.md docs/devlog/` to locate candidates, then a single-line edit in the specific part file plus the matching index line. Never read a part you are not editing.
   - **Delete the paragraph that says to re-read the file after editing and diff it mentally.** It was a guard against the №39/№40 header-eating regression; sharding removes the cause (you can no longer clobber a neighbour inside a 166 KB file when you are appending to a 25 KB one), and the instruction itself forces a second full read. State in the command that the regression is now structurally prevented, so nobody reintroduces the guard later.
   - Update `allowed-tools` to include `Bash(grep *)`/`Glob` as needed for the size and staleness checks.
4. **Update the pointers.** `CLAUDE.md` ("End of every pass: an entry in `docs/DEVLOG.md`") → point at the new structure in one clause, no new paragraph. Same for `docs/PROCESS.md` and `.claude/commands/ship.md` step 3 wherever they name `docs/DEVLOG.md` as the file entries land in. `docs/full-vision/INDEX.md` only if it references DEVLOG.

**Don't (deliberately):**

- **Do not touch any entry's content.** No rewording, no trimming verbose entries, no fixing old typos. Tempting, out of scope, and it makes the verification below impossible.
- No changes to `/adr`, `/handoff`, or the DoD gate.
- No new dependencies, no scripts, no automation for rotation beyond what `/devlog` itself does.
- Do not gitignore `docs/devlog/` — it is project history and must be versioned.

## Verification (do this, and report the numbers)

This pass has no CI gate worth the name, so verify by counting:

1. `grep -c "^## " docs/devlog/part-*.md` summed across parts **must equal 61** (or whatever `grep -c "^## " docs/DEVLOG.md` returned on `main` before you started — measure it in Step 0 and quote both numbers in your report).
2. Every entry header string present in the original file must be present in exactly one part. Verify mechanically: extract `^## ` lines from the original (`git show origin/main:docs/DEVLOG.md`) and from the concatenated parts, sort both, `diff` them — the diff must be empty.
3. Total bytes across `docs/devlog/part-*.md` must be within a few hundred bytes of the original 166 211 (accounting only for the per-part headers you added).
4. No part file exceeds 25 KB except by a single trailing entry.
5. `docs/DEVLOG.md` index line count equals the entry count.
6. **Dry-run the new command's logic by hand:** state in your report which part a new entry would land in today, and how many bytes `/devlog` would need to read to place it (index head + current part). If that number is not comfortably under 30 KB, the design is wrong — stop and say so rather than shipping it.

## Constraints

- Docs content Russian (this is the owner's journal); code/commit messages English, per `COWORK.md` → «Язык файлов».
- PowerShell 5.1 — one command at a time; no `&&`.
- Reports stay short: the six verification numbers, and nothing else. Do not recount what you moved.

## Definition of Done

- [ ] `docs/devlog/part-NN.md` created; all 61 entries moved verbatim; the `diff` in Verification 2 is empty.
- [ ] `docs/DEVLOG.md` is an index under 20 KB with one line per entry and a part table.
- [ ] `.claude/commands/devlog.md` rewritten: no full read of the log, size-based rotation at 25 KB, Step 0 via `grep`, the "re-read and diff mentally" paragraph removed.
- [ ] Pointers updated in `CLAUDE.md`, `docs/PROCESS.md`, `.claude/commands/ship.md`.
- [ ] **This pass's own DEVLOG entry is written using the NEW structure** — it is the first live test of the rewritten command. If writing it is awkward, fix the command, don't work around it.
- [ ] **Tail cleanup:** move this prompt file to `prompts/_done/prompt-ops-10-devlog-shard.md`; update `prompts/README.md`. `BACKLOG.md`: close the DEVLOG-sharding line if present.
- [ ] One commit; worker opens the PR; gate green → auto-merge; clean tree.
- [ ] Report: the six verification numbers, and the "bytes `/devlog` now reads per pass" figure.

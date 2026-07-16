# GitHub Actions automation (Claude worker)

- Task = a GitHub issue labeled `ai-task`. The worker runs on a GitHub Actions runner
  (`.github/workflows/claude.yml`), not on the owner's machine.
- One PR per issue, opened by the worker and linked to the issue (`Closes #N`). CI
  (`ci.yml`) runs the same DoD checks as local.
- Rework happens only via explicit `@claude <note>` comments on the issue or PR, from
  the owner or Cowork. No bot-to-bot loops, no autonomous Claude↔Claude review.
- Merge only after the owner's explicit approval («принимаем»). The worker never
  merges its own PR.
- All token-economy rules from `CLAUDE.md` (model pin, minimal read scope, short
  reports) apply on the runner exactly as they do locally.

## Prompt-file naming

- Product prompts: `prompt-NN-*.md` (sequential, product track).
- Infrastructure/process prompts: `prompt-ops-NN-*.md` (sequential, independent
  numbering). Both archive to `prompts/_done/` the same way.

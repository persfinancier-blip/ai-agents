---
paths:
  - "frontend/**"
---

# Frontend rules

- Stack: React 19 + TypeScript + Vite, linter `oxlint`. API client — `src/api.ts`, shared types — `src/types.ts`. Game-panel prototype — `src/os/` (`CommandPanel.tsx`, `GoalCard.tsx`, `ProcessMap.tsx`, data in `data.ts`/`goals.ts`).
- **All UI strings are in Russian** (established tech terms and codes stay as-is: API, KPI, GOAL-014).
- Colors and typography — only tokens from `src/index.css :root`; don't introduce new colors, reuse components from `src/os/os.css` classes first. Canon — the brand book: `docs/full-vision/09_Design_System/Visual_Reference.md`, Part II (D2 tokens, D5 catalog, D6 state semantics, D9 usage rules).
- Don't reassign state semantics: green = done/ok, yellow = active/attention, red = risk/deficit, dashed = draft/future/no data.
- Animations — only `os-pulse`/`os-flow`; any new one must respect `prefers-reduced-motion`.
- Before a PR: `npm run build` and `npm run lint` must pass.

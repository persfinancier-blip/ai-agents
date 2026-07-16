# Prompt #36: F7a fix-up — one overlay style (goal popup = advisor overlay), codified in the brand book

### `fix/frontend-goal-popup-style`, `fix: unify goal popup with advisor overlay style (F7a fix-up)`

> **For:** Claude Code. Owner compared two live screenshots after PR #18: the advisor-orb overlay (conversation) vs the goal popup. Verdict: «ни разу не одинаково». The goal popup renders as a big framed gray panel; the advisor overlay renders as free-floating "облачка" (bubbles) on a dimmed canvas with identity-tinted borders. **There must be ONE overlay style in the product — the advisor overlay is the reference.** This is a fix-up inside F7a (the milestone is not accepted until this lands), plus the owner explicitly ordered the rule recorded in the brand book.
> **Model/mode:** Sonnet, effort medium — CSS/markup restyling of one component + one canon section; no logic changes, no backend.
> **Canon:** `Visual_Reference.md` Part II (D2 tokens, D4 geometry, D6 state semantics, D9 identity-color rules); doc-editing rules `docs/full-vision/AGENTS.md`.
> **Precondition:** main at PR #18 (`664f338`), clean tree. **Step 0 — preflight:** `git status` + `git log origin/main..HEAD`; untangle anything dirty deliberately before branching.

## Scope

**Do:**

1. **Restyle `GoalPopup.tsx` / its `os.css` rules to the advisor-overlay language.** Read the advisor overlay as the reference first: `.ov`, `.ov-bg`, `.ov-orb`, `.ov-name`, `.topic`, `.topic.on`, `.omsg` (and their spacing) in `os.css`. Then:
   - **Kill the monolithic framed panel.** No solid full-height `--sf` card with a border wrapping everything. The popup's sections — header/status row, name+description+owner, KPI block, СРОК, ВАЖНОСТЬ · СРОЧНОСТЬ, hint — become **separate floating "облачка"** on the dimmed backdrop, visually the same species as the advisor's `.omsg`/`.topic` bubbles (same surface, same radius family, same padding rhythm).
   - **Backdrop dimming identical to the advisor overlay** — same `.ov-bg` value (`rgba(8,9,14,.6)`), same fade-in (`os-ov-in`). If GoalPopup currently uses its own dimming/blur, replace with the shared one (ideally reuse the same CSS classes instead of near-duplicates).
   - **Border discipline — no gray-vs-purple «петушня».** One rule: bubble borders are tinted with the **identity color of the context** (the goal's branch color from `branchStyle()`, exactly like the advisor overlay tints its bubbles with the advisor's hue, cf. `.ov-name`, `.topic.on`). Neutral `var(--ln)` hairlines are allowed only for genuinely neutral inner rows (e.g. KPI rows), but pick ONE scheme for the outer bubbles and apply it to all of them uniformly. Traffic-light colors (D6) stay reserved for states (edit-mode yellow, delete red, risk badge); dashed stays reserved for no-data/future stubs.
   - **Uniform gaps.** The owner called out inconsistent spacing («где большие, где-то прям маленькие»): define one gap value between bubbles (take the advisor overlay's rhythm, ~8–10px) and one internal padding rhythm, apply everywhere. No section may invent its own margin.
   - **Column hugs content** — no huge empty void below the last block with the hint pinned far down (visible on the owner's screenshot). The bubble column is as tall as its content; the «Esc / клик мимо — закрыть» hint sits right under the last bubble as a small muted line (or drop it into a `title` if it fights the layout — owner prefers minimal).
   - The hex orb + name pill on the left stay as-is (they already match the overlay style).
   - **No logic changes:** all handlers, fetch/PATCH flows, inline editors, icon row behavior stay byte-identical where possible — this pass is markup/CSS only.
2. **Codify the rule in the brand book** (owner's explicit instruction: «внеси это в бренд-бук… отметь где-нибудь!!!»). In `docs/full-vision/09_Design_System/Visual_Reference.md` Part II, following the structure rules in `docs/full-vision/AGENTS.md`, add a rule (place it where Part II catalogs patterns — e.g. a "D10. Оверлеи" subsection or the closest existing slot; read the doc's structure and fit in, don't bolt on): **«Оверлей — один паттерн на весь продукт»**, in Russian, covering: (a) затемнение сцены `rgba(8,9,14,.6)` + появление `os-ov-in`; (b) никаких монолитных панелей с рамкой — свободные «облачка» на затемнении; (c) рамки облачков — цвет идентичности контекста (советник → его hue, цель → цвет ветки), нейтральный `--ln` только для внутренних строк; (d) светофор D6 — только состояния, пунктир — только «нет данных/будущее»; (e) единый ритм зазоров; (f) выходы: Esc, ✕, клик мимо. Reference both implementations (advisor overlay, goal popup) as the as-built examples.
3. **Screenshot for sign-off:** Playwright on seeded DB (`scripts/seed_demo_goals.py`), open the goal popup, save `renders/f7a-popup-style.png`. Visually compare against the advisor overlay screenshot yourself before finishing: same dimming, same bubble species, no gray frame.

**Don't:**

- No behavior/logic/API changes; no backend. No changes to the advisor overlay itself (it is the reference, not the patient) — except extracting a shared CSS class if that removes duplication cleanly.
- No new colors/tokens/animations; D6/D9 semantics untouched.
- Don't restyle `GoalCanvas` or the demo components — out of scope (if the canon rule implies future work there, add a BACKLOG line instead).
- Don't touch `Management_Model.md` or PRD.

## Constraints

- UI text Russian; code/commits English; canon section in Russian (docs are RU per `.claude/rules/commits.md` file-language table).
- One PR: code + `Visual_Reference.md` + DEVLOG/BACKLOG. Conventional Commit `fix:`.
- PowerShell 5.1 — one command at a time; venv `python -m X`. After merge — `git push origin main`.

## Definition of Done

- [ ] `npm run build` + `npm run lint` green; backend suite green (control).
- [ ] Playwright: popup opens/closes as before (Esc/✕/backdrop), all mutations still work (spot-check name edit + pause toggle + KPI add); visually — no framed panel, dimming matches the advisor overlay, bubbles share one border scheme and one gap rhythm, no dead void below content. Screenshot at `renders/f7a-popup-style.png`.
- [ ] `Visual_Reference.md` Part II contains the overlay rule (per Scope item 2), structured per `AGENTS.md`.
- [ ] `docs/DEVLOG.md` entry; `BACKLOG.md` — add follow-up line if other surfaces (GoalCanvas popovers, future overlays) need migration to the codified pattern.
- [ ] One commit on `fix/frontend-goal-popup-style`, PR merged into `main`, pushed, clean tree; prompt file committed to `prompts/_done/`; `prompts/README.md` updated.
- [ ] Report back with the screenshot path.

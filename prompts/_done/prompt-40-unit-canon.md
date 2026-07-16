# Prompt #40: unit milestone, slice 1 — canon (ADR-0006 + Management_Model)

### `docs/unit-entity-canon`, `docs: unit entity taxonomy and goal ownership (ADR-0006)`

> **For:** Claude Code. Opens the **unit milestone**: a real Unit entity so a goal is assigned to a unit instead of a free-text owner. Owner decisions (2026-07-16, this session): (1) unit kinds are **four atomic executor types** — internal employee / AI agent / external worker / robot-device; team/department are NOT kinds but a future grouping construct (separate slice), `hybrid` is dropped from canon; (2) goal's free-text owner is **replaced** by a unit reference (no coexistence); (3) milestone scope = this canon slice + one backend slice (prompt #41, separate pass) — UI is the next milestone.
> **Model/mode:** Sonnet, effort medium — docs-only pass, no code.
> **Canon:** `Management_Model.md` §2 (юнит в потоке управления), §6 table «Юнит», §7.1 q4 (definiteness needs «владелец»); PRD §28 (единая рабочая сила); ADR-0002 (definiteness); `docs/adr/0000-template.md`; `docs/full-vision/AGENTS.md` (doc-editing rules).
> **Precondition:** the owner works in parallel — do NOT assume a fixed main SHA. **Step 0 — preflight:** `git status` + `git log origin/main..HEAD`, pull fresh `main`; untangle anything dirty deliberately before branching.

## Scope

**Do:**

1. **`docs/adr/0006-unit-entity-and-goal-ownership.md`** (Russian, per 0000-template), fixing:
   - **Unit = Entity subtype** — `entity` row + `unit` table with `entity_id` PK+FK, same pattern as `Goal`/`Kpi`/`Decision` (Management_Model §6: no data models outside Entity Platform).
   - **`unit.kind ∈ {employee, agent, external, device}`** — atomic executors only. RU labels for future UI: сотрудник / агент / вне контура / устройство. `team`/`dept` are a future *grouping* of units (separate ADR + slice, goes to BACKLOG); `hybrid` from the `OsUnit` prototype is dropped. Note explicitly: this *operationalizes* PRD §28 (which lists teams/departments/multi-agent teams) the same way Management_Model §5 operationalizes PRD §37 — PRD itself is not edited.
   - **Goal ownership: replace, not coexist.** New `goal.unit_id` (nullable FK → `unit.entity_id`); the Goal API stops exposing free-text `owner`. Definiteness (ADR-0002 q4) criterion «владелец» becomes «назначен юнит»: `compute_definiteness` reads `unit_id` presence instead of `entity.owner` text.
   - **`entity.owner` stays a platform base field** (other subtypes — Decision, Kpi — still carry it); goals simply stop using it. Historic values are left untouched in the DB.
   - **One-time data migration (executed in slice 2):** for each distinct non-empty `entity.owner` among goals, create a `Unit(kind=employee, name=<text>)` and set `unit_id` on those goals — no data loss, and no ongoing text hacks (key decision of 2026-07-16 stands: no text matching after this migration).
   - **Open questions (leave open, don't guess):** unit lifecycle (PRD §31), grouping model for team/dept, unit workspace, permissions/access of units, unit-as-resource linkage (`OsResource.load`, Management_Model §3.2).
2. **`Management_Model.md` edits (surgical, not a rewrite):**
   - §2: item 3 and the mermaid node «Юнит — человек или ИИ» → reflect the four kinds; update the `OsUnit` prototype note (line «kind: human | digital | hybrid | team | dept») to state the prototype enum is superseded by ADR-0006.
   - §6 table: row «Юнит» → `Employee / Agent / External / Device` with a note «группы (Team/Department) — будущая надстройка, ADR-0006»; row «Ролевой ярлык владельца» — add a pointer that goal ownership is now `unit_id` (ADR-0006).
   - §7.1 q4: annotate that «владелец» = назначенный юнит since ADR-0006 (do not rewrite the resolved question).
3. **`BACKLOG.md`:** close the line «Юнит-сущность для назначения владельца цели» (canon done, backend = prompt #41); add follow-ups: unit grouping (team/dept) ADR+slice; unit UI milestone (list, assignment from popup); unit-as-resource linkage.

**Don't (deliberately):**

- No code, no migrations, no schema/service/route changes — that is slice 2 (prompt #41, separate pass after this PR is merged and verified).
- No PRD edits (divergence is recorded in the ADR as operationalization, per §5 precedent).
- No frontend changes; the popup's «отв. …» line is untouched until slice 2 dictates the API shape.
- No renumbering or restructuring of Management_Model sections.

## Constraints

- Docs in `docs/**` are Russian; commit message English (Conventional Commits).
- **spec-guardian review is mandatory** (canon pass — CLAUDE.md delegation rules).
- Token economy: read only the referenced sections, not whole documents.
- PowerShell 5.1 — one command at a time. After merge — `git push origin main`.

## Definition of Done

- [ ] `docs/adr/0006-unit-entity-and-goal-ownership.md` exists, status «Принято», covers all decisions and open questions above; `docs/adr/README.md` index updated if one is maintained there.
- [ ] Management_Model §2/§6/§7.1 edits in place, nothing else touched; spec-guardian pass clean.
- [ ] `docs/DEVLOG.md` entry; `BACKLOG.md` updated per Scope item 3.
- [ ] One commit on `docs/unit-entity-canon`, PR merged into `main`, pushed, clean tree; prompt file committed to `prompts/_done/`; `prompts/README.md` updated.
- [ ] Report back — do NOT start the backend slice without prompt #41.

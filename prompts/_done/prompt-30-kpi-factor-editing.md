# Prompt #30: Step F5 — manage composite KPI factors from the goal canvas
### `feat/frontend-kpi-factor-editing`, `feat: manage composite KPI factors from goal canvas`

> **For:** Claude Code. Close the F4 TODO: on the goal canvas (prompt #23) composite factors are read-only dashed edges; this slice adds create/delete of factors from the UI. Backend is NOT touched — `POST/GET/DELETE /kpi-factors` exist since Step 3b (`backend/app/api/v1/kpi_factors.py`); verify the routes before starting.
> **Model/mode:** Sonnet, normal mode (guardrails in `.claude/settings.json` — do not touch).
> **Canon:** `Management_Model.md` §9.12 (composite KPI = KPI without own target, value from weighted factors); ADR-0004 R4 + open question #2 (weight normalization — still OPEN, do not invent any normalization or unit logic); `Visual_Reference.md` Part II tokens only.
> **Precondition:** main at PR #10 (`2a16917`) or later, clean tree. Step 0 — preflight: `git status` + `git log origin/main..HEAD`; anything dirty/unpushed — surface and untangle deliberately, no blind merges.

## Scope

**Do:**
1. **API client** (`frontend/src/api.ts`, `frontend/src/types.ts`): add `KpiFactorCreate` type (mirror of `backend/app/schemas/kpi_factor.py`: `composite_kpi_id`, `factor_kpi_id`, `weight`) and two functions next to `listKpiFactors`:
   - `createKpiFactor(payload)` → `POST /kpi-factors`
   - `deleteKpiFactor(id)` → `DELETE /kpi-factors/{id}`
2. **Create a factor** (`frontend/src/os/GoalCanvas.tsx`): clicking an own-KPI node currently opens the link popover directly (`openLink`). Insert an action-chooser step: «связать KPI…» (existing flow, unchanged after the choice) / «добавить фактор…» (new flow). Factor flow mirrors the link draft pattern (`LinkDraft` → goal list → KPI list), plus a weight step:
   - candidate list = KPIs of the chosen goal with `target != null`, excluding the source KPI itself (backend rejects target-less factors with 400 `FactorNotMeasurableError` and self-factors with 400 — the filter is UX, the 400 handler stays as backstop);
   - weight — required numeric input (any float, raw `Σ weight × target`, no normalization — ADR-0004 open question #2 stays open); confirm → `POST` → full canvas reload (no optimism, as in F3/F4) → close popover;
   - Russian errors: 409 → «Такой фактор уже добавлен», 400 → «Нельзя добавить фактор: KPI должен иметь числовой таргет»;
   - `Escape` closes the factor draft first, then falls through to existing behavior.
3. **Delete a factor:** dashed factor edge gets a hit-path (same pattern as `gc-edge-hit` on link edges): `role="button"`, `aria-label`, Enter; click → `window.confirm('Убрать фактор «<name>» (вес ×<weight>)?')` → `DELETE` → reload. Note: after deleting the LAST factor of a target-less KPI, `computed_value` becomes null and the goal may flip to fog — that is correct §9.12 behavior, verify it in DoD, don't "fix" it.
4. Data plumbing: `fetchCanvasData` detects composites via `computed_value != null` — after a mutation + reload a newly composite KPI picks up its dashed edges automatically; no change needed unless testing proves otherwise (if it does, note the fix in the commit body, still frontend-only).

**Don't (deliberately):**
- Backend untouched — no new routes, no schema/service changes, no migrations.
- No weight EDITING on existing factors (delete + re-add covers it; a PATCH route doesn't exist — do not add one). Note it as a possible future line in BACKLOG only if you find it painful in testing.
- No normalization/unit reconciliation of weights (ADR-0004 open question #2).
- General goal map: factors/links still not drawn there.
- `RealGoalCard.tsx` factor UI — no; canvas only.

## Constraints
- UI text Russian; existing v2 tokens/classes only (new classes in the style of `gc-*`; divergences → "Открытые вопросы" of Part II).
- Accessibility as in F4: focus outlines, Enter activation, reduced-motion respected.
- PowerShell 5.1 — one command at a time; in venv only `python -m X`. After merge — `git push origin main`.

## Definition of Done
- [ ] `cd frontend`: `npm run build`, `npm run lint` — green; `cd backend`: pytest, ruff check, ruff format --check, `python -m mypy app` — green (control, nothing should change there).
- [ ] Playwright pass (seeded DB): open canvas → KPI popover offers both actions; add factor (KPI without target ← KPI with target from another goal, weight e.g. 0.4) → dashed edge with «×0.4» appears, KPI shows computed value; duplicate add → «Такой фактор уже добавлен»; delete the factor → edge gone, target-less KPI loses computed value (goal may flip to fog — expected); link flow still works unchanged.
- [ ] `docs/DEVLOG.md` — entry; `BACKLOG.md` — F5 line («Управление факторами композитного KPI из UI») → `[x]` with branch reference.
- [ ] One commit on `feat/frontend-kpi-factor-editing`, PR merged into `main`, pushed, clean tree (`git status` empty, origin synced).
- [ ] This prompt file committed to `prompts/_done/` as part of the same PR; `prompts/README.md` table updated.

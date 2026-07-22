// Карточка цели — попап поверх карты (Ф7a, промпт №35), для реальных данных
// (Goal API). Заменяет отдельную страницу RealGoalCard.tsx: то же самое
// инлайн-редактирование (F3-паттерн: клик → ввод, Enter/blur → PATCH, Escape →
// отмена), без оптимистичных обновлений — после мутации всегда перезапрашиваем
// цель И карту (listGoals), чтобы имя/тон/бэклог узла не разъезжались с попапом.
// Декомпозиция (+подцель/изменить родителя) сюда не перенесена — она уходит
// вместе со страницей до появления edge-affordances на карте (слайс B).

import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { ApiError, createGoal, getGoal, listGoals, listUnitGroups, listUnits, patchGoal } from '../api'
import type { GoalKpiRead, GoalPatch, GoalRead, UnitGroupRead, UnitRead } from '../types'
import { deleteGoalWithCascadeConfirm, kpiValue, unitNameOrDash } from './goalFormat'
import { KpiFieldsRow } from './KpiFieldsRow'
import type { KpiFieldsValue } from './KpiFieldsRow'
import { OwnerPicker } from './OwnerPicker'
import { ParentPicker } from './ParentPicker'

type Status = 'loading' | 'ready' | 'notfound' | 'error'

// Слайс 38: попап создания — та же карточка, пустая, до коммита имени цель не
// существует в БД. «edit» — обычный режим (goalId уже есть). «create» — «+» на
// узле (parentId — новый родитель). «insert-between» — «+» на ребре P→C: после
// имени идут ДВЕ мутации (createGoal под P, затем patchGoal(C, {parent_id: N})) —
// честная обработка отказа второго шага описана в commitCreate ниже.
export type GoalPopupMode =
  | { kind: 'edit'; goalId: string }
  | { kind: 'create'; parentId: string | null }
  | { kind: 'insert-between'; parentId: string; childId: string }

interface BranchStyle {
  hex: string
  bg: string
  bd: string
  fg: string
}

const QUADRANTS = [
  { key: 'do', title: 'важно · срочно', label: 'делать' },
  { key: 'plan', title: 'важно · несрочно', label: 'планировать' },
  { key: 'delegate', title: 'неважно · срочно', label: 'делегировать' },
  { key: 'drop', title: 'неважно · несрочно', label: 'отложить' },
] as const

export function GoalPopup({
  mode,
  branch,
  onClose,
  onOpenCanvas,
  onChanged,
}: {
  mode: GoalPopupMode
  branch: BranchStyle
  onClose: () => void
  onOpenCanvas: (goalId: string) => void
  onChanged: () => void
}) {
  // в create/insert-between цель ещё не существует — goalId появляется только
  // после успешного createGoal, дальше попап ведёт себя как обычный edit
  const [createdGoalId, setCreatedGoalId] = useState<string | null>(null)
  const goalId = mode.kind === 'edit' ? mode.goalId : createdGoalId

  const [goal, setGoal] = useState<GoalRead | null>(null)
  const [status, setStatus] = useState<Status>(goalId ? 'loading' : 'ready')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  // попап может размонтироваться посреди createGoal/patchGoal (Esc/backdrop
  // не блокируют закрытие на время запроса) — гасим setState после unmount.
  // true выставляется и в самом эффекте (не только при объявлении ref) —
  // иначе StrictMode (mount → unmount → remount в dev) гасит его навсегда.
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const [editingField, setEditingField] = useState<'name' | 'description' | null>(null)
  const [fieldDraft, setFieldDraft] = useState('')
  const skipFieldBlur = useRef(false)
  // create/insert-between: ✕/Escape/backdrop до коммита имени должны закрыть
  // попап без запроса — этот флаг гасит commitCreate, который иначе успел бы
  // сработать по blur имени раньше onClose (промпт №38a, п.1)
  const skipCreateBlur = useRef(false)

  const [editingKpiId, setEditingKpiId] = useState<string | null>(null)
  const [kpiDraft, setKpiDraft] = useState<KpiFieldsValue | null>(null)

  const [parentName, setParentName] = useState<string | null>(null)
  const [parentPickerOpen, setParentPickerOpen] = useState(false)
  const [parentOptions, setParentOptions] = useState<GoalRead[] | null>(null)
  const [parentOptionsError, setParentOptionsError] = useState(false)

  const [ownerPickerOpen, setOwnerPickerOpen] = useState(false)
  const [ownerUnits, setOwnerUnits] = useState<UnitRead[] | null>(null)
  const [ownerGroups, setOwnerGroups] = useState<UnitGroupRead[] | null>(null)
  const [ownerOptionsError, setOwnerOptionsError] = useState(false)

  // создание: имя ещё не закоммичено — карточка пустая, поле имени в фокусе
  const [nameDraft, setNameDraft] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [insertNote, setInsertNote] = useState<string | null>(null)
  const creatingMode = mode.kind !== 'edit' && !goalId

  useEffect(() => {
    if (!goalId) return
    let cancelled = false
    setStatus('loading')
    setGoal(null)
    setEditingField(null)
    setEditingKpiId(null)
    setKpiDraft(null)
    setActionError(null)
    setParentName(null)
    setParentPickerOpen(false)
    setParentOptions(null)
    setOwnerPickerOpen(false)
    setOwnerUnits(null)
    setOwnerGroups(null)

    getGoal(goalId)
      .then((g) => {
        if (cancelled) return
        setGoal(g)
        setStatus('ready')
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setStatus(err instanceof ApiError && err.status === 404 ? 'notfound' : 'error')
      })

    return () => {
      cancelled = true
    }
  }, [goalId])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (parentPickerOpen) {
        setParentPickerOpen(false)
        return
      }
      if (ownerPickerOpen) {
        setOwnerPickerOpen(false)
        return
      }
      if (creatingMode) skipCreateBlur.current = true
      onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, parentPickerOpen, ownerPickerOpen, creatingMode])

  useEffect(() => {
    if (!goal?.parent_id) {
      setParentName(null)
      return
    }
    let cancelled = false
    getGoal(goal.parent_id)
      .then((p) => {
        if (!cancelled) setParentName(p.name)
      })
      .catch(() => {
        if (!cancelled) setParentName(null)
      })
    return () => {
      cancelled = true
    }
  }, [goal?.parent_id])

  const reload = async () => {
    if (!goalId) return
    const fresh = await getGoal(goalId)
    setGoal(fresh)
  }

  // единая точка PATCH для всех правок попапа: без оптимизма — ждём ответ,
  // затем перезапрашиваем и цель, и карту (список), чтобы узел не отстал.
  // goalId уже существует к моменту вызова (правки доступны только status
  // === 'ready', т.е. после создания в create/insert-between режимах).
  const saveField = async (patch: GoalPatch) => {
    if (!goalId) return
    setBusy(true)
    setActionError(null)
    try {
      await patchGoal(goalId, patch)
      await reload()
      onChanged()
    } catch (err) {
      setActionError(
        err instanceof ApiError && err.status === 409 ? 'Нельзя: цикл в дереве' : 'Не удалось сохранить изменения',
      )
    } finally {
      setBusy(false)
    }
  }

  /* ── правка имени/описания ───────────────────────────────────────────── */

  const startField = (field: 'name' | 'description', current: string) => {
    setFieldDraft(current)
    setEditingField(field)
  }
  const commitField = () => {
    if (!goal || !editingField) return
    const field = editingField
    const value = fieldDraft
    setEditingField(null)
    if (field === 'name') {
      const name = value.trim()
      if (name && name !== goal.name) void saveField({ name })
    } else if (field === 'description') {
      if (value !== (goal.description ?? '')) void saveField({ description: value })
    }
  }
  const fieldKeyDown = (e: ReactKeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      skipFieldBlur.current = true
      setEditingField(null)
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      skipFieldBlur.current = true
      commitField()
    }
  }
  const fieldBlur = () => {
    if (skipFieldBlur.current) {
      skipFieldBlur.current = false
      return
    }
    commitField()
  }

  /* ── правка родителя (пикер-облачко D9, список — исключая себя) ─────── */

  const openParentPicker = () => {
    setParentPickerOpen(true)
    setParentOptions(null)
    setParentOptionsError(false)
    listGoals()
      .then((all) => setParentOptions(all.filter((g) => g.id !== goalId)))
      .catch(() => setParentOptionsError(true))
  }
  const closeParentPicker = () => setParentPickerOpen(false)
  const chooseParent = (parentId: string | null) => {
    setParentPickerOpen(false)
    void saveField({ parent_id: parentId })
  }

  /* ── правка владельца (юнит или группа, пикер-облачко D9 с поиском) ──── */

  const openOwnerPicker = () => {
    setOwnerPickerOpen(true)
    setOwnerUnits(null)
    setOwnerGroups(null)
    setOwnerOptionsError(false)
    Promise.all([listUnits(), listUnitGroups()])
      .then(([units, groups]) => {
        setOwnerUnits(units)
        setOwnerGroups(groups)
      })
      .catch(() => setOwnerOptionsError(true))
  }
  const closeOwnerPicker = () => setOwnerPickerOpen(false)
  const chooseOwner = (unitId: string | null) => {
    setOwnerPickerOpen(false)
    void saveField({ unit_id: unitId })
  }

  /* ── правка KPI (diff-sync по id — существующие id не терять) ───────── */

  const kpisToWrite = (kpis: GoalKpiRead[]) => kpis.map((k) => ({ id: k.id, name: k.name, target: k.target, unit: k.unit }))

  const startEditKpi = (k: GoalKpiRead) => {
    if (!k.id || k.computed_value != null) return
    setKpiDraft(null)
    setEditingKpiId(k.id)
    setKpiDraft({ name: k.name, target: k.target != null ? String(k.target) : '', unit: k.unit })
  }
  const cancelKpiEdit = () => {
    setEditingKpiId(null)
    setKpiDraft(null)
  }
  const commitKpiEdit = () => {
    if (!goal || !editingKpiId || !kpiDraft) return
    const name = kpiDraft.name.trim()
    if (!name) {
      cancelKpiEdit()
      return
    }
    const targetRaw = kpiDraft.target.trim()
    const target = targetRaw === '' ? null : Number(targetRaw)
    const kpis = kpisToWrite(goal.kpis).map((k) =>
      k.id === editingKpiId ? { id: k.id, name, target: target !== null && Number.isNaN(target) ? null : target, unit: kpiDraft.unit.trim() } : k,
    )
    cancelKpiEdit()
    void saveField({ kpis })
  }

  const startAddKpi = () => {
    setEditingKpiId(null)
    setKpiDraft({ name: '', target: '', unit: '' })
  }
  const cancelAddKpi = () => setKpiDraft(null)
  const commitAddKpi = () => {
    if (!goal || !kpiDraft) return
    const name = kpiDraft.name.trim()
    if (!name) {
      cancelAddKpi()
      return
    }
    const targetRaw = kpiDraft.target.trim()
    const target = targetRaw === '' ? null : Number(targetRaw)
    const kpis = [
      ...kpisToWrite(goal.kpis),
      { id: null, name, target: target !== null && Number.isNaN(target) ? null : target, unit: kpiDraft.unit.trim() },
    ]
    setKpiDraft(null)
    void saveField({ kpis })
  }

  const removeKpi = (kpiId: string) => {
    if (!goal) return
    void saveField({ kpis: kpisToWrite(goal.kpis).filter((k) => k.id !== kpiId) })
  }

  /* ── создание (Ф38): коммит имени — до этого момента цели нет в БД ───── */

  const commitCreate = () => {
    if (!creatingMode || creating) return
    const name = nameDraft.trim()
    if (!name) {
      onClose()
      return
    }
    setCreating(true)
    setCreateError(null)
    if (mode.kind === 'create') {
      createGoal({ name, parent_id: mode.parentId })
        .then((created) => {
          onChanged()
          if (mountedRef.current) setCreatedGoalId(created.id)
        })
        .catch((err: unknown) => {
          if (!mountedRef.current) return
          setCreating(false)
          setCreateError(err instanceof ApiError ? 'Не удалось создать цель' : 'Нет связи с сервером')
        })
    } else if (mode.kind === 'insert-between') {
      const { parentId, childId } = mode
      createGoal({ name, parent_id: parentId })
        .then((created) =>
          patchGoal(childId, { parent_id: created.id })
            .then(() => {
              onChanged()
              if (mountedRef.current) setCreatedGoalId(created.id)
            })
            .catch(() =>
              // честно: N уже создан под P, но перенос C не удался — не откатываем
              // и не притворяемся, что вставка завершена (см. промпт №38, п.7)
              getGoal(childId)
                .then((c) => c.name)
                .catch(() => childId)
                .then((childName) => {
                  onChanged()
                  if (!mountedRef.current) return
                  setInsertNote(`Цель создана, но перенос ветки не удался — привяжите «${childName}» вручную`)
                  setCreatedGoalId(created.id)
                }),
            ),
        )
        .catch((err: unknown) => {
          if (!mountedRef.current) return
          setCreating(false)
          setCreateError(err instanceof ApiError ? 'Не удалось создать цель' : 'Нет связи с сервером')
        })
    }
  }

  /* ── бэклог (активна/пауза) ───────────────────────────────────────────── */

  const setBacklog = (value: boolean) => {
    if (!goal || goal.is_backlog === value || busy) return
    void saveField({ is_backlog: value })
  }

  /* ── удаление ─────────────────────────────────────────────────────────── */

  const handleDelete = async () => {
    if (!goal || busy) return
    setBusy(true)
    setActionError(null)
    const result = await deleteGoalWithCascadeConfirm(goal)
    if (!mountedRef.current) return
    if (result === 'deleted') {
      onChanged()
      onClose()
      return
    }
    if (result === 'error') setActionError('Не удалось удалить цель')
    setBusy(false)
  }

  return (
    <div className="ov gpop">
      <div
        className="ov-bg"
        onMouseDown={() => {
          if (creatingMode) skipCreateBlur.current = true
        }}
        onClick={onClose}
      />
      <div className="ov-orb">
        <svg width="150" height="150" viewBox="0 0 28 28">
          <path d="M14 2 L25 8.5 V21.5 L14 28 L3 21.5 V8.5 Z" fill="none" stroke={branch.hex} strokeWidth="1.2" />
        </svg>
        <div className="ov-name" style={{ borderColor: branch.bd, color: branch.fg }}>
          {status === 'ready' && goal ? goal.name : 'Цель'}
        </div>
      </div>

      <div className="gpop-col">
        <div className="gpop-bub gpop-hd" style={{ borderColor: branch.bd }}>
          <span className="cap">КАРТОЧКА ЦЕЛИ</span>
          {creatingMode && (
            <span className="gpop-icons">
              <span className="bdg b-sec">ТУМАН</span>
              <button className="gpop-ic" title="активна — недоступно до создания" aria-label="активна — недоступно до создания" disabled>
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path d="M6 4 L20 12 L6 20 Z" fill="currentColor" />
                </svg>
              </button>
              <button className="gpop-ic" title="пауза — недоступно до создания" aria-label="пауза — недоступно до создания" disabled>
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <rect x="6" y="4" width="4" height="16" fill="currentColor" />
                  <rect x="14" y="4" width="4" height="16" fill="currentColor" />
                </svg>
              </button>
              <button className="gpop-ic" title="назначить процесс — скоро" aria-label="Назначить процесс — скоро" disabled>
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M12 8 V12 L15 14" fill="none" stroke="currentColor" strokeWidth="1.6" />
                </svg>
              </button>
              <button className="gpop-ic" title="удалить — недоступно до создания" aria-label="удалить — недоступно до создания" disabled>
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path d="M5 7 H19 M9 7 V5 H15 V7 M7 7 L8 20 H16 L17 7" fill="none" stroke="currentColor" strokeWidth="1.6" />
                </svg>
              </button>
              <button
                className="gpop-ic"
                title="закрыть"
                aria-label="Закрыть карточку"
                onMouseDown={() => {
                  // mousedown бьёт раньше blur имени — иначе commitCreate
                  // успевает сработать до того, как onClick поставит флаг
                  skipCreateBlur.current = true
                }}
                onClick={onClose}
              >
                ✕
              </button>
            </span>
          )}
          {status === 'ready' && goal && (
            <span className="gpop-icons">
              <span className={`bdg ${goal.definiteness === 'fog' ? 'b-sec' : 'b-act'}`}>
                {goal.definiteness === 'fog' ? 'ТУМАН' : 'ОПРЕДЕЛЕНА'}
              </span>
              <span className={`bdg gpop-risk gpop-risk-${goal.risk_level}`}>
                риск: {goal.risk_level === 'low' ? 'низкий' : goal.risk_level === 'medium' ? 'средний' : 'высокий'}
              </span>
              <button
                className={`gpop-ic${!goal.is_backlog ? ' on' : ''}`}
                title="активна"
                aria-label="Сделать цель активной"
                disabled={busy}
                onClick={() => setBacklog(false)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path d="M6 4 L20 12 L6 20 Z" fill="currentColor" />
                </svg>
              </button>
              <button
                className={`gpop-ic${goal.is_backlog ? ' on' : ''}`}
                title="пауза"
                aria-label="Поставить цель на паузу"
                disabled={busy}
                onClick={() => setBacklog(true)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <rect x="6" y="4" width="4" height="16" fill="currentColor" />
                  <rect x="14" y="4" width="4" height="16" fill="currentColor" />
                </svg>
              </button>
              <button className="gpop-ic" title="назначить процесс — скоро" aria-label="Назначить процесс — скоро" disabled>
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M12 8 V12 L15 14" fill="none" stroke="currentColor" strokeWidth="1.6" />
                </svg>
              </button>
              <button
                className="gpop-ic"
                title="канвас постановки"
                aria-label="Открыть канвас постановки цели"
                onClick={() => onOpenCanvas(goal.id)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <circle cx="5" cy="6" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.6" />
                  <circle cx="19" cy="6" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.6" />
                  <circle cx="12" cy="19" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M7 7 L11 17 M17 7 L13 17" stroke="currentColor" strokeWidth="1.6" />
                </svg>
              </button>
              <button
                className="gpop-ic gpop-ic-danger"
                title="удалить"
                aria-label="Удалить цель"
                disabled={busy}
                onClick={handleDelete}
              >
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path d="M5 7 H19 M9 7 V5 H15 V7 M7 7 L8 20 H16 L17 7" fill="none" stroke="currentColor" strokeWidth="1.6" />
                </svg>
              </button>
              <button className="gpop-ic" title="закрыть" aria-label="Закрыть карточку" onClick={onClose}>
                ✕
              </button>
            </span>
          )}
          {status !== 'ready' && (
            <button className="gpop-ic" title="закрыть" aria-label="Закрыть карточку" onClick={onClose}>
              ✕
            </button>
          )}
        </div>

        {creatingMode && (
          <>
            <div className="gpop-bub gpop-chars" style={{ borderColor: branch.bd }}>
              <input
                className="edit big"
                aria-label="Название цели"
                placeholder="название цели…"
                autoFocus
                disabled={creating}
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    commitCreate()
                  } else if (e.key === 'Escape') {
                    skipCreateBlur.current = true
                  }
                }}
                onBlur={() => {
                  if (skipCreateBlur.current) {
                    skipCreateBlur.current = false
                    return
                  }
                  commitCreate()
                }}
              />
              <div className="s gpop-dashed" aria-hidden="true">
                без описания — нажмите, чтобы добавить
              </div>
              <div className="s">
                отв. <span className="gpop-dashed" aria-hidden="true">—</span>
              </div>
              <div className="s gpop-parent-row">родитель: <span className="gpop-dashed" aria-hidden="true">—</span></div>
            </div>

            <div className="gpop-bub" style={{ borderColor: branch.bd }}>
              <div className="cap">KPI ЦЕЛИ · 0 ШТ.</div>
              <div className="rc rc2">
                <button className="radd" disabled>
                  + добавить KPI
                </button>
              </div>
            </div>

            {createError && (
              <div className="gpop-bub" style={{ borderColor: branch.bd, color: 'var(--rk)' }}>
                {createError}
              </div>
            )}

            <div className="gpop-ft">Esc / клик мимо — закрыть · Enter — создать</div>
          </>
        )}

        {status !== 'ready' && !creatingMode && (
          <div className="gpop-bub" style={{ borderColor: branch.bd, color: 'var(--i55)' }}>
            {status === 'loading' && 'Загрузка…'}
            {status === 'notfound' && 'Цель не найдена — возможно, её удалили.'}
            {status === 'error' && 'Не удалось загрузить цель'}
          </div>
        )}

        {status === 'ready' && goal && (
          <>
            <div className="gpop-bub gpop-chars" style={{ borderColor: branch.bd }}>
              {editingField === 'name' ? (
                <input
                  className="edit big"
                  aria-label="Название цели"
                  autoFocus
                  disabled={busy}
                  value={fieldDraft}
                  onChange={(e) => setFieldDraft(e.target.value)}
                  onKeyDown={fieldKeyDown}
                  onBlur={fieldBlur}
                />
              ) : (
                <h1
                  role="button"
                  tabIndex={0}
                  className="gpop-name"
                  onClick={() => startField('name', goal.name)}
                  onKeyDown={(e) => e.key === 'Enter' && startField('name', goal.name)}
                  aria-label="Изменить название цели"
                >
                  {goal.name}
                </h1>
              )}

              {editingField === 'description' ? (
                <input
                  className="edit mono"
                  aria-label="Описание цели"
                  autoFocus
                  disabled={busy}
                  placeholder="описание…"
                  value={fieldDraft}
                  onChange={(e) => setFieldDraft(e.target.value)}
                  onKeyDown={fieldKeyDown}
                  onBlur={fieldBlur}
                />
              ) : (
                <div
                  className="s gpop-dashed"
                  role="button"
                  tabIndex={0}
                  onClick={() => startField('description', goal.description ?? '')}
                  onKeyDown={(e) => e.key === 'Enter' && startField('description', goal.description ?? '')}
                  aria-label="Изменить описание цели"
                >
                  {goal.description || 'без описания — нажмите, чтобы добавить'}
                </div>
              )}

              <div className="s gpop-parent-row">
                отв.{' '}
                <span
                  role="button"
                  tabIndex={0}
                  className="gpop-dashed"
                  title="без юнита цель в тумане"
                  onClick={() => (ownerPickerOpen ? closeOwnerPicker() : openOwnerPicker())}
                  onKeyDown={(e) => e.key === 'Enter' && (ownerPickerOpen ? closeOwnerPicker() : openOwnerPicker())}
                  aria-label="Изменить владельца цели"
                >
                  {unitNameOrDash(goal.unit_name)}
                </span>
                {ownerPickerOpen && (
                  <OwnerPicker
                    units={ownerUnits}
                    groups={ownerGroups}
                    error={ownerOptionsError}
                    borderColor={branch.bd}
                    onChoose={chooseOwner}
                    onClose={closeOwnerPicker}
                  />
                )}
              </div>

              <div className="s gpop-parent-row">
                родитель:{' '}
                <span
                  role="button"
                  tabIndex={0}
                  className="gpop-dashed"
                  onClick={() => (parentPickerOpen ? closeParentPicker() : openParentPicker())}
                  onKeyDown={(e) => e.key === 'Enter' && (parentPickerOpen ? closeParentPicker() : openParentPicker())}
                  aria-label="Изменить родителя цели"
                >
                  {parentName ?? '—'}
                </span>
                {parentPickerOpen && (
                  <ParentPicker
                    options={parentOptions}
                    error={parentOptionsError}
                    borderColor={branch.bd}
                    onChoose={chooseParent}
                    onClose={closeParentPicker}
                  />
                )}
              </div>
            </div>

            <div className="gpop-bub" style={{ borderColor: branch.bd }}>
              <div className="cap">KPI ЦЕЛИ · {goal.kpis.length} ШТ.</div>
              <div className="rc rc2">
                {goal.kpis.map((k) => {
                  const composite = k.computed_value != null
                  if (editingKpiId === k.id && k.id && kpiDraft) {
                    return (
                      <KpiFieldsRow
                        key={k.id}
                        value={kpiDraft}
                        onChange={setKpiDraft}
                        onCommit={commitKpiEdit}
                        onCancel={cancelKpiEdit}
                        disabled={busy}
                      />
                    )
                  }
                  const editable = !composite && !!k.id
                  return (
                    <div
                      key={k.id ?? k.name}
                      className="rrow"
                      role={editable ? 'button' : undefined}
                      tabIndex={editable ? 0 : undefined}
                      style={{ cursor: editable ? 'pointer' : 'default' }}
                      onClick={editable ? () => startEditKpi(k) : undefined}
                      onKeyDown={editable ? (e) => e.key === 'Enter' && startEditKpi(k) : undefined}
                      aria-label={editable ? `Изменить KPI ${k.name}` : undefined}
                    >
                      <span className="rname" style={{ flex: 1 }}>
                        {k.name}
                      </span>
                      <span className="rkind">{composite ? 'РАСЧЁТ' : 'ПЛАН'}</span>
                      <span className="rcost">{kpiValue(k)}</span>
                      {k.id && !composite && (
                        <button
                          className="rdel"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeKpi(k.id!)
                          }}
                          aria-label={`Удалить KPI ${k.name}`}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  )
                })}
                {!goal.kpis.length && <div className="note">KPI не заданы</div>}

                {kpiDraft && editingKpiId === null ? (
                  <KpiFieldsRow
                    value={kpiDraft}
                    onChange={setKpiDraft}
                    onCommit={commitAddKpi}
                    onCancel={cancelAddKpi}
                    disabled={busy}
                  />
                ) : (
                  <button className="radd" onClick={startAddKpi} disabled={busy}>
                    + добавить KPI
                  </button>
                )}
              </div>
            </div>

            <div className="gpop-bub" style={{ borderColor: branch.bd }}>
              <div className="cap">СРОК</div>
              <div className="rrow gpop-stub" title="появится позже">
                <svg width="14" height="14" viewBox="0 0 24 24" style={{ marginRight: 8 }}>
                  <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeDasharray="3 3" />
                  <path d="M12 8 V12 L15 14" fill="none" stroke="currentColor" strokeWidth="1.6" />
                </svg>
                не задан
              </div>
            </div>

            <div className="gpop-bub" style={{ borderColor: branch.bd }}>
              <div className="cap">ВАЖНОСТЬ · СРОЧНОСТЬ</div>
              <div className="gpop-quad">
                {QUADRANTS.map((q) => (
                  <div key={q.key} className="gpop-qtile" title={q.title}>
                    <div className="gpop-qtitle">{q.title}</div>
                    <div className="gpop-qlabel">{q.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {insertNote && (
              <div className="gpop-bub" style={{ borderColor: branch.bd, color: 'var(--op)' }}>
                {insertNote}
              </div>
            )}

            {actionError && (
              <div className="gpop-bub" style={{ borderColor: branch.bd, color: 'var(--rk)' }}>
                {actionError}
              </div>
            )}

            <div className="gpop-ft">Esc / клик мимо — закрыть</div>
          </>
        )}
      </div>
    </div>
  )
}

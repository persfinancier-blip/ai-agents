// Карточка цели — попап поверх карты (Ф7a, промпт №35), для реальных данных
// (Goal API). Заменяет отдельную страницу RealGoalCard.tsx: то же самое
// инлайн-редактирование (F3-паттерн: клик → ввод, Enter/blur → PATCH, Escape →
// отмена), без оптимистичных обновлений — после мутации всегда перезапрашиваем
// цель И карту (listGoals), чтобы имя/тон/бэклог узла не разъезжались с попапом.
// Декомпозиция (+подцель/изменить родителя) сюда не перенесена — она уходит
// вместе со страницей до появления edge-affordances на карте (слайс B).

import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { ApiError, deleteGoal, getGoal, getGoalSubtree, patchGoal } from '../api'
import type { GoalKpiRead, GoalPatch, GoalRead } from '../types'
import { kpiValue, ownerOrDash } from './goalFormat'

type Status = 'loading' | 'ready' | 'notfound' | 'error'

interface BranchStyle {
  hex: string
  bg: string
  bd: string
  fg: string
}

interface KpiFieldsValue {
  name: string
  target: string
  unit: string
}

// та же inline-редактор строка KPI, что была в RealGoalCard.tsx — имя+target+unit,
// Enter/blur вне полей → commit, Escape → cancel без запроса.
function KpiFieldsRow({
  value,
  onChange,
  onCommit,
  onCancel,
  disabled,
}: {
  value: KpiFieldsValue
  onChange: (next: KpiFieldsValue) => void
  onCommit: () => void
  onCancel: () => void
  disabled: boolean
}) {
  const rowRef = useRef<HTMLDivElement>(null)
  const skipBlur = useRef(false)

  const onKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      skipBlur.current = true
      onCancel()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      skipBlur.current = true
      onCommit()
    }
  }
  const onBlur = () => {
    if (skipBlur.current) {
      skipBlur.current = false
      return
    }
    requestAnimationFrame(() => {
      if (rowRef.current && !rowRef.current.contains(document.activeElement)) onCommit()
    })
  }

  return (
    <div className="rrow" ref={rowRef}>
      <input
        className="edit"
        style={{ flex: 1 }}
        aria-label="Название KPI"
        placeholder="название KPI"
        value={value.name}
        disabled={disabled}
        autoFocus
        onChange={(e) => onChange({ ...value, name: e.target.value })}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
      />
      <input
        className="edit"
        style={{ width: 84 }}
        aria-label="Целевое значение KPI"
        placeholder="target"
        inputMode="decimal"
        value={value.target}
        disabled={disabled}
        onChange={(e) => onChange({ ...value, target: e.target.value })}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
      />
      <input
        className="edit"
        style={{ width: 70 }}
        aria-label="Единица измерения KPI"
        placeholder="ед."
        value={value.unit}
        disabled={disabled}
        onChange={(e) => onChange({ ...value, unit: e.target.value })}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
      />
    </div>
  )
}

const QUADRANTS = [
  { key: 'do', title: 'важно · срочно', label: 'делать' },
  { key: 'plan', title: 'важно · несрочно', label: 'планировать' },
  { key: 'delegate', title: 'неважно · срочно', label: 'делегировать' },
  { key: 'drop', title: 'неважно · несрочно', label: 'отложить' },
] as const

export function GoalPopup({
  goalId,
  branch,
  onClose,
  onOpenCanvas,
  onChanged,
}: {
  goalId: string
  branch: BranchStyle
  onClose: () => void
  onOpenCanvas: (goalId: string) => void
  onChanged: () => void
}) {
  const [goal, setGoal] = useState<GoalRead | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const [editingField, setEditingField] = useState<'name' | 'description' | 'owner' | null>(null)
  const [fieldDraft, setFieldDraft] = useState('')
  const skipFieldBlur = useRef(false)

  const [editingKpiId, setEditingKpiId] = useState<string | null>(null)
  const [kpiDraft, setKpiDraft] = useState<KpiFieldsValue | null>(null)

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    setGoal(null)
    setEditingField(null)
    setEditingKpiId(null)
    setKpiDraft(null)
    setActionError(null)

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
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const reload = async () => {
    const fresh = await getGoal(goalId)
    setGoal(fresh)
  }

  // единая точка PATCH для всех правок попапа: без оптимизма — ждём ответ,
  // затем перезапрашиваем и цель, и карту (список), чтобы узел не отстал.
  const saveField = async (patch: GoalPatch) => {
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

  /* ── правка имени/описания/владельца ─────────────────────────────────── */

  const startField = (field: 'name' | 'description' | 'owner', current: string) => {
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
    } else if (field === 'owner') {
      if (value !== goal.owner) void saveField({ owner: value })
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

  /* ── бэклог (активна/пауза) ───────────────────────────────────────────── */

  const setBacklog = (value: boolean) => {
    if (!goal || goal.is_backlog === value || busy) return
    void saveField({ is_backlog: value })
  }

  /* ── удаление ─────────────────────────────────────────────────────────── */

  const handleDelete = async () => {
    if (!goal || busy) return
    if (!window.confirm(`Удалить цель «${goal.name}»?`)) return
    setBusy(true)
    setActionError(null)
    try {
      await deleteGoal(goal.id, false)
      onChanged()
      onClose()
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        let count: number | null = null
        try {
          const subtree = await getGoalSubtree(goal.id)
          count = subtree.length - 1
        } catch {
          count = null
        }
        const question = count != null ? `Удалить со всеми подцелями (${count})?` : 'Удалить со всеми подцелями?'
        if (window.confirm(question)) {
          try {
            await deleteGoal(goal.id, true)
            onChanged()
            onClose()
            return
          } catch {
            setActionError('Не удалось удалить цель')
          }
        }
      } else {
        setActionError('Не удалось удалить цель')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ov gpop">
      <div className="ov-bg" onClick={onClose} />
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

        {status !== 'ready' && (
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

              <div className="s">
                отв.{' '}
                {editingField === 'owner' ? (
                  <input
                    className="edit mono"
                    aria-label="Владелец цели"
                    autoFocus
                    disabled={busy}
                    value={fieldDraft}
                    onChange={(e) => setFieldDraft(e.target.value)}
                    onKeyDown={fieldKeyDown}
                    onBlur={fieldBlur}
                  />
                ) : (
                  <span
                    role="button"
                    tabIndex={0}
                    className="gpop-dashed"
                    onClick={() => startField('owner', goal.owner)}
                    onKeyDown={(e) => e.key === 'Enter' && startField('owner', goal.owner)}
                    title="без владельца цель в тумане"
                    aria-label="Изменить владельца цели"
                  >
                    {ownerOrDash(goal.owner)}
                  </span>
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

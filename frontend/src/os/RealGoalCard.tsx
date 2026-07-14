// Карточка цели на реальных данных (Goal API). Ф2 (промпт №18) — чтение;
// Ф3 (промпт №22) — инлайн-правка/удаление поверх того же экрана: клик по
// значению → ввод, Enter/blur → PATCH, Escape → отмена; без форм-оверлеев,
// без оптимистичных обновлений (после мутации всегда перезапрашиваем цель).
// Ресурсы/юниты и карта процесса — следующие срезы.
// Не путать с демо-GoalCard.tsx (data.ts/goals.ts) — независимый компонент.

import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { ApiError, deleteGoal, getGoal, getGoalSubtree, listGoals, patchGoal } from '../api'
import type { GoalKpiRead, GoalPatch, GoalRead } from '../types'
import { definitenessLabel, kpiValue, lifecycleLabel, ownerOrDash } from './goalFormat'

type Status = 'loading' | 'ready' | 'notfound' | 'error'

interface GoalData {
  goal: GoalRead
  parent: GoalRead | null
  children: GoalRead[]
  descendantCount: number
}

async function fetchGoalData(goalId: string): Promise<GoalData> {
  const [goal, subtree] = await Promise.all([getGoal(goalId), getGoalSubtree(goalId)])
  let parent: GoalRead | null = null
  if (goal.parent_id) {
    try {
      parent = await getGoal(goal.parent_id)
    } catch {
      parent = null
    }
  }
  return {
    goal,
    parent,
    children: subtree.filter((c) => c.id !== goal.id && c.parent_id === goal.id),
    descendantCount: subtree.length - 1,
  }
}

interface KpiFieldsValue {
  name: string
  target: string
  unit: string
}

// Общий инлайн-редактор строки KPI (имя+target+unit) — и для правки существующей
// строки, и для добавления новой. Enter/blur вне всех трёх полей → commit,
// Escape → cancel без запроса (skipBlur гасит commit-на-blur после Escape).
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

export function RealGoalCard({
  path,
  onNavigate,
  onBack,
  onOpenCanvas,
}: {
  path: string[]
  onNavigate: (path: string[]) => void
  onBack: () => void
  onOpenCanvas: () => void
}) {
  const id = path[path.length - 1]

  const [goal, setGoal] = useState<GoalRead | null>(null)
  const [parent, setParent] = useState<GoalRead | null>(null)
  const [children, setChildren] = useState<GoalRead[]>([])
  const [descendantCount, setDescendantCount] = useState(0)
  const [status, setStatus] = useState<Status>('loading')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  // инлайн-правка полей заголовка: какое поле сейчас редактируется + черновик значения
  const [editingField, setEditingField] = useState<'name' | 'description' | 'owner' | null>(null)
  const [fieldDraft, setFieldDraft] = useState('')
  const skipFieldBlur = useRef(false)

  // KPI: id редактируемой строки ('new' — форма добавления) + её черновик
  const [editingKpiId, setEditingKpiId] = useState<string | null>(null)
  const [kpiDraft, setKpiDraft] = useState<KpiFieldsValue | null>(null)

  // родитель: попап-список целей (без поиска — простой список по listGoals)
  const [parentPickerOpen, setParentPickerOpen] = useState(false)
  const [parentOptions, setParentOptions] = useState<GoalRead[] | null>(null)

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    setGoal(null)
    setParent(null)
    setChildren([])
    setEditingField(null)
    setEditingKpiId(null)
    setKpiDraft(null)
    setParentPickerOpen(false)
    setActionError(null)

    fetchGoalData(id)
      .then((data) => {
        if (cancelled) return
        setGoal(data.goal)
        setParent(data.parent)
        setChildren(data.children)
        setDescendantCount(data.descendantCount)
        setStatus('ready')
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setStatus(err instanceof ApiError && err.status === 404 ? 'notfound' : 'error')
      })

    return () => {
      cancelled = true
    }
  }, [id])

  const reload = async () => {
    const data = await fetchGoalData(id)
    setGoal(data.goal)
    setParent(data.parent)
    setChildren(data.children)
    setDescendantCount(data.descendantCount)
  }

  // единая точка PATCH для всех правок карточки: без оптимизма — ждём ответ,
  // затем перезапрашиваем цель целиком (просто и предсказуемо, п. 4 промпта).
  const saveField = async (patch: GoalPatch) => {
    setBusy(true)
    setActionError(null)
    try {
      await patchGoal(id, patch)
      await reload()
    } catch (err) {
      setActionError(
        err instanceof ApiError && err.status === 409 ? 'Нельзя: цикл в дереве' : 'Не удалось сохранить изменения',
      )
    } finally {
      setBusy(false)
    }
  }

  const goTo = (goalId: string) => onNavigate([...path, goalId])

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

  /* ── родитель и бэклог ────────────────────────────────────────────────── */

  const openParentPicker = () => {
    setParentPickerOpen(true)
    setParentOptions(null)
    listGoals()
      .then((all) => setParentOptions(all.filter((g) => g.id !== id)))
      .catch(() => setParentOptions([]))
  }
  const chooseParent = (parentId: string | null) => {
    setParentPickerOpen(false)
    void saveField({ parent_id: parentId })
  }
  const setBacklog = (value: boolean) => {
    if (!goal || goal.is_backlog === value) return
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
      onBack()
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        if (window.confirm(`Удалить со всеми подцелями (${descendantCount})?`)) {
          try {
            await deleteGoal(goal.id, true)
            onBack()
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
    <div className="os-goal">
      <header className="top">
        <span className="crumb">
          <button onClick={onBack}>Карта целей</button>
          {goal && (
            <>
              {' '}
              / <b>{goal.name}</b>
            </>
          )}
        </span>
        {goal && (
          <span className="badges">
            <span className={`bdg ${goal.definiteness === 'fog' ? 'b-sec' : 'b-act'}`}>
              {goal.definiteness === 'fog' ? 'ТУМАН' : 'ОПРЕДЕЛЕНА'}
            </span>
            <span className={`chip lc-${goal.lifecycle_stage}`}>{lifecycleLabel(goal.lifecycle_stage)}</span>
            <button className="bdg b-sec" onClick={onOpenCanvas} aria-label="Открыть канвас постановки цели">
              канвас постановки →
            </button>
          </span>
        )}
      </header>

      <div className="wrap">
        {status !== 'ready' && (
          <div style={{ color: 'var(--i55)', padding: '40px 0' }}>
            {status === 'loading' && 'Загрузка…'}
            {status === 'notfound' && 'Цель не найдена — возможно, её удалили.'}
            {status === 'error' && 'Не удалось загрузить цель'}
          </div>
        )}

        {status === 'ready' && goal && (
          <>
            <div className="hd">
              <div className="ic">
                <svg width="24" height="24" viewBox="0 0 28 28">
                  <path d="M14 4 L23 9.5 V19 L14 24.5 L5 19 V9.5 Z" fill="none" stroke="#e8c04a" strokeWidth="1.6" />
                </svg>
              </div>
              <div>
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
                    onClick={() => startField('name', goal.name)}
                    onKeyDown={(e) => e.key === 'Enter' && startField('name', goal.name)}
                    style={{ cursor: 'pointer' }}
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
                    className="s"
                    role="button"
                    tabIndex={0}
                    onClick={() => startField('description', goal.description ?? '')}
                    onKeyDown={(e) => e.key === 'Enter' && startField('description', goal.description ?? '')}
                    style={{ cursor: 'pointer' }}
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
                      title="без владельца цель в тумане"
                      value={fieldDraft}
                      onChange={(e) => setFieldDraft(e.target.value)}
                      onKeyDown={fieldKeyDown}
                      onBlur={fieldBlur}
                    />
                  ) : (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={() => startField('owner', goal.owner)}
                      onKeyDown={(e) => e.key === 'Enter' && startField('owner', goal.owner)}
                      style={{ cursor: 'pointer' }}
                      title="без владельца цель в тумане"
                      aria-label="Изменить владельца цели"
                    >
                      {ownerOrDash(goal.owner)}
                    </span>
                  )}{' '}
                  · {goal.role_label}
                </div>
              </div>
              <div className="kpis">
                {goal.kpis.map((k) => (
                  <div className="k" key={k.id ?? k.name}>
                    <div className="l">
                      {k.name} · ПЛАН
                    </div>
                    <div className="v">{kpiValue(k)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="sec">
              <div className="cap">KPI ЦЕЛИ</div>
              <div className="res">
                <div className="rc rc2">
                  <div className="t">
                    <span className="l">ПОКАЗАТЕЛИ</span>
                    <span className="st" style={{ color: 'var(--i35)' }}>
                      {goal.kpis.length} шт.
                    </span>
                  </div>

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
                        {/* композитный KPI — из отдельного роута /kpi-factors (ADR-0004), сюда не лезем */}
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
            </div>

            <div className="sec">
              <div className="cap caprow">
                РОДИТЕЛЬ И РАЗМЕЩЕНИЕ
                <span className="rtog">
                  <button className={!goal.is_backlog ? 'on' : ''} onClick={() => setBacklog(false)} disabled={busy}>
                    На карте
                  </button>
                  <button className={goal.is_backlog ? 'on' : ''} onClick={() => setBacklog(true)} disabled={busy}>
                    В бэклоге
                  </button>
                </span>
              </div>
              <div className="res">
                <div className="rc rc2">
                  <div className="t">
                    <span className="l">РОДИТЕЛЬСКАЯ ЦЕЛЬ</span>
                    <span className="st" style={{ color: 'var(--i35)' }}>
                      {parent ? parent.name : 'нет — корневая цель'}
                    </span>
                  </div>
                  <button
                    className="radd"
                    onClick={() => (parentPickerOpen ? setParentPickerOpen(false) : openParentPicker())}
                    disabled={busy}
                  >
                    изменить родителя
                  </button>
                  {parentPickerOpen && (
                    <div className="rpool">
                      <button onClick={() => chooseParent(null)}>
                        <b>Сделать корневой</b>
                      </button>
                      {parentOptions === null && <div className="note">загрузка…</div>}
                      {parentOptions?.map((g) => (
                        <button key={g.id} onClick={() => chooseParent(g.id)}>
                          <b>{g.name}</b>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="sec">
              <div className="cap">СТРУКТУРА — РОДИТЕЛЬ И ПРЯМЫЕ ПОДЦЕЛИ</div>
              <div className="flow">
                {parent && (
                  <div
                    className="wstage"
                    onClick={() => goTo(parent.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && goTo(parent.id)}
                    aria-label={`Перейти к родительской цели: ${parent.name}`}
                  >
                    <div className="num">↑</div>
                    <div>
                      <div className="nm">{parent.name}</div>
                      <div className="dsc">Родительская цель</div>
                    </div>
                    <div className="who">
                      <div className="p">
                        <b>{ownerOrDash(parent.owner)}</b>
                      </div>
                    </div>
                    <div className="due" />
                    <div className="st">{definitenessLabel(parent)}</div>
                  </div>
                )}

                {children.map((c, i) => (
                  <div
                    key={c.id}
                    className="wstage"
                    onClick={() => goTo(c.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && goTo(c.id)}
                    aria-label={`Открыть подцель: ${c.name}`}
                  >
                    <div className="num">{i + 1}</div>
                    <div>
                      <div className="nm">{c.name}</div>
                    </div>
                    <div className="who">
                      <div className="p">
                        <b>{ownerOrDash(c.owner)}</b>
                      </div>
                    </div>
                    <div className="due" />
                    <div className="st">{definitenessLabel(c)}</div>
                  </div>
                ))}

                {!parent && children.length === 0 && (
                  <div className="wstage" style={{ cursor: 'default' }}>
                    <div className="num">—</div>
                    <div>
                      <div className="nm">Нет связанных целей</div>
                      <div className="dsc">Родительской цели нет, подцелей нет — конечный узел дерева.</div>
                    </div>
                    <div className="who" />
                    <div className="due" />
                    <div className="st" />
                  </div>
                )}
              </div>
            </div>

            <div className="sec">
              <button
                className="radd"
                style={{ borderColor: 'rgba(232,84,74,.4)', color: 'var(--rk)' }}
                onClick={handleDelete}
                disabled={busy}
              >
                удалить цель
              </button>
              {actionError && (
                <div className="s" style={{ color: 'var(--rk)', marginTop: 8 }}>
                  {actionError}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

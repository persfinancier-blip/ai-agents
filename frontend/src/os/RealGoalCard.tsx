// Карточка цели на реальных данных (Goal API, промпт №18). Только чтение:
// редактирование, ресурсы/юниты и карта процесса — следующие срезы (см. промпт).
// Не путать с демо-GoalCard.tsx (data.ts/goals.ts) — независимый компонент.

import { useEffect, useState } from 'react'
import { ApiError, getGoal, getGoalSubtree } from '../api'
import type { GoalKpiRead, GoalRead } from '../types'

const LIFECYCLE_LABEL_RU: Record<string, string> = {
  draft: 'Черновик',
  active: 'Активна',
  review: 'На проверке',
  archived: 'Архивирована',
}

const lifecycleLabel = (stage: string): string => (LIFECYCLE_LABEL_RU[stage] ?? stage).toUpperCase()

const ownerOrDash = (owner: string): string => (owner.trim() === '' ? '—' : owner)

const definitenessLabel = (g: GoalRead): string => (g.definiteness === 'fog' ? 'туман' : 'определена')

// Композитный KPI (computed_value) — вычисленное значение важнее target;
// без таргета и без computed_value это и есть туман-кейс (D6, §9 Management_Model).
const kpiValue = (k: GoalKpiRead): string => {
  if (k.computed_value != null) return `${k.computed_value} ${k.unit} · расчёт`
  if (k.target != null) return `${k.target} ${k.unit}`
  return '—'
}

type Status = 'loading' | 'ready' | 'notfound' | 'error'

export function RealGoalCard({
  path,
  onNavigate,
  onBack,
}: {
  path: string[]
  onNavigate: (path: string[]) => void
  onBack: () => void
}) {
  const id = path[path.length - 1]

  const [goal, setGoal] = useState<GoalRead | null>(null)
  const [parent, setParent] = useState<GoalRead | null>(null)
  const [children, setChildren] = useState<GoalRead[]>([])
  const [status, setStatus] = useState<Status>('loading')

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    setGoal(null)
    setParent(null)
    setChildren([])

    Promise.all([getGoal(id), getGoalSubtree(id)])
      .then(async ([g, subtree]) => {
        if (cancelled) return
        setGoal(g)
        setChildren(subtree.filter((c) => c.id !== g.id && c.parent_id === g.id))
        if (g.parent_id) {
          try {
            const p = await getGoal(g.parent_id)
            if (!cancelled) setParent(p)
          } catch {
            if (!cancelled) setParent(null)
          }
        }
        if (!cancelled) setStatus('ready')
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setStatus(err instanceof ApiError && err.status === 404 ? 'notfound' : 'error')
      })

    return () => {
      cancelled = true
    }
  }, [id])

  const goTo = (goalId: string) => onNavigate([...path, goalId])

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
                <h1>{goal.name}</h1>
                {goal.description && <div className="s">{goal.description}</div>}
                <div className="s">
                  отв. {ownerOrDash(goal.owner)} · {goal.role_label}
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
          </>
        )}
      </div>
    </div>
  )
}

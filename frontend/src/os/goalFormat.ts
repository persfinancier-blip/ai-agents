// Общие хелперы форматирования GoalRead/GoalKpiRead — используются и RealGoalCard.tsx
// (Ф2/Ф3), и GoalCanvas.tsx (Ф4, промпт №23). Отдельный модуль без компонентов,
// чтобы не ловить react/only-export-components на файле с компонентом.

import { ApiError, deleteGoal, getGoalSubtree } from '../api'
import type { GoalKpiRead, GoalRead } from '../types'

const LIFECYCLE_LABEL_RU: Record<string, string> = {
  draft: 'Черновик',
  active: 'Активна',
  review: 'На проверке',
  archived: 'Архивирована',
}

export const lifecycleLabel = (stage: string): string => (LIFECYCLE_LABEL_RU[stage] ?? stage).toUpperCase()

export const ownerOrDash = (owner: string): string => (owner.trim() === '' ? '—' : owner)

export const definitenessLabel = (g: GoalRead): string => (g.definiteness === 'fog' ? 'туман' : 'определена')

// Композитный KPI (computed_value) — вычисленное значение важнее target;
// без таргета и без computed_value это и есть туман-кейс (D6, §9 Management_Model).
export const kpiValue = (k: GoalKpiRead): string => {
  if (k.computed_value != null) return `${k.computed_value} ${k.unit} · расчёт`
  if (k.target != null) return `${k.target} ${k.unit}`
  return '—'
}

export type DeleteGoalResult = 'deleted' | 'cancelled' | 'error'

// Общий сценарий удаления цели с confirm/каскадом (Ф38): card (GoalPopup) и
// hover-контролы узла карты (CommandPanel) запускают один и тот же диалог —
// 409 → уточнить размер поддерева → подтвердить каскад. window.confirm
// вызывается здесь же (не вынесен), т.к. это единственный побочный эффект,
// который дублировался дословно между двумя местами (промпт №38a, п.3).
export const deleteGoalWithCascadeConfirm = async (goal: GoalRead): Promise<DeleteGoalResult> => {
  if (!window.confirm(`Удалить цель «${goal.name}»?`)) return 'cancelled'
  try {
    await deleteGoal(goal.id, false)
    return 'deleted'
  } catch (err) {
    if (!(err instanceof ApiError && err.status === 409)) return 'error'
    let count: number | null = null
    try {
      const subtree = await getGoalSubtree(goal.id)
      count = subtree.length - 1
    } catch {
      count = null
    }
    const question = count != null ? `Удалить со всеми подцелями (${count})?` : 'Удалить со всеми подцелями?'
    if (!window.confirm(question)) return 'cancelled'
    try {
      await deleteGoal(goal.id, true)
      return 'deleted'
    } catch {
      return 'error'
    }
  }
}

// Общие хелперы форматирования GoalRead/GoalKpiRead — используются и RealGoalCard.tsx
// (Ф2/Ф3), и GoalCanvas.tsx (Ф4, промпт №23). Отдельный модуль без компонентов,
// чтобы не ловить react/only-export-components на файле с компонентом.

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

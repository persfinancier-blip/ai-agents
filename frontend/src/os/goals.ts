// Хелперы дерева целей: навигация по пути, иммутабельные правки,
// свёртки снизу вверх и сигнал перегруза ресурсов (§41.1).

import { UNITS } from './data'
import type { GoalLifecycle, OsGoal } from './data'

export const LIFECYCLE_LABEL: Record<GoalLifecycle, string> = {
  draft: 'Черновик',
  active: 'Активна',
  review: 'На проверке',
  archived: 'Архивирована',
}

/** Состояние узла в потоке процесса: пройден / текущий / предстоящий. */
export const flowState = (g: OsGoal): 'passed' | 'now' | 'next' =>
  g.lifecycle === 'archived' ? 'passed' : g.lifecycle === 'draft' ? 'next' : 'now'

export const unitById = new Map(UNITS.map((u) => [u.id, u]))

/** Пройти путь id от корня; вернуть цепочку root → … → current (для крошек). */
export function resolveChain(roots: OsGoal[], path: string[]): OsGoal[] {
  if (!path.length) return []
  const root = roots.find((g) => g.id === path[0])
  if (!root) return []
  const chain = [root]
  let cur = root
  for (const id of path.slice(1)) {
    const next = cur.stages?.find((s) => s.id === id)
    if (!next) break
    chain.push(next)
    cur = next
  }
  return chain
}

/** Иммутабельная правка одного узла в дереве (ids уникальны). */
export const updateGoalTree = (gs: OsGoal[], id: string, fn: (g: OsGoal) => OsGoal): OsGoal[] =>
  gs.map((g) =>
    g.id === id ? fn(g) : g.stages ? { ...g, stages: updateGoalTree(g.stages, id, fn) } : g,
  )

/* свёртка снизу вверх: KPI родителя = среднее свёрток детей */
export const rollupKpi = (g: OsGoal): number =>
  g.stages?.length
    ? Math.round(g.stages.reduce((s, c) => s + rollupKpi(c), 0) / g.stages.length)
    : g.kpi

/** узел + все потомки */
export function branchGoals(g: OsGoal): OsGoal[] {
  const out: OsGoal[] = [g]
  for (const s of g.stages ?? []) out.push(...branchGoals(s))
  return out
}

export const branchLoad = (g: OsGoal): number =>
  branchGoals(g).reduce((s, n) => s + (n.resources ?? []).reduce((a, r) => a + r.load, 0), 0)

export const branchCost = (g: OsGoal): number =>
  branchGoals(g).reduce((s, n) => s + (n.resources ?? []).reduce((a, r) => a + (r.cost ?? 0), 0), 0)

/** суммарная загрузка каждого юнита по всей ветке */
export function branchByUnit(g: OsGoal): Map<string, number> {
  const m = new Map<string, number>()
  for (const n of branchGoals(g))
    for (const r of n.resources ?? []) m.set(r.unitId, (m.get(r.unitId) ?? 0) + r.load)
  return m
}

export interface Overload {
  unitId: string
  parentLoad: number
  childrenLoad: number
  /** юнит занят на этапах, но вовсе не выделен родителю */
  missing?: boolean
}

/** Перегруз: прямые этапы требуют юнита больше, чем выделено родителю. */
export function findOverloads(g: OsGoal): Overload[] {
  if (!g.stages?.length) return []
  const childSum = new Map<string, number>()
  for (const st of g.stages)
    for (const r of st.resources ?? [])
      childSum.set(r.unitId, (childSum.get(r.unitId) ?? 0) + r.load)
  const out: Overload[] = []
  for (const [unitId, sum] of childSum) {
    const own = g.resources?.find((r) => r.unitId === unitId)
    if (!own) out.push({ unitId, parentLoad: 0, childrenLoad: sum, missing: true })
    else if (sum > own.load) out.push({ unitId, parentLoad: own.load, childrenLoad: sum })
  }
  return out
}

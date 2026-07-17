import type {
  BoardOpinionRead,
  DecisionCreate,
  DecisionRead,
  GoalCreate,
  GoalPatch,
  GoalRead,
  KpiFactorCreate,
  KpiFactorRead,
  KpiLinkCreate,
  KpiLinkCycleRead,
  KpiLinkRead,
  UnitRead,
} from './types'

const BASE = '/api/v1'

// Отдельный класс ошибки — чтобы вызывающий код мог различить 404 (например,
// цель удалили между загрузкой карты и открытием карточки) от прочих отказов.
export class ApiError extends Error {
  readonly status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(body.detail ?? `Request failed: ${res.status}`, res.status)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const listDecisions = () => request<DecisionRead[]>('/decisions')

export const getDecision = (id: string) => request<DecisionRead>(`/decisions/${id}`)

export const createDecision = (payload: DecisionCreate) =>
  request<DecisionRead>('/decisions', { method: 'POST', body: JSON.stringify(payload) })

export const analyzeDecision = (id: string) =>
  request<BoardOpinionRead>(`/decisions/${id}/analyze`, { method: 'POST' })

export const getBoard = (id: string) => request<BoardOpinionRead[]>(`/decisions/${id}/board`)

/* Goal API (промпт №17, read-only срез) */

export const listGoals = () => request<GoalRead[]>('/goals')

export const getGoal = (id: string) => request<GoalRead>(`/goals/${id}`)

export const getGoalSubtree = (id: string) => request<GoalRead[]>(`/goals/${id}/subtree`)

/* Ф3 — редактирование (промпт №22): create/patch/delete, backend не менялся */

export const createGoal = (payload: GoalCreate) =>
  request<GoalRead>('/goals', { method: 'POST', body: JSON.stringify(payload) })

export const patchGoal = (id: string, payload: GoalPatch) =>
  request<GoalRead>(`/goals/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })

export const deleteGoal = (id: string, cascade = false) =>
  request<void>(`/goals/${id}${cascade ? '?cascade=true' : ''}`, { method: 'DELETE' })

/* Ф4 — канвас постановки (промпт №23): связи KPI→KPI, циклы, факторы композита.
   Backend не менялся — все роуты уже были (Шаги 3a/3b/3c). */

export const listKpiLinksForKpi = (kpiId: string) =>
  request<KpiLinkRead[]>(`/kpi-links?kpi_id=${encodeURIComponent(kpiId)}`)

export const createKpiLink = (payload: KpiLinkCreate) =>
  request<KpiLinkRead>('/kpi-links', { method: 'POST', body: JSON.stringify(payload) })

export const deleteKpiLink = (id: string) => request<void>(`/kpi-links/${id}`, { method: 'DELETE' })

export const listKpiLinkCycles = () => request<KpiLinkCycleRead[]>('/kpi-links/cycles')

export const confirmKpiLinkCycle = (id: string, confirmed: boolean) =>
  request<KpiLinkCycleRead>(`/kpi-links/cycles/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ confirmed }),
  })

export const listKpiFactors = (compositeKpiId: string) =>
  request<KpiFactorRead[]>(`/kpi-factors?composite_kpi_id=${encodeURIComponent(compositeKpiId)}`)

export const createKpiFactor = (payload: KpiFactorCreate) =>
  request<KpiFactorRead>('/kpi-factors', { method: 'POST', body: JSON.stringify(payload) })

export const deleteKpiFactor = (id: string) => request<void>(`/kpi-factors/${id}`, { method: 'DELETE' })

/* Unit API (промпт №43, read-only срез) */

export const listUnits = () => request<UnitRead[]>('/units')
